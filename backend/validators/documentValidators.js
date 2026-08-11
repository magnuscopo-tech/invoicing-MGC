const Joi = require("joi");
const {
  DOC_TYPES,
  DOC_STATUSES,
  APPROVAL_STATUSES,
  BILLING_MODES,
  OBJECT_ID_REGEX,
} = require("../config/constants");

const objectId = Joi.string().pattern(OBJECT_ID_REGEX).messages({
  "string.pattern.base": "Must be a valid id",
});

const itemSchema = Joi.object({
  serviceRef: objectId.allow(null, ""),
  description: Joi.string().trim().min(1).max(1000).required().messages({
    "string.empty": "Item description is required",
  }),
  unit: Joi.string().trim().max(30).allow(""),
  qty: Joi.number().min(0).required().messages({
    "number.base": "Item quantity must be a number",
    "number.min": "Item quantity cannot be negative",
  }),
  unitPrice: Joi.number().min(0).required().messages({
    "number.base": "Item unit price must be a number",
    "number.min": "Item unit price cannot be negative",
  }),
  discountPercent: Joi.number().min(0).max(100).default(0).messages({
    "number.min": "Discount must be between 0 and 100",
    "number.max": "Discount must be between 0 and 100",
  }),
  // Accepted but ignored - the server always recomputes the line amount.
  amount: Joi.number().optional(),
});

// GST is a fixed server-side constant, never accepted from the client.
const forbiddenGstPercent = Joi.any().forbidden().messages({
  "any.unknown": "gstPercent is fixed at 18% and cannot be sent by the client",
});

/*
 * Split-billing fields are derived from a billing plan, never posted. An
 * installment created through this endpoint would carry a percentage that
 * nothing had reserved a serial or a share of the contract for, so it is
 * rejected the same way a client-supplied GST rate is.
 */
const forbiddenBillingField = Joi.any().forbidden().messages({
  "any.unknown":
    "Installment fields are set by the billing plan. Raise installments from the plan instead.",
});

const billingFieldGuards = {
  billingPlan: forbiddenBillingField,
  billingMode: forbiddenBillingField,
  installmentIndex: forbiddenBillingField,
  installmentPercent: forbiddenBillingField,
  installmentLabel: forbiddenBillingField,
  contractTotal: forbiddenBillingField,
  coveredProformas: forbiddenBillingField,
};

const createDocumentSchema = Joi.object({
  docType: Joi.string()
    .valid(...DOC_TYPES)
    .required()
    .messages({ "any.only": "docType must be quotation, proforma or invoice" }),
  company: objectId.required().messages({ "any.required": "Company is required" }),
  client: objectId.required().messages({ "any.required": "Client is required" }),
  issueDate: Joi.date().required().messages({
    "date.base": "A valid issue date is required",
  }),
  dueDate: Joi.date().min(Joi.ref("issueDate")).allow(null, "").messages({
    "date.min": "Due date cannot be earlier than the issue date",
  }),
  introLine: Joi.string().trim().max(600).allow(""),
  items: Joi.array().items(itemSchema).min(1).required().messages({
    "array.min": "At least one item is required",
    "any.required": "At least one item is required",
  }),
  gstApplicable: Joi.boolean(),
  notesTerms: Joi.string().max(5000).allow(""),
  status: Joi.string().valid(...DOC_STATUSES),
  gstPercent: forbiddenGstPercent,
  ...billingFieldGuards,
});

const updateDocumentSchema = Joi.object({
  company: objectId,
  client: objectId,
  issueDate: Joi.date(),
  dueDate: Joi.date().allow(null, ""),
  introLine: Joi.string().trim().max(600).allow(""),
  items: Joi.array().items(itemSchema).min(1).messages({
    "array.min": "At least one item is required",
  }),
  gstApplicable: Joi.boolean(),
  notesTerms: Joi.string().max(5000).allow(""),
  status: Joi.string().valid(...DOC_STATUSES),
  gstPercent: forbiddenGstPercent,
  ...billingFieldGuards,
})
  .min(1)
  .messages({ "object.min": "At least one field is required to update" });

const convertDocumentSchema = Joi.object({
  toType: Joi.string()
    .valid("proforma", "invoice")
    .required()
    .messages({ "any.only": "toType must be proforma or invoice" }),
  issueDate: Joi.date().allow(null, ""),
  dueDate: Joi.date().allow(null, ""),
  // "swap" uses the target type's standard terms, "keep" carries the source text over.
  termsStrategy: Joi.string().valid("auto", "keep", "swap").default("auto"),
});

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...DOC_STATUSES)
    .required()
    .messages({ "any.only": `Status must be one of ${DOC_STATUSES.join(", ")}` }),
});

const nextNumberQuerySchema = Joi.object({
  type: Joi.string()
    .valid(...DOC_TYPES)
    .required()
    .messages({ "any.only": "type must be quotation, proforma or invoice" }),
  companyId: objectId.required().messages({ "any.required": "companyId is required" }),
  date: Joi.date().allow(null, ""),
});

const listDocumentQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  client: objectId,
  company: objectId,
  docType: Joi.string().valid(...DOC_TYPES),
  status: Joi.string().valid(...DOC_STATUSES),
  approvalStatus: Joi.string()
    .valid(...APPROVAL_STATUSES)
    .messages({
      "any.only": `approvalStatus must be one of ${APPROVAL_STATUSES.join(", ")}`,
    }),
  fromDate: Joi.date(),
  toDate: Joi.date(),
  search: Joi.string().trim().max(120).allow(""),
  // "partial" narrows the history to installment proformas.
  billingMode: Joi.string().valid(...BILLING_MODES),
});

const rejectDocumentSchema = Joi.object({
  rejectionReason: Joi.string().trim().min(3).max(500).required().messages({
    "string.empty": "A reason is required so the sender knows what to fix",
    "string.min": "Please give at least 3 characters of context",
  }),
});

module.exports = {
  createDocumentSchema,
  updateDocumentSchema,
  convertDocumentSchema,
  updateStatusSchema,
  nextNumberQuerySchema,
  listDocumentQuerySchema,
  rejectDocumentSchema,
};
