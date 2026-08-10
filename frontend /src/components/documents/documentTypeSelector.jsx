import { Check, Hash, Loader2 } from "lucide-react";
import { DOC_TYPE_OPTIONS, DOC_TYPES } from "../../constants/document.constants";
import { classNames } from "../../Utlis/Common/commonMethod";

export default function DocumentTypeSelector({
  value,
  numberPreview = null,
  loadingNumber = false,
  onChange = () => {},
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold text-ink-950">
          What are you creating?
        </h2>
        <p className="mt-0.5 text-subtle">
          Work normally starts at the quotation and moves forward one stage at a
          time — each later document is created by converting the one before it.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {DOC_TYPE_OPTIONS.map((option, index) => {
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              style={{ animationDelay: `${index * 70}ms` }}
              className={classNames(
                "group relative animate-fade-up rounded-2xl border-2 p-5 text-left transition-all duration-300",
                isSelected
                  ? "border-primary-500 bg-primary-50/60 shadow-[0_16px_36px_-22px_rgba(29,93,245,0.9)]"
                  : "border-ink-200 bg-white hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-card"
              )}
            >
              <span
                className={classNames(
                  "absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full transition-all duration-300",
                  isSelected
                    ? "scale-100 bg-primary-600 text-white"
                    : "scale-0 bg-transparent"
                )}
              >
                <Check size={12} strokeWidth={3.5} />
              </span>

              <span className="inline-flex rounded-lg bg-ink-100 px-2 py-0.5 font-mono text-[11px] font-bold text-ink-600">
                {option.series}
              </span>

              <h3 className="mt-3 text-[15px] font-semibold text-ink-950">
                {option.label}
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
                {option.summary}
              </p>

              <span
                className={classNames(
                  "mt-3.5 inline-block rounded-md px-2 py-1 text-[11px] font-semibold",
                  option.gstApplicable
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-ink-100 text-ink-600"
                )}
              >
                {option.gstApplicable ? "GST @ 18%" : "No GST breakup"}
              </span>
            </button>
          );
        })}
      </div>

      {value && value !== DOC_TYPES.quotation && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-800">
          Starting here skips the earlier stage. The usual path is to raise a
          quotation, negotiate on it, then convert it — that way the chain keeps
          a record of what was quoted against what was finally agreed. Create
          this directly only when there is genuinely no earlier document.
        </p>
      )}

      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-white px-5 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-500">
          {loadingNumber ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Hash size={18} />
          )}
        </span>

        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
            Next number preview
          </p>
          <p className="truncate font-mono text-[15px] font-bold text-ink-950">
            {loadingNumber
              ? "Checking…"
              : numberPreview?.docNumber || "Select a company to preview"}
          </p>
        </div>

        <p className="ml-auto hidden max-w-[15rem] text-right text-[11px] leading-relaxed text-ink-400 lg:block">
          Preview only — the serial is reserved when you save, so abandoned
          drafts never burn a number.
        </p>
      </div>
    </section>
  );
}
