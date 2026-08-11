const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    address: { type: String, required: true, trim: true },
    // Optional - a quotation never prints the buyer GSTIN even when it is stored.
    gstin: { type: String, trim: true, uppercase: true, default: "" },
    stateCode: { type: String, trim: true, default: "" },
    contactPerson: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

clientSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model("Client", clientSchema);
