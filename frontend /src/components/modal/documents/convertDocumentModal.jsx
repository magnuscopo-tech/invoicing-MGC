import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Hash, Info, Lock } from "lucide-react";
import BaseModal from "../baseModal";
import CustomButton from "../../custom/customButton";
import DatePickerField from "../../custom/datePickerField";
import { classNames } from "../../../Utlis/Common/commonMethod";
import { toInputDate } from "../../../Utlis/dateFormat";
import { formatCurrency } from "../../../Utlis/currencyFormat";
import {
  CONVERSION_TARGETS,
  DOC_LABELS,
  TERMS_STRATEGY,
} from "../../../constants/document.constants";
import { handleConvertDocument } from "../../../Services/apiCalling/documentApis";
import { SuccessMessage } from "../../../Utlis/Toastify/ToastMessage";

const TermsPreview = ({ text }) => (
  <p className="mt-2 max-h-24 overflow-y-auto whitespace-pre-line rounded-lg bg-ink-50 px-3 py-2 text-[12px] leading-relaxed text-ink-600">
    {text || "No terms saved for this document type."}
  </p>
);

export default function ConvertDocumentModal({
  open,
  document: sourceDocument,
  onClose = () => {},
  onSuccess = () => {},
}) {
  const targets = CONVERSION_TARGETS[sourceDocument?.docType] || [];
  const [toType, setToType] = useState(targets[0] || "");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [termsStrategy, setTermsStrategy] = useState(TERMS_STRATEGY.keep);
  const [converting, setConverting] = useState(false);

  const defaultTerms = sourceDocument?.company?.defaultTerms;
  const sourceTerms = sourceDocument?.notesTerms || "";
  const sourceDefault = defaultTerms?.[sourceDocument?.docType] || "";
  const targetDefault = defaultTerms?.[toType] || "";

  // Whether the source terms were edited is decided here, BEFORE converting, so
  // the user answers the question while it can still change the outcome.
  // The same comparison the server makes for termsStrategy "auto".
  const termsWereCustom = useMemo(() => {
    if (!defaultTerms) return false;
    return sourceTerms !== sourceDefault;
  }, [defaultTerms, sourceTerms, sourceDefault]);

  useEffect(() => {
    if (!open || !sourceDocument) return;

    setToType(CONVERSION_TARGETS[sourceDocument.docType]?.[0] || "");
    setIssueDate(toInputDate(sourceDocument.issueDate));
    setDueDate(toInputDate(sourceDocument.dueDate));
    setTermsStrategy(TERMS_STRATEGY.keep);
  }, [open, sourceDocument]);

  const reusesNumber = sourceDocument?.docType === "proforma";
  const isFixingPrice = toType === "proforma";

  const resultingTerms =
    !termsWereCustom || termsStrategy === TERMS_STRATEGY.swap
      ? targetDefault
      : sourceTerms;

  const onConvert = async () => {
    setConverting(true);
    try {
      const payload = {
        toType,
        // Always explicit. "auto" is never sent, so the outcome is exactly what
        // the user picked above rather than something inferred afterwards.
        termsStrategy: termsWereCustom ? termsStrategy : TERMS_STRATEGY.swap,
      };
      if (issueDate) payload.issueDate = issueDate;
      if (dueDate) payload.dueDate = dueDate;

      const result = await handleConvertDocument(sourceDocument._id, payload);
      if (!result) return;

      SuccessMessage(`${DOC_LABELS[toType]} created as ${result.docNumber}.`);
      onSuccess(result);
      onClose();
    } finally {
      setConverting(false);
    }
  };

  if (!sourceDocument) return null;

  return (
    <BaseModal
      open={open}
      title="Move to the next stage"
      description={`Carry ${sourceDocument.docNumber} forward into the ${
        DOC_LABELS[toType]?.toLowerCase() || "next stage"
      }.`}
      size="md"
      onClose={onClose}
      footer={
        <>
          <CustomButton variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </CustomButton>
          <CustomButton
            size="sm"
            icon={ArrowRight}
            iconRight
            loading={converting}
            disabled={!toType}
            onClick={onConvert}
          >
            Convert to {DOC_LABELS[toType] || "…"}
          </CustomButton>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="field-label">Convert to</p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {targets.map((target) => (
              <button
                key={target}
                type="button"
                onClick={() => setToType(target)}
                className={classNames(
                  "relative rounded-xl border-2 p-4 text-left transition-all duration-200",
                  toType === target
                    ? "border-primary-500 bg-primary-50/60"
                    : "border-ink-200 bg-white hover:border-primary-300"
                )}
              >
                {toType === target && (
                  <span className="absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-white">
                    <Check size={10} strokeWidth={4} />
                  </span>
                )}
                <p className="text-sm font-semibold text-ink-950">
                  {DOC_LABELS[target]}
                </p>
                <p className="mt-0.5 text-[12px] text-ink-500">
                  GST @ 18% applies
                </p>
              </button>
            ))}
          </div>
        </div>

        <p
          className={classNames(
            "flex gap-2.5 rounded-xl px-4 py-3 text-[13px] leading-relaxed",
            isFixingPrice
              ? "bg-amber-50 text-amber-800"
              : "bg-emerald-50 text-emerald-800"
          )}
        >
          <Lock size={15} className="mt-0.5 shrink-0" />
          {isFixingPrice
            ? `The line items carry over exactly as they stand — ${sourceDocument.totalAmount != null ? formatCurrency(sourceDocument.totalAmount) : "the quoted total"} plus GST. This is the agreed price, so once the proforma is sent or signed the amount can no longer be edited. Settle the negotiation on the quotation first.`
            : "Raise this once the client has paid. Approving the tax invoice confirms the payment and marks both it and this proforma as paid."}
        </p>

        <p className="flex gap-2.5 rounded-xl bg-ink-50 px-4 py-3 text-[13px] leading-relaxed text-ink-600">
          <Hash size={15} className="mt-0.5 shrink-0 text-ink-400" />
          {reusesNumber
            ? `The tax invoice reuses the exact same number — ${sourceDocument.docNumber}. No new serial is consumed.`
            : "A new MCI number is minted, because quotations live in the separate MCQ series."}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <DatePickerField
            label="Issue date"
            name="issueDate"
            value={issueDate}
            onChange={(value) => setIssueDate(value)}
          />
          <DatePickerField
            label="Due date"
            name="dueDate"
            minDate={issueDate}
            value={dueDate}
            onChange={(value) => setDueDate(value)}
          />
        </div>

        <div className="border-t border-ink-100 pt-4">
          <p className="field-label">Notes &amp; terms on the new document</p>

          {termsWereCustom ? (
            <>
              <p className="mb-3 text-[12px] leading-relaxed text-ink-500">
                You edited the terms on this {DOC_LABELS[sourceDocument.docType].toLowerCase()},
                so they are not the standard set. Choose which text the{" "}
                {DOC_LABELS[toType]?.toLowerCase()} should carry.
              </p>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setTermsStrategy(TERMS_STRATEGY.keep)}
                  className={classNames(
                    "w-full rounded-xl border-2 p-3.5 text-left transition-all duration-200",
                    termsStrategy === TERMS_STRATEGY.keep
                      ? "border-primary-500 bg-primary-50/60"
                      : "border-ink-200 bg-white hover:border-primary-300"
                  )}
                >
                  <p className="text-[13px] font-semibold text-ink-950">
                    Keep your custom terms
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-500">
                    Carry the text you wrote across unchanged.
                  </p>
                  {termsStrategy === TERMS_STRATEGY.keep && (
                    <TermsPreview text={sourceTerms} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setTermsStrategy(TERMS_STRATEGY.swap)}
                  className={classNames(
                    "w-full rounded-xl border-2 p-3.5 text-left transition-all duration-200",
                    termsStrategy === TERMS_STRATEGY.swap
                      ? "border-primary-500 bg-primary-50/60"
                      : "border-ink-200 bg-white hover:border-primary-300"
                  )}
                >
                  <p className="text-[13px] font-semibold text-ink-950">
                    Replace with standard {DOC_LABELS[toType]} terms
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-500">
                    Use this company&apos;s saved defaults for the new type.
                  </p>
                  {termsStrategy === TERMS_STRATEGY.swap && (
                    <TermsPreview text={targetDefault} />
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-2 text-[12px] leading-relaxed text-ink-500">
                Your terms are still the standard set, so the{" "}
                {DOC_LABELS[toType]?.toLowerCase()} picks up this company&apos;s
                default terms for that type.
              </p>
              <TermsPreview text={resultingTerms} />
            </>
          )}

          <p className="mt-3 flex gap-2 text-[12px] leading-relaxed text-ink-400">
            <Info size={13} className="mt-0.5 shrink-0" />
            The new document is created as a draft — you can edit its terms and
            dates afterwards from its detail screen.
          </p>
        </div>
      </div>
    </BaseModal>
  );
}
