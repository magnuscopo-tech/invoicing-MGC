import { useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import BaseModal from "../baseModal";
import CustomButton from "../../custom/customButton";
import {
  handleDownloadDocument,
  handlePreviewDocumentHtml,
} from "../../../Services/apiCalling/documentApis";
import {
  downloadBlobAsFile,
  safeFileName,
} from "../../../Utlis/Common/commonMethod";

export default function DocumentPreviewModal({
  open,
  documentId,
  docNumber = "document",
  onClose = () => {},
}) {
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open || !documentId) return;

    const fetchPreview = async () => {
      setLoading(true);
      try {
        // The endpoint needs the auth header, so the HTML is injected as
        // srcdoc rather than pointed at with an iframe src.
        const html = await handlePreviewDocumentHtml(documentId);
        if (iframeRef.current && html) {
          iframeRef.current.srcdoc = html;
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [open, documentId]);

  const onDownload = async () => {
    setDownloading(true);
    try {
      const blob = await handleDownloadDocument(documentId);
      if (blob) downloadBlobAsFile(blob, safeFileName(docNumber));
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
