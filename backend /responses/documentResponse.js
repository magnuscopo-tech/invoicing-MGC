const {
  GST_PERCENT,
  DUE_DATE_LABELS,
  APPROVAL_LABELS,
  CONVERSION_TARGETS,
  PRICE_LOCK_STATUSES,
} = require("../config/constants");
const { toPublicUrl } = require("../utils/fileHelper");

// Mirrors isPriceLocked in documentService. Computed here rather than imported so
// the response layer stays free of a cycle back into the service.
// An installment proforma is locked from the moment it exists: it is one slice of
// a schedule the client was quoted up front, not a figure still being settled.
const priceLocked = (doc) =>
  doc.docType !== "quotation" &&
  (doc.billingMode === "partial" ||
    PRICE_LOCK_STATUSES.includes(doc.status) ||
    doc.approvalStatus === "approved");

// Compact shape used by the history table.
const mapDocumentListItem = (doc) => ({
  _id: doc._id,
  docType: doc.docType,
  docLabel: doc.docLabel,
  docNumber: doc.docNumber,
  financialYearOrYear: doc.financialYearOrYear,
  serialNumber: doc.serialNumber,
  company: doc.company || null,
  client: doc.client || null,
  issueDate: doc.issueDate,
  dueDate: doc.dueDate,
  subTotal: doc.subTotal,
  gstApplicable: doc.gstApplicable,
  gstPercent: doc.gstApplicable ? GST_PERCENT : 0,
  gstAmount: doc.gstAmount,
  totalAmount: doc.totalAmount,
  status: doc.status,
  version: doc.version,
  // Flow state: which stage may follow, and whether the money is still open.
  // A quotation is negotiable; a proforma fixes the price once it goes out.
  conversionTargets: CONVERSION_TARGETS[doc.docType] || [],
  priceLocked: priceLocked(doc),
  isNegotiable: doc.docType === "quotation" && !priceLocked(doc),
  paidAt: doc.paidAt || null,
  // Approval axis - drives the Approvals screens and the signature gate.
  approvalStatus: doc.approvalStatus || "not_submitted",
  approvalLabel: APPROVAL_LABELS[doc.approvalStatus || "not_submitted"],
  isSigned: Boolean(doc.isSigned),
  submittedForApprovalAt: doc.submittedForApprovalAt || null,
  approvedAt: doc.approvedAt || null,
  rejectedAt: doc.rejectedAt || null,
  rejectionReason: doc.rejectionReason || "",
  convertedFrom: doc.convertedFrom || null,
  convertedToCount: Array.isArray(doc.convertedTo) ? doc.convertedTo.length : 0,
  // Split billing. Absent on every ordinary document, which is what lets the UI
  // treat "no billingPlan" as the normal single-proforma flow.
  billingPlan: doc.billingPlan || null,
  billingMode: doc.billingMode || "full",
  isInstallment: doc.billingMode === "partial",
  installmentIndex: doc.installmentIndex ?? null,
  installmentCount: doc.installmentCount ?? null,
  installmentPercent: doc.installmentPercent ?? null,
  installmentLabel: doc.installmentLabel || "",
  contractTotal: doc.contractTotal ?? null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

// Full shape used by the detail screen and after create/update.
const mapDocumentDetail = (doc) => ({
  ...mapDocumentListItem(doc),
  introLine: doc.introLine || "",
  items: doc.items || [],
  amountInWords: doc.amountInWords,
  notesTerms: doc.notesTerms || "",
  dueDateLabel: DUE_DATE_LABELS[doc.docType],
  showBuyerGstin: doc.docType !== "quotation",
  signatureUrl: toPublicUrl(doc.signatureUrl),
  submittedBy: doc.submittedBy || null,
  approvedBy: doc.approvedBy || null,
  rejectedBy: doc.rejectedBy || null,
  paymentConfirmedBy: doc.paymentConfirmedBy || null,
  convertedTo: doc.convertedTo || [],
  contractSubTotal: doc.contractSubTotal ?? null,
  contractGstAmount: doc.contractGstAmount ?? null,
  previouslyBilledTotal: doc.previouslyBilledTotal ?? null,
  // Closing tax invoice only: the installments it settles.
  coveredProformas: doc.coveredProformas || [],
  settledInstallments: doc.settledInstallments || [],
  createdBy: doc.createdBy || null,
  updatedBy: doc.updatedBy || null,
});

module.exports = { mapDocumentListItem, mapDocumentDetail };
