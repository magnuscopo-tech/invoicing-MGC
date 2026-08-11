/*
 * Cash book vocabulary. These lists mirror config/constants.js on the server -
 * the API validates against its own copy, so anything added here without being
 * added there is rejected on save. The server also serves the same lists from
 * /expense/getCashBookMeta, which is what the forms actually bind to; these are
 * the static fallback and the source of the display metadata (tones, labels).
 */

export const TXN_DIRECTION = {
  credit: "credit",
  debit: "debit",
};

// "Money in / money out" rather than "credit / debit": the people keying this in
// are recording payments, not writing double-entry journals.
export const DIRECTION_LABELS = {
  credit: "Money in",
  debit: "Money out",
};

export const DIRECTION_OPTIONS = [
  { value: TXN_DIRECTION.debit, label: "Money out (expense)" },
  { value: TXN_DIRECTION.credit, label: "Money in (receipt)" },
];

export const DIRECTION_TONE = {
  credit: "success",
  debit: "danger",
};

const INCOME = "income";
const EXPENSE = "expense";
const BOTH = "both";

// Order matters: it is the order the dropdown offers, grouped by side.
export const TXN_CATEGORIES = [
  { value: "Income/Receipt", kind: INCOME },
  { value: "Interest Income", kind: INCOME },
  { value: "Loan/Capital Infusion", kind: INCOME },
  { value: "Refund/Adjustment", kind: BOTH },
  { value: "Inter-account Transfer", kind: BOTH },
  { value: "Investment", kind: BOTH },
  { value: "Uncategorized", kind: BOTH },
  { value: "Vendor Payment", kind: EXPENSE },
  { value: "Contractor Payment", kind: EXPENSE },
  { value: "Salary/Contractor Payment", kind: EXPENSE },
  { value: "Travel", kind: EXPENSE },
  { value: "Travel Advance", kind: EXPENSE },
  { value: "Office/Coworking", kind: EXPENSE },
  { value: "Rent", kind: EXPENSE },
  { value: "Utilities/Telecom", kind: EXPENSE },
  { value: "Software/Subscription", kind: EXPENSE },
  { value: "Marketing/Advertising", kind: EXPENSE },
  { value: "Professional Fees", kind: EXPENSE },
  { value: "Statutory/Tax", kind: EXPENSE },
  { value: "Bank Charges", kind: EXPENSE },
  { value: "Equipment/Assets", kind: EXPENSE },
  { value: "Meals/Entertainment", kind: EXPENSE },
  { value: "Repairs/Maintenance", kind: EXPENSE },
  { value: "Insurance", kind: EXPENSE },
  { value: "Other Expense", kind: EXPENSE },
];

export const CATEGORY_OPTIONS = TXN_CATEGORIES.map((category) => ({
  value: category.value,
  label: category.value,
}));

/*
 * A head belongs to one side of the book, so the category dropdown only offers
 * what the chosen direction allows. The server enforces the same rule - this
 * just stops someone reaching a rejection they could not have predicted.
 */
export const categoryOptionsFor = (direction, categories = TXN_CATEGORIES) => {
  if (!direction) return categories.map((c) => ({ value: c.value, label: c.value }));

  const wanted = direction === TXN_DIRECTION.credit ? INCOME : EXPENSE;
  return categories
    .filter((category) => category.kind === wanted || category.kind === BOTH)
    .map((category) => ({ value: category.value, label: category.value }));
};

export const isCategoryAllowed = (category, direction, categories = TXN_CATEGORIES) => {
  const found = categories.find((item) => item.value === category);
  if (!found) return false;
  if (found.kind === BOTH) return true;
  return found.kind === (direction === TXN_DIRECTION.credit ? INCOME : EXPENSE);
};

export const TXN_PAYMENT_MODES = [
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

export const PAYMENT_MODE_OPTIONS = TXN_PAYMENT_MODES.map((mode) => ({
  value: mode,
  label: mode,
}));

export const SOURCE_OPTIONS = [
  { value: "manual", label: "Entered by hand" },
  { value: "bulk_upload", label: "Imported from a statement" },
];

export const SOURCE_LABELS = {
  manual: "Manual",
  bulk_upload: "Imported",
};

export const IMPORT_STATUS_TONE = {
  completed: "success",
  partial: "warning",
  failed: "danger",
};

export const IMPORT_STATUS_LABELS = {
  completed: "Imported",
  partial: "Imported with warnings",
  failed: "Nothing imported",
};

// Rows the importer could not classify. Surfaced as its own filter because
// clearing this list is the standing job after every upload.
export const REVIEW_CATEGORY = "Uncategorized";

export const EXPENSE_MESSAGES = {
  savedExpense: "Expense recorded successfully.",
  savedReceipt: "Receipt recorded successfully.",
  updated: "Transaction updated successfully.",
  deleted: "Transaction deleted successfully.",
  importReverted: "Import reverted and its transactions removed.",
  exportStarted: "Preparing your download…",
  uploadRequired: "Choose an .xlsx file to upload.",
};
