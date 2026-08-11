import { BRAND } from "../../constants/brand.constants";
import { classNames } from "../../Utlis/Common/commonMethod";

const SIZES = {
  sm: { box: "h-9 w-9 rounded-xl text-[12px]", name: "text-sm", sub: "text-[11px]" },
  md: { box: "h-11 w-11 rounded-2xl text-sm", name: "text-[15px]", sub: "text-[11px]" },
  lg: { box: "h-14 w-14 rounded-2xl text-lg", name: "text-lg", sub: "text-xs" },
};

/*
 * Brand lockup: monogram + wordmark. `tone` picks the treatment for the surface
 * it sits on — "light" for white app chrome, "onDark" for the gradient panel.
 */
export default function BrandMark({
  size = "md",
  tone = "light",
  showText = true,
  subtitle = BRAND.product,
  className = "",
}) {
  const scale = SIZES[size];
  const onDark = tone === "onDark";

  return (
    <div className={classNames("flex items-center gap-3", className)}>
      <span
        className={classNames(
          "relative flex shrink-0 items-center justify-center font-bold tracking-tight",
          scale.box,
          onDark
            ? "bg-white/12 text-white ring-1 ring-inset ring-white/25 backdrop-blur"
            : "bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-[0_10px_24px_-12px_rgba(29,93,245,0.95)]"
        )}
      >
        {BRAND.monogram}
      </span>

      {showText && (
        <span className="min-w-0 leading-tight">
          <span
            className={classNames(
              "block truncate font-bold tracking-tight",
              scale.name,
              onDark ? "text-white" : "text-ink-950"
            )}
          >
            {BRAND.name}
          </span>
          {subtitle && (
            <span
              className={classNames(
                "block truncate font-medium",
                scale.sub,
                onDark ? "text-primary-200" : "text-ink-400"
              )}
            >
              {subtitle}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
