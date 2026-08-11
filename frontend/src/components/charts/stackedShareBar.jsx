import ChartLegend from "./chartLegend";
import { formatCompactCurrency } from "../../Utlis/currencyFormat";

/*
 * Part-to-whole across one bar. Segments are separated by a 2px surface gap so
 * adjacent fills never touch, and each segment is direct-labelled below.
 */
export default function StackedShareBar({
  segments = [],
  formatValue = formatCompactCurrency,
  emptyLabel = "Nothing to show yet.",
}) {
  const total = segments.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  if (!total) {
    return <p className="py-10 text-center text-sm text-ink-400">{emptyLabel}</p>;
  }

  const visible = segments.filter((item) => Number(item.value) > 0);

  return (
    <div>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
        {visible.map((item) => (
          <div
            key={item.key}
            className="h-full transition-all duration-700 ease-out first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(item.value / total) * 100}%`,
              backgroundColor: item.color,
            }}
            title={`${item.label}: ${formatValue(item.value)}`}
          />
        ))}
      </div>

      <ChartLegend series={visible} className="mt-4" />

      <ul className="mt-3 space-y-1.5">
        {visible.map((item) => (
          <li key={item.key} className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate text-[13px] text-ink-600">
                {item.label}
              </span>
            </span>
            <span className="shrink-0 text-[13px] font-semibold text-ink-900 tabular-nums">
              {formatValue(item.value)}
              <span className="ml-1.5 text-[11px] font-normal text-ink-400">
                {Math.round((item.value / total) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
