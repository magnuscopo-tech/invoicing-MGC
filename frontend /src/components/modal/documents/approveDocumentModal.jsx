import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ImageOff,
  PenLine,
  RefreshCw,
  Trash2,
  UploadCloud,
  Wallet,
} from "lucide-react";
import BaseModal from "../baseModal";
import CustomButton from "../../custom/customButton";
import { handleApproveDocument } from "../../../Services/apiCalling/documentApis";
import {
  ErrorMessage,
  SuccessMessage,
} from "../../../Utlis/Toastify/ToastMessage";
import { formatCurrency } from "../../../Utlis/currencyFormat";
import { formatFileSize, resolveAssetUrl } from "../../../Utlis/assetUrl";
import { DOC_TYPES } from "../../../constants/document.constants";

const MAX_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

/*
 * Approving is what applies the signature. Until this happens the server refuses
 * to render one, so the PDF the sender downloaded is unsigned by construction.
 */
export default function ApproveDocumentModal({
  open,
  document: pendingDocument,
  onClose = () => {},
  onSuccess = () => {},
}) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewFailed, setPreviewFailed] = useState(false);
  const [approving, setApproving] = useState(false);
  const inputRef = useRef(null);
  const objectUrlRef = useRef("");

  const companySignature = resolveAssetUrl(
    pendingDocument?.company?.signatureUrl
  );
  // Signing a tax invoice is the act that records the payment as received.
  const confirmsPayment = pendingDocument?.docType === DOC_TYPES.invoice;

  // The object URL for an uploaded file is revoked whenever it is replaced or
  // the modal closes, so a long approvals session does not leak blobs.
  const applyPreview = (nextUrl) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
    setPreviewFailed(false);
  };

  useEffect(() => {
    if (open) {
      setFile(null);
      applyPreview("");
    }
  }, [open]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    []
  );

  const onFileSelect = (event) => {
    const selected = event.target.files?.[0];
    // Reset so re-picking the same file still fires onChange.
    event.target.value = "";
    if (!selected) return;

    if (!ALLOWED_TYPES.includes(selected.type)) {
      ErrorMessage("Only PNG, JPG or WEBP images are allowed.");
      return;
    }
    if (selected.size > MAX_SIZE_BYTES) {
      ErrorMessage("Signature image is larger than the 2 MB limit.");
      return;
    }

    setFile(selected);
    applyPreview(URL.createObjectURL(selected));
  };

  const onClearFile = () => {
    setFile(null);
    applyPreview("");
  };

  const onApprove = async () => {
    if (!file && !companySignature) {
      ErrorMessage("Upload a signature — this company has none saved.");
      return;
    }

    setApproving(true);
    try {
      const result = await handleApproveDocument(pendingDocument._id, file);
      if (result) {
        SuccessMessage(
          confirmsPayment
            ? `${result.docNumber} approved and signed. Payment confirmed — the invoice and its proforma are now marked paid.`
            : `${result.docNumber} approved and signed.`
        );
        onSuccess(result);
        onClose();
      }
    } finally {
      setApproving(false);
    }
  };

  if (!pendingDocument) return null;

  const activeSignature = previewUrl || companySignature;

  return (
    <BaseModal
      open={open}
      title="Approve & sign"
      description={`${pendingDocument.docNumber} — the signature is applied as part of approving.`}
      size="md"
      onClose={onClose}
      footer={
        <>
          <CustomButton variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </CustomButton>
          <CustomButton
            size="sm"
            icon={CheckCircle2}
            loading={approving}
            onClick={onApprove}
          >
            Approve &amp; sign
          </CustomButton>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[13px] font-bold text-ink-950">
                {pendingDocument.docNumber}
              </p>
              <p className="mt-0.5 truncate text-[13px] text-ink-500">
                {pendingDocument.client?.name}
              </p>
            </div>
            <p className="shrink-0 text-[15px] font-bold text-ink-950 tabular-nums">
              {formatCurrency(pendingDocument.totalAmount)}
            </p>
          </div>
        </div>

        <div>
          <p className="field-label">Authorised signature</p>

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onFileSelect}
          />

          {activeSignature ? (
            /*
             * Once a signature is in play the admin sees the actual image that
             * will be stamped onto the PDF, not just its file name — a wrong
             * signature cannot be undone after approval.
             */
            <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
              <div className="flex min-h-[7.5rem] items-center justify-center bg-[linear-gradient(45deg,#f4f4f5_25%,transparent_25%,transparent_75%,#f4f4f5_75%),linear-gradient(45deg,#f4f4f5_25%,transparent_25%,transparent_75%,#f4f4f5_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px] p-4">
                {previewFailed ? (
                  <span className="flex flex-col items-center gap-1.5 text-ink-400">
                    <ImageOff size={22} />
                    <span className="text-xs">
                      Preview unavailable — upload a signature for this document
                    </span>
                  </span>
                ) : (
                  <img
                    src={activeSignature}
                    alt="Authorised signature preview"
                    className="max-h-24 max-w-full object-contain"
                    onError={() => setPreviewFailed(true)}
                  />
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-ink-100 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-ink-800">
                    {file ? file.name : "Saved company signature"}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {file
                      ? `${formatFileSize(file.size)} · used for this document only`
                      : "Applied unless you upload one for this document"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-50"
                  >
                    <RefreshCw size={13} />
                    Change
                  </button>
                  {file && (
                    <button
                      type="button"
                      onClick={onClearFile}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                      title={
                        companySignature
                          ? "Remove and fall back to the company signature"
                          : "Remove"
                      }
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-ink-200 bg-white px-6 py-8 text-center transition-all duration-200 hover:border-primary-300 hover:bg-primary-50/40"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-100 text-ink-400">
                <PenLine size={22} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink-800">
                  Click to upload a signature
                </span>
                <span className="mt-0.5 block text-xs text-ink-400">
                  PNG, JPG or WEBP · up to 2 MB
                </span>
              </span>
            </button>
          )}

          {!companySignature && !file && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
              This company has no saved signature, so one must be uploaded here
              before the document can be approved.
            </p>
          )}
        </div>

        {confirmsPayment && (
          <p className="flex gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-[13px] leading-relaxed text-emerald-800">
            <Wallet size={15} className="mt-0.5 shrink-0" />
            Approving a tax invoice confirms the client has paid. This invoice
            and the proforma it came from are both marked paid, so only approve
            it once the payment has actually landed.
          </p>
        )}

        <p className="flex gap-2 rounded-xl bg-primary-50 px-4 py-3 text-[13px] leading-relaxed text-primary-800">
          <UploadCloud size={15} className="mt-0.5 shrink-0" />
          Approving stamps this signature onto the document and regenerates the
          PDF, so the downloaded file is the signed copy. The document then locks
          against further edits.
        </p>
      </div>
    </BaseModal>
  );
}
