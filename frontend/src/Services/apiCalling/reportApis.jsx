import {
  GetFinancialSummaryApi,
  GetRevenueTrendApi,
  GetDocumentBreakdownApi,
  GetTopClientsApi,
  GetGstSummaryApi,
  GetReceivablesAgeingApi,
  GetConversionFunnelApi,
  GetCompanyPerformanceApi,
  GetWorkspaceOverviewApi,
  GetAuditTrailApi,
  GetDocumentLedgerApi,
} from "../apiMethod";
import { itemsOf } from "../../Utlis/Common/commonMethod";

const handleGetFinancialSummary = async (params) => {
  try {
    const response = await GetFinancialSummaryApi(params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching financial summary:", error);
    return null;
  }
};

const handleGetRevenueTrend = async (params) => {
  try {
    const response = await GetRevenueTrendApi(params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching revenue trend:", error);
    return null;
  }
};

const handleGetDocumentBreakdown = async (params) => {
  try {
    const response = await GetDocumentBreakdownApi(params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching document breakdown:", error);
    return null;
  }
};

const handleGetTopClients = async (params) => {
  try {
    const response = await GetTopClientsApi(params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching top clients:", error);
    return null;
  }
};

const handleGetGstSummary = async (params) => {
  try {
    const response = await GetGstSummaryApi(params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching GST summary:", error);
    return null;
  }
};

const handleGetReceivablesAgeing = async (params) => {
  try {
    const response = await GetReceivablesAgeingApi(params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching receivables ageing:", error);
    return null;
  }
};

const handleGetConversionFunnel = async (params) => {
  try {
    const response = await GetConversionFunnelApi(params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching conversion funnel:", error);
    return null;
  }
};

const handleGetCompanyPerformance = async (params) => {
  try {
    const response = await GetCompanyPerformanceApi(params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching company performance:", error);
    return null;
  }
};

const handleGetWorkspaceOverview = async () => {
  try {
    const response = await GetWorkspaceOverviewApi();
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching workspace overview:", error);
    return null;
  }
};

const handleGetAuditTrail = async (params) => {
  try {
    const response = await GetAuditTrailApi(params);
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
    console.error("Error fetching audit trail:", error);
    return null;
  }
};

// The ledger carries filtered running totals alongside the page of rows.
const handleGetDocumentLedger = async (params) => {
  try {
    const response = await GetDocumentLedgerApi(params);
    if (response.statusCode === 200) {
      const items = itemsOf(response.raw.data);
      return {
        items,
        total: response.raw.total || 0,
        page: response.raw.page || 1,
        limit: response.raw.limit || 50,
        totals: response.raw.totals || {
          subTotal: 0,
          gstAmount: 0,
          totalAmount: 0,
        },
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching document ledger:", error);
    return null;
  }
};

export {
  handleGetFinancialSummary,
  handleGetRevenueTrend,
  handleGetDocumentBreakdown,
  handleGetTopClients,
  handleGetGstSummary,
  handleGetReceivablesAgeing,
  handleGetConversionFunnel,
  handleGetCompanyPerformance,
  handleGetWorkspaceOverview,
  handleGetAuditTrail,
  handleGetDocumentLedger,
};
