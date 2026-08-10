import { Mail, MapPin, Pencil, Phone, Trash2, User } from "lucide-react";
import StatusBadge from "../custom/statusBadge";
import { initialsOf } from "../../Utlis/Common/commonMethod";

export default function ClientCard({
  client,
  canDelete = false,
  onEdit = () => {},
  onDelete = () => {},
}) {
  const isInactive = client.isActive === false;

  return (
    <article className="card card-hover flex animate-fade-up flex-col p-5">
      <header className="flex items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-sm font-bold text-violet-700">
          {initialsOf(client.name)}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-ink-950">
            {client.name}
          </h3>
          <p className="mt-0.5 font-mono text-xs text-ink-500">
            {client.gstin || "No GSTIN on record"}
          </p>
        </div>

        {isInactive && <StatusBadge label="Inactive" tone="danger" />}
      </header>

      <dl className="mt-4 space-y-2 text-[13px] text-ink-500">
        <div className="flex gap-2">
          <MapPin size={14} className="mt-0.5 shrink-0" />
          <dd className="line-clamp-2 whitespace-pre-line">{client.address}</dd>
        </div>
        {client.contactPerson && (
          <div className="flex gap-2">
            <User size={14} className="mt-0.5 shrink-0" />
            <dd className="truncate">{client.contactPerson}</dd>
          </div>
        )}
        {client.email && (
          <div className="flex gap-2">
            <Mail size={14} className="mt-0.5 shrink-0" />
            <dd className="truncate">{client.email}</dd>
          </div>
        )}
        {client.phone && (
          <div className="flex gap-2">
            <Phone size={14} className="mt-0.5 shrink-0" />
            <dd className="truncate">{client.phone}</dd>
          </div>
        )}
      </dl>

      <footer className="mt-5 flex items-center justify-between border-t border-ink-100 pt-3.5">
        {client.gstin ? (
          <StatusBadge label="Invoice ready" tone="success" />
        ) : (
          <StatusBadge label="Quotation only" tone="warning" />
        )}

        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(client)}
            className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-primary-50 hover:text-primary-700"
            title="Edit client"
          >
            <Pencil size={15} />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(client)}
              className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Delete client"
            >
              <Trash2 size={15} />
            </button>
          )}
        </span>
      </footer>
    </article>
  );
}
