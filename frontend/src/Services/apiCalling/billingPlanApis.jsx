import {
  GetAllBillingPlansApi,
  GetBillingPlanApi,
  GetBillingPlanForDocumentApi,
  CreateBillingPlanApi,
  GenerateInstallmentApi,
  RecordInstallmentPaymentApi,
  RaiseFinalInvoiceApi,
  CancelInstallmentApi,
  CloseBillingPlanEarlyApi,
  CancelBillingPlanApi,
} from "../apiMethod";
import { itemsOf } from "../../Utlis/Common/commonMethod";

const handleGetAllBillingPlans = async (params = { page: 1, limit: 20 }) => {
  try {
    const response = await GetAllBillingPlansApi(params);
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
    console.error("Error fetching billing plans:", error);
    return null;
  }
};

const handleGetBillingPlan = async (id) => {
  try {
    const response = await GetBillingPlanApi(id);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching billing plan:", error);
    return null;
  }
};

/*
 * Returns null when the document is not part of a split-billed job, which is
 * the ordinary case - the caller treats that as "no plan panel to show" rather
 * than as a failure.
 */
const handleGetBillingPlanForDocument = async (id) => {
  try {
    const response = await GetBillingPlanForDocumentApi(id);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching billing plan for document:", error);
    return null;
  }
};

const handleCreateBillingPlan = async (params) => {
  try {
    const response = await CreateBillingPlanApi(params);
    if (response.statusCode === 200 || response.statusCode === 201) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error creating billing plan:", error);
    return null;
  }
};

// Resolves to { document, plan } - the new proforma and the plan it came from.
const handleGenerateInstallment = async (id, params = {}) => {
  try {
    const response = await GenerateInstallmentApi(id, params);
    if (response.statusCode === 200 || response.statusCode === 201) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error generating installment:", error);
    return null;
  }
};

const handleRecordInstallmentPayment = async (id, index, params = {}) => {
  try {
    const response = await RecordInstallmentPaymentApi(id, index, params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error recording installment payment:", error);
    return null;
  }
};

// Resolves to { document, plan } - the closing tax invoice and the plan.
const handleRaiseFinalInvoice = async (id, params = {}) => {
  try {
    const response = await RaiseFinalInvoiceApi(id, params);
    if (response.statusCode === 200 || response.statusCode === 201) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error raising final invoice:", error);
    return null;
  }
};

const handleCancelInstallment = async (id, index, params) => {
  try {
    const response = await CancelInstallmentApi(id, index, params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error cancelling installment:", error);
    return null;
  }
};

const handleCloseBillingPlanEarly = async (id, params) => {
  try {
    const response = await CloseBillingPlanEarlyApi(id, params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error closing billing plan early:", error);
    return null;
  }
};

const handleCancelBillingPlan = async (id, params) => {
  try {
    const response = await CancelBillingPlanApi(id, params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error cancelling billing plan:", error);
    return null;
  }
};

export {
  handleGetAllBillingPlans,
  handleGetBillingPlan,
  handleGetBillingPlanForDocument,
  handleCreateBillingPlan,
  handleGenerateInstallment,
  handleRecordInstallmentPayment,
  handleRaiseFinalInvoice,
  handleCancelInstallment,
  handleCloseBillingPlanEarly,
  handleCancelBillingPlan,
};
