import { Download, Eye, Link2 } from "lucide-react";
import StatusBadge from "../custom/statusBadge";
import {
  DOC_LABELS,
  DOC_STATUS_TONE,
  DOC_TYPE_TONE,
} from "../../constants/document.constants";
import { itemsOf } from "../../Utlis/Common/commonMethod";
import { formatCurrency } from "../../Utlis/currencyFormat";
import { formatDisplayDate } from "../../Utlis/dateFormat";

export default function DocumentHistoryTable({
  documents = [],
  onOpen = () => {},
  onPreview = () => {},
  onDownload = () => {},
}) {
  const documentList = itemsOf(documents);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px]">
        <thead className="bg-ink-50">
          <tr>
            <th className="table-head">Document</th>
            <th className="table-head">Client</th>
            <th className="table-head">Company</th>
            <th className="table-head">Issued</th>
            <th className="table-head text-right">Total</th>
            <th className="table-head">Status</th>
            <th className="table-head text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-ink-100">
          {documentList.map((document, index) => (
            <tr
              key={document._id}
              onClick={() => onOpen(document)}
              style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
              className="animate-fade-in cursor-pointer transition-colors hover:bg-primary-50/40"
            >
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[13px] font-bold text-ink-950">
                    {document.docNumber}
                  </p>
                  {document.convertedFrom && (
                    <Link2 size={13} className="text-ink-400" />
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <StatusBadge
                    dot={false}
                    label={DOC_LABELS[document.docType]}
                    tone={DOC_TYPE_TONE[document.docType]}
                  />
                  {/* A part-billed proforma looks under-priced next to its
                      siblings until you know it is one slice of a schedule. */}
                  {document.isInstallment && (
                    <StatusBadge
                      dot={false}
                      tone="purple"
                      label={`${document.installmentPercent}% · ${document.installmentIndex} of ${document.installmentCount}`}
                    />
                  )}
                </div>
              </td>

              <td className="table-cell">
                <p className="max-w-[14rem] truncate font-medium text-ink-900">
                  {document.client?.name || "—"}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-ink-400">
                  {document.client?.gstin || "No GSTIN"}
                </p>
              </td>

              <td className="table-cell">
                <p className="max-w-[12rem] truncate">
                  {document.company?.name || "—"}
                </p>
              </td>

              <td className="table-cell">
                {formatDisplayDate(document.issueDate)}
              </td>

              <td className="table-cell text-right font-semibold text-ink-950 tabular-nums">
                {formatCurrency(document.totalAmount)}
              </td>

              <td className="table-cell">
                <StatusBadge
                  label={document.status}
                  tone={DOC_STATUS_TONE[document.status]}
                />
              </td>

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
                    title="Download PDF"
                    className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-primary-50 hover:text-primary-700"
                  >
                    <Download size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
