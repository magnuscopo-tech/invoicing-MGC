import { useMemo, useState } from "react";
import useElementWidth from "../../hooks/useElementWidth";
import ChartLegend from "./chartLegend";
import { CHART_CHROME } from "../../constants/chart.constants";
import { formatCompactCurrency } from "../../Utlis/currencyFormat";

const PADDING = { top: 16, bottom: 28, left: 56 };

// Right padding is sized to the longest series label so an end-of-line direct
// label can never be clipped by the plot edge.
const rightPaddingFor = (series) => {
  const longest = Math.max(
    0,
    ...series.map((item) => (item.label || "").length)
  );
  return Math.min(150, Math.max(24, Math.round(longest * 6.2) + 20));
};

const niceCeiling = (value) => {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
};

export default function LineChart({
  series = [],
  categories = [],
  height = 260,
  formatValue = formatCompactCurrency,
  formatTooltipValue = formatCompactCurrency,
}) {
  const [ref, width] = useElementWidth();
  const [activeIndex, setActiveIndex] = useState(null);

  const paddingRight = rightPaddingFor(series);
  const innerWidth = Math.max(80, width - PADDING.left - paddingRight);
  const innerHeight = height - PADDING.top - PADDING.bottom;

  const maxValue = useMemo(() => {
    const values = series.flatMap((item) => item.values || []);
    return niceCeiling(Math.max(0, ...values));
  }, [series]);

  const ticks = useMemo(
    () => [0, 0.25, 0.5, 0.75, 1].map((step) => step * maxValue),
    [maxValue]
  );

  const xAt = (index) =>
    categories.length <= 1
      ? PADDING.left + innerWidth / 2
      : PADDING.left + (index / (categories.length - 1)) * innerWidth;

  const yAt = (value) =>
    PADDING.top + innerHeight - (maxValue ? (value / maxValue) * innerHeight : 0);

  // Only label a subset of the x axis, so ticks never collide on narrow cards.
  const labelStride = Math.max(1, Math.ceil(categories.length / (innerWidth / 56)));

  // Push end labels apart when their final values nearly coincide.
  const labelPositions = useMemo(() => {
    const lastIndex = categories.length - 1;
    if (lastIndex < 0) return [];

    const placed = series
      .map((item) => {
        const value = item.values?.[lastIndex] || 0;
        const pointY =
          PADDING.top +
          innerHeight -
          (maxValue ? (value / maxValue) * innerHeight : 0);
        return { key: item.key, label: item.label, color: item.color, pointY };
      })
      .sort((a, b) => a.pointY - b.pointY);

    let previousY = -Infinity;
    return placed.map((item) => {
      const y = Math.max(item.pointY, previousY + 13);
      previousY = y;
      return { ...item, y };
    });
  }, [series, categories.length, innerHeight, maxValue]);

  const onPointerMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left - PADDING.left;
    const ratio = innerWidth ? x / innerWidth : 0;
    const index = Math.round(ratio * (categories.length - 1));
    setActiveIndex(Math.min(categories.length - 1, Math.max(0, index)));
  };

  if (categories.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-ink-400">
        No data in this period.
      </p>
    );
  }

  return (
    <div ref={ref} className="w-full">
      <ChartLegend series={series} className="mb-3" />

      <div className="relative">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="Trend chart"
          onMouseMove={onPointerMove}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={PADDING.left + innerWidth}
                y1={yAt(tick)}
                y2={yAt(tick)}
                stroke={tick === 0 ? CHART_CHROME.baseline : CHART_CHROME.grid}
                strokeWidth="1"
              />
              <text
                x={PADDING.left - 10}
                y={yAt(tick) + 4}
                textAnchor="end"
                className="tabular-nums"
                fill={CHART_CHROME.muted}
                fontSize="11"
              >
                {formatValue(tick)}
              </text>
            </g>
          ))}

          {categories.map((label, index) => {
            if (index % labelStride !== 0) return null;
            // Anchor the edge labels inward so they never clip the plot area.
            const isFirst = index === 0;
            const isLast = index === categories.length - 1;

            return (
              <text
                key={label}
                x={xAt(index)}
                y={height - 8}
                textAnchor={isFirst ? "start" : isLast ? "end" : "middle"}
                fill={CHART_CHROME.muted}
                fontSize="11"
              >
                {label}
              </text>
            );
          })}

          {activeIndex !== null && (
            <line
              x1={xAt(activeIndex)}
              x2={xAt(activeIndex)}
              y1={PADDING.top}
              y2={PADDING.top + innerHeight}
              stroke={CHART_CHROME.baseline}
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}

          {series.map((item) => {
            const path = (item.values || [])
              .map(
                (value, index) =>
                  `${index === 0 ? "M" : "L"} ${xAt(index)} ${yAt(value)}`
              )
              .join(" ");

            return (
              <path
                key={item.key}
                d={path}
                fill="none"
                stroke={item.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* Direct labels at the line ends, nudged apart when two lines
              finish close together. Identity never rests on the legend alone. */}
          {labelPositions.map((label) => (
            <g key={`label-${label.key}`}>
              <circle
                cx={xAt(categories.length - 1)}
                cy={label.pointY}
                r="3.5"
                fill={label.color}
                stroke={CHART_CHROME.surface}
                strokeWidth="2"
              />
              <text
                x={xAt(categories.length - 1) + 8}
                y={label.y + 4}
                fill={CHART_CHROME.muted}
                fontSize="11"
                fontWeight="600"
              >
                {label.label}
              </text>
            </g>
          ))}

          {activeIndex !== null &&
            series.map((item) => (
              <circle
                key={item.key}
                cx={xAt(activeIndex)}
                cy={yAt(item.values[activeIndex] || 0)}
                r="5"
                fill={item.color}
                stroke={CHART_CHROME.surface}
                strokeWidth="2"
              />
            ))}
        </svg>

        {activeIndex !== null && (
          <div
            className="pointer-events-none absolute z-10 min-w-[10rem] rounded-xl border border-ink-100 bg-white p-3 shadow-pop"
            style={{
              left: Math.min(
                Math.max(xAt(activeIndex) - 80, 0),
                Math.max(width - 170, 0)
              ),
              top: 8,
            }}
          >
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-400">
              {categories[activeIndex]}
            </p>
            <ul className="space-y-1">
              {series.map((item) => (
                <li
                  key={item.key}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[12px] text-ink-600">
                      {item.label}
                    </span>
                  </span>
                  <span className="text-[12px] font-semibold text-ink-900 tabular-nums">
                    {formatTooltipValue(item.values[activeIndex] || 0)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
