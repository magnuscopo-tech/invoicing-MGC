const { GST_PERCENT, installmentSuffix } = require("../config/constants");
const { round2 } = require("../utils/moneyHelper");

/*
 * Shapes a billing plan for the UI. The plan's own methods do the arithmetic -
 * allocated percent, billed, received - so the numbers on screen are derived
 * from the slices rather than from a stored copy that could drift out of step
 * with them.
 *
 * Expects a mongoose document, not a lean object: the derived figures come from
 * schema methods.
 */

const mapInstallment = (slice, plan) => ({
  index: slice.index,
  label: slice.label || "",
  percent: slice.percent,
  subTotal: slice.subTotal,
  gstAmount: slice.gstAmount,
  totalAmount: slice.totalAmount,
  status: slice.status,
  // Pending slices have no document yet, so the number they WILL take is shown
  // instead - the user sees the whole schedule before raising any of it.
  docNumber:
    slice.docNumber ||
    `${plan.baseDocNumber}-${installmentSuffix(slice.index)}`,
  documentId: slice.document || null,
  issuedAt: slice.issuedAt || null,
  paidAt: slice.paidAt || null,
  amountReceived: slice.amountReceived || 0,
  paymentMode: slice.paymentMode || "",
  paymentReference: slice.paymentReference || "",
  cancelledAt: slice.cancelledAt || null,
  cancellationReason: slice.cancellationReason || "",
});

const buildSummary = (plan) => {
  const live = plan.liveInstallments();
  const allocatedPercent = plan.allocatedPercent();
  const billedTotal = round2(plan.billedTotal());
  const receivedTotal = round2(plan.receivedTotal());

  return {
    installmentCount: live.length,
    cancelledCount: plan.installments.length - live.length,
    allocatedPercent,
    unallocatedPercent: round2(100 - allocatedPercent),
    // A plan that does not allocate exactly 100% cannot be closed by an
    // invoice, so the UI surfaces it as its own state rather than as a
    // silently disabled button.
    isFullyAllocated: allocatedPercent === 100,
    billedTotal,
    receivedTotal,
    outstandingTotal: round2(billedTotal - receivedTotal),
    unbilledTotal: round2(plan.baseTotalAmount - billedTotal),
    issuedCount: live.filter((slice) => slice.status !== "pending").length,
    paidCount: live.filter((slice) => slice.status === "paid").length,
    pendingCount: live.filter((slice) => slice.status === "pending").length,
    isSettled: plan.isSettled(),
    nextInstallmentIndex: plan.nextPendingInstallment()?.index || null,
  };
};

/*
 * What the plan will let the user do right now, decided server side so the
 * buttons mirror the API instead of offering an action that returns a 422.
 */
const buildActions = (plan, summary) => {
  const isOpen = plan.status !== "cancelled" && !plan.finalInvoice;
  return {
    canGenerateInstallment: isOpen && summary.nextInstallmentIndex !== null,
    canRecordPayment:
      isOpen && plan.liveInstallments().some((slice) => slice.status === "issued"),
    canCloseEarly: isOpen && summary.issuedCount > 0 && summary.pendingCount > 0,
    canCancelPlan: isOpen && summary.paidCount === 0,
    canRaiseFinalInvoice:
      isOpen && summary.isFullyAllocated && summary.isSettled && summary.issuedCount > 0,
  };
};

const mapBillingPlanListItem = (plan) => {
  const summary = buildSummary(plan);
  return {
    _id: plan._id,
    baseDocNumber: plan.baseDocNumber,
    baseYearKey: plan.baseYearKey,
    baseSerialNumber: plan.baseSerialNumber,
    company: plan.company || null,
    client: plan.client || null,
    sourceDocument: plan.sourceDocument || null,
    contractSubTotal: plan.baseSubTotal,
    contractGstAmount: plan.baseGstAmount,
    contractTotal: plan.baseTotalAmount,
    gstApplicable: plan.baseGstApplicable,
    gstPercent: plan.baseGstApplicable ? GST_PERCENT : 0,
    status: plan.status,
    finalInvoice: plan.finalInvoice || null,
    closedEarlyAt: plan.closedEarlyAt || null,
    originalTotalAmount: plan.originalTotalAmount || null,
    summary,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
};

const mapBillingPlanDetail = (plan) => {
  if (!plan) return null;
  const listItem = mapBillingPlanListItem(plan);
  return {
    ...listItem,
    items: plan.baseItems || [],
    notesTerms: plan.baseNotesTerms || "",
    closedEarlyReason: plan.closedEarlyReason || "",
    installments: plan.installments.map((slice) => mapInstallment(slice, plan)),
    actions: buildActions(plan, listItem.summary),
  };
};

module.exports = { mapBillingPlanListItem, mapBillingPlanDetail };
