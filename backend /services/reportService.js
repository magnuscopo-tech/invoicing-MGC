const mongoose = require("mongoose");
const dayjs = require("dayjs");
const Document = require("../models/documentModel");
const Client = require("../models/clientModel");
const Company = require("../models/companyModel");
const Service = require("../models/serviceModel");
const User = require("../models/userModel");
const AuditLog = require("../models/auditLogModel");
const { GST_PERCENT } = require("../config/constants");

/*
 * Revenue recognition rules used by every report in this file:
 *
 *   Revenue        = tax invoices only. A quotation is an estimate and a proforma
 *                    is a pre-payment request, so neither is ever counted as
 *                    revenue - they are reported separately as pipeline.
 *   Cancelled      = excluded from every monetary figure, always.
 *   Collected      = invoices whose status is "paid".
 *   Outstanding    = non-cancelled, unpaid invoices.
 *   GST liability  = gstAmount on non-cancelled invoices.
 */
const LIVE_STATUSES = ["draft", "generated", "sent", "paid"];
const UNPAID_STATUSES = ["draft", "generated", "sent"];

/*
 * Receivables sit on the PROFORMA, not the tax invoice.
 *
 * The client pays against the proforma, and the tax invoice is raised afterwards
 * - approving it is what confirms the payment, which marks it paid immediately.
 * So an unpaid tax invoice is only ever a few minutes of transient state, while
 * the money genuinely owed is a proforma that went out and has not come back.
 *
 * "Issued" means the client actually has it: sent, or approved and signed. A
 * draft still being prepared internally is not money owed by anyone. This is the
 * same line the price lock draws, so "the price is final" and "the client owes
 * it" describe the same set of documents.
 */
const RECEIVABLE_MATCH = {
  docType: "proforma",
  status: { $in: UNPAID_STATUSES },
  $or: [{ status: "sent" }, { approvalStatus: "approved" }],
};

const round2 = (value) =>
  Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

// Shared company / client / issue-date scope applied to every report.
const buildScopeMatch = (query = {}, extra = {}) => {
  const match = { ...extra };

  if (query.companyId) match.company = toObjectId(query.companyId);
  if (query.clientId) match.client = toObjectId(query.clientId);

  if (query.fromDate || query.toDate) {
    match.issueDate = {};
    if (query.fromDate) {
      match.issueDate.$gte = dayjs(query.fromDate).startOf("day").toDate();
    }
    if (query.toDate) {
      match.issueDate.$lte = dayjs(query.toDate).endOf("day").toDate();
    }
  }

  return match;
};

const emptyBucket = () => ({ count: 0, subTotal: 0, gstAmount: 0, totalAmount: 0 });

const addToBucket = (bucket, row) => ({
  count: bucket.count + row.count,
  subTotal: bucket.subTotal + row.subTotal,
  gstAmount: bucket.gstAmount + row.gstAmount,
  totalAmount: bucket.totalAmount + row.totalAmount,
});

const roundBucket = (bucket) => ({
  count: bucket.count,
  subTotal: round2(bucket.subTotal),
  gstAmount: round2(bucket.gstAmount),
  totalAmount: round2(bucket.totalAmount),
});

/* ------------------------------ 1. Headline KPIs ----------------------------- */

