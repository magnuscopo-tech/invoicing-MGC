import { useEffect, useState } from "react";
import { XCircle } from "lucide-react";
import BaseModal from "../baseModal";
import CustomButton from "../../custom/customButton";
import TextAreaField from "../../custom/textAreaField";
import { handleRejectDocument } from "../../../Services/apiCalling/documentApis";
import { SuccessMessage } from "../../../Utlis/Toastify/ToastMessage";

export default function RejectDocumentModal({
  open,
  document: pendingDocument,
  onClose = () => {},
  onSuccess = () => {},
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setError("");
    }
  }, [open]);

  const onReject = async () => {
    if (reason.trim().length < 3) {
      setError("Give at least a few words so the sender knows what to fix.");
      return;
    }

    setRejecting(true);
    try {
      const result = await handleRejectDocument(pendingDocument._id, {
        rejectionReason: reason.trim(),
      });
      if (result) {
        SuccessMessage(`${result.docNumber} rejected.`);
        onSuccess(result);
        onClose();
      }
    } finally {
      setRejecting(false);
    }
  };

  if (!pendingDocument) return null;

  return (
    <BaseModal
      open={open}
      title="Reject document"
      description={`${pendingDocument.docNumber} goes back to the sender unsigned.`}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <CustomButton variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </CustomButton>
          <CustomButton
            variant="danger"
            size="sm"
            icon={XCircle}
            loading={rejecting}
            onClick={onReject}
          >
            Reject
          </CustomButton>
        </>
      }
    >
      <div className="space-y-4">
        <TextAreaField
          label="Reason for rejection"
          name="rejectionReason"
          required
          rows={4}
          placeholder="e.g. The discount on line 2 was not approved by the client."
          value={reason}
          error={error}
          onChange={(value) => {
            setReason(value);
            setError("");
          }}
        />

        <p className="rounded-xl bg-ink-50 px-4 py-3 text-[13px] leading-relaxed text-ink-600">
          The sender sees this reason on the document, can edit it again, and can
          resubmit for approval. No signature is applied to a rejected document.
        </p>
      </div>
    </BaseModal>
  );
}
