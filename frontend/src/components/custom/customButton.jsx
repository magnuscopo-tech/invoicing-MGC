import { classNames } from "../../Utlis/Common/commonMethod";
import ButtonLoader from "../loader/buttonLoader";

const VARIANTS = {
  primary:
    "bg-primary-600 text-white shadow-[0_10px_24px_-12px_rgba(29,93,245,0.9)] hover:bg-primary-700 focus-visible:ring-primary-200",
  secondary:
    "bg-white text-ink-700 border border-ink-200 hover:border-primary-300 hover:text-primary-700 focus-visible:ring-primary-100",
  subtle:
    "bg-primary-50 text-primary-700 hover:bg-primary-100 focus-visible:ring-primary-100",
  ghost:
    "bg-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-900 focus-visible:ring-ink-200",
  danger:
    "bg-red-600 text-white shadow-[0_10px_24px_-12px_rgba(220,38,38,0.9)] hover:bg-red-700 focus-visible:ring-red-200",
  dangerGhost:
    "bg-transparent text-red-600 hover:bg-red-50 focus-visible:ring-red-100",
};

const SIZES = {
  sm: "h-9 px-3 text-[13px] gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2",
};

export default function CustomButton({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon: Icon = null,
  iconRight = false,
  fullWidth = false,
  className = "",
  onClick = () => {},
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={classNames(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-4 active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className
      )}
    >
      {loading && <ButtonLoader />}
      {!loading && Icon && !iconRight && <Icon size={16} strokeWidth={2.2} />}
      {children}
      {!loading && Icon && iconRight && <Icon size={16} strokeWidth={2.2} />}
    </button>
  );
}
