// Fixed GST rate for every taxable document. Locked by decision 13.2 of the build
// plan - it is never accepted from the client and never stored per document.
const GST_PERCENT = 18;

const DOC_TYPES = ["quotation", "proforma", "invoice"];

// The commercial flow is strictly sequential. A quotation is what the client
// negotiates against; the agreed price is then frozen onto a proforma; the tax
// invoice follows once payment is confirmed.
const STAGE_ORDER = ["quotation", "proforma", "invoice"];

// A document may only be converted into the next stage. Quotation -> invoice is
// deliberately absent: the proforma is the step that fixes the final price, so
// skipping it would leave a tax invoice raised off a negotiable figure.
const CONVERSION_TARGETS = {
  quotation: ["proforma"],
  proforma: ["invoice"],
  invoice: [],
};

// Once a proforma or invoice reaches one of these statuses the money on it is
// final and the line items stop being editable. A quotation is never price
// locked by status - negotiating it is the entire purpose of that stage.
const PRICE_LOCK_STATUSES = ["sent", "paid"];

const DOC_STATUSES = ["draft", "generated", "sent", "paid", "cancelled"];

const USER_ROLES = ["admin", "finance_user"];

// Approval runs on its own axis, separate from `status`. A document moves
// draft -> generated -> sent -> paid regardless; approval is the gate that
// decides whether the authorised signature may be printed on it.
const APPROVAL_STATUSES = ["not_submitted", "pending", "approved", "rejected"];

const APPROVAL_LABELS = {
  not_submitted: "Not submitted",
  pending: "Approval pending",
  approved: "Approved",
  rejected: "Rejected",
};

// Header title printed on the PDF for each document type.
const DOC_LABELS = {
  quotation: "Quotation",
  proforma: "Proforma Invoice",
  invoice: "Tax Invoice",
};

// Numbering series prefix.
const DOC_PREFIX = {
  quotation: "MCQ",
  proforma: "MCP",
  invoice: "MCI",
};

// Quotation numbering resets on 1 January, invoice numbering on 1 April.
const YEAR_MODE = {
  quotation: "calendar",
  proforma: "financial",
  invoice: "financial",
};

// Label used for the dueDate field per document type.
const DUE_DATE_LABELS = {
  quotation: "Valid Until",
  proforma: "Due Date",
  invoice: "Due Date",
};

const SERIAL_PAD_LENGTH = 3;

/* ============================= Split billing ================================
 *
 * A job is normally billed once: one proforma for the agreed amount, one tax
 * invoice after it is paid. Split billing covers the other case - the client
 * pays in stages, so the same agreed amount goes out as several proformas
 * (50% advance, 50% on delivery) and ONE tax invoice closes the job at the end.
 *
 * Splitting is a PROFORMA-only feature. The tax invoice side is untouched: it
 * is still one document for the full contract value, raised once, approved
 * once. Everything below describes how the proformas are carved up.
 */

// "full" is every document that existed before this feature - one proforma for
// the whole amount. Absent on old records, which is why it defaults to "full".
const BILLING_MODES = ["full", "partial"];

/*
 * active       - slices still to be issued or paid
 * fully_billed - every slice issued, approved and paid; the invoice may now go
 * invoiced     - the closing tax invoice has been approved
 * cancelled    - abandoned before completion
 */
const BILLING_PLAN_STATUSES = ["active", "fully_billed", "invoiced", "cancelled"];

/*
 * pending - planned but no proforma raised yet
 * issued  - proforma exists and is with the client
 * paid    - the money for this slice has been received
 * cancelled - dropped; its percentage returns to the plan's unallocated pool
 */
const INSTALLMENT_STATUSES = ["pending", "issued", "paid", "cancelled"];

// A one-slice plan is just a normal proforma, so two is the real minimum. The
// upper bound is the letter suffix space (A..L) used in the document number.
const MIN_INSTALLMENTS = 2;
const MAX_INSTALLMENTS = 12;

// Percentages are stored to two decimals, so the "must total 100" check is done
// on integer paise-equivalents rather than on floats.
const PERCENT_SCALE = 100;

/*
 * A slice proforma carries the base document number with a letter appended:
 * MCP/26-27/003-A, MCP/26-27/003-B. One split-billing job consumes exactly one
 * proforma serial no matter how many slices it was billed in.
 */
const installmentSuffix = (index) => String.fromCharCode(64 + Number(index));

