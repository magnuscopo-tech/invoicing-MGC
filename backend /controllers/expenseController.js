const {
  createTransactionSchema,
  updateTransactionSchema,
  transactionScopeSchema,
  transactionListQuerySchema,
  cashFlowTrendQuerySchema,
  topPartiesQuerySchema,
  importBatchQuerySchema,
  uploadStatementSchema,
} = require("../validators/transactionValidators");
const {
  fetchCreateTransaction,
  fetchAllTransactions,
  fetchTransactionDetail,
  fetchUpdateTransaction,
  fetchDeleteTransaction,
  fetchImportBatches,
  fetchDeleteImportBatch,
} = require("../services/transactionService");
const {
  fetchBulkUploadStatement,
  fetchDownloadTemplate,
  fetchExportTransactions,
  fetchCashBookMeta,
} = require("../services/expenseImportService");
const {
  fetchCashFlowSummary,
  fetchCashFlowTrend,
  fetchCategoryBreakdown,
  fetchTopParties,
  fetchPaymentModeSplit,
  fetchDailyCashFlow,
} = require("../services/expenseReportService");

// Every read endpoint validates its query the same way, so the boilerplate is
// shared exactly as it is on the reporting router.
const withValidatedQuery = (schema, handler, label) => async (req, res) => {
  try {
    const { error, value } = schema.validate(req.query);
    if (error) return res.status(422).json({ message: error.details[0].message });
    req.query = value;
    await handler(req, res);
  } catch (error) {
    console.error(`Error ${label}:`, error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const withValidatedBody = (schema, handler, label) => async (req, res) => {
  try {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(422).json({ message: error.details[0].message });
    req.body = value;
    await handler(req, res);
  } catch (error) {
    console.error(`Error ${label}:`, error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

/* -------------------------------- Ledger CRUD -------------------------------- */

const createTransaction = withValidatedBody(
  createTransactionSchema,
  fetchCreateTransaction,
  "Create Transaction"
);

const getAllTransactions = withValidatedQuery(
  transactionListQuerySchema,
  fetchAllTransactions,
  "Get All Transactions"
);

const getTransactionDetail = async (req, res) => {
  try {
    await fetchTransactionDetail(req, res);
  } catch (error) {
    console.error("Error Get Transaction Detail:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const updateTransaction = withValidatedBody(
  updateTransactionSchema,
  fetchUpdateTransaction,
  "Update Transaction"
);

const deleteTransaction = async (req, res) => {
  try {
    await fetchDeleteTransaction(req, res);
  } catch (error) {
    console.error("Error Delete Transaction:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const getCashBookMeta = async (req, res) => {
  try {
    await fetchCashBookMeta(req, res);
  } catch (error) {
    console.error("Error Get Cash Book Meta:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

/* ---------------------------- Import (admin only) ---------------------------- */

// Multipart, so the options ride in req.body as strings and Joi coerces them.
const bulkUploadStatement = withValidatedBody(
  uploadStatementSchema,
  fetchBulkUploadStatement,
  "Bulk Upload Statement"
);

const getImportBatches = withValidatedQuery(
  importBatchQuerySchema,
  fetchImportBatches,
  "Get Import Batches"
);

const deleteImportBatch = async (req, res) => {
  try {
    await fetchDeleteImportBatch(req, res);
  } catch (error) {
    console.error("Error Delete Import Batch:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const downloadTemplate = async (req, res) => {
  try {
    await fetchDownloadTemplate(req, res);
  } catch (error) {
    console.error("Error Download Template:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const exportTransactions = withValidatedQuery(
  transactionScopeSchema,
  fetchExportTransactions,
  "Export Transactions"
);

/* --------------------------- Dashboard (admin only) --------------------------- */

const getCashFlowSummary = withValidatedQuery(
  transactionScopeSchema,
  fetchCashFlowSummary,
  "Get Cash Flow Summary"
);

const getCashFlowTrend = withValidatedQuery(
  cashFlowTrendQuerySchema,
  fetchCashFlowTrend,
  "Get Cash Flow Trend"
);

const getCategoryBreakdown = withValidatedQuery(
  transactionScopeSchema,
  fetchCategoryBreakdown,
  "Get Category Breakdown"
);

const getTopParties = withValidatedQuery(
  topPartiesQuerySchema,
  fetchTopParties,
  "Get Top Parties"
);

const getPaymentModeSplit = withValidatedQuery(
  transactionScopeSchema,
  fetchPaymentModeSplit,
  "Get Payment Mode Split"
);

const getDailyCashFlow = withValidatedQuery(
  transactionScopeSchema,
  fetchDailyCashFlow,
  "Get Daily Cash Flow"
);

module.exports = {
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
};