const fetchFinancialSummary = async (req, res) => {
  try {
    const match = buildScopeMatch(req.query);
    // Start of day, so a document due today is not yet overdue. The ageing report
    // measures whole days the same way - the two must agree or the KPI tile and
    // the ageing table report different things about the same document.
    const today = dayjs().startOf("day").toDate();

    const [result] = await Document.aggregate([
      { $match: match },
      {
        $facet: {
          byTypeStatus: [
            {
              $group: {
                _id: { docType: "$docType", status: "$status" },
                count: { $sum: 1 },
                subTotal: { $sum: "$subTotal" },
                gstAmount: { $sum: "$gstAmount" },
                totalAmount: { $sum: "$totalAmount" },
              },
            },
          ],
          quotationConversion: [
            { $match: { docType: "quotation", status: { $ne: "cancelled" } } },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                converted: {
                  $sum: {
                    $cond: [
                      { $gt: [{ $size: { $ifNull: ["$convertedTo", []] } }, 0] },
                      1,
                      0,
                    ],
                  },
                },
                value: { $sum: "$totalAmount" },
              },
            },
          ],
          // Money owed: issued, unsettled proformas. See RECEIVABLE_MATCH above.
          receivables: [
            { $match: RECEIVABLE_MATCH },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                totalAmount: { $sum: "$totalAmount" },
              },
            },
          ],
          overdue: [
            {
              $match: {
                ...RECEIVABLE_MATCH,
                dueDate: { $ne: null, $lt: today },
              },
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                totalAmount: { $sum: "$totalAmount" },
              },
            },
          ],
        },
      },
    ]);

    const rows = result?.byTypeStatus || [];

    const pick = (predicate) =>
      rows
        .filter(predicate)
        .reduce((accumulator, row) => addToBucket(accumulator, row), emptyBucket());

    const isLive = (row) => row._id.status !== "cancelled";

    const invoiced = pick((row) => row._id.docType === "invoice" && isLive(row));
    const collected = pick(
      (row) => row._id.docType === "invoice" && row._id.status === "paid"
    );
    // Pipeline means "not yet realised", so a proforma that has been paid is
    // excluded - that money is already counted as revenue on its tax invoice.
    const proforma = pick(
      (row) =>
        row._id.docType === "proforma" &&
        isLive(row) &&
        row._id.status !== "paid"
    );
    const quotation = pick((row) => row._id.docType === "quotation" && isLive(row));
    const cancelled = pick((row) => row._id.status === "cancelled");
    const drafts = pick((row) => row._id.status === "draft");

    const conversion = result?.quotationConversion?.[0] || {
      total: 0,
      converted: 0,
      value: 0,
    };
    const receivables = result?.receivables?.[0] || { count: 0, totalAmount: 0 };
    const overdue = result?.overdue?.[0] || { count: 0, totalAmount: 0 };

    const outstandingAmount = round2(receivables.totalAmount);
    // Of all the money that reached the "client owes it" stage, how much came in.
    // Measuring collected against invoiced would now always read ~100%, because a
    // tax invoice is only raised once the payment has already been confirmed.
    const settlementBase = collected.totalAmount + receivables.totalAmount;

    const documentCount = rows.reduce((sum, row) => sum + row.count, 0);

    return res.status(200).json({
      success: true,
      message: "Financial summary generated",
      data: {
        scope: {
          companyId: req.query.companyId || null,
          clientId: req.query.clientId || null,
          fromDate: req.query.fromDate || null,
          toDate: req.query.toDate || null,
        },
        gstPercent: GST_PERCENT,
        documentCount,

        // Revenue is tax invoices only - see the rules block at the top of this file.
        invoiced: roundBucket(invoiced),
        collected: roundBucket(collected),
        // Issued proformas the client has not settled yet - this is the real
        // receivable under the current flow, not an unpaid tax invoice.
        outstanding: {
          count: receivables.count,
          totalAmount: outstandingAmount,
          basis: "proforma",
        },
        overdue: {
          count: overdue.count,
          totalAmount: round2(overdue.totalAmount),
        },

        // Pipeline is explicitly not revenue.
        pipeline: {
          quotation: roundBucket(quotation),
          proforma: roundBucket(proforma),
        },

        gst: {
          taxableValue: round2(invoiced.subTotal),
          gstAmount: round2(invoiced.gstAmount),
          totalWithGst: round2(invoiced.totalAmount),
        },

        ratios: {
          collectionRate: settlementBase
            ? round2((collected.totalAmount / settlementBase) * 100)
            : 0,
          quotationConversionRate: conversion.total
            ? round2((conversion.converted / conversion.total) * 100)
            : 0,
          averageInvoiceValue: invoiced.count
            ? round2(invoiced.totalAmount / invoiced.count)
            : 0,
        },

        counts: {
          quotationsConverted: conversion.converted,
          quotationsTotal: conversion.total,
          drafts: drafts.count,
          cancelled: cancelled.count,
        },
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Financial Summary:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/* ---------------------------- 2. Monthly trend line --------------------------- */

const fetchRevenueTrend = async (req, res) => {
  try {
    const months = req.query.months || 12;
    const start = dayjs().subtract(months - 1, "month").startOf("month");

    const match = buildScopeMatch(req.query, {
      status: { $ne: "cancelled" },
    });
    // The rolling window wins over an explicit fromDate for this report.
    match.issueDate = {
      ...(match.issueDate || {}),
      $gte: start.toDate(),
    };

    const rows = await Document.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%Y-%m", date: "$issueDate" } },
            docType: "$docType",
            status: "$status",
          },
          count: { $sum: 1 },
          subTotal: { $sum: "$subTotal" },
          gstAmount: { $sum: "$gstAmount" },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    // Empty months must still appear, otherwise the chart's time axis lies.
    const series = Array.from({ length: months }, (_, index) => {
      const monthKey = start.add(index, "month");
      const monthRows = rows.filter((row) => row._id.month === monthKey.format("YYYY-MM"));

      const sumOf = (predicate, field) =>
        monthRows
          .filter(predicate)
          .reduce((sum, row) => sum + (row[field] || 0), 0);

      const invoicedTotal = sumOf((row) => row._id.docType === "invoice", "totalAmount");
      const collectedTotal = sumOf(
        (row) => row._id.docType === "invoice" && row._id.status === "paid",
        "totalAmount"
      );

      return {
        month: monthKey.format("YYYY-MM"),
        label: monthKey.format("MMM YY"),
        invoiced: round2(invoicedTotal),
        collected: round2(collectedTotal),
        outstanding: round2(invoicedTotal - collectedTotal),
        gstAmount: round2(
          sumOf((row) => row._id.docType === "invoice", "gstAmount")
        ),
        quotationValue: round2(
          sumOf((row) => row._id.docType === "quotation", "totalAmount")
        ),
        proformaValue: round2(
          sumOf((row) => row._id.docType === "proforma", "totalAmount")
        ),
        invoiceCount: monthRows
          .filter((row) => row._id.docType === "invoice")
          .reduce((sum, row) => sum + row.count, 0),
      };
    });

    return res.status(200).json({
      success: true,
      message: "Revenue trend generated",
      data: { months, series },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Revenue Trend:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/* ------------------- 3. Document type and status breakdown ------------------- */

const fetchDocumentBreakdown = async (req, res) => {
  try {
    const match = buildScopeMatch(req.query);

    const rows = await Document.aggregate([
      { $match: match },
      {
        $group: {
          _id: { docType: "$docType", status: "$status" },
          count: { $sum: 1 },
          subTotal: { $sum: "$subTotal" },
          gstAmount: { $sum: "$gstAmount" },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    const byType = ["quotation", "proforma", "invoice"].map((docType) => {
      const typeRows = rows.filter((row) => row._id.docType === docType);
      const live = typeRows
        .filter((row) => row._id.status !== "cancelled")
        .reduce((accumulator, row) => addToBucket(accumulator, row), emptyBucket());

      return {
        docType,
        ...roundBucket(live),
        cancelledCount: typeRows
          .filter((row) => row._id.status === "cancelled")
          .reduce((sum, row) => sum + row.count, 0),
        byStatus: typeRows.map((row) => ({
          status: row._id.status,
          count: row.count,
          totalAmount: round2(row.totalAmount),
        })),
      };
    });

    const byStatus = ["draft", "generated", "sent", "paid", "cancelled"].map(
      (status) => {
        const statusRows = rows.filter((row) => row._id.status === status);
        const bucket = statusRows.reduce(
          (accumulator, row) => addToBucket(accumulator, row),
          emptyBucket()
        );
        return { status, ...roundBucket(bucket) };
      }
    );

    return res.status(200).json({
      success: true,
      message: "Document breakdown generated",
      data: { byType, byStatus },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Document Breakdown:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/* ------------------------------ 4. Top clients ------------------------------- */

const fetchTopClients = async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const match = buildScopeMatch(req.query, {
      docType: "invoice",
      status: { $in: LIVE_STATUSES },
    });

    const rows = await Document.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$client",
          invoiceCount: { $sum: 1 },
          invoiced: { $sum: "$totalAmount" },
          gstAmount: { $sum: "$gstAmount" },
          collected: {
            $sum: {
              $cond: [{ $eq: ["$status", "paid"] }, "$totalAmount", 0],
            },
          },
          lastIssueDate: { $max: "$issueDate" },
        },
      },
      { $sort: { invoiced: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "clients",
          localField: "_id",
          foreignField: "_id",
          as: "client",
        },
      },
      { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
    ]);

    const data = rows.map((row) => ({
      clientId: row._id,
      name: row.client?.name || "Deleted client",
      gstin: row.client?.gstin || "",
      invoiceCount: row.invoiceCount,
      invoiced: round2(row.invoiced),
      collected: round2(row.collected),
      outstanding: round2(row.invoiced - row.collected),
      gstAmount: round2(row.gstAmount),
      lastIssueDate: row.lastIssueDate,
    }));

    return res.status(200).json({
      success: true,
      message: "Top clients generated",
      data,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Top Clients:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/* ------------------------ 5. GST summary for filing -------------------------- */

const fetchGstSummary = async (req, res) => {
  try {
    const months = req.query.months || 12;
    const start = dayjs().subtract(months - 1, "month").startOf("month");

    const match = buildScopeMatch(req.query, {
      docType: "invoice",
      status: { $in: LIVE_STATUSES },
      gstApplicable: true,
    });
    match.issueDate = { ...(match.issueDate || {}), $gte: start.toDate() };

    const rows = await Document.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$issueDate" } },
          invoiceCount: { $sum: 1 },
          taxableValue: { $sum: "$subTotal" },
          gstAmount: { $sum: "$gstAmount" },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    const series = Array.from({ length: months }, (_, index) => {
      const monthKey = start.add(index, "month");
      const row = rows.find((item) => item._id === monthKey.format("YYYY-MM"));

      return {
        month: monthKey.format("YYYY-MM"),
        label: monthKey.format("MMM YY"),
        // Indian FY runs 1 April to 31 March.
        financialYear:
          monthKey.month() + 1 >= 4
            ? `${String(monthKey.year()).slice(-2)}-${String(monthKey.year() + 1).slice(-2)}`
            : `${String(monthKey.year() - 1).slice(-2)}-${String(monthKey.year()).slice(-2)}`,
        invoiceCount: row?.invoiceCount || 0,
        taxableValue: round2(row?.taxableValue || 0),
        gstAmount: round2(row?.gstAmount || 0),
        totalAmount: round2(row?.totalAmount || 0),
      };
    });

    const totals = series.reduce(
      (accumulator, row) => ({
        invoiceCount: accumulator.invoiceCount + row.invoiceCount,
        taxableValue: round2(accumulator.taxableValue + row.taxableValue),
        gstAmount: round2(accumulator.gstAmount + row.gstAmount),
        totalAmount: round2(accumulator.totalAmount + row.totalAmount),
      }),
      { invoiceCount: 0, taxableValue: 0, gstAmount: 0, totalAmount: 0 }
    );

    // Group the same rows by financial year, which is how GST is actually filed.
    const byFinancialYear = Object.values(
      series.reduce((accumulator, row) => {
        const current = accumulator[row.financialYear] || {
          financialYear: row.financialYear,
          invoiceCount: 0,
          taxableValue: 0,
          gstAmount: 0,
          totalAmount: 0,
        };

        accumulator[row.financialYear] = {
          ...current,
          invoiceCount: current.invoiceCount + row.invoiceCount,
          taxableValue: round2(current.taxableValue + row.taxableValue),
          gstAmount: round2(current.gstAmount + row.gstAmount),
          totalAmount: round2(current.totalAmount + row.totalAmount),
        };
        return accumulator;
      }, {})
    );

    return res.status(200).json({
      success: true,
      message: "GST summary generated",
      data: { gstPercent: GST_PERCENT, series, byFinancialYear, totals },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Gst Summary:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/* ------------------------- 6. Receivables ageing ----------------------------- */

const fetchReceivablesAgeing = async (req, res) => {
  try {
    const now = dayjs();
    // Proformas, not tax invoices - the client pays against the proforma, so that
    // is where unsettled money sits. See RECEIVABLE_MATCH at the top of the file.
    const match = buildScopeMatch(req.query, RECEIVABLE_MATCH);

    const receivables = await Document.find(match)
      .select(
        "docNumber docType client company issueDate dueDate totalAmount status approvalStatus"
      )
      .populate("client", "name gstin")
      .populate("company", "name")
      .sort({ dueDate: 1 })
      .lean();

    const buckets = {
      notDue: { label: "Not yet due", count: 0, totalAmount: 0 },
      "0-30": { label: "1-30 days", count: 0, totalAmount: 0 },
      "31-60": { label: "31-60 days", count: 0, totalAmount: 0 },
      "61-90": { label: "61-90 days", count: 0, totalAmount: 0 },
      "90+": { label: "90+ days", count: 0, totalAmount: 0 },
    };

    const bucketFor = (daysOverdue) => {
      if (daysOverdue <= 0) return "notDue";
      if (daysOverdue <= 30) return "0-30";
      if (daysOverdue <= 60) return "31-60";
      if (daysOverdue <= 90) return "61-90";
      return "90+";
    };

    const rows = receivables.map((document) => {
      // A document with no due date is never treated as overdue.
      const daysOverdue = document.dueDate
        ? now.startOf("day").diff(dayjs(document.dueDate).startOf("day"), "day")
        : 0;
      const bucketKey = bucketFor(daysOverdue);

      buckets[bucketKey].count += 1;
      buckets[bucketKey].totalAmount = round2(
        buckets[bucketKey].totalAmount + (document.totalAmount || 0)
      );

      return {
        _id: document._id,
        docNumber: document.docNumber,
        docType: document.docType,
        clientName: document.client?.name || "Deleted client",
        companyName: document.company?.name || "",
        issueDate: document.issueDate,
        dueDate: document.dueDate,
        totalAmount: round2(document.totalAmount),
        status: document.status,
        approvalStatus: document.approvalStatus,
        daysOverdue: Math.max(0, daysOverdue),
        bucket: bucketKey,
      };
    });

    const totalOutstanding = round2(
      rows.reduce((sum, row) => sum + row.totalAmount, 0)
    );

    return res.status(200).json({
      success: true,
      message: "Receivables ageing generated",
      data: {
        totalOutstanding,
        // What the ageing is measured on, so the UI can label itself honestly.
        basis: "proforma",
        buckets: Object.entries(buckets).map(([key, value]) => ({
          bucket: key,
          ...value,
        })),
        // Worst offenders first, so the collections list is actionable. Buckets
        // and totalOutstanding above cover every row; only this list is capped.
        documents: rows.sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 50),
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Receivables Ageing:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/* ------------------------- 7. Quotation to cash funnel ----------------------- */

const fetchConversionFunnel = async (req, res) => {
  try {
    const match = buildScopeMatch(req.query, { status: { $ne: "cancelled" } });

    const rows = await Document.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$docType",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
          converted: {
            $sum: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ["$convertedTo", []] } }, 0] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const paidRow = await Document.aggregate([
      { $match: buildScopeMatch(req.query, { docType: "invoice", status: "paid" }) },
      { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: "$totalAmount" } } },
    ]);

    const find = (docType) =>
      rows.find((row) => row._id === docType) || {
        count: 0,
        totalAmount: 0,
        converted: 0,
      };

    const quotation = find("quotation");
    const proforma = find("proforma");
    const invoice = find("invoice");
    const paid = paidRow[0] || { count: 0, totalAmount: 0 };

    const stages = [
      {
        stage: "quotation",
        label: "Quotations",
        count: quotation.count,
        totalAmount: round2(quotation.totalAmount),
      },
      {
        stage: "proforma",
        label: "Proforma invoices",
        count: proforma.count,
        totalAmount: round2(proforma.totalAmount),
      },
      {
        stage: "invoice",
        label: "Tax invoices",
        count: invoice.count,
        totalAmount: round2(invoice.totalAmount),
      },
      {
        stage: "paid",
        label: "Paid",
        count: paid.count,
        totalAmount: round2(paid.totalAmount),
      },
    ];

    // Each rate is measured against the first stage, so the funnel reads top-down.
    const base = stages[0].count || 0;
    const withRates = stages.map((stage) => ({
      ...stage,
      conversionRate: base ? round2((stage.count / base) * 100) : 0,
    }));

    return res.status(200).json({
      success: true,
      message: "Conversion funnel generated",
      data: {
        stages: withRates,
        quotationsConverted: quotation.converted,
        quotationConversionRate: quotation.count
          ? round2((quotation.converted / quotation.count) * 100)
          : 0,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Conversion Funnel:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/* ------------------------ 8. Per company performance ------------------------- */

const fetchCompanyPerformance = async (req, res) => {
  try {
    const match = buildScopeMatch(req.query, {
      docType: "invoice",
      status: { $in: LIVE_STATUSES },
    });

    const rows = await Document.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$company",
          invoiceCount: { $sum: 1 },
          invoiced: { $sum: "$totalAmount" },
          taxableValue: { $sum: "$subTotal" },
          gstAmount: { $sum: "$gstAmount" },
          collected: {
            $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$totalAmount", 0] },
          },
        },
      },
      { $sort: { invoiced: -1 } },
      {
        $lookup: {
          from: "companies",
          localField: "_id",
          foreignField: "_id",
          as: "company",
        },
      },
      { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },
    ]);

    const data = rows.map((row) => ({
      companyId: row._id,
      name: row.company?.name || "Deleted company",
      gstin: row.company?.gstin || "",
      invoiceCount: row.invoiceCount,
      invoiced: round2(row.invoiced),
      collected: round2(row.collected),
      outstanding: round2(row.invoiced - row.collected),
      taxableValue: round2(row.taxableValue),
      gstAmount: round2(row.gstAmount),
    }));

    return res.status(200).json({
      success: true,
      message: "Company performance generated",
      data,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Company Performance:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/* --------------------------- 9. Workspace overview --------------------------- */

const fetchWorkspaceOverview = async (req, res) => {
  try {
    const [companies, clients, services, users, clientsWithoutGstin] =
      await Promise.all([
        Company.countDocuments({}),
        Client.countDocuments({}),
        Service.countDocuments({}),
        User.countDocuments({}),
        Client.countDocuments({
          $or: [{ gstin: { $exists: false } }, { gstin: "" }, { gstin: null }],
        }),
      ]);

    const [activeCompanies, activeClients, activeServices, activeUsers] =
      await Promise.all([
        Company.countDocuments({ isActive: { $ne: false } }),
        Client.countDocuments({ isActive: { $ne: false } }),
        Service.countDocuments({ isActive: { $ne: false } }),
        User.countDocuments({ isActive: true }),
      ]);

    return res.status(200).json({
      success: true,
      message: "Workspace overview generated",
      data: {
        companies: { total: companies, active: activeCompanies },
        clients: {
          total: clients,
          active: activeClients,
          // These clients can only ever receive quotations.
          missingGstin: clientsWithoutGstin,
        },
        services: { total: services, active: activeServices },
        users: { total: users, active: activeUsers },
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Workspace Overview:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/* ------------------------------ 10. Audit trail ------------------------------ */

const fetchAuditTrail = async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;

    const query = {};
    if (req.query.action) query.action = req.query.action;
    if (req.query.entityType) query.entityType = req.query.entityType;
    if (req.query.performedBy) query.performedBy = toObjectId(req.query.performedBy);
    if (req.query.fromDate || req.query.toDate) {
      query.createdAt = {};
      if (req.query.fromDate) {
        query.createdAt.$gte = dayjs(req.query.fromDate).startOf("day").toDate();
      }
      if (req.query.toDate) {
        query.createdAt.$lte = dayjs(req.query.toDate).endOf("day").toDate();
      }
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("performedBy", "name email role")
      .populate("document", "docNumber docType")
      .lean();

    const total = await AuditLog.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: "Audit trail fetched",
      total,
      page,
      limit,
      data: logs.map((log) => ({
        _id: log._id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        documentId: log.document?._id || null,
        docNumber: log.document?.docNumber || "",
        docType: log.document?.docType || "",
        performedBy: log.performedBy
          ? {
              _id: log.performedBy._id,
              name: log.performedBy.name,
              email: log.performedBy.email,
              role: log.performedBy.role,
            }
          : null,
        meta: log.meta || {},
        createdAt: log.createdAt,
      })),
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Audit Trail:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/* --------------------------- 11. Document ledger ----------------------------- */

const fetchDocumentLedger = async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 50;

    const query = buildScopeMatch(req.query);
    if (req.query.docType) query.docType = req.query.docType;
    if (req.query.status) query.status = req.query.status;
    if (req.query.search) {
      query.docNumber = { $regex: String(req.query.search).trim(), $options: "i" };
    }

    const documents = await Document.find(query)
      .select(
        "docType docLabel docNumber financialYearOrYear serialNumber company client issueDate dueDate subTotal gstApplicable gstAmount totalAmount status version convertedFrom convertedTo createdAt"
      )
      .populate("company", "name gstin")
      .populate("client", "name gstin")
      .sort({ issueDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Document.countDocuments(query);

    // Running totals for the ledger footer, computed over the whole filtered set
    // rather than just the current page.
    const [totals] = await Document.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          subTotal: { $sum: "$subTotal" },
          gstAmount: { $sum: "$gstAmount" },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Document ledger fetched",
      total,
      page,
      limit,
      totals: {
        subTotal: round2(totals?.subTotal || 0),
        gstAmount: round2(totals?.gstAmount || 0),
        totalAmount: round2(totals?.totalAmount || 0),
      },
      data: documents.map((doc) => ({
        _id: doc._id,
        docType: doc.docType,
        docLabel: doc.docLabel,
        docNumber: doc.docNumber,
        financialYearOrYear: doc.financialYearOrYear,
        serialNumber: doc.serialNumber,
        company: doc.company || null,
        client: doc.client || null,
        issueDate: doc.issueDate,
        dueDate: doc.dueDate,
        subTotal: round2(doc.subTotal),
        gstApplicable: doc.gstApplicable,
        gstPercent: doc.gstApplicable ? GST_PERCENT : 0,
        gstAmount: round2(doc.gstAmount),
        totalAmount: round2(doc.totalAmount),
        status: doc.status,
        version: doc.version,
        convertedFrom: doc.convertedFrom || null,
        convertedToCount: Array.isArray(doc.convertedTo) ? doc.convertedTo.length : 0,
        createdAt: doc.createdAt,
      })),
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Document Ledger:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

module.exports = {
  fetchFinancialSummary,
  fetchRevenueTrend,
  fetchDocumentBreakdown,
  fetchTopClients,
  fetchGstSummary,
  fetchReceivablesAgeing,
  fetchConversionFunnel,
  fetchCompanyPerformance,
  fetchWorkspaceOverview,
  fetchAuditTrail,
  fetchDocumentLedger,
};
