import { useEffect, useState } from "react";
import { ImageUp, PenLine, UploadCloud } from "lucide-react";
import BaseModal from "../baseModal";
import CustomButton from "../../custom/customButton";
import {
  handleUploadCompanyLogo,
  handleUploadCompanySignature,
} from "../../../Services/apiCalling/companyApis";
import { SuccessMessage, ErrorMessage } from "../../../Utlis/Toastify/ToastMessage";
import { formatFileSize, resolveAssetUrl } from "../../../Utlis/assetUrl";

const MAX_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

const ASSETS = {
  logo: {
    title: "Company logo",
    description: "Printed in the document header. PNG, JPG or WEBP up to 2 MB.",
    icon: ImageUp,
    urlKey: "logoUrl",
  },
  signature: {
    title: "Authorised signature",
    description: "Printed bottom-right on every document. Max 2 MB.",
    icon: PenLine,
    urlKey: "signatureUrl",
  },
};

export default function CompanyAssetModal({
  open,
  company = null,
  assetType = "logo",
  onClose = () => {},
  onSuccess = () => {},
}) {
  const asset = ASSETS[assetType];
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setFile(null);
      setPreviewUrl(resolveAssetUrl(company?.[asset.urlKey]));
    }
  }, [open, company, asset.urlKey]);

  const onFileSelect = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (!ALLOWED_TYPES.includes(selected.type)) {
      ErrorMessage("Only PNG, JPG or WEBP images are allowed.");
      return;
    }
    if (selected.size > MAX_SIZE_BYTES) {
      ErrorMessage("File is larger than the 2 MB limit.");
      return;
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const onUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const result =
        assetType === "logo"
          ? await handleUploadCompanyLogo(company._id, file)
          : await handleUploadCompanySignature(company._id, file);

      if (result) {
        SuccessMessage(`${asset.title} uploaded successfully.`);
        onSuccess(result);
        onClose();
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <BaseModal
      open={open}
      title={asset.title}
      description={asset.description}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <CustomButton variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </CustomButton>
          <CustomButton
            size="sm"
            icon={UploadCloud}
            loading={uploading}
            disabled={!file}
            onClick={onUpload}
          >
            Upload
          </CustomButton>
        </>
      }
    >
      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50/60 px-6 py-10 text-center transition-all duration-200 hover:border-primary-300 hover:bg-primary-50/50">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={asset.title}
            className="max-h-28 max-w-full object-contain"
          />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-primary-500 shadow-sm">
            <asset.icon size={22} />
          </span>
        )}

        <div>
          <p className="text-sm font-semibold text-ink-800">
            {file
              ? file.name
              : previewUrl
                ? "Current image — click to replace"
                : "Click to choose an image"}
          </p>
          <p className="mt-0.5 text-xs text-ink-400">
            {file
              ? `${formatFileSize(file.size)} · preview above`
              : "PNG, JPG or WEBP · up to 2 MB"}
          </p>
        </div>

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onFileSelect}
        />
      </label>
    </BaseModal>
  );
}
