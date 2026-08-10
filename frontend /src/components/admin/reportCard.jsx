import { Table2 } from "lucide-react";
import { useState } from "react";

/*
 * Shared shell for every report block. The table toggle is not decoration - the
 * palette validator flags one fill below 3:1 on white and requires either visible
 * labels or a table view as relief. Every chart here ships both.
 */
export default function ReportCard({
  title,
  description = "",
  tableView = null,
  actions = null,
  className = "",
  children,
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <section className={`card animate-fade-up p-5 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink-950">{title}</h2>
          {description && (
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink-400">
              {description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {actions}
          {tableView && (
            <button
              type="button"
              onClick={() => setShowTable((previous) => !previous)}
              title={showTable ? "Show chart" : "Show data table"}
              className={`rounded-lg p-1.5 transition-colors ${
                showTable
                  ? "bg-primary-50 text-primary-700"
                  : "text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              }`}
            >
              <Table2 size={15} />
            </button>
          )}
        </div>
      </header>

      {showTable && tableView ? tableView : children}
    </section>
  );
}
