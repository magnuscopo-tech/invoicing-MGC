const Joi = require("joi");
const {
  BILLING_PLAN_STATUSES,
  MIN_INSTALLMENTS,
  MAX_INSTALLMENTS,
  OBJECT_ID_REGEX,
} = require("../config/constants");

const objectId = Joi.string().pattern(OBJECT_ID_REGEX).messages({
  "string.pattern.base": "Must be a valid id",
});

// Two decimals is deliberate: 33.33 / 33.33 / 33.34 is a real split, but a
// percentage carried to more places than that is a sign of a UI rounding bug
// rather than an agreement anyone made.
const percent = Joi.number().greater(0).max(100).precision(2).required().messages({
  "number.base": "Each installment needs a percentage",
  "number.greater": "An installment must be more than 0%",
  "number.max": "An installment cannot exceed 100%",
});

const itemSchema = Joi.object({
  serviceRef: objectId.allow(null, ""),
  description: Joi.string().trim().min(1).max(1000).required().messages({
    "string.empty": "Item description is required",
  }),
  unit: Joi.string().trim().max(30).allow(""),
  qty: Joi.number().min(0).required(),
  unitPrice: Joi.number().min(0).required(),
  discountPercent: Joi.number().min(0).max(100).default(0),
  amount: Joi.number().optional(),
});

/*
 * The percentages must total exactly 100, checked here rather than in the
 * service so a malformed split never reaches the point where a serial has
 * already been burned for it.
 *
 * Compared as hundredths: 33.33 + 33.33 + 33.34 is 99.99999999999999 in floating
 * point, and rejecting that would make a perfectly ordinary thirds split
 * impossible to enter.
 */
const totalsToHundred = (installments, helpers) => {
  const total =
    Math.round(installments.reduce((sum, slice) => sum + slice.percent, 0) * 100) / 100;
  if (total !== 100) {
    return helpers.message(
      `Installments must add up to exactly 100% (they currently total ${total}%)`
    );
  }
  return installments;
};

const installmentsSchema = Joi.array()
  .items(
    Joi.object({
      percent,
      label: Joi.string().trim().max(60).allow(""),
    })
  )
  .min(MIN_INSTALLMENTS)
  .max(MAX_INSTALLMENTS)
  .required()
  .custom(totalsToHundred)
  .messages({
    "array.min": `A billing plan needs at least ${MIN_INSTALLMENTS} installments. For a single payment, convert the quotation to a proforma instead.`,
    "array.max": `A billing plan supports at most ${MAX_INSTALLMENTS} installments`,
    "any.required": "The installment split is required",
  });

/*
 * Either cut the plan from a quotation, or describe the job directly. The
 * "one or the other" check is left to the service, which is where the source
 * quotation is loaded and its parties and scope are read off it.
 */
const createBillingPlanSchema = Joi.object({
  sourceDocument: objectId,
  company: objectId,
  client: objectId,
  items: Joi.array().items(itemSchema).min(1),
  gstApplicable: Joi.boolean(),
  notesTerms: Joi.string().max(5000).allow(""),
  issueDate: Joi.date().allow(null, ""),
  installments: installmentsSchema,
});

const generateInstallmentSchema = Joi.object({
  issueDate: Joi.date().allow(null, ""),
  dueDate: Joi.date().allow(null, ""),
  notesTerms: Joi.string().max(5000).allow(""),
});

const recordInstallmentPaymentSchema = Joi.object({
  // Omitted means "the full installment", which is the normal case.
  amountReceived: Joi.number().min(0),
  paidAt: Joi.date().allow(null, ""),
  paymentMode: Joi.string().trim().max(40).allow(""),
  paymentReference: Joi.string().trim().max(120).allow(""),
});

const cancelInstallmentSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(500).required().messages({
    "string.empty": "A reason is required so the audit trail explains the change",
    "string.min": "Please give at least 3 characters of context",
  }),
  /*
   * Optional: hand the cancelled slice's percentage to the installments that
   * have not gone out yet. Without it the plan is left short of 100% and must
   * be reallocated later or closed early - which is a legitimate state, just
   * not one that can be invoiced.
   */
  reallocation: Joi.array().items(
    Joi.object({
      index: Joi.number().integer().min(1).required(),
      percent,
    })
  ),
});

const closePlanSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(500).required().messages({
    "string.empty": "A reason is required so the audit trail explains the change",
    "string.min": "Please give at least 3 characters of context",
  }),
});

const raiseFinalInvoiceSchema = Joi.object({
  issueDate: Joi.date().allow(null, ""),
  dueDate: Joi.date().allow(null, ""),
  notesTerms: Joi.string().max(5000).allow(""),
});

const listBillingPlanQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  client: objectId,
  company: objectId,
  status: Joi.string().valid(...BILLING_PLAN_STATUSES),
  search: Joi.string().trim().max(120).allow(""),
});

const planParamsSchema = Joi.object({
  id: objectId.required(),
  index: Joi.number().integer().min(1),
});

module.exports = {
  createBillingPlanSchema,
  generateInstallmentSchema,
  recordInstallmentPaymentSchema,
  cancelInstallmentSchema,
  closePlanSchema,
  raiseFinalInvoiceSchema,
  listBillingPlanQuerySchema,
  planParamsSchema,
};
