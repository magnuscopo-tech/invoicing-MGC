import { CheckCircle2, Clock, PenLine, Send, XCircle } from "lucide-react";
import StatusBadge from "../custom/statusBadge";
import {
  APPROVAL_LABELS,
  APPROVAL_STATUS,
  APPROVAL_TONE,
} from "../../constants/document.constants";
import { formatDisplayDateTime } from "../../Utlis/dateFormat";
import { resolveAssetUrl } from "../../Utlis/assetUrl";

const ICONS = {
  not_submitted: Send,
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
};

const NOTES = {
  not_submitted:
    "This document is unsigned. Send it for approval — an admin applies the authorised signature when they approve it.",
  pending:
    "Waiting for an admin to review. The document cannot be edited while it is under review.",
  approved:
    "Approved and signed. The downloadable PDF is the signed copy, and the document is locked against edits.",
  rejected:
    "Sent back unsigned. Edit the document and submit it again when it is ready.",
};

export default function DocumentApprovalPanel({ document: doc }) {
  const Icon = ICONS[doc.approvalStatus] || Send;

  const timestamp =
    doc.approvalStatus === APPROVAL_STATUS.pending
      ? doc.submittedForApprovalAt
      : doc.approvalStatus === APPROVAL_STATUS.approved
        ? doc.approvedAt
        : doc.approvalStatus === APPROVAL_STATUS.rejected
          ? doc.rejectedAt
          : null;

  return (
    <section className="card animate-fade-up p-5">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-ink-400">
          Approval
        </h2>
        <StatusBadge
          label={APPROVAL_LABELS[doc.approvalStatus]}
          tone={APPROVAL_TONE[doc.approvalStatus]}
        />
      </div>

      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-500">
          <Icon size={17} />
        </span>
        <p className="pt-1 text-[13px] leading-relaxed text-ink-600">
          {NOTES[doc.approvalStatus]}
        </p>
      </div>

      {timestamp && (
        <p className="mt-3 border-t border-ink-100 pt-3 text-[12px] text-ink-400">
          {doc.approvalStatus === APPROVAL_STATUS.pending
            ? "Submitted"
            : doc.approvalStatus === APPROVAL_STATUS.approved
              ? "Approved"
              : "Rejected"}{" "}
          {formatDisplayDateTime(timestamp)}
        </p>
      )}

      {doc.approvalStatus === APPROVAL_STATUS.rejected &&
        doc.rejectionReason && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-[13px] leading-relaxed text-red-700">
            <span className="font-semibold">Reason: </span>
            {doc.rejectionReason}
          </p>
        )}

      {doc.isSigned && doc.signatureUrl && (
        <div className="mt-4 rounded-xl border border-ink-100 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-400">
            <PenLine size={12} /> Applied signature
          </p>
          <img
            src={resolveAssetUrl(doc.signatureUrl)}
            alt="Authorised signature"
            className="max-h-16 object-contain"
          />
        </div>
      )}
    </section>
  );
}
