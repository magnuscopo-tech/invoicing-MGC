const AuditLog = require("../models/auditLogModel");

// Fire-and-forget audit trail. A logging failure must never fail the request that
// produced it, so errors are swallowed after being logged.
const recordAudit = ({
  documentId = null,
  entityType = "document",
  entityId = null,
  action,
  performedBy = null,
  meta = {},
}) => {
  setImmediate(async () => {
    try {
      await AuditLog.create({
        document: documentId,
        entityType,
        entityId: entityId || documentId,
        action,
        performedBy,
        meta,
      });
    } catch (error) {
      console.error("Audit Log Error:", error.message);
    }
  });
};

module.exports = { recordAudit };
