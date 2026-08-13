import {
  GetAllTransactionsApi,
  GetTransactionDetailApi,
  GetCashBookMetaApi,
  CreateTransactionApi,
  UpdateTransactionApi,
  DeleteTransactionApi,
  BulkUploadStatementApi,
  GetImportBatchesApi,
  DeleteImportBatchApi,
  DownloadExpenseTemplateApi,
  ExportTransactionsApi,
  GetCashFlowSummaryApi,
  GetCashFlowTrendApi,
  GetCategoryBreakdownApi,
  GetTopPartiesApi,
  GetPaymentModeSplitApi,
  GetDailyCashFlowApi,
} from "../apiMethod";
import { itemsOf } from "../../Utlis/Common/commonMethod";

/* --------------------------------- Ledger --------------------------------- */

// Carries the filtered totals alongside the page of rows, so the footer under
// the table can report the whole filtered set rather than just what is visible.
const handleGetAllTransactions = async (params = { page: 1, limit: 25 }) => {
  try {
    const response = await GetAllTransactionsApi(params);
    if (response.statusCode === 200) {
      const items = itemsOf(response.raw.data);
      return {
        items,
        total: response.raw.total || 0,
        page: response.raw.page || 1,
        limit: response.raw.limit || 25,
        totals: response.raw.totals || {
          totalCredit: 0,
          totalDebit: 0,
          netFlow: 0,
          creditCount: 0,
          debitCount: 0,
        },
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return null;
  }
};

const handleGetTransactionDetail = async (id) => {
  try {
    const response = await GetTransactionDetailApi(id);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching transaction detail:", error);
    return null;
  }
};

// The categories and payment modes the API will actually accept, plus the party
// names already in the book for autocomplete.
const handleGetCashBookMeta = async () => {
  try {
    const response = await GetCashBookMetaApi();
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching cash book metadata:", error);
    return null;
  }
};

const handleCreateTransaction = async (params) => {
  try {
    const response = await CreateTransactionApi(params);
    if (response.statusCode === 200 || response.statusCode === 201) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error creating transaction:", error);
    return null;
  }
};

const handleUpdateTransaction = async (id, params) => {
  try {
    const response = await UpdateTransactionApi(id, params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error updating transaction:", error);
    return null;
  }
};

const handleDeleteTransaction = async (id) => {
  try {
    const response = await DeleteTransactionApi(id);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return null;
  }
};

/* --------------------------------- Import --------------------------------- */

/*
 * Returns the whole import receipt rather than a bare success flag. A partial
 * import is the normal case with real bank files, and the caller needs the
 * counts and the per-row reasons to tell the admin what actually happened.
 */
const handleBulkUploadStatement = async (formData) => {
  try {
    const response = await BulkUploadStatementApi(formData);
    if (response.statusCode === 200 || response.statusCode === 201) {
      return {
        batch: response.raw.data?.batch || null,
        needsReview: response.raw.data?.needsReview || 0,
        errors: itemsOf(response.raw.data?.errors),
        message: response.message,
      };
    }
    return null;
  } catch (error) {
    console.error("Error uploading statement:", error);
    return null;
  }
};

const handleGetImportBatches = async (params = { page: 1, limit: 20 }) => {
  try {
    const response = await GetImportBatchesApi(params);
    if (response.statusCode === 200) {
      const items = itemsOf(response.raw.data);
      return {
        items,
        total: response.raw.total || 0,
        page: response.raw.page || 1,
        limit: response.raw.limit || 20,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching import batches:", error);
    return null;
  }
};

const handleDeleteImportBatch = async (id) => {
  try {
    const response = await DeleteImportBatchApi(id);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error reverting import batch:", error);
    return null;
  }
};

// Both downloads come back as blobs; the caller saves them with
// downloadBlobAsFile.
const handleDownloadExpenseTemplate = async () => {
  try {
    const response = await DownloadExpenseTemplateApi();
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error downloading template:", error);
    return null;
  }
};

const handleExportTransactions = async (params = {}) => {
  try {
    const response = await ExportTransactionsApi(params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error exporting transactions:", error);
    return null;
  }
};

/* -------------------------------- Dashboard -------------------------------- */

const handleGetCashFlowSummary = async (params) => {
  try {
    const response = await GetCashFlowSummaryApi(params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching cash flow summary:", error);
    return null;
  }
};

const handleGetCashFlowTrend = async (params) => {
  try {
    const response = await GetCashFlowTrendApi(params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching cash flow trend:", error);
    return null;
  }
};

const handleGetCategoryBreakdown = async (params) => {
  try {
    const response = await GetCategoryBreakdownApi(params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching category breakdown:", error);
    return null;
  }
};

const handleGetTopParties = async (params) => {
  try {
    const response = await GetTopPartiesApi(params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching top parties:", error);
    return null;
  }
};

const handleGetPaymentModeSplit = async (params) => {
  try {
    const response = await GetPaymentModeSplitApi(params);
    if (response.statusCode === 200) {
      return itemsOf(response.raw.data);
    }
    return null;
  } catch (error) {
    console.error("Error fetching payment mode split:", error);
    return null;
  }
};

const handleGetDailyCashFlow = async (params) => {
  try {
    const response = await GetDailyCashFlowApi(params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching daily cash flow:", error);
    return null;
  }
};

export {
  handleGetAllTransactions,
  handleGetTransactionDetail,
  handleGetCashBookMeta,
  handleCreateTransaction,
  handleUpdateTransaction,
  handleDeleteTransaction,
  handleBulkUploadStatement,
  handleGetImportBatches,
  handleDeleteImportBatch,
  handleDownloadExpenseTemplate,
  handleExportTransactions,
  handleGetCashFlowSummary,
  handleGetCashFlowTrend,
  handleGetCategoryBreakdown,
  handleGetTopParties,
  handleGetPaymentModeSplit,
  handleGetDailyCashFlow,
};
