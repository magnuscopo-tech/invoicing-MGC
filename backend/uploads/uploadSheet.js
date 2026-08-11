const path = require("path");
const multer = require("multer");
const { ensureDirectory, sanitizeFileName } = require("../utils/fileHelper");

const ALLOWED_MIME = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream", // some browsers send this for .xlsx
];
const ALLOWED_EXT = [".xlsx", ".xlsm"];
// A month of bank statement is a few hundred KB; 10 MB leaves room for a full
// year with formatting without letting an arbitrary file through.
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "..", "public", "uploads", "statements");
    ensureDirectory(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = sanitizeFileName(path.basename(file.originalname, ext)).slice(0, 40);
    cb(null, `${Date.now()}-${base || "statement"}${ext}`);
  },
});

/*
 * The extension is the real gate. Browsers are inconsistent about the MIME type
 * they attach to .xlsx - Chrome sends the long OOXML type, some send
 * application/octet-stream - so trusting MIME alone would reject valid uploads.
 * .xls is deliberately absent: exceljs cannot read the old binary format, and
 * failing here with a clear message beats failing later with a parse error.
 */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXT.includes(ext)) {
    const error = new Error(
      ext === ".xls"
        ? "The old .xls format is not supported, re-save the file as .xlsx"
        : "Only .xlsx spreadsheet files can be uploaded"
    );
    error.statusCode = 422;
    return cb(error);
  }

  if (file.mimetype && !ALLOWED_MIME.includes(file.mimetype)) {
    const error = new Error("The uploaded file is not a valid spreadsheet");
    error.statusCode = 422;
    return cb(error);
  }

  return cb(null, true);
};

const uploadSheet = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

module.exports = { uploadSheet, MAX_FILE_SIZE, ALLOWED_EXT };
