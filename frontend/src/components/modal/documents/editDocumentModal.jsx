import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Lock, RotateCcw } from "lucide-react";
import BaseModal from "../baseModal";
import CustomButton from "../../custom/customButton";
import DatePickerField from "../../custom/datePickerField";
import TextAreaField from "../../custom/textAreaField";
import ItemBuilder from "../../documents/itemBuilder";
import ItemsTable from "../../documents/itemsTable";
import TotalsSummary from "../../documents/totalsSummary";
import { handleUpdateDocument } from "../../../Services/apiCalling/documentApis";
import { handleGetAllServices } from "../../../Services/apiCalling/serviceApis";
import {
  ErrorMessage,
  SuccessMessage,
} from "../../../Utlis/Toastify/ToastMessage";
import { isDueDateValid } from "../../../Utlis/Common/commonValidator";
import { toInputDate } from "../../../Utlis/dateFormat";
import { computeTotals } from "../../../Utlis/calculations";
import { DOC_TYPES, isPriceLocked } from "../../../constants/document.constants";
import { MESSAGES } from "../../../constants/message.constants";

// Only the fields that actually define the price are compared, so a formatting
// difference coming back from the server never looks like a re-price.
const toComparableItems = (items = []) =>
  JSON.stringify(
    items.map((item) => ({
      description: String(item.description || "").trim(),
      unit: item.unit || "unit",
      qty: Number(item.qty) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      discountPercent: Number(item.discountPercent) || 0,
    }))
  );

