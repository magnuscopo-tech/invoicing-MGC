const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null,
      index: true,
    },
    entityType: { type: String, default: "document" },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    // "created", "updated", "regenerated", "status_changed", "converted", "deleted"
    action: { type: String, required: true, index: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
