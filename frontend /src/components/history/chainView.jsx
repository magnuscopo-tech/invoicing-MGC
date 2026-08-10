import { ChevronRight } from "lucide-react";
import StatusBadge from "../custom/statusBadge";
import {
  DOC_LABELS,
  DOC_STATUS_TONE,
} from "../../constants/document.constants";
import { formatCurrency } from "../../Utlis/currencyFormat";
import { formatDisplayDate } from "../../Utlis/dateFormat";
import { classNames } from "../../Utlis/Common/commonMethod";

export default function ChainView({
  chain = [],
  currentId = "",
  onSelect = () => {},
}) {
  if (chain.length <= 1) return null;

  return (
    <section className="card animate-fade-up p-5">
      <h2 className="text-[13px] font-bold uppercase tracking-wider text-ink-400">
        Document chain
      </h2>

      <ol className="mt-4 space-y-2">
        {chain.map((node, index) => {
          const isCurrent = node._id === currentId;

          return (
            <li key={node._id}>
              <button
                type="button"
                onClick={() => onSelect(node)}
                className={classNames(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200",
                  isCurrent
                    ? "border-primary-400 bg-primary-50/70"
                    : "border-ink-100 bg-white hover:border-primary-200 hover:bg-ink-50"
                )}
              >
                <span
                  className={classNames(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    isCurrent
                      ? "bg-primary-600 text-white"
                      : "bg-ink-100 text-ink-500"
                  )}
                >
                  {index + 1}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-ink-950">
                    {DOC_LABELS[node.docType]}
                  </span>
                  <span className="block truncate font-mono text-[11px] text-ink-500">
                    {node.docNumber} · {formatDisplayDate(node.issueDate)}
                  </span>
                </span>

                <span className="hidden text-right sm:block">
                  <span className="block text-[13px] font-semibold text-ink-900">
                    {formatCurrency(node.totalAmount)}
                  </span>
                  <StatusBadge
                    className="mt-0.5"
                    label={node.status}
                    tone={DOC_STATUS_TONE[node.status]}
                  />
                </span>

                <ChevronRight size={15} className="shrink-0 text-ink-300" />
              </button>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
        A proforma and its tax invoice intentionally share one number — that is
        correct, not a duplicate.
      </p>
    </section>
  );
}
