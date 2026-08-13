import { formatCompactCurrency } from "../../Utlis/currencyFormat";
import { itemsOf } from "../../Utlis/Common/commonMethod";

/*
 * Ordered magnitude bars. Every row is directly labelled with its value, which
 * is also the "relief" the palette validator requires wherever a fill sits below
 * 3:1 against the white card.
 */
export default function HorizontalBars({
  rows = [],
  formatValue = formatCompactCurrency,
  emptyLabel = "Nothing to show yet.",
}) {
  const rowList = itemsOf(rows);
  const max = Math.max(1, ...rowList.map((row) => Number(row.value) || 0));

  if (rowList.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-400">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-3">
      {rowList.map((row) => {
        const value = Number(row.value) || 0;
        const percent = Math.max(value > 0 ? 2 : 0, (value / max) * 100);

        return (
          <li key={row.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-[13px] font-medium text-ink-700">
                {row.label}
              </span>
              <span className="shrink-0 text-[13px] font-semibold text-ink-950 tabular-nums">
                {formatValue(value)}
                {row.caption && (
                  <span className="ml-1.5 text-[11px] font-normal text-ink-400">
                    {row.caption}
                  </span>
                )}
              </span>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{ width: `${percent}%`, backgroundColor: row.color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
