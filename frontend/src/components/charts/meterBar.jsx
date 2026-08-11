// A single ratio against a limit — the correct form for "collection rate", and
// the reason there is no two-slice pie anywhere in this dashboard.
export default function MeterBar({
  label,
  percent = 0,
  caption = "",
  color = "#1d5df5",
}) {
  const clamped = Math.min(100, Math.max(0, Number(percent) || 0));

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-ink-700">{label}</span>
        <span className="text-[13px] font-bold text-ink-950 tabular-nums">
          {clamped.toFixed(1)}%
        </span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>

      {caption && <p className="mt-1.5 text-[11px] text-ink-400">{caption}</p>}
    </div>
  );
}
