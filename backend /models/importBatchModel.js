const mongoose = require("mongoose");
const { IMPORT_STATUSES } = require("../config/constants");

/*
 * The receipt for one bank-statement upload. It exists so an import is
 * reversible: every transaction created by an upload points back at its batch,
 * so a bad file can be undone in one action instead of being unpicked row by
 * row. It is also the audit answer to "where did this number come from".
 */
const importBatchSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true, trim: true },
    sheetName: { type: String, default: "", trim: true },

    // Both read out of the statement header when it carries them.
    bankAccount: { type: String, trim: true, default: "" },
    periodFrom: { type: Date, default: null },
    periodTo: { type: Date, default: null },

    // The statement's own opening/closing balance, when the file states them.
    openingBalance: { type: Number, default: null },
    closingBalance: { type: Number, default: null },

    // rowsRead counts data rows found; the three below always sum to it.
    rowsRead: { type: Number, default: 0 },
    inserted: { type: Number, default: 0 },
    duplicates: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },

    totalCredit: { type: Number, default: 0 },
    totalDebit: { type: Number, default: 0 },

    /*
     * Per-row rejections: { row, reason }. Capped so one broken file cannot
     * write an unbounded document. Named rowErrors rather than errors because
     * `errors` is a reserved path on a Mongoose document - taking it would
     * shadow the validation-error bag.
     */
    rowErrors: { type: [mongoose.Schema.Types.Mixed], default: [] },

    status: { type: String, enum: IMPORT_STATUSES, default: "completed" },

    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

importBatchSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ImportBatch", importBatchSchema);
