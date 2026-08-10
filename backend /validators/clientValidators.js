const Joi = require("joi");
const { GSTIN_REGEX } = require("../config/constants");

const createClientSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required().messages({
    "string.empty": "Client name is required",
  }),
  address: Joi.string().trim().min(5).max(600).required().messages({
    "string.empty": "Client address is required",
  }),
  // Optional - a quotation never prints it, but a proforma/invoice does.
  gstin: Joi.string().trim().uppercase().pattern(GSTIN_REGEX).allow("").messages({
    "string.pattern.base": "GSTIN must be a valid 15 character GSTIN",
  }),
  stateCode: Joi.string()
    .trim()
    .pattern(/^[0-9]{2}$/)
    .allow("")
    .messages({ "string.pattern.base": "State code must be 2 digits" }),
  contactPerson: Joi.string().trim().max(120).allow(""),
  email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).allow(""),
  phone: Joi.string().trim().max(20).allow(""),
});

const updateClientSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150),
  address: Joi.string().trim().min(5).max(600),
  gstin: Joi.string().trim().uppercase().pattern(GSTIN_REGEX).allow("").messages({
    "string.pattern.base": "GSTIN must be a valid 15 character GSTIN",
  }),
  stateCode: Joi.string()
    .trim()
    .pattern(/^[0-9]{2}$/)
    .allow(""),
  contactPerson: Joi.string().trim().max(120).allow(""),
  email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).allow(""),
  phone: Joi.string().trim().max(20).allow(""),
  isActive: Joi.boolean(),
})
  .min(1)
  .messages({ "object.min": "At least one field is required to update" });

module.exports = { createClientSchema, updateClientSchema };
