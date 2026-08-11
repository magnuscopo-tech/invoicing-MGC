const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const multer = require("multer");

const connectDb = require("./config/db");
const { ensureDirectory } = require("./utils/fileHelper");
const { closeBrowser } = require("./services/pdfService");

const authRouter = require("./router/authRoutes");
const companyRouter = require("./router/companyRoutes");
const clientRouter = require("./router/clientRoutes");
const serviceRouter = require("./router/serviceRoutes");
const documentRouter = require("./router/documentRoutes");
const billingPlanRouter = require("./router/billingPlanRoutes");
const reportRouter = require("./router/reportRoutes");
const expenseRouter = require("./router/expenseRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Cross-origin resource policy is relaxed so the frontend can render stored logos
// and signatures served from /uploads. PDFs are never stored - they are printed
// per request and streamed from the download route.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// "statements" holds an uploaded workbook only for the life of one import; the
// importer deletes it as soon as the rows are booked.
["logos", "signatures", "statements"].forEach((folder) =>
  ensureDirectory(path.join(__dirname, "public", "uploads", folder))
);
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

app.get("/health", (req, res) =>
  res.status(200).json({
    success: true,
    message: "Invoicing API is running",
    data: { uptime: process.uptime() },
    statusCode: 200,
  })
);

app.use("/api/auth", authRouter);
app.use("/api/company", companyRouter);
app.use("/api/client", clientRouter);
app.use("/api/service", serviceRouter);
app.use("/api/document", documentRouter);
app.use("/api/billing", billingPlanRouter);
app.use("/api/report", reportRouter);
app.use("/api/expense", expenseRouter);

app.use((req, res) =>
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    statusCode: 404,
  })
);

// Catches multer, CORS and any error thrown before a service could respond.
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.message);

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File is too large, maximum allowed size is 2 MB"
        : err.message;
    return res.status(422).json({ success: false, message, statusCode: 422 });
  }

  const statusCode = err.statusCode || (/CORS/i.test(err.message) ? 403 : 500);
  return res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    statusCode,
  });
});

const startServer = async () => {
  await connectDb();
  const server = app.listen(PORT, () =>
    console.log(`Invoicing API listening on port ${PORT}`)
  );

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down`);
    await closeBrowser();
    server.close(() => process.exit(0));
  };
  ["SIGINT", "SIGTERM"].forEach((signal) =>
    process.on(signal, () => shutdown(signal))
  );
};

startServer();

module.exports = app;
