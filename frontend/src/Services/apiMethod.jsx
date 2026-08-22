import { apiConstant } from "./apiConstant";
import apiRequest from "./apiService";

/* ---------------------------------- Auth ---------------------------------- */

export const RegisterApi = (params) => {
  return apiRequest(apiConstant.register, "Post", params, true);
};

export const LogInApi = (params) => {
  return apiRequest(apiConstant.logIn, "Post", params, true);
};

export const GetProfileApi = () => {
  return apiRequest(apiConstant.getProfile, "Get");
};

export const ChangePasswordApi = (params) => {
  return apiRequest(apiConstant.changePassword, "Post", params, true);
};

export const SignOutApi = () => {
  return apiRequest(apiConstant.signOut, "Post", {}, true);
};

// Authenticated admin-side user creation. Public register cannot grant a role.
export const CreateUserApi = (params) => {
  return apiRequest(apiConstant.createUser, "Post", params, true);
};

export const GetAllUsersApi = (params) => {
  return apiRequest(apiConstant.getAllUsers, "Get", params);
};

export const UpdateUserStatusApi = (id, params) => {
  return apiRequest(apiConstant.updateUserStatus(id), "Put", params, true);
};

/* -------------------------------- Companies -------------------------------- */

export const GetAllCompaniesApi = (params) => {
  return apiRequest(apiConstant.getAllCompanies, "Get", params);
};

export const GetCompanyDetailApi = (id) => {
  return apiRequest(apiConstant.getCompanyDetail(id), "Get");
};

export const CreateCompanyApi = (params) => {
  return apiRequest(apiConstant.createCompany, "Post", params, true);
};

export const UpdateCompanyApi = (id, params) => {
  return apiRequest(apiConstant.updateCompany(id), "Put", params, true);
};

export const DeleteCompanyApi = (id) => {
  return apiRequest(apiConstant.deleteCompany(id), "Delete", {}, true);
};

export const UploadCompanyLogoApi = (id, params) => {
  return apiRequest(apiConstant.uploadCompanyLogo(id), "Post", params, true);
};

export const UploadCompanySignatureApi = (id, params) => {
  return apiRequest(
    apiConstant.uploadCompanySignature(id),
    "Post",
    params,
    true
  );
};

/* --------------------------------- Clients --------------------------------- */

export const GetAllClientsApi = (params) => {
  return apiRequest(apiConstant.getAllClients, "Get", params);
};

export const GetClientDetailApi = (id) => {
  return apiRequest(apiConstant.getClientDetail(id), "Get");
};

export const CreateClientApi = (params) => {
  return apiRequest(apiConstant.createClient, "Post", params, true);
};

export const UpdateClientApi = (id, params) => {
  return apiRequest(apiConstant.updateClient(id), "Put", params, true);
};

export const DeleteClientApi = (id) => {
  return apiRequest(apiConstant.deleteClient(id), "Delete", {}, true);
};

/* ---------------------------- Service catalogue ---------------------------- */

export const GetAllServicesApi = (params) => {
  return apiRequest(apiConstant.getAllServices, "Get", params);
};

export const GetServiceDetailApi = (id) => {
  return apiRequest(apiConstant.getServiceDetail(id), "Get");
};

export const CreateServiceApi = (params) => {
  return apiRequest(apiConstant.createService, "Post", params, true);
};

export const UpdateServiceApi = (id, params) => {
  return apiRequest(apiConstant.updateService(id), "Put", params, true);
};

export const DeleteServiceApi = (id) => {
  return apiRequest(apiConstant.deleteService(id), "Delete", {}, true);
};

/* -------------------------------- Documents -------------------------------- */

export const GetNextNumberApi = (type, companyId, date) => {
  return apiRequest(apiConstant.getNextNumber(type, companyId, date), "Get");
};

export const GetAllDocumentsApi = (params) => {
  return apiRequest(apiConstant.getAllDocuments, "Get", params);
};

export const GetDocumentDetailApi = (id) => {
  return apiRequest(apiConstant.getDocumentDetail(id), "Get");
};

export const GetDocumentChainApi = (id) => {
  return apiRequest(apiConstant.getDocumentChain(id), "Get");
};

export const PreviewDocumentHtmlApi = (id, options = {}) => {
  return apiRequest(
    apiConstant.previewDocumentHtml(id, options.separatePricing),
    "Get",
    {},
    false,
    {},
    "text"
  );
};

export const DownloadDocumentApi = (id, options = {}) => {
  return apiRequest(
    apiConstant.downloadDocument(id, options.separatePricing),
    "Get",
    {},
    false,
    {},
    "blob"
  );
};

export const CreateDocumentApi = (params) => {
  return apiRequest(apiConstant.createDocument, "Post", params, true);
};

export const ConvertDocumentApi = (id, params) => {
  return apiRequest(apiConstant.convertDocument(id), "Post", params, true);
};

export const UpdateDocumentApi = (id, params) => {
  return apiRequest(apiConstant.updateDocument(id), "Put", params, true);
};

export const UpdateDocumentStatusApi = (id, params) => {
  return apiRequest(apiConstant.updateDocumentStatus(id), "Put", params, true);
};

export const DeleteDocumentApi = (id) => {
  return apiRequest(apiConstant.deleteDocument(id), "Delete", {}, true);
};

export const SubmitForApprovalApi = (id) => {
  return apiRequest(apiConstant.submitForApproval(id), "Post", {}, true);
};

// Multipart: `params` is FormData carrying an optional signature file.
export const ApproveDocumentApi = (id, params) => {
  return apiRequest(apiConstant.approveDocument(id), "Post", params, true);
};

export const RejectDocumentApi = (id, params) => {
  return apiRequest(apiConstant.rejectDocument(id), "Post", params, true);
};

