import { AlertTriangle, Building2, ExternalLink, Users } from "lucide-react";
import { Link } from "react-router-dom";
import SelectField from "../custom/selectField";
import DatePickerField from "../custom/datePickerField";
import TextAreaField from "../custom/textAreaField";
import { ROUTES } from "../../constants/route.constants";
import { DOC_TYPES } from "../../constants/document.constants";

const PartyPreview = ({ icon: Icon, title, party, showGstin = true }) => (
  <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4">
    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-400">
      <Icon size={13} /> {title}
    </p>

    {party ? (
      <div className="animate-fade-in space-y-1">
        <p className="text-sm font-semibold text-ink-950">{party.name}</p>
        <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-500">
          {party.address}
        </p>
        {showGstin && party.gstin && (
          <p className="pt-1 font-mono text-xs text-ink-600">
            GSTIN {party.gstin}
          </p>
        )}
      </div>
    ) : (
      <p className="text-[13px] text-ink-400">
        Nothing selected yet — the block fills in automatically.
      </p>
    )}
  </div>
);

export default function DocumentPartiesForm({
  formData,
  errors = {},
  companies = [],
  clients = [],
  selectedCompany = null,
  selectedClient = null,
  dueDateLabel = "Due Date",
  onChange = () => {},
}) {
  const isQuotation = formData.docType === DOC_TYPES.quotation;
  const clientMissingGstin =
    !isQuotation && selectedClient && !selectedClient.gstin;

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold text-ink-950">
          Who is this document between?
        </h2>
        <p className="mt-0.5 text-subtle">
          Seller and buyer blocks are pulled straight from your saved records —
          nothing is re-typed.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <SelectField
            label="Your company (seller)"
            name="company"
            required
            placeholder="Select a company"
            value={formData.company}
            error={errors.company}
            options={companies.map((company) => ({
              value: company._id,
              label: company.name,
            }))}
            onChange={onChange}
          />
          <PartyPreview
            icon={Building2}
            title="Seller"
            party={selectedCompany}
          />
          <Link
            to={ROUTES.companies}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 transition-colors hover:text-primary-700"
          >
            Manage companies <ExternalLink size={12} />
          </Link>
        </div>

        <div className="space-y-3">
          <SelectField
            label="Client (buyer)"
            name="client"
            required
            placeholder="Select a client"
            value={formData.client}
            error={errors.client}
            options={clients.map((client) => ({
              value: client._id,
              label: client.name,
            }))}
            onChange={onChange}
          />
          <PartyPreview
            icon={Users}
            title="Buyer"
            party={selectedClient}
            showGstin={!isQuotation}
          />
          <Link
            to={ROUTES.clients}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 transition-colors hover:text-primary-700"
          >
            Manage clients <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {clientMissingGstin && (
        <p className="flex animate-fade-in gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-[13px] leading-relaxed text-red-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          This client has no GSTIN on record. A proforma or tax invoice cannot be
          created without one — add it on the client record, or switch this
          document to a quotation.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <DatePickerField
          label="Issue date"
          name="issueDate"
          required
          value={formData.issueDate}
          error={errors.issueDate}
          hint="The financial year and serial are derived from this date."
          onChange={onChange}
        />
        <DatePickerField
          label={dueDateLabel}
          name="dueDate"
          minDate={formData.issueDate}
          value={formData.dueDate}
          error={errors.dueDate}
          hint={
            isQuotation
              ? "How long the quotation stays valid."
              : "Must be on or after the issue date."
          }
          onChange={onChange}
        />
      </div>

      {isQuotation && (
        <TextAreaField
          label="Intro line"
          name="introLine"
          rows={2}
          hint="Printed above the item table. Quotations only — it is cleared on conversion."
          placeholder="With reference to your enquiry, we are pleased to submit our quotation as below."
          value={formData.introLine}
          onChange={onChange}
        />
      )}
    </section>
  );
}
