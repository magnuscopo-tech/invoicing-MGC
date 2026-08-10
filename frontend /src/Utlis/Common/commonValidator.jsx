import { REGEX } from "../../constants/regex.constants";

export const commonValidator = (type, value) => {
  const trimmed = typeof value === "string" ? value.trim() : value;

  switch (type) {
    case "email":
      if (!trimmed) return "Please enter an email address.";
      if (!REGEX.email.test(trimmed)) return "Please enter a valid email ID.";
      return "";

    case "optionalEmail":
      if (!trimmed) return "";
      if (!REGEX.email.test(trimmed)) return "Please enter a valid email ID.";
      return "";

    case "password":
      if (!trimmed) return "Please enter a password.";
      if (trimmed.length < 8) return "Password must be at least 8 characters.";
      return "";

    case "name":
      if (!trimmed) return "This field is required.";
      if (trimmed.length < 2) return "Please enter at least 2 characters.";
      return "";

    case "required":
      if (!trimmed && trimmed !== 0) return "This field is required.";
      return "";

    case "gstin":
      if (!trimmed) return "Please enter the GSTIN.";
      if (!REGEX.gstin.test(trimmed.toUpperCase()))
        return "GSTIN must be a valid 15 character GSTIN.";
      return "";

    case "optionalGstin":
      if (!trimmed) return "";
      if (!REGEX.gstin.test(trimmed.toUpperCase()))
        return "GSTIN must be a valid 15 character GSTIN.";
      return "";

    case "pan":
      if (!trimmed) return "Please enter the PAN.";
      if (!REGEX.pan.test(trimmed.toUpperCase()))
        return "PAN must be a valid 10 character PAN.";
      return "";

    case "ifsc":
      if (!trimmed) return "Please enter the IFSC code.";
      if (!REGEX.ifsc.test(trimmed.toUpperCase()))
        return "IFSC must be a valid 11 character code.";
      return "";

    case "stateCode":
      if (!trimmed) return "Please enter the state code.";
      if (!REGEX.stateCode.test(trimmed))
        return "State code must be exactly 2 digits.";
      return "";

    case "optionalPhone":
      if (!trimmed) return "";
      if (!REGEX.phone.test(trimmed)) return "Please enter a valid phone number.";
      return "";

    case "discountPercent": {
      const numeric = Number(trimmed);
      if (Number.isNaN(numeric)) return "Discount must be a number.";
      if (numeric < 0 || numeric > 100) return "Discount must be between 0 and 100.";
      return "";
    }

    case "positiveNumber": {
      const numeric = Number(trimmed);
      if (trimmed === "" || Number.isNaN(numeric))
        return "Please enter a valid number.";
      if (numeric < 0) return "Value cannot be negative.";
      return "";
    }

    default:
      return "";
  }
};

// Runs a { field: validatorType } map against a form object.
export const validateForm = (formData, rules) => {
  const errors = {};

  Object.entries(rules).forEach(([field, type]) => {
    const message = commonValidator(type, formData[field]);
    if (message) errors[field] = message;
  });

  return errors;
};

export const isDueDateValid = (issueDate, dueDate) => {
  if (!issueDate || !dueDate) return true;
  return new Date(dueDate) >= new Date(issueDate);
};
