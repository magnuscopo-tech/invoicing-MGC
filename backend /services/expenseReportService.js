const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const Transaction = require("../models/transactionModel");
const { TXN_CATEGORY_KIND } = require("../config/constants");
const { buildTransactionMatch, round2 } = require("../utils/cashBookScope");

dayjs.extend(utc);

/*
 * The whole file works in UTC days. Transactions are stored at UTC midnight and
 * every $dateToString below groups in UTC, so the JavaScript side that builds
 * the axis has to agree - a local-time cursor would label a bucket with the
 * wrong month for any server that is not on UTC.
 */
const day = (value) => (value ? dayjs.utc(value) : dayjs.utc());

/*
 * Reporting rules for the cash book:
 *
 *   Money in / out  = credit / debit totals. Nothing is netted before it is
 *                     reported, so a refund shows as both the payment and the
 *                     money coming back rather than silently vanishing.
 *   Net flow        = money in - money out. Positive means the account grew.
 *   Closing balance = the balance the BANK printed on the most recent row that
 *                     carried one. It is never derived by adding movements to a
 *                     guess, because a hand-entered cash row has no balance and
 *                     would quietly corrupt the running figure.
 *   Spend           = debits only, and "Inter-account Transfer" is excluded
 *                     from spend analytics - moving money between your own
 *                     accounts is not an expense.
 */

const TRANSFER_CATEGORY = "Inter-account Transfer";

const directionTotals = (rows = []) => {
  const credit = rows.find((row) => row._id === "credit");
  const debit = rows.find((row) => row._id === "debit");
  return {
    moneyIn: round2(credit?.amount || 0),
    moneyOut: round2(debit?.amount || 0),
    creditCount: credit?.count || 0,
    debitCount: debit?.count || 0,
  };
};

const totalsPipeline = [
  {
    $group: {
      _id: "$direction",
      amount: { $sum: "$amount" },
      count: { $sum: 1 },
    },
  },
];

/*
 * The comparison window is the same length as the scoped one, ending the day
 * before it starts. It is only offered when the caller actually scoped a range
 * - inventing a baseline for "everything ever" would produce a delta that means
 * nothing.
 */
const previousWindow = (query) => {
  if (!query.fromDate || !query.toDate) return null;

  const from = day(query.fromDate).startOf("day");
  const to = day(query.toDate).endOf("day");
  const days = Math.max(1, to.diff(from, "day") + 1);

  return {
    fromDate: from.subtract(days, "day").toDate(),
    toDate: from.subtract(1, "day").endOf("day").toDate(),
    days,
  };
};

const percentChange = (current, previous) => {
  if (!previous) return null;
  return round2(((current - previous) / previous) * 100);
};

/* ------------------------------ 1. Headline KPIs ----------------------------- */

