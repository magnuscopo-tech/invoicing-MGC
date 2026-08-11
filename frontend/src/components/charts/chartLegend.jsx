// A legend is always present for two or more series, so identity never rests on
// color alone. Labels wear text tokens; only the swatch carries the series color.
export default function ChartLegend({ series = [], className = "" }) {
  if (series.length < 2) return null;

  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className}`}>
      {series.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span className="text-[12px] font-medium text-ink-600">
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
