import ReportCard from "./reportCard";
import DataTable from "./dataTable";
import LineChart from "../charts/lineChart";
import FunnelChart from "../charts/funnelChart";
import StackedShareBar from "../charts/stackedShareBar";
import MeterBar from "../charts/meterBar";
import {
  SERIES_COLORS,
  STATUS_COLORS,
  CATEGORICAL,
} from "../../constants/chart.constants";
import { DOC_LABELS } from "../../constants/document.constants";
import { itemsOf } from "../../Utlis/Common/commonMethod";
import { formatCurrency } from "../../Utlis/currencyFormat";

export default function AdminOverviewTab({
  summary,
  trend,
  funnel,
  breakdown,
}) {
  const ratios = summary?.ratios || {};
  const counts = summary?.counts || {};
  const trendRows = itemsOf(trend?.series);
  const typeRows = itemsOf(breakdown?.byType);
  const statusRows = itemsOf(breakdown?.byStatus);

  /*
   * Invoiced and collected now move together — a tax invoice is raised against a
   * paid proforma and approving it marks it paid — so plotting only those two
   * draws one line twice. Proforma value is what was billed, so the gap between
   * it and collected is the money still in flight.
   */
  const trendSeries = [
    {
      key: "proformaValue",
      label: "Billed (proforma)",
      color: CATEGORICAL[0],
      values: trendRows.map((row) => row.proformaValue),
    },
    {
      key: "invoiced",
      label: "Invoiced",
      color: CATEGORICAL[1],
      values: trendRows.map((row) => row.invoiced),
    },
    {
      key: "collected",
      label: "Collected",
      color: CATEGORICAL[2],
      values: trendRows.map((row) => row.collected),
    },
  ];

  const typeSegments = typeRows.map((row) => ({
    key: row.docType,
    label: DOC_LABELS[row.docType],
    value: row.totalAmount,
    color: SERIES_COLORS[row.docType],
  }));

  const statusSegments = statusRows
    .filter((row) => row.count > 0)
    .map((row) => ({
      key: row.status,
      label: `${row.status} (${row.count})`,
      value: row.totalAmount,
      color: STATUS_COLORS[row.status],
    }));

  return (
    <div className="space-y-5">
      <ReportCard
        title="Billed vs collected"
        description="By issue month. Proforma value is what was billed to clients; invoiced and collected are tax invoices, which are raised and settled together once payment lands."
        tableView={
          <DataTable
            columns={[
              { key: "label", label: "Month" },
              {
                key: "proformaValue",
                label: "Billed",
                align: "right",
                render: (row) => formatCurrency(row.proformaValue),
              },
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
                key: "gstAmount",
                label: "GST",
                align: "right",
                render: (row) => formatCurrency(row.gstAmount),
              },
              { key: "invoiceCount", label: "Count", align: "right" },
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
          title="Quotation to cash funnel"
          description="Counts at each stage, with each stage measured against the quotation count."
        >
          <FunnelChart stages={itemsOf(funnel?.stages)} />

          {summary && (
            <div className="mt-5 space-y-4 border-t border-ink-100 pt-4">
              <MeterBar
                label="Collection rate"
                percent={ratios.collectionRate || 0}
                caption="Settled value as a share of settled plus still-owed proformas."
              />
              <MeterBar
                label="Quotation conversion"
                percent={ratios.quotationConversionRate || 0}
                caption={`${counts.quotationsConverted || 0} of ${
                  counts.quotationsTotal || 0
                } quotations became a proforma.`}
              />
            </div>
          )}
        </ReportCard>

        <div className="space-y-5">
          <ReportCard
            title="Value by document type"
            description="Excludes cancelled documents."
          >
            <StackedShareBar segments={typeSegments} />
          </ReportCard>

          <ReportCard
            title="Value by status"
            description="Status colours are reserved and always carry a label."
          >
            <StackedShareBar segments={statusSegments} />
          </ReportCard>
        </div>
      </div>
    </div>
  );
}
