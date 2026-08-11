const mongoose = require("mongoose");
const {
  BILLING_PLAN_STATUSES,
  INSTALLMENT_STATUSES,
} = require("../config/constants");

/*
 * One slice of the contract. The money on a slice is frozen when the plan is
 * created, not when the proforma is raised - the client is quoted "50% now,
 * 50% on delivery" up front, so the second figure must not move because
 * somebody edited the quotation in between.
 */
const installmentSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    // "Advance", "On delivery" - printed on the proforma as its sub-title.
    label: { type: String, default: "", trim: true },
    percent: { type: Number, required: true, min: 0, max: 100 },

    // Frozen at plan creation. The LAST live slice always carries the residue
    // (contract minus everything before it) rather than its own percentage, so
    // the slices sum to the contract exactly however the percentages round.
    subTotal: { type: Number, required: true },
    gstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    status: { type: String, enum: INSTALLMENT_STATUSES, default: "pending" },

    // Set once the proforma for this slice is raised.
    document: { type: mongoose.Schema.Types.ObjectId, ref: "Document", default: null },
    docNumber: { type: String, default: "" },
    issuedAt: { type: Date, default: null },

    // Set when the money lands.
    paidAt: { type: Date, default: null },
    amountReceived: { type: Number, default: 0 },
    paymentMode: { type: String, default: "" },
    paymentReference: { type: String, default: "" },
    paymentRecordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, default: "" },
  },
  { _id: false }
);

const billingPlanSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },

    // The quotation the plan was cut from. Optional - a plan can be started
    // straight from an agreed scope with no quotation behind it.
    sourceDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null,
    },

    /*
     * One serial is reserved from the MCI series for the whole job. Every slice
     * proforma prints it with a letter appended (…/003-A) and the closing tax
     * invoice prints it bare (…/003), so the documents visibly belong together
     * and the series does not inflate with the number of slices.
     */
    baseDocNumber: { type: String, required: true },
    baseYearKey: { type: String, required: true },
    baseSerialNumber: { type: Number, required: true },

    /*
     * Photograph of what was agreed. The slices are computed from this, never
     * from the live quotation - editing the quotation afterwards must not move
     * a figure the client has already been billed against.
     */
    baseItems: { type: Array, default: [] },
    baseSubTotal: { type: Number, required: true },
    baseGstApplicable: { type: Boolean, default: true },
    baseGstAmount: { type: Number, default: 0 },
    baseTotalAmount: { type: Number, required: true },
    baseNotesTerms: { type: String, default: "" },

    installments: { type: [installmentSchema], default: [] },

    status: { type: String, enum: BILLING_PLAN_STATUSES, default: "active", index: true },

    // The closing tax invoice, once raised.
    finalInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null,
    },

    /*
     * Set when a plan is closed short of 100% - the client walked away after
     * paying part of it. The remaining slices are cancelled and what was
     * actually billed becomes the whole job, so the closing invoice can still
     * be raised for a figure below the original contract value.
     */
    closedEarlyAt: { type: Date, default: null },
    closedEarlyReason: { type: String, default: "" },
    originalTotalAmount: { type: Number, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

billingPlanSchema.index({ client: 1, createdAt: -1 });
billingPlanSchema.index({ company: 1, status: 1 });
billingPlanSchema.index({ sourceDocument: 1 });

/* -------------------------- Derived plan arithmetic -------------------------
 *
 * Kept as methods rather than stored fields: a cancelled slice changes every
 * one of these at once, and a stored copy that drifts from the slice array is
 * worse than no copy at all.
 */

// Slices that still count. A cancelled slice returns its percentage to the pool.
billingPlanSchema.methods.liveInstallments = function liveInstallments() {
  return this.installments.filter((slice) => slice.status !== "cancelled");
};

billingPlanSchema.methods.allocatedPercent = function allocatedPercent() {
  return Math.round(
    this.liveInstallments().reduce((sum, slice) => sum + slice.percent, 0) * 100
  ) / 100;
};

billingPlanSchema.methods.billedTotal = function billedTotal() {
  return this.liveInstallments()
    .filter((slice) => slice.status !== "pending")
    .reduce((sum, slice) => sum + slice.totalAmount, 0);
};

billingPlanSchema.methods.receivedTotal = function receivedTotal() {
  return this.liveInstallments()
    .filter((slice) => slice.status === "paid")
    .reduce((sum, slice) => sum + slice.amountReceived, 0);
};

// The next slice waiting for a proforma, in order.
billingPlanSchema.methods.nextPendingInstallment = function nextPending() {
  return this.liveInstallments().find((slice) => slice.status === "pending") || null;
};

// True once every live slice has been issued, approved and paid - the point at
// which the closing tax invoice may be raised.
billingPlanSchema.methods.isSettled = function isSettled() {
  const live = this.liveInstallments();
  return live.length > 0 && live.every((slice) => slice.status === "paid");
};

module.exports = mongoose.model("BillingPlan", billingPlanSchema);
