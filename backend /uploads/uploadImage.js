const path = require("path");
const multer = require("multer");
const { ensureDirectory, sanitizeFileName } = require("../utils/fileHelper");

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const ALLOWED_EXT = [".png", ".jpg", ".jpeg", ".webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

// Sub-folder is decided by the route through req.uploadFolder ("logos" | "signatures").
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.uploadFolder || "misc";
    const dir = path.join(__dirname, "..", "public", "uploads", folder);
    ensureDirectory(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = sanitizeFileName(path.basename(file.originalname, ext)).slice(0, 40);
    cb(null, `${Date.now()}-${base || "image"}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME.includes(file.mimetype) || !ALLOWED_EXT.includes(ext)) {
    // statusCode is read by the global error handler so a bad file type surfaces
    // as a validation failure rather than an unexpected server error.
    const error = new Error("Only PNG, JPG and WEBP image files are allowed");
    error.statusCode = 422;
    return cb(error);
  }
  return cb(null, true);
};

const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

// Route helper: sets the destination folder before multer runs.
const setUploadFolder = (folder) => (req, res, next) => {
  req.uploadFolder = folder;
  return next();
};

module.exports = { uploadImage, setUploadFolder, MAX_FILE_SIZE, ALLOWED_MIME };
