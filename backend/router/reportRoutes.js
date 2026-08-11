const express = require("express");
const reportRouter = express.Router();
const jwtMiddleware = require("../middleware/jwtMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const {
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
} = require("../controllers/reportController");

// Reporting aggregates the whole workspace, so the entire router is admin only.
reportRouter.use(jwtMiddleware, adminMiddleware);

reportRouter.get("/getFinancialSummary", getFinancialSummary);
reportRouter.get("/getRevenueTrend", getRevenueTrend);
reportRouter.get("/getDocumentBreakdown", getDocumentBreakdown);
reportRouter.get("/getTopClients", getTopClients);
reportRouter.get("/getGstSummary", getGstSummary);
reportRouter.get("/getReceivablesAgeing", getReceivablesAgeing);
reportRouter.get("/getConversionFunnel", getConversionFunnel);
reportRouter.get("/getCompanyPerformance", getCompanyPerformance);
reportRouter.get("/getWorkspaceOverview", getWorkspaceOverview);
reportRouter.get("/getAuditTrail", getAuditTrail);
reportRouter.get("/getDocumentLedger", getDocumentLedger);

module.exports = reportRouter;
