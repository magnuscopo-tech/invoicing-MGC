const Joi = require("joi");
const { DOC_TYPES, DOC_STATUSES, OBJECT_ID_REGEX } = require("../config/constants");

const objectId = Joi.string()
  .pattern(OBJECT_ID_REGEX)
  .messages({ "string.pattern.base": "A valid id is required" });

// Every report accepts the same company + date-range scope.
const scopeKeys = {
  companyId: objectId,
  clientId: objectId,
  fromDate: Joi.date(),
  toDate: Joi.date(),
};

const reportScopeSchema = Joi.object({ ...scopeKeys });

const revenueTrendQuerySchema = Joi.object({
  ...scopeKeys,
  months: Joi.number().integer().min(3).max(36).default(12),
});

const topClientsQuerySchema = Joi.object({
  ...scopeKeys,
  limit: Joi.number().integer().min(1).max(50).default(10),
});

const gstSummaryQuerySchema = Joi.object({
  ...scopeKeys,
  months: Joi.number().integer().min(3).max(36).default(12),
});

const auditTrailQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  action: Joi.string().trim().max(40),
  entityType: Joi.string().valid("document", "company", "client", "service", "user"),
  performedBy: objectId,
  fromDate: Joi.date(),
  toDate: Joi.date(),
});

const documentLedgerQuerySchema = Joi.object({
  ...scopeKeys,
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
  docType: Joi.string().valid(...DOC_TYPES),
  status: Joi.string().valid(...DOC_STATUSES),
  search: Joi.string().trim().max(120).allow(""),
});

module.exports = {
  reportScopeSchema,
  revenueTrendQuerySchema,
  topClientsQuerySchema,
  gstSummaryQuerySchema,
  auditTrailQuerySchema,
  documentLedgerQuerySchema,
};
