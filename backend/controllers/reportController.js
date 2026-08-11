const {
  reportScopeSchema,
  revenueTrendQuerySchema,
  topClientsQuerySchema,
  gstSummaryQuerySchema,
  auditTrailQuerySchema,
  documentLedgerQuerySchema,
} = require("../validators/reportValidators");
const {
  fetchFinancialSummary,
  fetchRevenueTrend,
  fetchDocumentBreakdown,
  fetchTopClients,
  fetchGstSummary,
  fetchReceivablesAgeing,
  fetchConversionFunnel,
  fetchCompanyPerformance,
  fetchWorkspaceOverview,
  fetchAuditTrail,
  fetchDocumentLedger,
} = require("../services/reportService");

// Every report validates its query the same way, so the boilerplate is shared.
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

const getFinancialSummary = withValidatedQuery(
  reportScopeSchema,
  fetchFinancialSummary,
  "Get Financial Summary"
);

const getRevenueTrend = withValidatedQuery(
  revenueTrendQuerySchema,
  fetchRevenueTrend,
  "Get Revenue Trend"
);

const getDocumentBreakdown = withValidatedQuery(
  reportScopeSchema,
  fetchDocumentBreakdown,
  "Get Document Breakdown"
);

const getTopClients = withValidatedQuery(
  topClientsQuerySchema,
  fetchTopClients,
  "Get Top Clients"
);

const getGstSummary = withValidatedQuery(
  gstSummaryQuerySchema,
  fetchGstSummary,
  "Get Gst Summary"
);

const getReceivablesAgeing = withValidatedQuery(
  reportScopeSchema,
  fetchReceivablesAgeing,
  "Get Receivables Ageing"
);

const getConversionFunnel = withValidatedQuery(
  reportScopeSchema,
  fetchConversionFunnel,
  "Get Conversion Funnel"
);

const getCompanyPerformance = withValidatedQuery(
  reportScopeSchema,
  fetchCompanyPerformance,
  "Get Company Performance"
);

const getWorkspaceOverview = async (req, res) => {
  try {
    await fetchWorkspaceOverview(req, res);
  } catch (error) {
    console.error("Error Get Workspace Overview:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const getAuditTrail = withValidatedQuery(
  auditTrailQuerySchema,
  fetchAuditTrail,
  "Get Audit Trail"
);

const getDocumentLedger = withValidatedQuery(
  documentLedgerQuerySchema,
  fetchDocumentLedger,
  "Get Document Ledger"
);

module.exports = {
  getFinancialSummary,
  getRevenueTrend,
  getDocumentBreakdown,
  getTopClients,
  getGstSummary,
  getReceivablesAgeing,
  getConversionFunnel,
  getCompanyPerformance,
  getWorkspaceOverview,
  getAuditTrail,
  getDocumentLedger,
};
