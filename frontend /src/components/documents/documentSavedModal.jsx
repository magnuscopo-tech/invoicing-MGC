import { ArrowRight, CheckCircle2, Eye, FileText } from "lucide-react";
import BaseModal from "../modal/baseModal";
import CustomButton from "../custom/customButton";
import { CONVERSION_TARGETS, DOC_LABELS } from "../../constants/document.constants";

export default function DocumentSavedModal({
  open,
  document: savedDocument,
  onPreview = () => {},
  onConvert = () => {},
  onOpenDocument = () => {},
  onClose = () => {},
}) {
  if (!savedDocument) return null;

  const nextStages = CONVERSION_TARGETS[savedDocument.docType] || [];

  return (
    <BaseModal
      open={open}
      title="Document saved"
      description="The serial is now committed to this document."
      size="sm"
      onClose={onClose}
    >
      <div className="space-y-5 text-center">
        <div className="flex justify-center">
          <span className="flex h-14 w-14 animate-scale-in items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={28} />
          </span>
        </div>

        <div>
          <p className="font-mono text-lg font-bold text-ink-950">
            {savedDocument.docNumber}
          </p>
          <p className="mt-0.5 text-[13px] text-ink-500">
            {DOC_LABELS[savedDocument.docType]} · saved as a draft
          </p>
        </div>

        <div className="space-y-2.5 text-left">
          <CustomButton fullWidth icon={Eye} onClick={onPreview}>
            Preview &amp; download PDF
          </CustomButton>

          {nextStages.length > 0 && (
            <CustomButton
              fullWidth
              variant="subtle"
              icon={ArrowRight}
              iconRight
              onClick={onConvert}
            >
              Convert to {DOC_LABELS[nextStages[0]]}
            </CustomButton>
          )}

          <CustomButton
            fullWidth
            variant="secondary"
            icon={FileText}
            onClick={onOpenDocument}
          >
            Open document
          </CustomButton>
        </div>
      </div>
    </BaseModal>
  );
}
