import ReportCard from "./reportCard";
import DataTable from "./dataTable";
import HorizontalBars from "../charts/horizontalBars";
import { ORDINAL_5 } from "../../constants/chart.constants";
import { formatCurrency } from "../../Utlis/currencyFormat";
import { formatDisplayDate } from "../../Utlis/dateFormat";
import { truncate } from "../../Utlis/Common/commonMethod";

// Magnitude ranking, so the fill is a single-hue ramp - darker means more, and
// the colour never claims the rows are different kinds of thing.
const rampFor = (index, count) =>
  ORDINAL_5[
    Math.min(
      ORDINAL_5.length - 1,
      Math.floor(((count - index - 1) / Math.max(1, count - 1)) * (ORDINAL_5.length - 1))
    )
  ];

export default function AdminPartiesTab({ topClients = [], companyPerformance = [] }) {
  const clientBars = topClients.map((client, index) => ({
    key: client.clientId,
    label: truncate(client.name, 34),
    value: client.invoiced,
    caption: `${client.invoiceCount} inv`,
    color: rampFor(index, topClients.length),
  }));

  return (
    <div className="space-y-5">
      <ReportCard
        title="Top clients by invoiced value"
        description="Non-cancelled tax invoices only, highest first."
        tableView={
          <DataTable
            columns={[
              { key: "name", label: "Client", strong: true },
              { key: "invoiceCount", label: "Invoices", align: "right" },
              {
                key: "invoiced",
                label: "Invoiced",
                align: "right",
                render: (row) => formatCurrency(row.invoiced),
              },
              {
                key: "collected",
                label: "Collected",
                align: "right",
                render: (row) => formatCurrency(row.collected),
              },
              {
                key: "outstanding",
                label: "Outstanding",
                align: "right",
                render: (row) => formatCurrency(row.outstanding),
              },
              {
                key: "lastIssueDate",
                label: "Last invoice",
                render: (row) => formatDisplayDate(row.lastIssueDate),
              },
            ]}
            rows={topClients.map((row) => ({ ...row, id: row.clientId }))}
          />
        }
      >
        <HorizontalBars
          rows={clientBars}
          emptyLabel="No invoices raised in this period."
        />
      </ReportCard>

      <ReportCard
        title="Performance by company"
        description="Your own seller entities, so multi-entity totals never get mixed up."
      >
        <DataTable
          emptyLabel="No invoices raised in this period."
          columns={[
            { key: "name", label: "Company", strong: true },
            {
              key: "gstin",
              label: "GSTIN",
              render: (row) => (
                <span className="font-mono text-[12px] text-ink-500">
                  {row.gstin || "—"}
                </span>
              ),
            },
            { key: "invoiceCount", label: "Invoices", align: "right" },
            {
              key: "taxableValue",
              label: "Taxable value",
              align: "right",
              render: (row) => formatCurrency(row.taxableValue),
            },
            {
              key: "gstAmount",
              label: "GST",
              align: "right",
              render: (row) => formatCurrency(row.gstAmount),
            },
            {
              key: "invoiced",
              label: "Invoiced",
              align: "right",
              strong: true,
              render: (row) => formatCurrency(row.invoiced),
            },
            {
              key: "outstanding",
              label: "Outstanding",
              align: "right",
              render: (row) => formatCurrency(row.outstanding),
            },
          ]}
          rows={companyPerformance.map((row) => ({ ...row, id: row.companyId }))}
        />
      </ReportCard>
    </div>
  );
}
