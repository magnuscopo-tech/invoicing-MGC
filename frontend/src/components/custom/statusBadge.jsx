import { classNames } from "../../Utlis/Common/commonMethod";

const TONES = {
  neutral: "bg-ink-100 text-ink-600 ring-ink-200",
  info: "bg-primary-50 text-primary-700 ring-primary-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-200",
};

export default function StatusBadge({
  label,
  tone = "neutral",
  dot = true,
  className = "",
}) {
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ring-inset",
        TONES[tone] || TONES.neutral,
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {label}
    </span>
  );
}
