import { RotateCcw } from "lucide-react";
import TextAreaField from "../custom/textAreaField";
import CustomButton from "../custom/customButton";
import { DOC_LABELS } from "../../constants/document.constants";

export default function NotesTermsEditor({
  value = "",
  docType,
  defaultTerms = "",
  onChange = () => {},
  onResetToDefault = () => {},
}) {
  const isCustom = defaultTerms !== "" && value !== defaultTerms;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-ink-950">
            Notes &amp; terms
          </h2>
          <p className="mt-0.5 text-subtle">
            Seeded from this company&apos;s{" "}
            <span className="font-medium text-ink-600">
              {DOC_LABELS[docType]?.toLowerCase()}
            </span>{" "}
            defaults. Edit freely — the document keeps whatever you type here.
          </p>
        </div>

        {isCustom && (
          <CustomButton
            variant="secondary"
            size="sm"
            icon={RotateCcw}
            onClick={onResetToDefault}
          >
            Reset to default
          </CustomButton>
        )}
      </div>

      <TextAreaField
        name="notesTerms"
        rows={8}
        placeholder="1. Payable by the due date.&#10;2. Confidentiality applies."
        value={value}
        onChange={onChange}
      />

      {isCustom && (
        <p className="animate-fade-in rounded-xl bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-800">
          These terms differ from the company default. If you later convert this
          document, you will be asked whether to keep this text or swap in the
          target type&apos;s standard terms.
        </p>
      )}
    </section>
  );
}
