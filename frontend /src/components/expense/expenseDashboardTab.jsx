import { AlertTriangle } from "lucide-react";
import ReportCard from "../admin/reportCard";
import DataTable from "../admin/dataTable";
import LineChart from "../charts/lineChart";
import HorizontalBars from "../charts/horizontalBars";
import StackedShareBar from "../charts/stackedShareBar";
import MeterBar from "../charts/meterBar";
import {
  CASHFLOW_COLORS,
  ORDINAL_5,
} from "../../constants/chart.constants";
import { formatCurrency, formatCompactCurrency } from "../../Utlis/currencyFormat";
import { formatDisplayDate } from "../../Utlis/dateFormat";
import { truncate } from "../../Utlis/Common/commonMethod";

/*
 * Ranked magnitude, so the fill is a single-hue ramp - darker means more. The
 * colour deliberately says nothing about what kind of thing each row is; the
 * label does that, and every bar is direct-labelled with its value.
 */
const rampFor = (index, count) =>
  ORDINAL_5[
    Math.min(
      ORDINAL_5.length - 1,
      Math.floor(
        ((count - index - 1) / Math.max(1, count - 1)) * (ORDINAL_5.length - 1)
      )
    )
  ];

const EmptyNote = ({ children }) => (
  <p className="py-10 text-center text-sm text-ink-400">{children}</p>
);

