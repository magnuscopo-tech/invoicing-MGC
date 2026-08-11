const apiUserUrlPrefix =`https://invoicing-mgc.onrender.com/api/`;

export const apiHost =`https://invoicing-mgc.onrender.com`;

export const apiConstant = {
  // Auth
  register: apiUserUrlPrefix + "auth/register",
  createUser: apiUserUrlPrefix + "auth/createUser",
  logIn: apiUserUrlPrefix + "auth/login",
  getProfile: apiUserUrlPrefix + "auth/getProfile",
  changePassword: apiUserUrlPrefix + "auth/changePassword",
  signOut: apiUserUrlPrefix + "auth/logout",
  getAllUsers: apiUserUrlPrefix + "auth/getAllUsers",
  updateUserStatus: (id) => `${apiUserUrlPrefix}auth/updateUserStatus/${id}`,

  // Company
  getAllCompanies: apiUserUrlPrefix + "company/getAllCompanies",
  getCompanyDetail: (id) => `${apiUserUrlPrefix}company/getCompanyDetail/${id}`,
  createCompany: apiUserUrlPrefix + "company/createCompany",
  updateCompany: (id) => `${apiUserUrlPrefix}company/updateCompany/${id}`,
  deleteCompany: (id) => `${apiUserUrlPrefix}company/deleteCompany/${id}`,
  uploadCompanyLogo: (id) =>
    `${apiUserUrlPrefix}company/uploadCompanyLogo/${id}`,
  uploadCompanySignature: (id) =>
    `${apiUserUrlPrefix}company/uploadCompanySignature/${id}`,

  // Client
  getAllClients: apiUserUrlPrefix + "client/getAllClients",
  getClientDetail: (id) => `${apiUserUrlPrefix}client/getClientDetail/${id}`,
  createClient: apiUserUrlPrefix + "client/createClient",
  updateClient: (id) => `${apiUserUrlPrefix}client/updateClient/${id}`,
  deleteClient: (id) => `${apiUserUrlPrefix}client/deleteClient/${id}`,

  // Service catalog
  getAllServices: apiUserUrlPrefix + "service/getAllServices",
  getServiceDetail: (id) => `${apiUserUrlPrefix}service/getServiceDetail/${id}`,
  createService: apiUserUrlPrefix + "service/createService",
  updateService: (id) => `${apiUserUrlPrefix}service/updateService/${id}`,
  deleteService: (id) => `${apiUserUrlPrefix}service/deleteService/${id}`,

  // Documents
  getNextNumber: (type, companyId, date) =>
    `${apiUserUrlPrefix}document/getNextNumber?type=${type}&companyId=${companyId}${
      date ? `&date=${date}` : ""
    }`,
  getAllDocuments: apiUserUrlPrefix + "document/getAllDocuments",
  getDocumentDetail: (id) =>
    `${apiUserUrlPrefix}document/getDocumentDetail/${id}`,
  getDocumentChain: (id) => `${apiUserUrlPrefix}document/getDocumentChain/${id}`,
  previewDocumentHtml: (id) =>
    `${apiUserUrlPrefix}document/previewDocumentHtml/${id}`,
  downloadDocument: (id) => `${apiUserUrlPrefix}document/downloadDocument/${id}`,
  createDocument: apiUserUrlPrefix + "document/createDocument",
  convertDocument: (id) => `${apiUserUrlPrefix}document/convertDocument/${id}`,
  updateDocument: (id) => `${apiUserUrlPrefix}document/updateDocument/${id}`,
  updateDocumentStatus: (id) =>
    `${apiUserUrlPrefix}document/updateDocumentStatus/${id}`,
  deleteDocument: (id) => `${apiUserUrlPrefix}document/deleteDocument/${id}`,
  submitForApproval: (id) =>
    `${apiUserUrlPrefix}document/submitForApproval/${id}`,
  approveDocument: (id) => `${apiUserUrlPrefix}document/approveDocument/${id}`,
  rejectDocument: (id) => `${apiUserUrlPrefix}document/rejectDocument/${id}`,

  /*
   * Split billing - jobs the client pays in stages. The installment proformas
   * and the single closing tax invoice are raised from the plan rather than
   * through the ordinary convert endpoint, which knows nothing about the
   * schedule behind them.
   */
  getAllBillingPlans: apiUserUrlPrefix + "billing/getAllBillingPlans",
  getBillingPlan: (id) => `${apiUserUrlPrefix}billing/getBillingPlan/${id}`,
  // Resolves the plan from any document in the job - a slice, the closing
  // invoice, or the quotation it was cut from.
  getBillingPlanForDocument: (id) =>
    `${apiUserUrlPrefix}billing/getBillingPlanForDocument/${id}`,
  createBillingPlan: apiUserUrlPrefix + "billing/createBillingPlan",
  generateInstallment: (id) =>
    `${apiUserUrlPrefix}billing/generateInstallment/${id}`,
  recordInstallmentPayment: (id, index) =>
    `${apiUserUrlPrefix}billing/recordInstallmentPayment/${id}/${index}`,
  raiseFinalInvoice: (id) => `${apiUserUrlPrefix}billing/raiseFinalInvoice/${id}`,
  cancelInstallment: (id, index) =>
    `${apiUserUrlPrefix}billing/cancelInstallment/${id}/${index}`,
  closeBillingPlanEarly: (id) =>
    `${apiUserUrlPrefix}billing/closeBillingPlanEarly/${id}`,
  cancelBillingPlan: (id) => `${apiUserUrlPrefix}billing/cancelBillingPlan/${id}`,

  // Reports (admin only)
  getFinancialSummary: apiUserUrlPrefix + "report/getFinancialSummary",
  getRevenueTrend: apiUserUrlPrefix + "report/getRevenueTrend",
  getDocumentBreakdown: apiUserUrlPrefix + "report/getDocumentBreakdown",
  getTopClients: apiUserUrlPrefix + "report/getTopClients",
  getGstSummary: apiUserUrlPrefix + "report/getGstSummary",
  getReceivablesAgeing: apiUserUrlPrefix + "report/getReceivablesAgeing",
  getConversionFunnel: apiUserUrlPrefix + "report/getConversionFunnel",
  getCompanyPerformance: apiUserUrlPrefix + "report/getCompanyPerformance",
  getWorkspaceOverview: apiUserUrlPrefix + "report/getWorkspaceOverview",
  getAuditTrail: apiUserUrlPrefix + "report/getAuditTrail",
  getDocumentLedger: apiUserUrlPrefix + "report/getDocumentLedger",

  /*
   * Cash book - expenses and receipts. Separate from documents by design: these
   * record money that actually moved through the bank, not what was agreed on
   * paper, so nothing here is scoped by company or client.
   */
  getAllTransactions: apiUserUrlPrefix + "expense/getAllTransactions",
  getTransactionDetail: (id) =>
    `${apiUserUrlPrefix}expense/getTransactionDetail/${id}`,
  getCashBookMeta: apiUserUrlPrefix + "expense/getCashBookMeta",
  createTransaction: apiUserUrlPrefix + "expense/createTransaction",
  updateTransaction: (id) => `${apiUserUrlPrefix}expense/updateTransaction/${id}`,
  deleteTransaction: (id) => `${apiUserUrlPrefix}expense/deleteTransaction/${id}`,

  // Bulk import (admin only)
  bulkUploadStatement: apiUserUrlPrefix + "expense/bulkUploadStatement",
  getImportBatches: apiUserUrlPrefix + "expense/getImportBatches",
  deleteImportBatch: (id) => `${apiUserUrlPrefix}expense/deleteImportBatch/${id}`,
  downloadExpenseTemplate: apiUserUrlPrefix + "expense/downloadTemplate",
  exportTransactions: apiUserUrlPrefix + "expense/exportTransactions",

  // Cash book dashboard (admin only)
  getCashFlowSummary: apiUserUrlPrefix + "expense/getCashFlowSummary",
  getCashFlowTrend: apiUserUrlPrefix + "expense/getCashFlowTrend",
  getCategoryBreakdown: apiUserUrlPrefix + "expense/getCategoryBreakdown",
  getTopParties: apiUserUrlPrefix + "expense/getTopParties",
  getPaymentModeSplit: apiUserUrlPrefix + "expense/getPaymentModeSplit",
  getDailyCashFlow: apiUserUrlPrefix + "expense/getDailyCashFlow",
};
