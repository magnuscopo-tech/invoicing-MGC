const fs = require("fs");
const path = require("path");

// Document numbers contain slashes ("MCI/26-27/003") which cannot go into a filename.
const sanitizeFileName = (value) =>
  String(value || "file")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const ensureDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};

// Silently removes a temp/replaced file - never throws into the request flow.
const removeFileIfExists = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.error("File Cleanup Error:", error.message);
  }
  return false;
};

// Converts a stored public path ("/uploads/logos/x.png") to an absolute disk path.
const toAbsolutePublicPath = (publicPath) => {
  if (!publicPath) return "";
  if (/^(data:|https?:\/\/)/i.test(publicPath)) return "";
  const relative = publicPath.replace(/^\/+/, "");
  return path.join(__dirname, "..", "public", relative);
};

// Converts a stored public path to an absolute URL for API responses.
const toPublicUrl = (publicPath) => {
  if (!publicPath) return "";
  if (/^(https?:\/\/|data:)/i.test(publicPath)) return publicPath;
  const base = (process.env.APP_BASE_URL || "").replace(/\/+$/, "");
  return `${base}${publicPath.startsWith("/") ? "" : "/"}${publicPath}`;
};

module.exports = {
  sanitizeFileName,
  ensureDirectory,
  removeFileIfExists,
  toAbsolutePublicPath,
  toPublicUrl,
};
