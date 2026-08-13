import { ArrowUpRight, FileText } from "lucide-react";
import StatusBadge from "../custom/statusBadge";
import EmptyState from "../custom/emptyState";
import {
  DOC_LABELS,
  DOC_STATUS_TONE,
  DOC_TYPE_TONE,
} from "../../constants/document.constants";
import { itemsOf } from "../../Utlis/Common/commonMethod";
import { formatCurrency } from "../../Utlis/currencyFormat";
import { relativeFromNow } from "../../Utlis/dateFormat";

export default function RecentDocuments({
  documents = [],
  onOpen = () => {},
  onSeeAll = () => {},
}) {
  const documentList = itemsOf(documents);

  return (
    <section className="card animate-fade-up overflow-hidden">
      <header className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
        <h2 className="text-[15px] font-semibold text-ink-950">
          Recent documents
        </h2>
        <button
          type="button"
          onClick={onSeeAll}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary-600 transition-colors hover:text-primary-700"
        >
          See all <ArrowUpRight size={14} />
        </button>
      </header>

      {documentList.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nothing issued yet"
          description="Your most recent quotations and invoices will appear here."
        />
      ) : (
        <ul className="divide-y divide-ink-100">
          {documentList.map((document, index) => (
            <li key={document._id}>
              <button
                type="button"
                onClick={() => onOpen(document)}
                style={{ animationDelay: `${index * 40}ms` }}
                className="flex w-full animate-fade-in items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-primary-50/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[13px] font-bold text-ink-950">
                    {document.docNumber}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-ink-500">
                    {document.client?.name} · {relativeFromNow(document.issueDate)}
                  </p>
                </div>

                <StatusBadge
                  className="hidden sm:inline-flex"
                  dot={false}
                  label={DOC_LABELS[document.docType]}
                  tone={DOC_TYPE_TONE[document.docType]}
                />

                <p className="w-28 shrink-0 text-right text-[13px] font-semibold text-ink-900 tabular-nums">
                  {formatCurrency(document.totalAmount)}
                </p>

                <StatusBadge
                  label={document.status}
                  tone={DOC_STATUS_TONE[document.status]}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
