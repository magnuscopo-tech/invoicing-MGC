import { apiHost } from "../Services/apiConstant";

/*
 * Uploaded assets (logos, signatures, PDFs) come back as server paths such as
 * "/uploads/signatures/x.png". Rendered as-is they resolve against the frontend
 * origin and 404, so anything relative is pinned to the API host.
 */
export const resolveAssetUrl = (value) => {
  if (!value) return "";
  if (/^(https?:|blob:|data:)/i.test(value)) return value;
  const base = String(apiHost).replace(/\/+$/, "");
  return `${base}${value.startsWith("/") ? "" : "/"}${value}`;
};

export const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
