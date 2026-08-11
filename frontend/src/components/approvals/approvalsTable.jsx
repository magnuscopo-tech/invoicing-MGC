import { CheckCircle2, Download, Eye, XCircle } from "lucide-react";
import StatusBadge from "../custom/statusBadge";
import EmptyState from "../custom/emptyState";
import {
  APPROVAL_STATUS,
  DOC_LABELS,
  DOC_TYPE_TONE,
} from "../../constants/document.constants";
import { formatCurrency } from "../../Utlis/currencyFormat";
import { formatDisplayDate, relativeFromNow } from "../../Utlis/dateFormat";

export default function ApprovalsTable({
  documents = [],
  tab,
  isAdmin = false,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  onOpen = () => {},
  onPreview = () => {},
  onDownload = () => {},
  onApprove = () => {},
  onReject = () => {},
}) {
  if (documents.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  const isPending = tab === APPROVAL_STATUS.pending;
  const isApproved = tab === APPROVAL_STATUS.approved;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px]">
        <thead className="bg-ink-50">
          <tr>
            <th className="table-head">Document</th>
            <th className="table-head">Client</th>
            <th className="table-head">
              {isPending ? "Submitted" : isApproved ? "Approved" : "Rejected"}
            </th>
            <th className="table-head text-right">Total</th>
            {isApproved && <th className="table-head">Signature</th>}
            {tab === APPROVAL_STATUS.rejected && (
              <th className="table-head">Reason</th>
            )}
            <th className="table-head text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-ink-100">
          {documents.map((document, index) => (
            <tr
              key={document._id}
              onClick={() => onOpen(document)}
              style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
              className="animate-fade-in cursor-pointer transition-colors hover:bg-primary-50/40"
            >
              <td className="px-4 py-3.5">
                <p className="font-mono text-[13px] font-bold text-ink-950">
                  {document.docNumber}
                </p>
                <StatusBadge
                  className="mt-1"
                  dot={false}
                  label={DOC_LABELS[document.docType]}
                  tone={DOC_TYPE_TONE[document.docType]}
                />
              </td>

              <td className="table-cell">
                <p className="max-w-[14rem] truncate font-medium text-ink-900">
                  {document.client?.name || "—"}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-400">
                  {document.company?.name}
                </p>
              </td>

              <td className="table-cell">
                {relativeFromNow(
                  isPending
                    ? document.submittedForApprovalAt
                    : isApproved
                      ? document.approvedAt
                      : document.rejectedAt
                )}
                <p className="mt-0.5 text-[11px] text-ink-400">
                  issued {formatDisplayDate(document.issueDate)}
                </p>
              </td>

              <td className="table-cell text-right font-semibold text-ink-950 tabular-nums">
                {formatCurrency(document.totalAmount)}
              </td>

              {isApproved && (
                <td className="table-cell">
                  <StatusBadge
                    label={document.isSigned ? "Signed" : "Unsigned"}
                    tone={document.isSigned ? "success" : "neutral"}
                  />
                </td>
              )}

              {tab === APPROVAL_STATUS.rejected && (
                <td className="px-4 py-3.5">
                  <p className="max-w-[16rem] truncate text-[13px] text-ink-600">
                    {document.rejectionReason || "—"}
                  </p>
                </td>
              )}

              <td className="px-4 py-3.5">
                <div
                  className="flex items-center justify-end gap-1"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onPreview(document)}
                    title="Preview"
                    className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-primary-50 hover:text-primary-700"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownload(document)}
                    title={
                      isApproved ? "Download signed PDF" : "Download PDF"
                    }
                    className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-primary-50 hover:text-primary-700"
                  >
                    <Download size={15} />
                  </button>

                  {isPending && isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => onApprove(document)}
                        title="Approve & sign"
                        className="rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onReject(document)}
                        title="Reject"
                        className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50"
                      >
                        <XCircle size={16} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
