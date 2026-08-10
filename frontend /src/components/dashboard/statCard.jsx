import { classNames } from "../../Utlis/Common/commonMethod";

const TONES = {
  primary: "bg-primary-50 text-primary-600",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  purple: "bg-violet-50 text-violet-600",
};

export default function StatCard({
  label,
  value,
  caption = "",
  icon: Icon,
  tone = "primary",
  delay = 0,
  onClick = null,
}) {
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick || undefined}
      style={{ animationDelay: `${delay}ms` }}
      className={classNames(
        "card card-hover flex animate-fade-up items-start gap-4 p-5 text-left",
        onClick && "w-full"
      )}
    >
      <span
        className={classNames(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          TONES[tone]
        )}
      >
        <Icon size={20} strokeWidth={2} />
      </span>

      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
          {label}
        </p>
        <p className="mt-1 truncate text-2xl font-bold tracking-tight text-ink-950">
          {value}
        </p>
        {caption && (
          <p className="mt-0.5 truncate text-[12px] text-ink-400">{caption}</p>
        )}
      </div>
    </Wrapper>
  );
}
