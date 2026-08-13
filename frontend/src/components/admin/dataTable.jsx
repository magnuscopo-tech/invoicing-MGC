import { itemsOf } from "../../Utlis/Common/commonMethod";

// Generic table used for every report's table view and for the ledger screens.
export default function DataTable({
  columns = [],
  rows = [],
  footer = null,
  emptyLabel = "No rows to show.",
  onRowClick = null,
}) {
  const columnList = itemsOf(columns);
  const rowList = itemsOf(rows);

  if (rowList.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-400">{emptyLabel}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px]">
        <thead className="bg-ink-50">
          <tr>
            {columnList.map((column) => (
              <th
                key={column.key}
                className={`table-head ${column.align === "right" ? "text-right" : ""}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-ink-100">
          {rowList.map((row, rowIndex) => (
            <tr
              key={row.id ?? rowIndex}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`animate-fade-in transition-colors ${
                onRowClick ? "cursor-pointer hover:bg-primary-50/40" : ""
              }`}
            >
              {columnList.map((column) => (
                <td
                  key={column.key}
                  className={`table-cell ${
                    column.align === "right"
                      ? "text-right tabular-nums"
                      : ""
                  } ${column.strong ? "font-semibold text-ink-950" : ""}`}
                >
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>

        {footer && (
          <tfoot className="border-t-2 border-ink-200 bg-ink-50">{footer}</tfoot>
        )}
      </table>
    </div>
  );
}
