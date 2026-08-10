import { Plus, Trash2 } from "lucide-react";
import CustomButton from "../custom/customButton";
import { classNames } from "../../Utlis/Common/commonMethod";
import { formatCurrency } from "../../Utlis/currencyFormat";
import {
  MAX_INSTALLMENTS,
  MIN_INSTALLMENTS,
  SPLIT_PRESETS,
  installmentSuffix,
  percentTotal,
  previewInstallmentAmounts,
} from "../../constants/billing.constants";

/*
 * The split editor. Rows are percentages of the agreed total, and the rupee
 * value of each is shown as it is typed - a user reasons in "50% advance" but
 * checks their work in rupees.
 *
 * The running total is the gate: nothing can be saved until the rows add to
 * exactly 100%, because a plan that allocates less can never be closed by a tax
 * invoice for the full contract value.
 */
export default function InstallmentSplitEditor({
  contractTotal = 0,
  installments = [],
  baseDocNumber = "",
  disabled = false,
  onChange = () => {},
}) {
  const percents = installments.map((row) => row.percent);
  const total = percentTotal(percents);
  const amounts = previewInstallmentAmounts(contractTotal, percents);
  const remaining = Math.round((100 - total) * 100) / 100;

  const applyPreset = (preset) => {
    onChange(
      preset.percents.map((percent, index) => ({
        percent,
        label: preset.names[index] || "",
      }))
    );
  };

  const updateRow = (index, patch) => {
    onChange(
      installments.map((row, position) =>
        position === index ? { ...row, ...patch } : row
      )
    );
  };

  const addRow = () => {
    if (installments.length >= MAX_INSTALLMENTS) return;
    // Seeded with whatever is unallocated, so the common case of splitting an
    // existing row needs no arithmetic from the user.
    onChange([...installments, { percent: remaining > 0 ? remaining : 0, label: "" }]);
  };

  const removeRow = (index) => {
    if (installments.length <= MIN_INSTALLMENTS) return;
    onChange(installments.filter((_, position) => position !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="field-label">Common splits</p>
        <div className="flex flex-wrap gap-2">
          {SPLIT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={disabled}
              onClick={() => applyPreset(preset)}
              className={classNames(
                "rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-600 transition-colors",
                "hover:border-primary-300 hover:text-primary-700",
                "disabled:cursor-not-allowed disabled:opacity-55"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        {installments.map((row, index) => (
          <div
            key={index}
            className="flex flex-wrap items-end gap-3 rounded-xl border border-ink-200 bg-white p-3"
          >
            <div className="w-full sm:w-auto sm:flex-1">
              <label className="field-label">
                Installment {index + 1}
                {baseDocNumber && (
                  <span className="ml-1.5 font-mono text-[11px] font-semibold text-ink-400">
                    {baseDocNumber}-{installmentSuffix(index + 1)}
                  </span>
                )}
              </label>
              <input
                type="text"
                value={row.label ?? ""}
                disabled={disabled}
                placeholder="Advance, On delivery…"
                onChange={(event) => updateRow(index, { label: event.target.value })}
                className="field-input"
              />
            </div>

            <div className="w-24">
              <label className="field-label">Share</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={row.percent ?? ""}
                  disabled={disabled}
                  onChange={(event) =>
                    updateRow(index, {
                      percent:
                        event.target.value === "" ? "" : Number(event.target.value),
                    })
                  }
                  className="field-input pr-7"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">
                  %
                </span>
              </div>
            </div>

            <div className="w-32 text-right">
              <p className="field-label">Amount</p>
              <p className="pb-2.5 text-[13px] font-semibold tabular-nums text-ink-900">
                {formatCurrency(amounts[index] || 0)}
              </p>
            </div>

            <button
              type="button"
              disabled={disabled || installments.length <= MIN_INSTALLMENTS}
              onClick={() => removeRow(index)}
              className={classNames(
                "mb-1.5 rounded-lg p-2 text-ink-400 transition-colors",
                "hover:bg-red-50 hover:text-red-600",
                "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-400"
              )}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <CustomButton
          variant="secondary"
          size="sm"
          icon={Plus}
          disabled={disabled || installments.length >= MAX_INSTALLMENTS}
          onClick={addRow}
        >
          Add installment
        </CustomButton>

        <div
          className={classNames(
            "rounded-xl px-3.5 py-2 text-[13px] font-semibold",
            total === 100
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-800"
          )}
        >
          {total === 100
            ? `Totals 100% · ${formatCurrency(contractTotal)}`
            : `Totals ${total}% — ${
                remaining > 0
                  ? `${remaining}% still to allocate`
                  : `${Math.abs(remaining)}% over`
              }`}
        </div>
      </div>
    </div>
  );
}
