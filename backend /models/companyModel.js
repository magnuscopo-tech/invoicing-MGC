const mongoose = require("mongoose");

const bankDetailsSchema = new mongoose.Schema(
  {
    accountName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    ifsc: { type: String, required: true, trim: true, uppercase: true },
    bankName: { type: String, trim: true },
    branch: { type: String, trim: true },
    // GSTIN is repeated inside the bank block on the printed document.
    bankGstin: { type: String, trim: true, uppercase: true },
  },
  { _id: false }
);

// One editable terms block per document type. Seeded onto a document at creation
// and swapped when a document is converted to another type.
const defaultTermsSchema = new mongoose.Schema(
  {
    quotation: { type: String, default: "" },
    proforma: { type: String, default: "" },
    invoice: { type: String, default: "" },
  },
  { _id: false }
);

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    gstin: { type: String, required: true, trim: true, uppercase: true },
    pan: { type: String, required: true, trim: true, uppercase: true },
    stateCode: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    logoUrl: { type: String, default: "" },
    signatureUrl: { type: String, default: "" },
    bankDetails: { type: bankDetailsSchema, required: true },
    defaultTerms: { type: defaultTermsSchema, default: () => ({}) },
    // Soft delete - a company referenced by a document is deactivated, never removed.
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

companySchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model("Company", companySchema);