/* ============================ Cash book (expenses) ===========================
 *
 * The cash book is a ledger of money that actually moved through the bank
 * account. It is deliberately NOT joined to documents: a quotation, proforma or
 * invoice records what was agreed, while a transaction records what was banked.
 * Reconciling the two is a reporting question, not a data-model one, so nothing
 * here references the Document collection.
 */

// Every row is one side of the bank statement. "credit" is money in.
const TXN_DIRECTIONS = ["credit", "debit"];

/*
 * Categories are a closed list so the dashboard can group on them without a
 * cleanup pass. The first block mirrors the heads already used in the
 * MAGNUSCOPO statement tracker; the rest are the common heads a small services
 * LLP needs. Adding a head here is the only supported way to create one.
 */
const TXN_CATEGORIES = [
  // Money in
  "Income/Receipt",
  "Interest Income",
  "Loan/Capital Infusion",
  // Either side
  "Refund/Adjustment",
  "Inter-account Transfer",
  "Investment",
  "Uncategorized",
  // Money out
  "Vendor Payment",
  "Contractor Payment",
  "Salary/Contractor Payment",
  "Travel",
  "Travel Advance",
  "Office/Coworking",
  "Rent",
  "Utilities/Telecom",
  "Software/Subscription",
  "Marketing/Advertising",
  "Professional Fees",
  "Statutory/Tax",
  "Bank Charges",
  "Equipment/Assets",
  "Meals/Entertainment",
  "Repairs/Maintenance",
  "Insurance",
  "Other Expense",
];

/*
 * Which side of the book a head is allowed to sit on. "both" exists because a
 * refund and an inter-account transfer genuinely occur in either direction -
 * everything else is one-way, and the validator rejects the wrong side rather
 * than silently letting a salary payment appear as income.
 */
const TXN_CATEGORY_KIND = {
  "Income/Receipt": "income",
  "Interest Income": "income",
  "Loan/Capital Infusion": "income",
  "Refund/Adjustment": "both",
  "Inter-account Transfer": "both",
  // Money out when funds are placed (FD, mutual fund, SIP), money in when the
  // holding is redeemed or matures - so it sits on both sides like a transfer.
  Investment: "both",
  Uncategorized: "both",
  "Vendor Payment": "expense",
  "Contractor Payment": "expense",
  "Salary/Contractor Payment": "expense",
  Travel: "expense",
  "Travel Advance": "expense",
  "Office/Coworking": "expense",
  Rent: "expense",
  "Utilities/Telecom": "expense",
  "Software/Subscription": "expense",
  "Marketing/Advertising": "expense",
  "Professional Fees": "expense",
  "Statutory/Tax": "expense",
  "Bank Charges": "expense",
  "Equipment/Assets": "expense",
  "Meals/Entertainment": "expense",
  "Repairs/Maintenance": "expense",
  Insurance: "expense",
  "Other Expense": "expense",
};

const TXN_PAYMENT_MODES = [
  "UPI",
  "IMPS",
  "NEFT",
  "RTGS",
  "POS/Card",
  "Mobile Banking",
  "Net Banking",
  "Cash",
  "Cheque",
  "Bank Charge",
  "Visa Refund",
  "Auto Debit",
  "Other",
];

// A manual row was typed by a finance user; a bulk_upload row came off a bank
// statement and is treated as the bank's own record.
const TXN_SOURCES = ["manual", "bulk_upload"];

const IMPORT_STATUSES = ["completed", "partial", "failed"];

// Upper bound on statement rows accepted in one upload.
const IMPORT_MAX_ROWS = 5000;

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

module.exports = {
  GST_PERCENT,
  DOC_TYPES,
  STAGE_ORDER,
  CONVERSION_TARGETS,
  PRICE_LOCK_STATUSES,
  DOC_STATUSES,
  USER_ROLES,
  APPROVAL_STATUSES,
  APPROVAL_LABELS,
  DOC_LABELS,
  DOC_PREFIX,
  YEAR_MODE,
  DUE_DATE_LABELS,
  SERIAL_PAD_LENGTH,
  BILLING_MODES,
  BILLING_PLAN_STATUSES,
  INSTALLMENT_STATUSES,
  MIN_INSTALLMENTS,
  MAX_INSTALLMENTS,
  PERCENT_SCALE,
  installmentSuffix,
  TXN_DIRECTIONS,
  TXN_CATEGORIES,
  TXN_CATEGORY_KIND,
  TXN_PAYMENT_MODES,
  TXN_SOURCES,
  IMPORT_STATUSES,
  IMPORT_MAX_ROWS,
  GSTIN_REGEX,
  PAN_REGEX,
  IFSC_REGEX,
  OBJECT_ID_REGEX,
};
