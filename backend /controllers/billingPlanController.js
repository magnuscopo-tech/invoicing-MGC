const {
  createBillingPlanSchema,
  generateInstallmentSchema,
  recordInstallmentPaymentSchema,
  cancelInstallmentSchema,
  closePlanSchema,
  raiseFinalInvoiceSchema,
  listBillingPlanQuerySchema,
} = require("../validators/billingPlanValidators");
const {
  fetchCreateBillingPlan,
  fetchBillingPlanDetail,
  fetchBillingPlanForDocument,
  fetchAllBillingPlans,
  fetchGenerateInstallment,
  fetchRecordInstallmentPayment,
  fetchCancelInstallment,
  fetchCloseBillingPlanEarly,
  fetchCancelBillingPlan,
  fetchRaiseFinalInvoice,
} = require("../services/billingPlanService");

// Same shape as the other controllers: validate, replace the payload with the
// coerced value, hand off to the service.
const withValidation = (schema, handler, source = "body", label) => async (req, res) => {
  try {
    const { error, value } = schema.validate(req[source]);
    if (error) return res.status(422).json({ message: error.details[0].message });
    req[source] = value;
    await handler(req, res);
  } catch (error) {
    console.error(`Error ${label}:`, error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const passThrough = (handler, label) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error(`Error ${label}:`, error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const createBillingPlan = withValidation(
  createBillingPlanSchema,
  fetchCreateBillingPlan,
  "body",
  "Create Billing Plan"
);

const getAllBillingPlans = withValidation(
  listBillingPlanQuerySchema,
  fetchAllBillingPlans,
  "query",
  "Get All Billing Plans"
);

const getBillingPlanDetail = passThrough(fetchBillingPlanDetail, "Get Billing Plan");

const getBillingPlanForDocument = passThrough(
  fetchBillingPlanForDocument,
  "Get Billing Plan For Document"
);

const generateInstallment = withValidation(
  generateInstallmentSchema,
  fetchGenerateInstallment,
  "body",
  "Generate Installment"
);

const recordInstallmentPayment = withValidation(
  recordInstallmentPaymentSchema,
  fetchRecordInstallmentPayment,
  "body",
  "Record Installment Payment"
);

const cancelInstallment = withValidation(
  cancelInstallmentSchema,
  fetchCancelInstallment,
  "body",
  "Cancel Installment"
);

const closeBillingPlanEarly = withValidation(
  closePlanSchema,
  fetchCloseBillingPlanEarly,
  "body",
  "Close Billing Plan Early"
);

const cancelBillingPlan = withValidation(
  closePlanSchema,
  fetchCancelBillingPlan,
  "body",
  "Cancel Billing Plan"
);

const raiseFinalInvoice = withValidation(
  raiseFinalInvoiceSchema,
  fetchRaiseFinalInvoice,
  "body",
  "Raise Final Invoice"
);

module.exports = {
  createBillingPlan,
  getAllBillingPlans,
  getBillingPlanDetail,
  getBillingPlanForDocument,
  generateInstallment,
  recordInstallmentPayment,
  cancelInstallment,
  closeBillingPlanEarly,
  cancelBillingPlan,
  raiseFinalInvoice,
};
