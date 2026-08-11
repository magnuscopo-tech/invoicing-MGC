const Joi = require("joi");
const { USER_ROLES } = require("../config/constants");

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 2 characters",
  }),
  email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).required().messages({
    "string.email": "A valid email address is required",
    "string.empty": "Email is required",
  }),
  password: Joi.string().min(8).max(72).required().messages({
    "string.min": "Password must be at least 8 characters",
    "string.empty": "Password is required",
  }),
  role: Joi.string()
    .valid(...USER_ROLES)
    .default("finance_user"),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).required().messages({
    "string.email": "A valid email address is required",
    "string.empty": "Email is required",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required",
  }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "string.empty": "Current password is required",
  }),
  newPassword: Joi.string().min(8).max(72).required().messages({
    "string.min": "New password must be at least 8 characters",
  }),
});

const listUserQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  role: Joi.string().valid(...USER_ROLES),
  isActive: Joi.boolean(),
  search: Joi.string().trim().max(120).allow(""),
});

const updateUserStatusSchema = Joi.object({
  isActive: Joi.boolean(),
  role: Joi.string().valid(...USER_ROLES),
})
  .min(1)
  .messages({ "object.min": "Provide isActive or role to update" });

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  listUserQuerySchema,
  updateUserStatusSchema,
};
