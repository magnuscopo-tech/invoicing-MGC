import { Package, Pencil, Trash2 } from "lucide-react";
import StatusBadge from "../custom/statusBadge";
import { formatCurrency } from "../../Utlis/currencyFormat";

export default function ServiceCard({
  service,
  canDelete = false,
  onEdit = () => {},
  onDelete = () => {},
}) {
  const isInactive = service.isActive === false;

  return (
    <article className="card card-hover flex animate-fade-up flex-col p-5">
      <header className="flex items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <Package size={19} strokeWidth={2} />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink-950">
            {service.name}
          </h3>
          <p className="mt-1 text-xs capitalize text-ink-400">
            per {service.unit || "unit"}
          </p>
        </div>

        {isInactive && <StatusBadge label="Inactive" tone="danger" />}
      </header>

      {service.description && (
        <p className="mt-3.5 line-clamp-3 text-[13px] leading-relaxed text-ink-500">
          {service.description}
        </p>
      )}

      <footer className="mt-auto flex items-center justify-between border-t border-ink-100 pt-3.5 [margin-top:1.25rem]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
            Default price
          </p>
          <p className="text-[15px] font-bold text-ink-950">
            {formatCurrency(service.defaultUnitPrice)}
          </p>
        </div>

        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(service)}
            className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-primary-50 hover:text-primary-700"
            title="Edit service"
          >
            <Pencil size={15} />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(service)}
              className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Delete service"
            >
              <Trash2 size={15} />
            </button>
          )}
        </span>
      </footer>
    </article>
  );
}
