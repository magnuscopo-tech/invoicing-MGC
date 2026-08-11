import { Inbox } from "lucide-react";
import CustomButton from "./customButton";

export default function EmptyState({
  icon: Icon = Inbox,
  title = "Nothing here yet",
  description = "",
  actionLabel = "",
  actionIcon = null,
  onAction = null,
}) {
  return (
    <div className="flex animate-fade-up flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-500">
        <Icon size={26} strokeWidth={1.8} />
      </div>
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-ink-500">{description}</p>
      )}
      {actionLabel && onAction && (
        <CustomButton
          className="mt-5"
          icon={actionIcon}
          onClick={onAction}
          size="sm"
        >
          {actionLabel}
        </CustomButton>
      )}
    </div>
  );
}
