import { AlertTriangle } from "lucide-react";
import BaseModal from "./baseModal";
import CustomButton from "../custom/customButton";

export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
  onConfirm = () => {},
  onClose = () => {},
}) {
  return (
    <BaseModal
      open={open}
      title={title}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <CustomButton variant="secondary" size="sm" onClick={onClose}>
            {cancelLabel}
          </CustomButton>
          <CustomButton
            variant={tone}
            size="sm"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </CustomButton>
        </>
      }
    >
      <div className="flex gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <AlertTriangle size={20} />
        </span>
        <p className="pt-1.5 text-sm leading-relaxed text-ink-600">{message}</p>
      </div>
    </BaseModal>
  );
}
