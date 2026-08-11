import { useState } from "react";
import { useSelector } from "react-redux";
import { Pencil, Trash2 } from "lucide-react";
import ReportCard from "../admin/reportCard";
import DataTable from "../admin/dataTable";
import Pagination from "../custom/pagination";
import StatusBadge from "../custom/statusBadge";
import TableLoader from "../loader/tableLoader";
import ConfirmDialog from "../modal/confirmDialog";
import TransactionModal from "../modal/expense/transactionModal";
import { selectIsAdmin } from "../../ReduxFeature/Authenthicate/LoginSlice";
import { handleDeleteTransaction } from "../../Services/apiCalling/expenseApis";
import { formatCurrency } from "../../Utlis/currencyFormat";
import { formatDisplayDate } from "../../Utlis/dateFormat";
import { SuccessMessage } from "../../Utlis/Toastify/ToastMessage";
import {
  DIRECTION_TONE,
  EXPENSE_MESSAGES,
  REVIEW_CATEGORY,
  SOURCE_LABELS,
  TXN_DIRECTION,
} from "../../constants/expense.constants";

const LIMIT = 25;

/*
 * The cash book itself. This is the one surface a finance user works in, so it
 * carries the running totals and the edit affordances rather than being a
 * read-only report.
 */
export default function ExpenseLedgerTab({
  ledger,
  loading,
  page,
  categories,
  onPageChange = () => {},
  onChanged = () => {},
}) {
  const isAdmin = useSelector(selectIsAdmin);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const totals = ledger?.totals || {
    totalCredit: 0,
    totalDebit: 0,
    netFlow: 0,
  };

  const onDeleteConfirm = async () => {
    setDeleting(true);
    try {
      const result = await handleDeleteTransaction(deleteTarget._id);
      if (result) {
        SuccessMessage(EXPENSE_MESSAGES.deleted);
        setDeleteTarget(null);
        onChanged();
      }
    } finally {
      setDeleting(false);
    }
  };

  // An imported row is the bank's record, so only an admin may rewrite it. The
  // API enforces this independently; hiding the button just avoids offering an
  // action that would be refused.
  const canEdit = (row) => isAdmin || row.source !== "bulk_upload";

  return (
    <>
      <ReportCard
        title="Transactions"
        description="Every rupee in and out, newest first. Totals below cover everything matching the filters, not just this page."
      >
        {loading ? (
          <TableLoader rows={8} columns={7} />
        ) : (
          <>
            <DataTable
              emptyLabel="No transactions match these filters."
              columns={[
                {
                  key: "date",
                  label: "Date",
                  render: (row) => (
                    <div>
                      <p className="whitespace-nowrap font-medium text-ink-900">
                        {formatDisplayDate(row.date)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-400">
                        {SOURCE_LABELS[row.source]}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "particulars",
                  label: "Description",
                  render: (row) => (
                    <div className="max-w-[22rem]">
                      <p className="truncate text-[13px] text-ink-800">
                        {row.particulars}
                      </p>
                      {row.partyName && (
                        <p className="mt-0.5 truncate text-[11px] font-medium text-ink-500">
                          {row.partyName}
                        </p>
                      )}
                      {row.remarks && (
                        <p className="mt-0.5 truncate text-[11px] text-ink-400">
                          {row.remarks}
                        </p>
                      )}
                    </div>
                  ),
                },
                {
                  key: "category",
                  label: "Category",
                  render: (row) => (
                    <StatusBadge
                      dot={false}
                      label={row.category}
                      // Uncategorized is the queue to clear after an import, so
                      // it is styled as something to act on, not as a category.
                      tone={
                        row.category === REVIEW_CATEGORY ? "warning" : "neutral"
                      }
                    />
                  ),
                },
                {
                  key: "paymentMode",
                  label: "Mode",
                  render: (row) => (
                    <span className="whitespace-nowrap text-[12px] text-ink-500">
                      {row.paymentMode}
                    </span>
                  ),
                },
                {
                  key: "amount",
                  label: "Amount",
                  align: "right",
                  render: (row) => (
                    <div>
                      <p
                        className={`whitespace-nowrap font-semibold tabular-nums ${
                          row.direction === TXN_DIRECTION.credit
                            ? "text-emerald-700"
                            : "text-ink-950"
                        }`}
                      >
                        {row.direction === TXN_DIRECTION.credit ? "+" : "−"}
                        {formatCurrency(row.amount)}
                      </p>
                      <StatusBadge
                        className="mt-1"
                        dot={false}
                        label={
                          row.direction === TXN_DIRECTION.credit ? "In" : "Out"
                        }
                        tone={DIRECTION_TONE[row.direction]}
                      />
                    </div>
                  ),
                },
                {
                  key: "balance",
                  label: "Balance",
                  align: "right",
                  render: (row) =>
                    row.balance === null || row.balance === undefined ? (
                      <span className="text-ink-300">—</span>
                    ) : (
                      formatCurrency(row.balance)
                    ),
                },
                {
                  key: "actions",
                  label: "",
                  align: "right",
                  render: (row) => (
                    <div className="flex items-center justify-end gap-1">
                      {canEdit(row) && (
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => setEditing(row)}
                          className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-primary-700"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => setDeleteTarget(row)}
                          className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ),
                },
              ]}
              rows={(ledger?.items || []).map((row) => ({ ...row, id: row._id }))}
              footer={
                <tr>
                  <td
                    className="table-cell font-semibold text-ink-700"
                    colSpan={4}
                  >
                    Across all {ledger?.total || 0} matching transactions
                  </td>
                  <td className="table-cell text-right tabular-nums">
                    <p className="font-bold text-emerald-700">
                      +{formatCurrency(totals.totalCredit)}
                    </p>
                    <p className="font-bold text-ink-950">
                      −{formatCurrency(totals.totalDebit)}
                    </p>
                  </td>
                  <td className="table-cell text-right tabular-nums">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
                      Net
                    </p>
                    <p className="font-bold text-ink-950">
                      {formatCurrency(totals.netFlow)}
                    </p>
                  </td>
                  <td className="table-cell" />
                </tr>
              }
            />

            <Pagination
              page={page}
              limit={LIMIT}
              total={ledger?.total || 0}
              onPageChange={onPageChange}
            />
          </>
        )}
      </ReportCard>

      <TransactionModal
        open={Boolean(editing)}
        transaction={editing}
        categories={categories}
        onClose={() => setEditing(null)}
        onSuccess={() => {
          setEditing(null);
          onChanged();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this transaction?"
        message={`${
          deleteTarget?.direction === TXN_DIRECTION.credit ? "Receipt" : "Payment"
        } of ${formatCurrency(deleteTarget?.amount || 0)} — "${
          deleteTarget?.particulars || ""
        }". It is removed outright and every total on the dashboard will change to match.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={onDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}

export { LIMIT as LEDGER_LIMIT };
