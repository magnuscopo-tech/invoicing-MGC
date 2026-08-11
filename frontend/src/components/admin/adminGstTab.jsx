import ReportCard from "./reportCard";
import DataTable from "./dataTable";
import LineChart from "../charts/lineChart";
import { CATEGORICAL } from "../../constants/chart.constants";
import { GST_PERCENT } from "../../constants/document.constants";
import { formatCurrency } from "../../Utlis/currencyFormat";

export default function AdminGstTab({ gst }) {
  const series = gst?.series || [];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Taxable value",
            value: gst?.totals?.taxableValue,
            caption: "Sum of invoice subtotals",
          },
          {
            label: `GST collected @ ${GST_PERCENT}%`,
            value: gst?.totals?.gstAmount,
            caption: "Output tax liability",
          },
          {
            label: "Invoice value",
            value: gst?.totals?.totalAmount,
            caption: `${gst?.totals?.invoiceCount || 0} taxable invoices`,
          },
        ].map((tile, index) => (
          <article
            key={tile.label}
            style={{ animationDelay: `${index * 70}ms` }}
            className="card animate-fade-up p-5"
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
              {tile.label}
            </p>
            <p className="mt-2 text-xl font-bold tracking-tight text-ink-950">
              {formatCurrency(tile.value || 0)}
            </p>
            <p className="mt-1 text-[12px] text-ink-400">{tile.caption}</p>
          </article>
        ))}
      </div>

      <ReportCard
        title="GST liability by month"
        description="Taxable value and output GST from non-cancelled tax invoices, by issue month."
        tableView={
          <DataTable
            columns={[
              { key: "label", label: "Month" },
              { key: "financialYear", label: "FY" },
              { key: "invoiceCount", label: "Invoices", align: "right" },
              {
                key: "taxableValue",
                label: "Taxable value",
                align: "right",
                render: (row) => formatCurrency(row.taxableValue),
              },
              {
                key: "gstAmount",
                label: `GST @ ${GST_PERCENT}%`,
                align: "right",
                strong: true,
                render: (row) => formatCurrency(row.gstAmount),
              },
              {
                key: "totalAmount",
                label: "Total",
                align: "right",
                render: (row) => formatCurrency(row.totalAmount),
              },
            ]}
            rows={series.map((row) => ({ ...row, id: row.month }))}
          />
        }
      >
        <LineChart
          series={[
            {
              key: "taxableValue",
              label: "Taxable value",
              color: CATEGORICAL[0],
              values: series.map((row) => row.taxableValue),
            },
            {
              key: "gstAmount",
              label: `GST @ ${GST_PERCENT}%`,
              color: CATEGORICAL[1],
              values: series.map((row) => row.gstAmount),
            },
          ]}
          categories={series.map((row) => row.label)}
        />
      </ReportCard>

      <ReportCard
        title="By financial year"
        description="Grouped the way GST is actually filed — 1 April to 31 March."
      >
        <DataTable
          columns={[
            { key: "financialYear", label: "Financial year", strong: true },
            { key: "invoiceCount", label: "Invoices", align: "right" },
            {
              key: "taxableValue",
              label: "Taxable value",
              align: "right",
              render: (row) => formatCurrency(row.taxableValue),
            },
            {
              key: "gstAmount",
              label: "GST payable",
              align: "right",
              strong: true,
              render: (row) => formatCurrency(row.gstAmount),
            },
            {
              key: "totalAmount",
              label: "Invoice value",
              align: "right",
              render: (row) => formatCurrency(row.totalAmount),
            },
          ]}
          rows={(gst?.byFinancialYear || []).map((row) => ({
            ...row,
            id: row.financialYear,
          }))}
        />
      </ReportCard>
    </div>
  );
}