export default function ExpenseDashboardTab({
  summary,
  trend,
  daily,
  categories,
  parties,
  paymentModes = [],
}) {
  const trendRows = trend?.series || [];
  const dailyRows = daily?.series || [];

  // Three series is the cap this palette is validated for, and it is exactly
  // what the question needs: what came in, what went out, and the gap.
  const trendSeries = [
    {
      key: "moneyIn",
      label: "Money in",
      color: CASHFLOW_COLORS.moneyIn,
      values: trendRows.map((row) => row.moneyIn),
    },
    {
      key: "moneyOut",
      label: "Money out",
      color: CASHFLOW_COLORS.moneyOut,
      values: trendRows.map((row) => row.moneyOut),
    },
  ];

  const expenseRows = categories?.expense || [];
  const incomeRows = categories?.income || [];

  const expenseBars = expenseRows.slice(0, 10).map((row, index) => ({
    key: row.category,
    label: row.category,
    value: row.debit,
    caption: `${row.share}% · ${row.count}`,
    color: rampFor(index, Math.min(10, expenseRows.length)),
  }));

  const incomeBars = incomeRows.slice(0, 10).map((row, index) => ({
    key: row.category,
    label: row.category,
    value: row.credit,
    caption: `${row.share}% · ${row.count}`,
    color: rampFor(index, Math.min(10, incomeRows.length)),
  }));

  const vendorBars = (parties?.vendors || []).map((row, index, all) => ({
    key: `vendor-${row.party}`,
    label: truncate(row.party, 34),
    value: row.paid,
    caption: `${row.count} txn`,
    color: rampFor(index, all.length),
  }));

  const payerBars = (parties?.payers || []).map((row, index, all) => ({
    key: `payer-${row.party}`,
    label: truncate(row.party, 34),
    value: row.received,
    caption: `${row.count} txn`,
    color: rampFor(index, all.length),
  }));

  const modeBars = paymentModes.map((row, index, all) => ({
    key: row.mode,
    label: row.mode,
    value: row.total,
    caption: `${row.count} txn`,
    color: rampFor(index, all.length),
  }));

  // Two segments, one bar - the honest form for "how did the period split".
  const flowSegments = [
    {
      key: "moneyIn",
      label: "Money in",
      value: summary?.moneyIn || 0,
      color: CASHFLOW_COLORS.moneyIn,
    },
    {
      key: "moneyOut",
      label: "Money out",
      value: summary?.moneyOut || 0,
      color: CASHFLOW_COLORS.moneyOut,
    },
  ];

  const spend = summary?.spend;
  const balance = summary?.balance;

  return (
    <div className="space-y-5">
      {Boolean(summary?.needsReview) && (
        <div className="card flex animate-fade-up items-start gap-3 border-l-4 border-l-amber-400 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="text-[13px] font-semibold text-ink-900">
              {summary.needsReview} payment
              {summary.needsReview === 1 ? "" : "s"} still uncategorised
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink-500">
              The importer could not work out a category for these from the bank
              narration. They are counted in every total on this page — only the
              category mix below is missing them. Filter the Transactions tab by
              the “Uncategorized” category to clear them.
            </p>
          </div>
        </div>
      )}

      <ReportCard
        title="Money in vs money out"
        description="By month, over the selected period. Nothing is netted off before it is plotted, so a refund appears as both the payment and the money coming back."
        tableView={
          <DataTable
            emptyLabel="No transactions in this period."
            columns={[
              { key: "label", label: "Month" },
              {
                key: "moneyIn",
                label: "Money in",
                align: "right",
                render: (row) => formatCurrency(row.moneyIn),
              },
              {
                key: "moneyOut",
                label: "Money out",
                align: "right",
                render: (row) => formatCurrency(row.moneyOut),
              },
              {
                key: "netFlow",
                label: "Net",
                align: "right",
                strong: true,
                render: (row) => formatCurrency(row.netFlow),
              },
              {
                key: "cumulativeNet",
                label: "Cumulative",
                align: "right",
                render: (row) => formatCurrency(row.cumulativeNet),
              },
              {
                key: "count",
                label: "Entries",
                align: "right",
                render: (row) => row.creditCount + row.debitCount,
              },
            ]}
            rows={trendRows.map((row) => ({ ...row, id: row.month }))}
          />
        }
      >
        <LineChart
          series={trendSeries}
          categories={trendRows.map((row) => row.label)}
        />
      </ReportCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <ReportCard
          title="Where the money went"
          description="Debits by category, largest first. Transfers between your own accounts are excluded — moving money is not spending it."
          tableView={
            <DataTable
              emptyLabel="No spending in this period."
              columns={[
                { key: "category", label: "Category", strong: true },
                { key: "count", label: "Entries", align: "right" },
                {
                  key: "debit",
                  label: "Spent",
                  align: "right",
                  render: (row) => formatCurrency(row.debit),
                },
                {
                  key: "share",
                  label: "Share",
                  align: "right",
                  render: (row) => `${row.share}%`,
                },
              ]}
              rows={expenseRows.map((row) => ({ ...row, id: row.category }))}
            />
          }
        >
          <HorizontalBars
            rows={expenseBars}
            emptyLabel="No spending in this period."
          />
        </ReportCard>

        <ReportCard
          title="Where the money came from"
          description="Credits by category, largest first."
          tableView={
            <DataTable
              emptyLabel="No receipts in this period."
              columns={[
                { key: "category", label: "Category", strong: true },
                { key: "count", label: "Entries", align: "right" },
                {
                  key: "credit",
                  label: "Received",
                  align: "right",
                  render: (row) => formatCurrency(row.credit),
                },
                {
                  key: "share",
                  label: "Share",
                  align: "right",
                  render: (row) => `${row.share}%`,
                },
              ]}
              rows={incomeRows.map((row) => ({ ...row, id: row.category }))}
            />
          }
        >
          <HorizontalBars
            rows={incomeBars}
            emptyLabel="No receipts in this period."
          />
        </ReportCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ReportCard
          title="Daily movement and bank balance"
          description="The balance line is the figure the bank printed, carried forward on days with no activity. It is flat, not missing, where nothing moved."
          tableView={
            <DataTable
              emptyLabel="No activity in this window."
              columns={[
                { key: "label", label: "Day" },
                {
                  key: "moneyIn",
                  label: "In",
                  align: "right",
                  render: (row) => formatCurrency(row.moneyIn),
                },
                {
                  key: "moneyOut",
                  label: "Out",
                  align: "right",
                  render: (row) => formatCurrency(row.moneyOut),
                },
                {
                  key: "balance",
                  label: "Balance",
                  align: "right",
                  strong: true,
                  render: (row) =>
                    row.balance === null ? "—" : formatCurrency(row.balance),
                },
              ]}
              rows={dailyRows
                .filter((row) => row.moneyIn || row.moneyOut)
                .map((row) => ({ ...row, id: row.day }))}
            />
          }
        >
          {dailyRows.some((row) => row.balance !== null) ? (
            <LineChart
              // One series, so no legend box - the card title names it.
              series={[
                {
                  key: "balance",
                  label: "Balance",
                  color: CASHFLOW_COLORS.netFlow,
                  values: dailyRows.map((row) => row.balance || 0),
                },
              ]}
              categories={dailyRows.map((row) => row.label)}
            />
          ) : (
            <EmptyNote>
              No bank balances in this window. Import a statement to see the
              running balance.
            </EmptyNote>
          )}

          {daily?.truncated && (
            <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
              Showing the most recent {daily.maxSpanDays} days of the selected
              range — beyond that the daily points stop being readable, and the
              monthly chart above is the better view.
            </p>
          )}
        </ReportCard>

        <div className="space-y-5">
          <ReportCard
            title="Period split"
            description="Total in against total out for the selected period."
          >
            <StackedShareBar segments={flowSegments} />

            {spend && (
              <div className="mt-5 space-y-4 border-t border-ink-100 pt-4">
                <MeterBar
                  label="Share of receipts spent"
                  percent={
                    summary.moneyIn
                      ? Math.min(100, (summary.moneyOut / summary.moneyIn) * 100)
                      : 0
                  }
                  caption={
                    summary.moneyIn
                      ? `${formatCurrency(summary.moneyOut)} paid out against ${formatCurrency(summary.moneyIn)} received.`
                      : "Nothing was received in this period."
                  }
                  color={CASHFLOW_COLORS.moneyOut}
                />
              </div>
            )}
          </ReportCard>

          <ReportCard
            title="Spend profile"
            description="Averages are measured over the days the book actually covers, not the days you asked for."
          >
            {spend ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
                    Total spent
                  </dt>
                  <dd className="mt-1 text-[15px] font-bold text-ink-950 tabular-nums">
                    {formatCurrency(spend.total)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
                    Average payment
                  </dt>
                  <dd className="mt-1 text-[15px] font-bold text-ink-950 tabular-nums">
                    {formatCurrency(spend.average)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
                    Monthly burn
                  </dt>
                  <dd className="mt-1 text-[15px] font-bold text-ink-950 tabular-nums">
                    {formatCurrency(spend.monthlyBurn)}
                  </dd>
                  <p className="mt-0.5 text-[11px] text-ink-400">
                    Spend per 30 days across{" "}
                    {summary?.coverage?.days || 0} day
                    {summary?.coverage?.days === 1 ? "" : "s"} of data
                  </p>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
                    Runway
                  </dt>
                  <dd className="mt-1 text-[15px] font-bold text-ink-950 tabular-nums">
                    {balance?.runwayMonths === null ||
                    balance?.runwayMonths === undefined
                      ? "—"
                      : `${balance.runwayMonths} mo`}
                  </dd>
                  <p className="mt-0.5 text-[11px] text-ink-400">
                    {balance?.runwayMonths === null ||
                    balance?.runwayMonths === undefined
                      ? "Needs a bank balance and some spending"
                      : "Closing balance at the current burn"}
                  </p>
                </div>

                {spend.topCategory && (
                  <div className="col-span-2 border-t border-ink-100 pt-3">
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
                      Largest category
                    </dt>
                    <dd className="mt-1 text-[13px] text-ink-700">
                      <span className="font-semibold text-ink-950">
                        {spend.topCategory.category}
                      </span>{" "}
                      — {formatCurrency(spend.topCategory.amount)} (
                      {spend.topCategory.share}% of spend)
                    </dd>
                  </div>
                )}

                {spend.largest && (
                  <div className="col-span-2 border-t border-ink-100 pt-3">
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
                      Largest single payment
                    </dt>
                    <dd className="mt-1 text-[13px] text-ink-700">
                      <span className="font-semibold text-ink-950">
                        {formatCurrency(spend.largest.amount)}
                      </span>{" "}
                      to {spend.largest.partyName || "—"} on{" "}
                      {formatDisplayDate(spend.largest.date)}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <EmptyNote>No spending in this period.</EmptyNote>
            )}
          </ReportCard>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ReportCard
          title="Who you paid most"
          description="Vendors and contractors by total paid out."
          tableView={
            <DataTable
              emptyLabel="No payments to a named party in this period."
              columns={[
                { key: "party", label: "Party", strong: true },
                { key: "count", label: "Entries", align: "right" },
                {
                  key: "paid",
                  label: "Paid",
                  align: "right",
                  render: (row) => formatCurrency(row.paid),
                },
                {
                  key: "received",
                  label: "Received back",
                  align: "right",
                  render: (row) => formatCurrency(row.received),
                },
                {
                  key: "lastDate",
                  label: "Last activity",
                  render: (row) => formatDisplayDate(row.lastDate),
                },
              ]}
              rows={(parties?.vendors || []).map((row) => ({
                ...row,
                id: row.party,
              }))}
            />
          }
        >
          <HorizontalBars
            rows={vendorBars}
            emptyLabel="No payments to a named party in this period."
          />
        </ReportCard>

        <ReportCard
          title="Who paid you most"
          description="Clients and other payers by total received."
          tableView={
            <DataTable
              emptyLabel="No receipts from a named party in this period."
              columns={[
                { key: "party", label: "Party", strong: true },
                { key: "count", label: "Entries", align: "right" },
                {
                  key: "received",
                  label: "Received",
                  align: "right",
                  render: (row) => formatCurrency(row.received),
                },
                {
                  key: "paid",
                  label: "Paid to them",
                  align: "right",
                  render: (row) => formatCurrency(row.paid),
                },
                {
                  key: "lastDate",
                  label: "Last activity",
                  render: (row) => formatDisplayDate(row.lastDate),
                },
              ]}
              rows={(parties?.payers || []).map((row) => ({
                ...row,
                id: row.party,
              }))}
            />
          }
        >
          <HorizontalBars
            rows={payerBars}
            emptyLabel="No receipts from a named party in this period."
          />
        </ReportCard>
      </div>

      <ReportCard
        title="How the money moved"
        description="Total value routed through each payment channel, in and out combined."
        tableView={
          <DataTable
            emptyLabel="No transactions in this period."
            columns={[
              { key: "mode", label: "Payment mode", strong: true },
              { key: "count", label: "Entries", align: "right" },
              {
                key: "credit",
                label: "In",
                align: "right",
                render: (row) => formatCurrency(row.credit),
              },
              {
                key: "debit",
                label: "Out",
                align: "right",
                render: (row) => formatCurrency(row.debit),
              },
              {
                key: "total",
                label: "Total",
                align: "right",
                strong: true,
                render: (row) => formatCurrency(row.total),
              },
            ]}
            rows={paymentModes.map((row) => ({ ...row, id: row.mode }))}
          />
        }
      >
        <HorizontalBars
          rows={modeBars}
          formatValue={formatCompactCurrency}
          emptyLabel="No transactions in this period."
        />
      </ReportCard>
    </div>
  );
}
