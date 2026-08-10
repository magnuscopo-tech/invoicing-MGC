import { useNavigate } from "react-router-dom";
import ReportCard from "./reportCard";
import DataTable from "./dataTable";
import HorizontalBars from "../charts/horizontalBars";
import StatusBadge from "../custom/statusBadge";
import { AGEING_COLORS } from "../../constants/chart.constants";
import { formatCurrency } from "../../Utlis/currencyFormat";
import { formatDisplayDate } from "../../Utlis/dateFormat";
import { ROUTES } from "../../constants/route.constants";

export default function AdminReceivablesTab({ ageing }) {
  const navigate = useNavigate();

  const bars = (ageing?.buckets || []).map((bucket) => ({
    key: bucket.bucket,
    label: bucket.label,
    value: bucket.totalAmount,
    caption: `${bucket.count} pro`,
    color: AGEING_COLORS[bucket.bucket],
  }));

  return (
    <div className="space-y-5">
      <ReportCard
        title="Receivables ageing"
        description={`Issued proformas the client has not paid yet, bucketed by days past their due date. The client pays against the proforma — the tax invoice follows the payment — so this is where money owed sits. Total outstanding ${formatCurrency(
          ageing?.totalOutstanding || 0
        )}.`}
        tableView={
          <DataTable
            columns={[
              { key: "label", label: "Bucket" },
              { key: "count", label: "Proformas", align: "right" },
              {
                key: "totalAmount",
                label: "Amount",
                align: "right",
                strong: true,
                render: (row) => formatCurrency(row.totalAmount),
              },
            ]}
            rows={(ageing?.buckets || []).map((row) => ({
              ...row,
              id: row.bucket,
            }))}
          />
        }
      >
        <HorizontalBars
          rows={bars}
          emptyLabel="No unpaid proformas — everything issued has been settled."
        />
      </ReportCard>

      <ReportCard
        title="Collections worklist"
        description="The 50 most overdue unpaid proformas, worst first. Click a row to open the document — once the payment lands, convert it to a tax invoice and approve that to record it."
      >
        <DataTable
          onRowClick={(row) => navigate(ROUTES.documentDetailPath(row.id))}
          emptyLabel="Nothing outstanding."
          columns={[
            {
              key: "docNumber",
              label: "Proforma",
              strong: true,
              render: (row) => (
                <span className="font-mono text-[13px]">{row.docNumber}</span>
              ),
            },
            { key: "clientName", label: "Client" },
            {
              key: "issueDate",
              label: "Issued",
              render: (row) => formatDisplayDate(row.issueDate),
            },
            {
              key: "dueDate",
              label: "Due",
              render: (row) => formatDisplayDate(row.dueDate),
            },
            {
              key: "daysOverdue",
              label: "Overdue",
              align: "right",
              render: (row) =>
                row.daysOverdue > 0 ? (
                  <span className="font-semibold text-red-600">
                    {row.daysOverdue}d
                  </span>
                ) : (
                  <span className="text-ink-400">—</span>
                ),
            },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <StatusBadge
                  label={row.status}
                  tone={row.status === "sent" ? "warning" : "neutral"}
                />
              ),
            },
            {
              key: "totalAmount",
              label: "Amount",
              align: "right",
              strong: true,
              render: (row) => formatCurrency(row.totalAmount),
            },
          ]}
          rows={(ageing?.documents || []).map((row) => ({
            ...row,
            id: row._id,
          }))}
        />
      </ReportCard>
    </div>
  );
}
