const Joi = require("joi");
const {
  TXN_DIRECTIONS,
  TXN_CATEGORIES,
  TXN_CATEGORY_KIND,
  TXN_PAYMENT_MODES,
  TXN_SOURCES,
  OBJECT_ID_REGEX,
} = require("../config/constants");

const objectId = Joi.string()
  .pattern(OBJECT_ID_REGEX)
  .messages({ "string.pattern.base": "A valid id is required" });

/*
 * A category belongs to one side of the book. Booking "Salary/Contractor
 * Payment" as money received is not a typo the dashboard can recover from - it
 * would inflate income and understate spend at the same time - so it is
 * rejected at the edge rather than cleaned up later.
 */
const directionMatchesCategory = (value, helpers) => {
  const kind = TXN_CATEGORY_KIND[value.category];
  if (!kind || kind === "both") return value;

  const isIncome = kind === "income";
  const expected = isIncome ? "credit" : "debit";
  if (value.direction !== expected) {
    return helpers.message(
      `"${value.category}" is ${
        isIncome ? "an income" : "an expense"
      } head, so it can only be recorded as ${
        isIncome ? "money received" : "money paid"
      }`
    );
  }
  return value;
};

const baseKeys = {
  date: Joi.date().required().messages({ "any.required": "Date is required" }),
  direction: Joi.string()
    .valid(...TXN_DIRECTIONS)
    .required()
    .messages({ "any.only": "Direction must be either credit or debit" }),
  amount: Joi.number().greater(0).precision(2).required().messages({
    "number.greater": "Amount must be greater than zero",
    "any.required": "Amount is required",
  }),
  category: Joi.string()
    .valid(...TXN_CATEGORIES)
    .required()
    .messages({ "any.only": "Select a valid category" }),
  particulars: Joi.string().trim().min(2).max(400).required().messages({
    "string.empty": "A description is required",
  }),
  partyName: Joi.string().trim().max(180).allow(""),
  transactionId: Joi.string().trim().max(80).allow(""),
  paymentMode: Joi.string().valid(...TXN_PAYMENT_MODES),
  bankAccount: Joi.string().trim().max(40).allow(""),
  // Only a bank statement knows the true running balance, so this stays
  // optional and nullable for hand-entered rows.
  balance: Joi.number().allow(null),
  remarks: Joi.string().trim().max(400).allow(""),
};

const createTransactionSchema = Joi.object(baseKeys).custom(
  directionMatchesCategory
);

/*
 * Update revalidates the direction/category pair as a whole, so both must be
 * present together whenever either changes. Sending one alone would let a row
 * end up on a side its category forbids.
 */
const updateTransactionSchema = Joi.object({
  date: Joi.date(),
  direction: Joi.string().valid(...TXN_DIRECTIONS),
  amount: Joi.number().greater(0).precision(2),
  category: Joi.string().valid(...TXN_CATEGORIES),
  particulars: Joi.string().trim().min(2).max(400),
  partyName: Joi.string().trim().max(180).allow(""),
  transactionId: Joi.string().trim().max(80).allow(""),
  paymentMode: Joi.string().valid(...TXN_PAYMENT_MODES),
  bankAccount: Joi.string().trim().max(40).allow(""),
  balance: Joi.number().allow(null),
  remarks: Joi.string().trim().max(400).allow(""),
})
  .min(1)
  .and("direction", "category")
  .messages({
    "object.min": "At least one field is required to update",
    "object.and": "Direction and category must be updated together",
  })
  .custom((value, helpers) => {
    if (!value.category || !value.direction) return value;
    return directionMatchesCategory(value, helpers);
  });

// Shared scope for the ledger list and every dashboard report.
const scopeKeys = {
  fromDate: Joi.date(),
  toDate: Joi.date(),
  direction: Joi.string().valid(...TXN_DIRECTIONS),
  category: Joi.string().valid(...TXN_CATEGORIES),
  paymentMode: Joi.string().valid(...TXN_PAYMENT_MODES),
  source: Joi.string().valid(...TXN_SOURCES),
  partyName: Joi.string().trim().max(180),
  search: Joi.string().trim().max(160).allow(""),
};

const transactionScopeSchema = Joi.object({ ...scopeKeys });

const transactionListQuerySchema = Joi.object({
  ...scopeKeys,
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(25),
  importBatch: objectId,
  sortBy: Joi.string().valid("date", "amount", "createdAt").default("date"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});

const cashFlowTrendQuerySchema = Joi.object({
  ...scopeKeys,
  months: Joi.number().integer().min(3).max(36).default(12),
});

const topPartiesQuerySchema = Joi.object({
  ...scopeKeys,
  limit: Joi.number().integer().min(1).max(50).default(10),
});

const importBatchQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

/*
 * Upload options arrive as multipart text fields alongside the file, so every
 * value is a string on the wire and Joi does the coercion.
 */
const uploadStatementSchema = Joi.object({
  bankAccount: Joi.string().trim().max(40).allow(""),
  sheetName: Joi.string().trim().max(120).allow(""),
  // Off by default: a re-uploaded statement should skip rows it already booked.
  allowDuplicates: Joi.boolean().default(false),
  // When on, rows the file left blank are keyword-classified instead of landing
  // in Uncategorized. The guess is always recorded as such in remarks.
  autoCategorize: Joi.boolean().default(true),
});

module.exports = {
  createTransactionSchema,
  updateTransactionSchema,
  transactionScopeSchema,
  transactionListQuerySchema,
  cashFlowTrendQuerySchema,
  topPartiesQuerySchema,
  importBatchQuerySchema,
  uploadStatementSchema,
};
