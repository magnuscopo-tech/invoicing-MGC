export default function TableLoader({ rows = 6, columns = 6 }) {
  return (
    <div className="animate-fade-in divide-y divide-ink-100">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4 px-4 py-4"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <div
              key={columnIndex}
              className="skeleton h-4"
              style={{ width: columnIndex === 0 ? "80%" : "60%" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
