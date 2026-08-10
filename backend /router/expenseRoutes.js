const express = require("express");
const expenseRouter = express.Router();
const jwtMiddleware = require("../middleware/jwtMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { uploadSheet } = require("../uploads/uploadSheet");
const {
  createTransaction,
  getAllTransactions,
  getTransactionDetail,
  updateTransaction,
  deleteTransaction,
  getCashBookMeta,
  bulkUploadStatement,
  getImportBatches,
  deleteImportBatch,
  downloadTemplate,
  exportTransactions,
  getCashFlowSummary,
  getCashFlowTrend,
  getCategoryBreakdown,
  getTopParties,
  getPaymentModeSplit,
  getDailyCashFlow,
} = require("../controllers/expenseController");

/*
 * The cash book splits along one line: keeping the book versus reading it.
 *
 *   Finance users KEEP the book - they record what was paid and what came in,
 *   and they can see the ledger they are maintaining.
 *
 *   Admins READ it - bulk import, the dashboard, the export and reverting an
 *   import are all admin only, because each of those either rewrites the book
 *   wholesale or aggregates it into a company-wide financial picture.
 *
 * The client hides what a finance user cannot use; this router is what actually
 * enforces it.
 */

/* ------------------------- Shared: keeping the book ------------------------- */

expenseRouter.get("/getAllTransactions", jwtMiddleware, getAllTransactions);
expenseRouter.get("/getTransactionDetail/:id", jwtMiddleware, getTransactionDetail);
expenseRouter.get("/getCashBookMeta", jwtMiddleware, getCashBookMeta);
expenseRouter.post("/createTransaction", jwtMiddleware, createTransaction);
// The service additionally refuses a finance user editing an imported row.
expenseRouter.put("/updateTransaction/:id", jwtMiddleware, updateTransaction);

// Removing a booked entry is an admin action - correcting one is not.
expenseRouter.delete(
  "/deleteTransaction/:id",
  jwtMiddleware,
  adminMiddleware,
  deleteTransaction
);

/* --------------------------- Admin: bulk import --------------------------- */

expenseRouter.post(
  "/bulkUploadStatement",
  jwtMiddleware,
  adminMiddleware,
  uploadSheet.single("file"),
  bulkUploadStatement
);
expenseRouter.get(
  "/getImportBatches",
  jwtMiddleware,
  adminMiddleware,
  getImportBatches
);
expenseRouter.delete(
  "/deleteImportBatch/:id",
  jwtMiddleware,
  adminMiddleware,
  deleteImportBatch
);
expenseRouter.get(
  "/downloadTemplate",
  jwtMiddleware,
  adminMiddleware,
  downloadTemplate
);
expenseRouter.get(
  "/exportTransactions",
  jwtMiddleware,
  adminMiddleware,
  exportTransactions
);

/* ---------------------------- Admin: dashboard ---------------------------- */

expenseRouter.get(
  "/getCashFlowSummary",
  jwtMiddleware,
  adminMiddleware,
  getCashFlowSummary
);
expenseRouter.get(
  "/getCashFlowTrend",
  jwtMiddleware,
  adminMiddleware,
  getCashFlowTrend
);
expenseRouter.get(
  "/getCategoryBreakdown",
  jwtMiddleware,
  adminMiddleware,
  getCategoryBreakdown
);
expenseRouter.get("/getTopParties", jwtMiddleware, adminMiddleware, getTopParties);
expenseRouter.get(
  "/getPaymentModeSplit",
  jwtMiddleware,
  adminMiddleware,
  getPaymentModeSplit
);
expenseRouter.get(
  "/getDailyCashFlow",
  jwtMiddleware,
  adminMiddleware,
  getDailyCashFlow
);

module.exports = expenseRouter;
