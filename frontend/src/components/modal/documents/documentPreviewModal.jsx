import { useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import BaseModal from "../baseModal";
import CustomButton from "../../custom/customButton";
import {
  handleDownloadDocument,
  handlePreviewDocumentHtml,
} from "../../../Services/apiCalling/documentApis";

export default function DocumentPreviewModal({
  open,
  documentId,
  docNumber = "document",
  initialSeparatePricing = true,
  onClose = () => {},
}) {
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [separatePricing, setSeparatePricing] = useState(initialSeparatePricing);

  useEffect(() => {
    if (open) setSeparatePricing(initialSeparatePricing);
  }, [open, initialSeparatePricing]);

  useEffect(() => {
    if (!open || !documentId) return;

    const fetchPreview = async () => {
      setLoading(true);
      try {
        // The endpoint needs the auth header, so the HTML is injected as
        // srcdoc rather than pointed at with an iframe src.
        const html = await handlePreviewDocumentHtml(documentId, {
          separatePricing,
        });
        if (iframeRef.current && html) {
          iframeRef.current.srcdoc = html;
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [open, documentId, separatePricing]);

  const onDownload = async () => {
    setDownloading(true);
    try {
      await handleDownloadDocument(documentId, docNumber, {
        separatePricing,
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <BaseModal
      open={open}
      title="Document preview"
      description={docNumber}
      size="full"
      onClose={onClose}
      footer={
        <>
          <CustomButton variant="secondary" size="sm" onClick={onClose}>
            Close
          </CustomButton>
          <CustomButton
            size="sm"
            icon={Download}
            loading={downloading}
            onClick={onDownload}
          >
            Download PDF
          </CustomButton>
        </>
      }
    >
      <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-ink-200 bg-white px-4 py-3">
        <p className="text-sm font-semibold text-ink-900">Separate pricing</p>
        <button
          type="button"
          role="switch"
          aria-checked={separatePricing}
          disabled={loading || downloading}
          onClick={() => setSeparatePricing((value) => !value)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-100 disabled:cursor-not-allowed disabled:opacity-60 ${
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

      <div className="relative min-h-[60vh] overflow-hidden rounded-xl border border-ink-200 bg-ink-50">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/80">
            <Loader2 size={26} className="animate-spin text-primary-600" />
            <p className="text-sm font-medium text-ink-500">
              Rendering preview…
            </p>
          </div>
        )}

        <iframe
          ref={iframeRef}
          title="Document preview"
          className="h-[70vh] w-full bg-white"
          sandbox="allow-same-origin"
        />
      </div>
    </BaseModal>
  );
}
