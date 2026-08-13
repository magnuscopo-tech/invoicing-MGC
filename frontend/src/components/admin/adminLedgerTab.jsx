import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReportCard from "./reportCard";
import DataTable from "./dataTable";
import SearchInput from "../custom/searchInput";
import SelectField from "../custom/selectField";
import Pagination from "../custom/pagination";
import TableLoader from "../loader/tableLoader";
import StatusBadge from "../custom/statusBadge";
import useDebounce from "../../hooks/useDebounce";
import { handleGetDocumentLedger } from "../../Services/apiCalling/reportApis";
import { itemsOf } from "../../Utlis/Common/commonMethod";
import { formatCurrency } from "../../Utlis/currencyFormat";
import { formatDisplayDate } from "../../Utlis/dateFormat";
import {
  DOC_LABELS,
  DOC_STATUS_OPTIONS,
  DOC_STATUS_TONE,
  DOC_TYPE_OPTIONS,
  DOC_TYPE_TONE,
} from "../../constants/document.constants";
import { ROUTES } from "../../constants/route.constants";

const LIMIT = 25;

// Document-wise financial record: every line carries its own taxable value, GST
// and total, and the footer totals cover the whole filtered set, not just the page.
export default function AdminLedgerTab({ scope }) {
  const navigate = useNavigate();
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [docType, setDocType] = useState("");
  const [status, setStatus] = useState("");

  const debouncedSearch = useDebounce(search, 400);

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...scope, page, limit: LIMIT };
      if (debouncedSearch) params.search = debouncedSearch;
      if (docType) params.docType = docType;
      if (status) params.status = status;

      const result = await handleGetDocumentLedger(params);
      setLedger(result);
    } finally {
      setLoading(false);
    }
  }, [scope, page, debouncedSearch, docType, status]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, docType, status, scope]);

  const totals = ledger?.totals || { subTotal: 0, gstAmount: 0, totalAmount: 0 };
  const rows = itemsOf(ledger?.items);

  return (
    <ReportCard
      title="Document ledger"
      description="Every document with its taxable value, GST and total. Click a row to open it."
    >
      <div className="mb-4 grid gap-3 lg:grid-cols-12">
        <SearchInput
          className="lg:col-span-6"
          value={search}
          placeholder="Search document number…"
          onChange={setSearch}
        />
        <SelectField
          className="lg:col-span-3"
          name="docType"
          placeholder="All types"
          value={docType}
          options={DOC_TYPE_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          onChange={(value) => setDocType(value)}
        />
        <SelectField
          className="lg:col-span-3"
          name="status"
          placeholder="All statuses"
          value={status}
          options={DOC_STATUS_OPTIONS}
          onChange={(value) => setStatus(value)}
        />
      </div>

      {loading ? (
        <TableLoader rows={8} columns={7} />
      ) : (
        <>
          <DataTable
            onRowClick={(row) => navigate(ROUTES.documentDetailPath(row.id))}
            emptyLabel="No documents match these filters."
            columns={[
              {
                key: "docNumber",
                label: "Document",
                render: (row) => (
                  <div>
                    <p className="font-mono text-[13px] font-bold text-ink-950">
                      {row.docNumber}
                    </p>
                    <StatusBadge
                      className="mt-1"
                      dot={false}
                      label={DOC_LABELS[row.docType]}
                      tone={DOC_TYPE_TONE[row.docType]}
                    />
                  </div>
                ),
              },
              {
                key: "client",
                label: "Client",
                render: (row) => (
                  <span className="block max-w-[12rem] truncate">
                    {row.client?.name || "—"}
                  </span>
                ),
              },
              {
                key: "issueDate",
                label: "Issued",
                render: (row) => formatDisplayDate(row.issueDate),
              },
              {
                key: "subTotal",
                label: "Taxable",
                align: "right",
                render: (row) => formatCurrency(row.subTotal),
              },
              {
                key: "gstAmount",
                label: "GST",
                align: "right",
                render: (row) =>
                  row.gstApplicable ? (
                    formatCurrency(row.gstAmount)
                  ) : (
                    <span className="text-ink-300">n/a</span>
                  ),
              },
              {
                key: "totalAmount",
                label: "Total",
                align: "right",
                strong: true,
                render: (row) => formatCurrency(row.totalAmount),
              },
              {
                key: "status",
                label: "Status",
                render: (row) => (
                  <StatusBadge
                    label={row.status}
                    tone={DOC_STATUS_TONE[row.status]}
                  />
                ),
              },
            ]}
            rows={rows.map((row) => ({ ...row, id: row._id }))}
            footer={
              <tr>
                <td className="table-cell font-semibold text-ink-700" colSpan={3}>
                  Totals across all {ledger?.total || 0} filtered documents
                </td>
                <td className="table-cell text-right font-bold text-ink-950 tabular-nums">
                  {formatCurrency(totals.subTotal)}
                </td>
                <td className="table-cell text-right font-bold text-ink-950 tabular-nums">
                  {formatCurrency(totals.gstAmount)}
                </td>
                <td className="table-cell text-right font-bold text-ink-950 tabular-nums">
                  {formatCurrency(totals.totalAmount)}
                </td>
                <td className="table-cell" />
              </tr>
            }
          />

          <Pagination
            page={page}
            limit={LIMIT}
            total={ledger?.total || 0}
            onPageChange={setPage}
          />
        </>
      )}
    </ReportCard>
  );
}
