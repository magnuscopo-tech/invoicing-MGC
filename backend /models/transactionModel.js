const mongoose = require("mongoose");
const {
  TXN_DIRECTIONS,
  TXN_CATEGORIES,
  TXN_PAYMENT_MODES,
  TXN_SOURCES,
} = require("../config/constants");

/*
 * One row of the cash book - a single movement of money through the bank
 * account. This collection is intentionally standalone: it never references a
 * Document, because a document records what was agreed and a transaction
 * records what was banked, and the two do not line up one-to-one.
 */
const transactionSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, index: true },

    // "credit" = money received, "debit" = money paid out. Stored explicitly
    // rather than as a signed amount so every aggregation can group on it.
    direction: { type: String, enum: TXN_DIRECTIONS, required: true, index: true },
    // Always positive. The direction carries the sign.
    amount: { type: Number, required: true, min: 0 },

    category: { type: String, enum: TXN_CATEGORIES, required: true, index: true },

    // Bank narration for an imported row, or the description typed by hand.
    particulars: { type: String, required: true, trim: true },
    // Who the money went to or came from.
    partyName: { type: String, trim: true, default: "", index: true },

    // Bank reference - UPI/IMPS/NEFT ref, cheque number, UTR.
    transactionId: { type: String, trim: true, default: "" },
    paymentMode: { type: String, enum: TXN_PAYMENT_MODES, default: "Other" },
    bankAccount: { type: String, trim: true, default: "" },

    /*
     * Running balance as printed by the bank. Only imported rows carry one - a
     * manually typed entry has no authoritative balance, so it stays null and
     * the dashboard falls back to computing movement instead of reading it.
     */
    balance: { type: Number, default: null },

    remarks: { type: String, trim: true, default: "" },

    source: { type: String, enum: TXN_SOURCES, default: "manual", index: true },
    importBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ImportBatch",
      default: null,
      index: true,
    },

    /*
     * Deduplication key for imported rows. Bank statements are routinely
     * re-uploaded with overlapping periods, so the same transaction must not be
     * booked twice. Manual rows leave this null - two identical cash payments on
     * the same day are a real thing and must both be recordable.
     */
    fingerprint: { type: String, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

transactionSchema.index({ date: -1, direction: 1 });
transactionSchema.index({ category: 1, date: -1 });
transactionSchema.index({ partyName: 1, date: -1 });

// Partial index: only imported rows are deduplicated, and a null fingerprint is
// not a value, so manual rows never collide with each other.
transactionSchema.index(
  { fingerprint: 1 },
  { unique: true, partialFilterExpression: { fingerprint: { $type: "string" } } }
);

module.exports = mongoose.model("Transaction", transactionSchema);
