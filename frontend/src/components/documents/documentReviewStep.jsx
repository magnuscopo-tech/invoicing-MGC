import NotesTermsEditor from "./notesTermsEditor";
import TotalsSummary from "./totalsSummary";
import ItemsTable from "./itemsTable";
import InputField from "../custom/inputField";
import { DOC_LABELS } from "../../constants/document.constants";
import { formatDisplayDate } from "../../Utlis/dateFormat";

const SummaryRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 py-2">
    <dt className="text-[13px] text-ink-500">{label}</dt>
    <dd className="max-w-[60%] text-right text-[13px] font-medium text-ink-900">
      {value || "—"}
    </dd>
  </div>
);

export default function DocumentReviewStep({
  formData,
  numberPreview = null,
  displayDocNumber = "",
  serialValue = "",
  serialError = "",
  selectedCompany = null,
  selectedClient = null,
  defaultTerms = "",
  totals,
  dueDateLabel = "Due Date",
  separatePricing = true,
  onChange = () => {},
  onSerialChange = () => {},
  onResetTerms = () => {},
  onSeparatePricingChange = () => {},
}) {
  return (
    <section className="space-y-6">
      <NotesTermsEditor
        value={formData.notesTerms}
        docType={formData.docType}
        defaultTerms={defaultTerms}
        onChange={onChange}
        onResetToDefault={onResetTerms}
      />

      <div className="space-y-4 border-t border-ink-100 pt-6">
        <h2 className="text-[15px] font-semibold text-ink-950">
          Review before saving
        </h2>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-ink-100 bg-white p-5 lg:col-span-2">
            <dl className="divide-y divide-ink-100">
              <SummaryRow
                label="Document type"
                value={DOC_LABELS[formData.docType]}
              />
              <SummaryRow
                label="Document number"
                value={displayDocNumber || numberPreview?.docNumber}
              />
              <SummaryRow label="Seller" value={selectedCompany?.name} />
              <SummaryRow label="Buyer" value={selectedClient?.name} />
              <SummaryRow
                label="Issue date"
                value={formatDisplayDate(formData.issueDate)}
              />
              <SummaryRow
                label={dueDateLabel}
                value={formatDisplayDate(formData.dueDate)}
              />
              <SummaryRow label="Line items" value={formData.items.length} />
            </dl>
            <div className="mt-5 border-t border-ink-100 pt-5">
              <InputField
                label="Serial number"
                name="serialNumber"
                value={serialValue}
                type="text"
                placeholder="001"
                error={serialError}
                hint="Only the last serial part is editable. The prefix and year are fixed by document type and issue date."
                onChange={(value) => onSerialChange(value)}
              />
            </div>
          </div>

          <TotalsSummary
            subTotal={totals.subTotal}
            gstAmount={totals.gstAmount}
            totalAmount={totals.totalAmount}
            gstApplicable={formData.gstApplicable}
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 bg-white px-4 py-3">
          <p className="text-sm font-semibold text-ink-900">Separate pricing</p>
          <button
            type="button"
            role="switch"
            aria-checked={separatePricing}
            onClick={() => onSeparatePricingChange(!separatePricing)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-100 ${
              separatePricing ? "bg-primary-600" : "bg-ink-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-[left] duration-200 ${
                separatePricing ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>

        <ItemsTable
          items={formData.items}
          editable={false}
          separatePricing={separatePricing}
          totalAmount={totals.subTotal}
        />
      </div>
    </section>
  );
}
