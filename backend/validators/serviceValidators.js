const Joi = require("joi");

const includedServiceSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required().messages({
    "string.empty": "Included service name is required",
  }),
});

const createServiceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required().messages({
    "string.empty": "Service name is required",
  }),
  description: Joi.string().trim().max(1000).allow(""),
  defaultUnitPrice: Joi.number().min(0).default(0).messages({
    "number.min": "Default unit price cannot be negative",
  }),
  unit: Joi.string().trim().max(30).default("unit"),
  includedServices: Joi.array().items(includedServiceSchema).default([]),
});

const updateServiceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200),
  description: Joi.string().trim().max(1000).allow(""),
  defaultUnitPrice: Joi.number().min(0),
  unit: Joi.string().trim().max(30),
  includedServices: Joi.array().items(includedServiceSchema),
  isActive: Joi.boolean(),
})
  .min(1)
  .messages({ "object.min": "At least one field is required to update" });

module.exports = { createServiceSchema, updateServiceSchema };
