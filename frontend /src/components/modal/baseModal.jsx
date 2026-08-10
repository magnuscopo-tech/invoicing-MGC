import { useEffect } from "react";
import { X } from "lucide-react";
import { classNames } from "../../Utlis/Common/commonMethod";

const SIZES = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  full: "max-w-6xl",
};

export default function BaseModal({
  open,
  title,
  description = "",
  size = "md",
  footer = null,
  closeOnBackdrop = true,
  onClose = () => {},
  children,
}) {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 animate-fade-in bg-ink-950/45 backdrop-blur-[2px]"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      <div
        className={classNames(
          "relative flex max-h-[92vh] w-full animate-scale-in flex-col overflow-hidden rounded-t-2xl bg-white shadow-pop sm:rounded-2xl",
          SIZES[size]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink-950">{title}</h2>
            {description && (
              <p className="mt-0.5 text-[13px] text-ink-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1.5 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2.5 border-t border-ink-100 bg-ink-50/60 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
