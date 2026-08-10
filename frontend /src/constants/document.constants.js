export const GST_PERCENT = 18;

export const DOC_TYPES = {
  quotation: "quotation",
  proforma: "proforma",
  invoice: "invoice",
};

export const DOC_LABELS = {
  quotation: "Quotation",
  proforma: "Proforma Invoice",
  invoice: "Tax Invoice",
};

export const DOC_TYPE_OPTIONS = [
  {
    value: DOC_TYPES.quotation,
    label: "Quotation",
    series: "MCQ",
    gstApplicable: false,
    stage: 1,
    summary:
      "Stage 1 — sent after the first discussion. Prices stay open while the client negotiates.",
  },
  {
    value: DOC_TYPES.proforma,
    label: "Proforma Invoice",
    series: "MCI",
    gstApplicable: true,
    stage: 2,
    summary:
      "Stage 2 — issued once the price is agreed. GST @ 18% shown, and the amount is fixed once it goes out.",
  },
  {
    value: DOC_TYPES.invoice,
    label: "Tax Invoice",
    series: "MCI",
    gstApplicable: true,
    stage: 3,
    summary:
      "Stage 3 — raised from the proforma. Reuses its number; approving it confirms payment.",
  },
];

export const DOC_STATUS = {
  draft: "draft",
  generated: "generated",
  sent: "sent",
  paid: "paid",
  cancelled: "cancelled",
};

export const DOC_STATUS_OPTIONS = [
  { value: DOC_STATUS.draft, label: "Draft" },
  { value: DOC_STATUS.generated, label: "Generated" },
  { value: DOC_STATUS.sent, label: "Sent" },
  { value: DOC_STATUS.paid, label: "Paid" },
  { value: DOC_STATUS.cancelled, label: "Cancelled" },
];

/*
 * Statuses a user may set by hand. `paid` is deliberately absent — payment is
 * recorded by approving the tax invoice, which settles both it and its proforma.
 * Letting someone set it manually would let the two disagree.
 */
export const MANUAL_STATUS_OPTIONS = DOC_STATUS_OPTIONS.filter(
  (option) => option.value !== DOC_STATUS.paid
);

export const DOC_STATUS_TONE = {
  draft: "neutral",
  generated: "info",
  sent: "warning",
  paid: "success",
  cancelled: "danger",
};

export const DOC_TYPE_TONE = {
  quotation: "purple",
  proforma: "info",
  invoice: "success",
};

/*
 * The chain advances one stage at a time — mirrors CONVERSION_TARGETS on the
 * server. A quotation cannot jump straight to a tax invoice: the proforma in
 * between is what turns the negotiated figure into the fixed price.
 */
export const CONVERSION_TARGETS = {
  quotation: [DOC_TYPES.proforma],
  proforma: [DOC_TYPES.invoice],
  invoice: [],
};

export const TERMS_STRATEGY = {
  auto: "auto",
  keep: "keep",
  swap: "swap",
};

export const LOCKED_STATUSES = [DOC_STATUS.paid, DOC_STATUS.cancelled];

/*
 * Approval runs on its own axis, separate from `status`. A document is unsigned
 * until an admin approves it — the signature is applied at approval time and the
 * server refuses to render one before that.
 */
export const APPROVAL_STATUS = {
  notSubmitted: "not_submitted",
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
};

export const APPROVAL_LABELS = {
  not_submitted: "Not submitted",
  pending: "Approval pending",
  approved: "Approved",
  rejected: "Rejected",
};

export const APPROVAL_TONE = {
  not_submitted: "neutral",
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

// Editing is blocked while a document is under review or already signed.
export const APPROVAL_LOCKED = [
  APPROVAL_STATUS.pending,
  APPROVAL_STATUS.approved,
];

/*
 * Once a proforma or tax invoice has gone out or been signed, the money on it is
 * final — dates, notes and terms stay editable, but the line items do not. A
 * quotation is never price locked this way; negotiating it is the point.
 */
export const PRICE_LOCK_STATUSES = [DOC_STATUS.sent, DOC_STATUS.paid];

export const isPriceLocked = (document) => {
  if (!document) return false;
  // The server sends this flag; the local computation is the fallback so the UI
  // still reads correctly against a cached or partial document.
  if (typeof document.priceLocked === "boolean") return document.priceLocked;
  return (
    document.docType !== DOC_TYPES.quotation &&
    (PRICE_LOCK_STATUSES.includes(document.status) ||
      document.approvalStatus === APPROVAL_STATUS.approved)
  );
};
