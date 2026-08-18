const mongoose = require("mongoose");
const {
  DOC_TYPES,
  DOC_STATUSES,
  APPROVAL_STATUSES,
  BILLING_MODES,
} = require("../config/constants");

const itemSchema = new mongoose.Schema(
  {
    // Optional link back to the reusable catalog entry.
    serviceRef: { type: mongoose.Schema.Types.ObjectId, ref: "Service", default: null },
    description: { type: String, required: true, trim: true },
    unit: { type: String, default: "unit", trim: true },
    qty: { type: Number, required: true, default: 1, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    // Always recomputed server side: qty * unitPrice * (1 - discountPercent/100)
    amount: { type: Number, required: true },
  },
  { _id: false }
);

/*
 * Snapshot of one settled slice, denormalised onto the closing tax invoice so
 * the schedule table can print without joining back to the plan. The PDF
 * renderer reads whatever the document itself carries - that is what keeps the
 * on-screen preview and the printed file identical.
 */
const settledInstallmentSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    label: { type: String, default: "" },
    percent: { type: Number, required: true },
    docNumber: { type: String, default: "" },
    totalAmount: { type: Number, required: true },
    paidAt: { type: Date, default: null },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    docType: { type: String, enum: DOC_TYPES, required: true },
    // Header title: "Quotation" | "Proforma Invoice" | "Tax Invoice"
    docLabel: { type: String, required: true },
    // Not globally unique across document types.
    docNumber: { type: String, required: true },
    // "2026" for quotations (calendar year), "26-27" for proforma/invoice (FY).
    financialYearOrYear: { type: String, required: true },
    serialNumber: { type: Number, required: true },

    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },

    issueDate: { type: Date, required: true },
    dueDate: { type: Date, default: null },

    // Enquiry-reference sentence - printed on quotations only.
    introLine: { type: String, default: "" },

    items: { type: [itemSchema], default: [] },

    subTotal: { type: Number, required: true },
    // Quotations default to false. When true the rate is always GST_PERCENT.
    gstApplicable: { type: Boolean, default: true },
    gstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    amountInWords: { type: String, required: true },

    notesTerms: { type: String, default: "" },

    status: { type: String, enum: DOC_STATUSES, default: "draft", index: true },

    // ----------------------------- Approval gate -----------------------------
    // A document is unsigned until an admin approves it. The signature image is
    // stamped onto the document record at approval time and the PDF template
    // reads it from here - never from the company - so an unapproved document
    // physically cannot render a signature.
    approvalStatus: {
      type: String,
      enum: APPROVAL_STATUSES,
      default: "not_submitted",
      index: true,
    },
    submittedForApprovalAt: { type: Date, default: null },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rejectionReason: { type: String, default: "" },
    // Path of the signature image actually applied to this document.
    signatureUrl: { type: String, default: "" },
    isSigned: { type: Boolean, default: false },

    // ------------------------------ Payment ------------------------------
    // Approving a tax invoice is the act that confirms the client has paid, so
    // the invoice and the proforma it came from are both settled at that moment.
    paidAt: { type: Date, default: null },
    paymentConfirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // Incremented whenever a saved document is edited.
    version: { type: Number, default: 1 },

    // Chain links: quotation -> proforma -> invoice
    convertedFrom: { type: mongoose.Schema.Types.ObjectId, ref: "Document", default: null },
    convertedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],

    /* ---------------------------- Split billing ----------------------------
     *
     * Only ever set on documents belonging to a billing plan - a job the client
     * pays in stages. Every field here is absent on an ordinary document, which
     * is why "full" is the default: existing records read as unsplit and behave
     * exactly as they did before the feature existed.
     *
     * Splitting applies to PROFORMAS only. The closing tax invoice is a single
     * document for the whole contract value; it carries `billingPlan` and
     * `settledInstallments` so it can print the schedule, but its own
     * `billingMode` stays "full" because it is not itself a slice.
     */
    billingPlan: { type: mongoose.Schema.Types.ObjectId, ref: "BillingPlan", default: null },
    billingMode: { type: String, enum: BILLING_MODES, default: "full" },

    // Which slice this proforma is. 1-based; null on anything unsplit.
    installmentIndex: { type: Number, default: null },
    installmentCount: { type: Number, default: null },
    installmentPercent: { type: Number, default: null },
    installmentLabel: { type: String, default: "" },

    /*
     * The 100% figures, carried so the proforma can print "you are paying
     * ₹1,00,000 of an agreed ₹2,00,000" without the renderer having to load
     * the plan.
     */
    contractSubTotal: { type: Number, default: null },
    contractGstAmount: { type: Number, default: null },
    contractTotal: { type: Number, default: null },
    // Sum of the slices raised before this one.
    previouslyBilledTotal: { type: Number, default: null },

    // Closing tax invoice only: the proformas it settles.
    coveredProformas: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
    settledInstallments: { type: [settledInstallmentSchema], default: [] },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

documentSchema.index({ client: 1, createdAt: -1 });
documentSchema.index({ company: 1, docType: 1 });
documentSchema.index({ issueDate: -1 });
// Document numbers are unique within their own type.
// Split proformas differ by their letter suffix (…/003-A, …/003-B), so they sit in
// this index alongside the bare number their closing tax invoice takes.
documentSchema.index({ docNumber: 1, docType: 1 }, { unique: true });
documentSchema.index({ billingPlan: 1, installmentIndex: 1 });

module.exports = mongoose.model("Document", documentSchema);
