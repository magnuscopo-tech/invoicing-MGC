const mongoose = require("mongoose");

// One counter per (series prefix, company, year key) so serials reset on the
// correct boundary and never collide between companies.
// key examples: "MCQ:<companyId>:2026", "MCI:<companyId>:26-27"
const counterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Counter", counterSchema);
