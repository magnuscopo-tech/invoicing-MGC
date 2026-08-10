import { ChevronLeft, ChevronRight } from "lucide-react";
import { classNames } from "../../Utlis/Common/commonMethod";

export default function Pagination({
  page = 1,
  limit = 20,
  total = 0,
  onPageChange = () => {},
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (total <= limit) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const buttonClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 transition-all duration-200 hover:border-primary-300 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink-200 disabled:hover:text-ink-600";

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 sm:flex-row">
      <p className="text-xs text-ink-500">
        Showing <span className="font-semibold text-ink-700">{from}</span>–
        <span className="font-semibold text-ink-700">{to}</span> of{" "}
        <span className="font-semibold text-ink-700">{total}</span>
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={buttonClass}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={16} />
        </button>

        <span className="px-2 text-xs font-medium text-ink-600">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          className={classNames(buttonClass)}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
