import { ORDINAL_4 } from "../../constants/chart.constants";
import { itemsOf } from "../../Utlis/Common/commonMethod";
import { formatCompactCurrency } from "../../Utlis/currencyFormat";

// Ordered stages, so the fill uses the ordinal blue ramp rather than four
// categorical hues. Each stage carries its own count and rate as direct labels.
export default function FunnelChart({ stages = [] }) {
  const stageList = itemsOf(stages);
  const max = Math.max(1, ...stageList.map((stage) => stage.count || 0));

  if (stageList.every((stage) => !stage.count)) {
    return (
      <p className="py-10 text-center text-sm text-ink-400">
        No documents in this period yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {stageList.map((stage, index) => {
        const percent = Math.max(
          stage.count > 0 ? 3 : 0,
          (stage.count / max) * 100
        );

        return (
          <li key={stage.stage}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium text-ink-700">
                {stage.label}
              </span>
              <span className="text-[13px] text-ink-500">
                <span className="font-semibold text-ink-950 tabular-nums">
                  {stage.count}
                </span>
                <span className="ml-2 tabular-nums">
                  {formatCompactCurrency(stage.totalAmount)}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="h-7 flex-1 overflow-hidden rounded-lg bg-ink-100">
                <div
                  className="flex h-full items-center rounded-lg transition-[width] duration-700 ease-out"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: ORDINAL_4[index] || ORDINAL_4[ORDINAL_4.length - 1],
                  }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-[12px] font-semibold text-ink-500 tabular-nums">
                {stage.conversionRate}%
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
