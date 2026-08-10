import { useState } from "react";
import StatusBadge from "../custom/statusBadge";
import {
  DOC_STATUS,
  DOC_STATUS_TONE,
  LOCKED_STATUSES,
  MANUAL_STATUS_OPTIONS,
} from "../../constants/document.constants";
import { handleUpdateDocumentStatus } from "../../Services/apiCalling/documentApis";
import { SuccessMessage } from "../../Utlis/Toastify/ToastMessage";
import { MESSAGES } from "../../constants/message.constants";
import { classNames } from "../../Utlis/Common/commonMethod";

export default function DocumentStatusControl({
  documentId,
  status,
  onUpdated = () => {},
}) {
  const [saving, setSaving] = useState(false);

  const onSelect = async (nextStatus) => {
    if (nextStatus === status) return;

    setSaving(true);
    try {
      const result = await handleUpdateDocumentStatus(documentId, {
        status: nextStatus,
      });
      if (result) {
        SuccessMessage(MESSAGES.statusUpdated);
        onUpdated(result);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card animate-fade-up p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-ink-400">
          Status
        </h2>
        <StatusBadge label={status} tone={DOC_STATUS_TONE[status]} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {MANUAL_STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={saving || option.value === status}
            onClick={() => onSelect(option.value)}
            className={classNames(
              "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all duration-200",
              option.value === status
                ? "cursor-default bg-primary-600 text-white"
                : "bg-ink-100 text-ink-600 hover:bg-primary-100 hover:text-primary-700",
              saving && "opacity-60"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {status === DOC_STATUS.paid ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[12px] leading-relaxed text-emerald-800">
          Marked paid because the tax invoice was approved — that approval is
          what confirms the payment, so this is not set by hand.
        </p>
      ) : (
        LOCKED_STATUSES.includes(status) && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
            A {status} document is locked against edits. Change the status first
            if you need to modify it.
          </p>
        )
      )}
    </div>
  );
}