/* ------------------------------ Split billing ------------------------------ */

export const GetAllBillingPlansApi = (params) => {
  return apiRequest(apiConstant.getAllBillingPlans, "Get", params);
};

export const GetBillingPlanApi = (id) => {
  return apiRequest(apiConstant.getBillingPlan(id), "Get");
};

export const GetBillingPlanForDocumentApi = (id) => {
  return apiRequest(apiConstant.getBillingPlanForDocument(id), "Get");
};

export const CreateBillingPlanApi = (params) => {
  return apiRequest(apiConstant.createBillingPlan, "Post", params, true);
};

export const GenerateInstallmentApi = (id, params) => {
  return apiRequest(apiConstant.generateInstallment(id), "Post", params, true);
};

export const RecordInstallmentPaymentApi = (id, index, params) => {
  return apiRequest(
    apiConstant.recordInstallmentPayment(id, index),
    "Post",
    params,
    true
  );
};

export const RaiseFinalInvoiceApi = (id, params) => {
  return apiRequest(apiConstant.raiseFinalInvoice(id), "Post", params, true);
};

export const CancelInstallmentApi = (id, index, params) => {
  return apiRequest(apiConstant.cancelInstallment(id, index), "Post", params, true);
};

export const CloseBillingPlanEarlyApi = (id, params) => {
  return apiRequest(apiConstant.closeBillingPlanEarly(id), "Post", params, true);
};

export const CancelBillingPlanApi = (id, params) => {
  return apiRequest(apiConstant.cancelBillingPlan(id), "Post", params, true);
};

/* --------------------------- Reports (admin only) -------------------------- */

export const GetFinancialSummaryApi = (params) => {
  return apiRequest(apiConstant.getFinancialSummary, "Get", params);
};

export const GetRevenueTrendApi = (params) => {
  return apiRequest(apiConstant.getRevenueTrend, "Get", params);
};

export const GetDocumentBreakdownApi = (params) => {
  return apiRequest(apiConstant.getDocumentBreakdown, "Get", params);
};

export const GetTopClientsApi = (params) => {
  return apiRequest(apiConstant.getTopClients, "Get", params);
};

export const GetGstSummaryApi = (params) => {
  return apiRequest(apiConstant.getGstSummary, "Get", params);
};

export const GetReceivablesAgeingApi = (params) => {
  return apiRequest(apiConstant.getReceivablesAgeing, "Get", params);
};

export const GetConversionFunnelApi = (params) => {
  return apiRequest(apiConstant.getConversionFunnel, "Get", params);
};

export const GetCompanyPerformanceApi = (params) => {
  return apiRequest(apiConstant.getCompanyPerformance, "Get", params);
};

export const GetWorkspaceOverviewApi = () => {
  return apiRequest(apiConstant.getWorkspaceOverview, "Get");
};

export const GetAuditTrailApi = (params) => {
  return apiRequest(apiConstant.getAuditTrail, "Get", params);
};

export const GetDocumentLedgerApi = (params) => {
  return apiRequest(apiConstant.getDocumentLedger, "Get", params);
};

/* --------------------------------- Cash book -------------------------------- */

export const GetAllTransactionsApi = (params) => {
  return apiRequest(apiConstant.getAllTransactions, "Get", params);
};

export const GetTransactionDetailApi = (id) => {
  return apiRequest(apiConstant.getTransactionDetail(id), "Get");
};

export const GetCashBookMetaApi = () => {
  return apiRequest(apiConstant.getCashBookMeta, "Get");
};

export const CreateTransactionApi = (params) => {
  return apiRequest(apiConstant.createTransaction, "Post", params, true);
};

export const UpdateTransactionApi = (id, params) => {
  return apiRequest(apiConstant.updateTransaction(id), "Put", params, true);
};

export const DeleteTransactionApi = (id) => {
  return apiRequest(apiConstant.deleteTransaction(id), "Delete", {}, true);
};

/* ---------------------- Cash book: import (admin only) ---------------------- */

// Multipart: `params` is FormData carrying the .xlsx plus the import options.
export const BulkUploadStatementApi = (params) => {
  return apiRequest(apiConstant.bulkUploadStatement, "Post", params, true);
};

export const GetImportBatchesApi = (params) => {
  return apiRequest(apiConstant.getImportBatches, "Get", params);
};

export const DeleteImportBatchApi = (id) => {
  return apiRequest(apiConstant.deleteImportBatch(id), "Delete", {}, true);
};

// Both of these stream a workbook back, so the response is a blob rather than
// the usual JSON envelope.
export const DownloadExpenseTemplateApi = () => {
  return apiRequest(
    apiConstant.downloadExpenseTemplate,
    "Get",
    {},
    false,
    {},
    "blob"
  );
};

export const ExportTransactionsApi = (params) => {
  return apiRequest(
    apiConstant.exportTransactions,
    "Get",
    params,
    false,
    {},
    "blob"
  );
};

/* --------------------- Cash book: dashboard (admin only) --------------------- */

export const GetCashFlowSummaryApi = (params) => {
  return apiRequest(apiConstant.getCashFlowSummary, "Get", params);
};

export const GetCashFlowTrendApi = (params) => {
  return apiRequest(apiConstant.getCashFlowTrend, "Get", params);
};

export const GetCategoryBreakdownApi = (params) => {
  return apiRequest(apiConstant.getCategoryBreakdown, "Get", params);
};

export const GetTopPartiesApi = (params) => {
  return apiRequest(apiConstant.getTopParties, "Get", params);
};

export const GetPaymentModeSplitApi = (params) => {
  return apiRequest(apiConstant.getPaymentModeSplit, "Get", params);
};

export const GetDailyCashFlowApi = (params) => {
  return apiRequest(apiConstant.getDailyCashFlow, "Get", params);
};
