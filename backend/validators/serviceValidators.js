const Joi = require("joi");

const createServiceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required().messages({
    "string.empty": "Service name is required",
  }),
  description: Joi.string().trim().max(1000).allow(""),
  defaultUnitPrice: Joi.number().min(0).default(0).messages({
    "number.min": "Default unit price cannot be negative",
  }),
  unit: Joi.string().trim().max(30).default("unit"),
});

const updateServiceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200),
  description: Joi.string().trim().max(1000).allow(""),
  defaultUnitPrice: Joi.number().min(0),
  unit: Joi.string().trim().max(30),
  isActive: Joi.boolean(),
})
  .min(1)
  .messages({ "object.min": "At least one field is required to update" });

module.exports = { createServiceSchema, updateServiceSchema };
