const Joi = require("joi");
const { GSTIN_REGEX, PAN_REGEX, IFSC_REGEX } = require("../config/constants");

const bankDetailsSchema = Joi.object({
  accountName: Joi.string().trim().max(120).required().messages({
    "string.empty": "Bank account name is required",
  }),
  accountNumber: Joi.string().trim().max(40).required().messages({
    "string.empty": "Bank account number is required",
  }),
  ifsc: Joi.string().trim().uppercase().pattern(IFSC_REGEX).required().messages({
    "string.pattern.base": "IFSC must be 11 characters, e.g. HDFC0001234",
    "string.empty": "IFSC is required",
  }),
  bankName: Joi.string().trim().max(120).allow(""),
  branch: Joi.string().trim().max(120).allow(""),
  bankGstin: Joi.string().trim().uppercase().pattern(GSTIN_REGEX).allow("").messages({
    "string.pattern.base": "Bank GSTIN must be a valid 15 character GSTIN",
  }),
});

const defaultTermsSchema = Joi.object({
  quotation: Joi.string().allow("").max(5000),
  proforma: Joi.string().allow("").max(5000),
  invoice: Joi.string().allow("").max(5000),
});

const createCompanySchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required().messages({
    "string.empty": "Company name is required",
  }),
  gstin: Joi.string().trim().uppercase().pattern(GSTIN_REGEX).required().messages({
    "string.pattern.base": "GSTIN must be a valid 15 character GSTIN",
    "string.empty": "GSTIN is required",
  }),
  pan: Joi.string().trim().uppercase().pattern(PAN_REGEX).required().messages({
    "string.pattern.base": "PAN must be a valid 10 character PAN",
    "string.empty": "PAN is required",
  }),
  stateCode: Joi.string()
    .trim()
    .pattern(/^[0-9]{2}$/)
    .required()
    .messages({
      "string.pattern.base": "State code must be 2 digits",
      "string.empty": "State code is required",
    }),
  address: Joi.string().trim().min(5).max(600).required().messages({
    "string.empty": "Address is required",
  }),
  email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).allow(""),
  phone: Joi.string().trim().max(20).allow(""),
  website: Joi.string().trim().max(150).allow(""),
  bankDetails: bankDetailsSchema.required(),
  defaultTerms: defaultTermsSchema.default({}),
});

const updateCompanySchema = Joi.object({
  name: Joi.string().trim().min(2).max(150),
  gstin: Joi.string().trim().uppercase().pattern(GSTIN_REGEX).messages({
    "string.pattern.base": "GSTIN must be a valid 15 character GSTIN",
  }),
  pan: Joi.string().trim().uppercase().pattern(PAN_REGEX).messages({
    "string.pattern.base": "PAN must be a valid 10 character PAN",
  }),
  stateCode: Joi.string()
    .trim()
    .pattern(/^[0-9]{2}$/)
    .messages({ "string.pattern.base": "State code must be 2 digits" }),
  address: Joi.string().trim().min(5).max(600),
  email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).allow(""),
  phone: Joi.string().trim().max(20).allow(""),
  website: Joi.string().trim().max(150).allow(""),
  bankDetails: bankDetailsSchema,
  defaultTerms: defaultTermsSchema,
  isActive: Joi.boolean(),
})
  .min(1)
  .messages({ "object.min": "At least one field is required to update" });

module.exports = { createCompanySchema, updateCompanySchema };
