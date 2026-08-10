import {
  Banknote,
  ImageUp,
  MapPin,
  PenLine,
  Pencil,
  Trash2,
} from "lucide-react";
import StatusBadge from "../custom/statusBadge";
import { initialsOf } from "../../Utlis/Common/commonMethod";

export default function CompanyCard({
  company,
  canDelete = false,
  onEdit = () => {},
  onDelete = () => {},
  onUploadLogo = () => {},
  onUploadSignature = () => {},
}) {
  const isInactive = company.isActive === false;

  return (
    <article className="card card-hover flex animate-fade-up flex-col p-5">
      <header className="flex items-start gap-3.5">
        {company.logoUrl ? (
          <img
            src={company.logoUrl}
            alt={company.name}
            className="h-11 w-11 shrink-0 rounded-xl border border-ink-100 object-contain p-1"
          />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-sm font-bold text-primary-700">
            {initialsOf(company.name)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-ink-950">
            {company.name}
          </h3>
          <p className="mt-0.5 font-mono text-xs text-ink-500">
            {company.gstin}
          </p>
        </div>

        {isInactive && <StatusBadge label="Inactive" tone="danger" />}
      </header>

      <dl className="mt-4 space-y-2 text-[13px]">
        <div className="flex gap-2 text-ink-500">
          <MapPin size={14} className="mt-0.5 shrink-0" />
          <dd className="line-clamp-2 whitespace-pre-line">
            {company.address}
          </dd>
        </div>
        <div className="flex gap-2 text-ink-500">
          <Banknote size={14} className="mt-0.5 shrink-0" />
          <dd className="truncate">
            {company.bankDetails?.bankName || "Bank"} ····
            {String(company.bankDetails?.accountNumber || "").slice(-4)} ·{" "}
            {company.bankDetails?.ifsc}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className="rounded-md bg-ink-100 px-2 py-1 text-[11px] font-medium text-ink-600">
          PAN {company.pan}
        </span>
        <span className="rounded-md bg-ink-100 px-2 py-1 text-[11px] font-medium text-ink-600">
          State {company.stateCode}
        </span>
        <span
          className={`rounded-md px-2 py-1 text-[11px] font-medium ${
            company.signatureUrl
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {company.signatureUrl ? "Signature set" : "No signature"}
        </span>
      </div>

      <footer className="mt-5 flex items-center gap-1 border-t border-ink-100 pt-3.5">
        <button
          type="button"
          onClick={() => onUploadLogo(company)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
        >
          <ImageUp size={14} /> Logo
        </button>
        <button
          type="button"
          onClick={() => onUploadSignature(company)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
        >
          <PenLine size={14} /> Signature
        </button>

        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(company)}
            className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-primary-50 hover:text-primary-700"
            title="Edit company"
          >
            <Pencil size={15} />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(company)}
              className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Delete company"
            >
              <Trash2 size={15} />
            </button>
          )}
        </span>
      </footer>
    </article>
  );
}
