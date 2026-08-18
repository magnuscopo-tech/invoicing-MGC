const multer = require("multer");

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const ALLOWED_EXT = [".png", ".jpg", ".jpeg", ".webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

const fileFilter = (req, file, cb) => {
  const path = require("path");
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
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

// Kept as a route helper so existing routes can continue to describe intent.
const setUploadFolder = (folder) => (req, res, next) => {
  req.uploadFolder = folder;
  return next();
};

module.exports = { uploadImage, setUploadFolder, MAX_FILE_SIZE, ALLOWED_MIME };