const fetchCashFlowSummary = async (req, res) => {
  try {
    const match = buildTransactionMatch(req.query);
    const spendMatch = { ...match, direction: "debit", category: { $ne: TRANSFER_CATEGORY } };

    const [result] = await Transaction.aggregate([
      { $match: match },
      {
        $facet: {
          totals: totalsPipeline,
          /*
           * Latest row the bank stamped a balance onto - the only trustworthy
           * statement of where the account actually stands.
           *
           * The _id tiebreak is load bearing. A statement books many rows on
           * the same day and insertMany gives them all the same createdAt, so
           * date+createdAt leaves the winner undefined and the closing balance
           * lands on whichever same-day row Mongo happened to return. ObjectIds
           * increase with insertion order, so the highest one is the last line
           * of that day on the statement.
           */
          latestBalance: [
            { $match: { balance: { $ne: null } } },
            { $sort: { date: -1, createdAt: -1, _id: -1 } },
            { $limit: 1 },
            { $project: { balance: 1, date: 1, bankAccount: 1 } },
          ],
          span: [
            {
              $group: {
                _id: null,
                firstDate: { $min: "$date" },
                lastDate: { $max: "$date" },
                total: { $sum: 1 },
              },
            },
          ],
          bySource: [{ $group: { _id: "$source", count: { $sum: 1 } } }],
        },
      },
    ]);

    const [spendResult] = await Transaction.aggregate([
      { $match: spendMatch },
      {
        $facet: {
          spend: [
            {
              $group: {
                _id: null,
                amount: { $sum: "$amount" },
                count: { $sum: 1 },
                largest: { $max: "$amount" },
              },
            },
          ],
          topCategory: [
            { $group: { _id: "$category", amount: { $sum: "$amount" } } },
            { $sort: { amount: -1 } },
            { $limit: 1 },
          ],
          largestRow: [
            { $sort: { amount: -1 } },
            { $limit: 1 },
            { $project: { amount: 1, particulars: 1, partyName: 1, date: 1, category: 1 } },
          ],
        },
      },
    ]);

    const totals = directionTotals(result?.totals || []);
    const span = result?.span?.[0] || null;
    const spend = spendResult?.spend?.[0] || null;

    // Uncategorized debits are the queue an admin has to work through after an
    // import, so the count is a first-class KPI rather than something to find
    // by filtering.
    const needsReview = await Transaction.countDocuments({
      ...match,
      direction: "debit",
      category: "Uncategorized",
    });

    /*
     * Average monthly spend is measured over the days the data actually covers,
     * not over the requested window. A three-day-old book asked about "this
     * year" would otherwise report a burn rate near zero.
     */
    const coveredDays =
      span && span.firstDate && span.lastDate
        ? Math.max(1, day(span.lastDate).diff(day(span.firstDate), "day") + 1)
        : 0;
    const spendTotal = round2(spend?.amount || 0);
    const monthlyBurn = coveredDays
      ? round2((spendTotal / coveredDays) * 30)
      : 0;

    const latestBalance = result?.latestBalance?.[0] || null;
    const closingBalance = latestBalance ? round2(latestBalance.balance) : null;

    // Runway only means something with a known balance and real outflow.
    const runwayMonths =
      closingBalance !== null && monthlyBurn > 0
        ? round2(closingBalance / monthlyBurn)
        : null;

    // Comparison against the preceding window of equal length.
    let comparison = null;
    const window = previousWindow(req.query);
    if (window) {
      const previousMatch = buildTransactionMatch({
        ...req.query,
        fromDate: window.fromDate,
        toDate: window.toDate,
      });
      const previousTotals = directionTotals(
        await Transaction.aggregate([{ $match: previousMatch }, ...totalsPipeline])
      );

      comparison = {
        days: window.days,
        fromDate: window.fromDate,
        toDate: window.toDate,
        moneyIn: previousTotals.moneyIn,
        moneyOut: previousTotals.moneyOut,
        netFlow: round2(previousTotals.moneyIn - previousTotals.moneyOut),
        moneyInChange: percentChange(totals.moneyIn, previousTotals.moneyIn),
        moneyOutChange: percentChange(totals.moneyOut, previousTotals.moneyOut),
      };
    }

    const sources = (result?.bySource || []).reduce((accumulator, row) => {
      accumulator[row._id] = row.count;
      return accumulator;
    }, {});

    return res.status(200).json({
      success: true,
      message: "Cash flow summary fetched successfully",
      data: {
        moneyIn: totals.moneyIn,
        moneyOut: totals.moneyOut,
        netFlow: round2(totals.moneyIn - totals.moneyOut),
        creditCount: totals.creditCount,
        debitCount: totals.debitCount,
        transactionCount: span?.total || 0,

        spend: {
          total: spendTotal,
          count: spend?.count || 0,
          average: spend?.count ? round2(spendTotal / spend.count) : 0,
          monthlyBurn,
          topCategory: spendResult?.topCategory?.[0]
            ? {
                category: spendResult.topCategory[0]._id,
                amount: round2(spendResult.topCategory[0].amount),
                share: spendTotal
                  ? round2((spendResult.topCategory[0].amount / spendTotal) * 100)
                  : 0,
              }
            : null,
          largest: spendResult?.largestRow?.[0]
            ? {
                ...spendResult.largestRow[0],
                amount: round2(spendResult.largestRow[0].amount),
              }
            : null,
        },

        balance: {
          closing: closingBalance,
          asOf: latestBalance?.date || null,
          bankAccount: latestBalance?.bankAccount || "",
          runwayMonths,
        },

        coverage: {
          firstDate: span?.firstDate || null,
          lastDate: span?.lastDate || null,
          days: coveredDays,
        },

        needsReview,
        sources: {
          manual: sources.manual || 0,
          bulk_upload: sources.bulk_upload || 0,
        },
        comparison,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get Cash Flow Summary:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/* ----------------------------- 2. Monthly trend ----------------------------- */

const fetchCashFlowTrend = async (req, res) => {
  try {
    const { months } = req.query;

    /*
     * When no range is set the trend walks back from today. When one is set the
     * range wins outright - a chart sitting under a filter bar that quietly
     * ignored it would be worse than no chart.
     */
    const end = day(req.query.toDate);
    const start = req.query.fromDate
      ? day(req.query.fromDate)
      : end.subtract(months - 1, "month").startOf("month");

    const scoped = {
      ...req.query,
      fromDate: start.startOf("month").toDate(),
      toDate: end.endOf("month").toDate(),
    };

    const rows = await Transaction.aggregate([
      { $match: buildTransactionMatch(scoped) },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%Y-%m", date: "$date" } },
            direction: "$direction",
          },
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const byMonth = new Map();
    rows.forEach((row) => {
      const bucket = byMonth.get(row._id.month) || {
        moneyIn: 0,
        moneyOut: 0,
        creditCount: 0,
        debitCount: 0,
      };
      if (row._id.direction === "credit") {
        bucket.moneyIn = row.amount;
        bucket.creditCount = row.count;
      } else {
        bucket.moneyOut = row.amount;
        bucket.debitCount = row.count;
      }
      byMonth.set(row._id.month, bucket);
    });

    // Months with no activity are emitted as zeros. A gap in a time axis reads
    // as "no data collected"; a zero reads as "nothing moved", which is the
    // truth and keeps the x axis evenly spaced.
    const series = [];
    let cumulative = 0;
    const totalMonths = Math.max(1, end.startOf("month").diff(start.startOf("month"), "month") + 1);

    for (let index = 0; index < totalMonths; index += 1) {
      const cursor = start.startOf("month").add(index, "month");
      const key = cursor.format("YYYY-MM");
      const bucket = byMonth.get(key) || {
        moneyIn: 0,
        moneyOut: 0,
        creditCount: 0,
        debitCount: 0,
      };
      const net = bucket.moneyIn - bucket.moneyOut;
      cumulative += net;

      series.push({
        month: key,
        label: cursor.format("MMM YY"),
        moneyIn: round2(bucket.moneyIn),
        moneyOut: round2(bucket.moneyOut),
        netFlow: round2(net),
        cumulativeNet: round2(cumulative),
        creditCount: bucket.creditCount,
        debitCount: bucket.debitCount,
      });
    }

    const totalIn = series.reduce((sum, row) => sum + row.moneyIn, 0);
    const totalOut = series.reduce((sum, row) => sum + row.moneyOut, 0);

    return res.status(200).json({
      success: true,
      message: "Cash flow trend fetched successfully",
      data: {
        series,
        totals: {
          moneyIn: round2(totalIn),
          moneyOut: round2(totalOut),
          netFlow: round2(totalIn - totalOut),
          averageMonthlyIn: round2(totalIn / series.length),
          averageMonthlyOut: round2(totalOut / series.length),
        },
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get Cash Flow Trend:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/* --------------------------- 3. Category breakdown --------------------------- */

const fetchCategoryBreakdown = async (req, res) => {
  try {
    const match = buildTransactionMatch(req.query);

    const rows = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: { category: "$category", direction: "$direction" },
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const byCategory = new Map();
    rows.forEach((row) => {
      const key = row._id.category;
      const bucket = byCategory.get(key) || {
        category: key,
        kind: TXN_CATEGORY_KIND[key] || "both",
        credit: 0,
        debit: 0,
        count: 0,
      };
      if (row._id.direction === "credit") bucket.credit += row.amount;
      else bucket.debit += row.amount;
      bucket.count += row.count;
      byCategory.set(key, bucket);
    });

    const all = [...byCategory.values()].map((bucket) => ({
      ...bucket,
      credit: round2(bucket.credit),
      debit: round2(bucket.debit),
      net: round2(bucket.credit - bucket.debit),
    }));

    // Transfers are movement, not spend, so they are reported separately rather
    // than inflating the expense mix.
    const expense = all
      .filter((row) => row.debit > 0 && row.category !== TRANSFER_CATEGORY)
      .sort((a, b) => b.debit - a.debit);
    const income = all
      .filter((row) => row.credit > 0 && row.category !== TRANSFER_CATEGORY)
      .sort((a, b) => b.credit - a.credit);

    const expenseTotal = expense.reduce((sum, row) => sum + row.debit, 0);
    const incomeTotal = income.reduce((sum, row) => sum + row.credit, 0);

    return res.status(200).json({
      success: true,
      message: "Category breakdown fetched successfully",
      data: {
        expense: expense.map((row) => ({
          ...row,
          share: expenseTotal ? round2((row.debit / expenseTotal) * 100) : 0,
        })),
        income: income.map((row) => ({
          ...row,
          share: incomeTotal ? round2((row.credit / incomeTotal) * 100) : 0,
        })),
        totals: {
          expense: round2(expenseTotal),
          income: round2(incomeTotal),
          transfers: round2(
            all
              .filter((row) => row.category === TRANSFER_CATEGORY)
              .reduce((sum, row) => sum + row.debit, 0)
          ),
        },
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get Category Breakdown:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/* ----------------------------- 4. Top parties ----------------------------- */

const fetchTopParties = async (req, res) => {
  try {
    const { limit } = req.query;
    const match = buildTransactionMatch(req.query, {
      partyName: { $nin: ["", null] },
    });

    const rows = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: { party: "$partyName", direction: "$direction" },
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
          lastDate: { $max: "$date" },
        },
      },
    ]);

    const byParty = new Map();
    rows.forEach((row) => {
      const key = row._id.party;
      const bucket = byParty.get(key) || {
        party: key,
        paid: 0,
        received: 0,
        count: 0,
        lastDate: null,
      };
      if (row._id.direction === "credit") bucket.received += row.amount;
      else bucket.paid += row.amount;
      bucket.count += row.count;
      if (!bucket.lastDate || row.lastDate > bucket.lastDate) {
        bucket.lastDate = row.lastDate;
      }
      byParty.set(key, bucket);
    });

    const parties = [...byParty.values()].map((bucket) => ({
      ...bucket,
      paid: round2(bucket.paid),
      received: round2(bucket.received),
      net: round2(bucket.received - bucket.paid),
    }));

    return res.status(200).json({
      success: true,
      message: "Top parties fetched successfully",
      data: {
        // Split rather than ranked on a net figure: a party you both pay and
        // are paid by would otherwise disappear from both lists.
        vendors: parties
          .filter((row) => row.paid > 0)
          .sort((a, b) => b.paid - a.paid)
          .slice(0, limit),
        payers: parties
          .filter((row) => row.received > 0)
          .sort((a, b) => b.received - a.received)
          .slice(0, limit),
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get Top Parties:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/* -------------------------- 5. Payment mode split -------------------------- */

const fetchPaymentModeSplit = async (req, res) => {
  try {
    const match = buildTransactionMatch(req.query);

    const rows = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: { mode: "$paymentMode", direction: "$direction" },
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const byMode = new Map();
    rows.forEach((row) => {
      const key = row._id.mode;
      const bucket = byMode.get(key) || { mode: key, credit: 0, debit: 0, count: 0 };
      if (row._id.direction === "credit") bucket.credit += row.amount;
      else bucket.debit += row.amount;
      bucket.count += row.count;
      byMode.set(key, bucket);
    });

    const modes = [...byMode.values()]
      .map((bucket) => ({
        ...bucket,
        credit: round2(bucket.credit),
        debit: round2(bucket.debit),
        total: round2(bucket.credit + bucket.debit),
      }))
      .sort((a, b) => b.total - a.total);

    return res.status(200).json({
      success: true,
      message: "Payment mode split fetched successfully",
      data: modes,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get Payment Mode Split:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/* ---------------------------- 6. Daily movement ---------------------------- */

/*
 * Day-level detail for the scoped window, capped at a quarter. Beyond that the
 * points stop being distinguishable on screen and the monthly trend is the
 * right chart, so the cap is a design decision rather than a performance one.
 */
const MAX_DAILY_SPAN = 92;

const fetchDailyCashFlow = async (req, res) => {
  try {
    const end = day(req.query.toDate);
    let start = req.query.fromDate
      ? day(req.query.fromDate)
      : end.subtract(29, "day");

    let truncated = false;
    if (end.diff(start, "day") + 1 > MAX_DAILY_SPAN) {
      start = end.subtract(MAX_DAILY_SPAN - 1, "day");
      truncated = true;
    }

    const scoped = {
      ...req.query,
      fromDate: start.startOf("day").toDate(),
      toDate: end.endOf("day").toDate(),
    };

    const rows = await Transaction.aggregate([
      { $match: buildTransactionMatch(scoped) },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            direction: "$direction",
          },
          amount: { $sum: "$amount" },
        },
      },
      // Closing balance for a day is the last balance the bank printed on it.
      // Same _id tiebreak as the summary, for the same reason.
      {
        $unionWith: {
          coll: "transactions",
          pipeline: [
            { $match: { ...buildTransactionMatch(scoped), balance: { $ne: null } } },
            { $sort: { date: 1, createdAt: 1, _id: 1 } },
            {
              $group: {
                _id: {
                  day: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                  direction: "balance",
                },
                amount: { $last: "$balance" },
              },
            },
          ],
        },
      },
    ]);

    const byDay = new Map();
    rows.forEach((row) => {
      const bucket = byDay.get(row._id.day) || {
        moneyIn: 0,
        moneyOut: 0,
        balance: null,
      };
      if (row._id.direction === "credit") bucket.moneyIn = row.amount;
      else if (row._id.direction === "debit") bucket.moneyOut = row.amount;
      else bucket.balance = row.amount;
      byDay.set(row._id.day, bucket);
    });

    const series = [];
    const days = end.startOf("day").diff(start.startOf("day"), "day") + 1;
    let lastKnownBalance = null;

    for (let index = 0; index < days; index += 1) {
      const cursor = start.startOf("day").add(index, "day");
      const key = cursor.format("YYYY-MM-DD");
      const bucket = byDay.get(key) || { moneyIn: 0, moneyOut: 0, balance: null };

      if (bucket.balance !== null) lastKnownBalance = round2(bucket.balance);

      series.push({
        day: key,
        label: cursor.format("DD MMM"),
        moneyIn: round2(bucket.moneyIn),
        moneyOut: round2(bucket.moneyOut),
        netFlow: round2(bucket.moneyIn - bucket.moneyOut),
        // Carried forward on quiet days: the balance did not change, so the
        // line should be flat rather than dropping to zero.
        balance: lastKnownBalance,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Daily cash flow fetched successfully",
      data: {
        series,
        truncated,
        maxSpanDays: MAX_DAILY_SPAN,
        fromDate: start.startOf("day").toDate(),
        toDate: end.endOf("day").toDate(),
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get Daily Cash Flow:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

module.exports = {
  fetchCashFlowSummary,
  fetchCashFlowTrend,
  fetchCategoryBreakdown,
  fetchTopParties,
  fetchPaymentModeSplit,
  fetchDailyCashFlow,
};
