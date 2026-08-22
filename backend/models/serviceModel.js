const mongoose = require("mongoose");

const includedServiceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true, default: "" },
    defaultUnitPrice: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: "unit", trim: true },
    includedServices: { type: [includedServiceSchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

serviceSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model("Service", serviceSchema);