export default function EditDocumentModal({
  open,
  document: currentDocument,
  onClose = () => {},
  onSuccess = () => {},
}) {
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [introLine, setIntroLine] = useState("");
  const [notesTerms, setNotesTerms] = useState("");
  const [items, setItems] = useState([]);
  const [services, setServices] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const isQuotation = currentDocument?.docType === DOC_TYPES.quotation;
  const dueDateLabel = currentDocument?.dueDateLabel || "Due date";
  const defaultTerms =
    currentDocument?.company?.defaultTerms?.[currentDocument?.docType] || "";

  // Re-pricing is how a negotiation is recorded. A quotation stays open for it;
  // a proforma or invoice freezes its money once sent or signed.
  const priceLocked = isPriceLocked(currentDocument);
  const canReprice = Boolean(currentDocument) && !priceLocked;

  useEffect(() => {
    if (!open || !currentDocument) return;

    setIssueDate(toInputDate(currentDocument.issueDate));
    setDueDate(toInputDate(currentDocument.dueDate));
    setIntroLine(currentDocument.introLine || "");
    setNotesTerms(currentDocument.notesTerms || "");
    setItems(currentDocument.items || []);
    setErrors({});
  }, [open, currentDocument]);

  // The catalog is only needed when lines can still be added.
  useEffect(() => {
    if (!open || !canReprice || services.length > 0) return;

    const fetchServices = async () => {
      const result = await handleGetAllServices({
        page: 1,
        limit: 200,
        isActive: true,
      });
      setServices(result?.items || []);
    };

    fetchServices();
  }, [open, canReprice, services.length]);

  const totals = useMemo(
    () => computeTotals(items, currentDocument?.gstApplicable),
    [items, currentDocument?.gstApplicable]
  );

  const itemsChanged = useMemo(() => {
    if (!currentDocument) return false;
    return (
      toComparableItems(items) !==
      toComparableItems(currentDocument.items || [])
    );
  }, [items, currentDocument]);

  const onSubmit = async () => {
    if (!isDueDateValid(issueDate, dueDate)) {
      setErrors({ dueDate: `${dueDateLabel} cannot be before the issue date.` });
      return;
    }
    if (canReprice && items.length === 0) {
      ErrorMessage("A document needs at least one line item.");
      return;
    }

    setSaving(true);
    try {
      const payload = { notesTerms };
      if (issueDate) payload.issueDate = issueDate;
      // Clearing the due date is a real edit, so an empty value is sent as null.
      payload.dueDate = dueDate || null;
      if (isQuotation) payload.introLine = introLine;
      // Items go up only when they actually moved — an untouched save should not
      // read as a re-price in the audit trail.
      if (canReprice && itemsChanged) {
        payload.items = items.map((item) => ({
          serviceRef: item.serviceRef || undefined,
          description: item.description,
          unit: item.unit || "unit",
          qty: Number(item.qty),
          unitPrice: Number(item.unitPrice),
          discountPercent: Number(item.discountPercent) || 0,
        }));
      }

      const result = await handleUpdateDocument(currentDocument._id, payload);
      if (result) {
        SuccessMessage(
          payload.items
            ? "Prices updated. The revised version is ready to send to the client."
            : MESSAGES.documentUpdated
        );
        onSuccess(result);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  if (!currentDocument) return null;

  return (
    <BaseModal
      open={open}
      title={canReprice ? "Edit & re-price" : "Edit document"}
      description={`${currentDocument.docNumber} — the number, type and series never change.`}
      size={canReprice ? "xl" : "md"}
      onClose={onClose}
      footer={
        <>
          <CustomButton variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </CustomButton>
          <CustomButton size="sm" loading={saving} onClick={onSubmit}>
            Save changes
          </CustomButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <DatePickerField
            label="Issue date"
            name="issueDate"
            value={issueDate}
            onChange={(value) => setIssueDate(value)}
          />
          <DatePickerField
            label={dueDateLabel}
            name="dueDate"
            minDate={issueDate}
            value={dueDate}
            error={errors.dueDate}
            onChange={(value) => setDueDate(value)}
          />
        </div>

        {isQuotation && (
          <TextAreaField
            label="Intro line"
            name="introLine"
            rows={2}
            value={introLine}
            hint="Printed above the item table on quotations."
            onChange={(value) => setIntroLine(value)}
          />
        )}

        <div className="border-t border-ink-100 pt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="field-label !mb-0">Line items &amp; pricing</span>
            {itemsChanged && (
              <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                Price changed
              </span>
            )}
          </div>

          {priceLocked ? (
            <>
              <p className="mb-3 flex gap-2 rounded-xl bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-800">
                <Lock size={15} className="mt-0.5 shrink-0" />
                This is the agreed amount and can no longer be changed. To move
                the price, cancel this document and convert a fresh one from the
                quotation.
              </p>
              <ItemsTable items={items} editable={false} />
            </>
          ) : (
            <>
              <p className="mb-3 text-[12px] leading-relaxed text-ink-500">
                {isQuotation
                  ? "Update the pricing as the client negotiates. Each save bumps the version, so the history shows what was offered at every round."
                  : "This document is still a draft, so its pricing can be corrected. It locks once the document is sent or signed."}
              </p>

              <ItemBuilder
                services={services}
                onAdd={(item) => setItems((previous) => [...previous, item])}
              />

              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <ItemsTable
                    items={items}
                    onRemove={(index) =>
                      setItems((previous) =>
                        previous.filter((_, position) => position !== index)
                      )
                    }
                  />
                </div>
                <TotalsSummary
                  subTotal={totals.subTotal}
                  gstAmount={totals.gstAmount}
                  totalAmount={totals.totalAmount}
                  gstApplicable={currentDocument.gstApplicable}
                />
              </div>
            </>
          )}
        </div>

        <div className="border-t border-ink-100 pt-4">
          <div className="mb-1.5 flex items-end justify-between gap-3">
            <span className="field-label !mb-0">Notes &amp; terms</span>
            {defaultTerms && notesTerms !== defaultTerms && (
              <button
                type="button"
                onClick={() => setNotesTerms(defaultTerms)}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary-600 transition-colors hover:text-primary-700"
              >
                <RotateCcw size={12} /> Reset to default
              </button>
            )}
          </div>
          <TextAreaField
            name="notesTerms"
            rows={8}
            value={notesTerms}
            onChange={(value) => setNotesTerms(value)}
          />
        </div>

        <p className="flex gap-2 rounded-xl bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          Saving bumps the version and clears the stored PDF, because the file
          would no longer match the data. Generate it again before sending.
        </p>
      </div>
    </BaseModal>
  );
}
