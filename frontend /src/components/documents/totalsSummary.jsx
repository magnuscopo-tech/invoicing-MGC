import { GST_PERCENT } from "../../constants/document.constants";
import { formatCurrency } from "../../Utlis/currencyFormat";

export default function TotalsSummary({
  subTotal = 0,
  gstAmount = 0,
  totalAmount = 0,
  gstApplicable = false,
  amountInWords = "",
  compact = false,
}) {
  return (
    <div
      className={`rounded-2xl border border-ink-100 bg-white ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <dl className="space-y-2.5">
        <div className="flex items-center justify-between text-sm">
          <dt className="text-ink-500">Subtotal</dt>
          <dd className="font-semibold text-ink-800 tabular-nums">
            {formatCurrency(subTotal)}
          </dd>
        </div>

        {gstApplicable && (
          <div className="flex animate-fade-in items-center justify-between text-sm">
            <dt className="text-ink-500">GST @ {GST_PERCENT}%</dt>
            <dd className="font-semibold text-ink-800 tabular-nums">
              {formatCurrency(gstAmount)}
            </dd>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-ink-100 pt-3">
          <dt className="text-[13px] font-bold uppercase tracking-wide text-ink-600">
            {gstApplicable ? "Payable amount" : "Total"}
          </dt>
          <dd className="text-lg font-bold text-primary-700 tabular-nums">
            {formatCurrency(totalAmount)}
          </dd>
        </div>
      </dl>

      {amountInWords && (
        <p className="mt-4 rounded-xl bg-ink-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-600">
          <span className="font-semibold text-ink-700">In words: </span>
          {amountInWords}
        </p>
      )}

      {!gstApplicable && (
        <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
          No GST breakup is printed on this document type — a flat total is shown
          instead.
        </p>
      )}
    </div>
  );
}
