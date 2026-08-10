const express = require("express");
const billingPlanRouter = express.Router();
const jwtMiddleware = require("../middleware/jwtMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const {
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
} = require("../controllers/billingPlanController");

/*
 * Split billing: a job the client pays in stages. The plan holds the agreed
 * total and the percentage split; the installment proformas and the single
 * closing tax invoice are raised from here rather than through the ordinary
 * convert endpoint, which has no way to know about the schedule.
 */

billingPlanRouter.get("/getAllBillingPlans", jwtMiddleware, getAllBillingPlans);
billingPlanRouter.get("/getBillingPlan/:id", jwtMiddleware, getBillingPlanDetail);
// Resolves the plan from any document in the job - a slice, the closing
// invoice, or the quotation it was cut from.
billingPlanRouter.get(
  "/getBillingPlanForDocument/:id",
  jwtMiddleware,
  getBillingPlanForDocument
);

billingPlanRouter.post("/createBillingPlan", jwtMiddleware, createBillingPlan);
billingPlanRouter.post(
  "/generateInstallment/:id",
  jwtMiddleware,
  generateInstallment
);
billingPlanRouter.post(
  "/recordInstallmentPayment/:id/:index",
  jwtMiddleware,
  recordInstallmentPayment
);
billingPlanRouter.post("/raiseFinalInvoice/:id", jwtMiddleware, raiseFinalInvoice);

/*
 * Anything that withdraws a document already sent to a client, or that shrinks
 * the agreed contract value, is an admin decision.
 */
billingPlanRouter.post(
  "/cancelInstallment/:id/:index",
  jwtMiddleware,
  adminMiddleware,
  cancelInstallment
);
billingPlanRouter.post(
  "/closeBillingPlanEarly/:id",
  jwtMiddleware,
  adminMiddleware,
  closeBillingPlanEarly
);
billingPlanRouter.post(
  "/cancelBillingPlan/:id",
  jwtMiddleware,
  adminMiddleware,
  cancelBillingPlan
);

module.exports = billingPlanRouter;
