import { Check } from "lucide-react";
import { classNames } from "../../Utlis/Common/commonMethod";

export default function WizardStepper({
  steps = [],
  activeStep = 0,
  onStepClick = () => {},
}) {
  return (
    <ol className="card flex animate-fade-up flex-col gap-1 p-2 sm:flex-row sm:items-center sm:gap-0">
      {steps.map((step, index) => {
        const isDone = index < activeStep;
        const isActive = index === activeStep;
        const isReachable = index <= activeStep;

        return (
          <li key={step.title} className="flex flex-1 items-center">
            <button
              type="button"
              disabled={!isReachable}
              onClick={() => isReachable && onStepClick(index)}
              className={classNames(
                "flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200",
                isActive && "bg-primary-50",
                isReachable && !isActive && "hover:bg-ink-50",
                !isReachable && "cursor-not-allowed opacity-60"
              )}
            >
              <span
                className={classNames(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-all duration-300",
                  isDone && "bg-emerald-500 text-white",
                  isActive && "bg-primary-600 text-white shadow-[0_8px_18px_-8px_rgba(29,93,245,0.9)]",
                  !isDone && !isActive && "bg-ink-100 text-ink-500"
                )}
              >
                {isDone ? <Check size={15} strokeWidth={3} /> : index + 1}
              </span>

              <span className="min-w-0">
                <span
                  className={classNames(
                    "block truncate text-[13px] font-semibold",
                    isActive ? "text-primary-800" : "text-ink-700"
                  )}
                >
                  {step.title}
                </span>
                <span className="block truncate text-[11px] text-ink-400">
                  {step.hint}
                </span>
              </span>
            </button>

            {index < steps.length - 1 && (
              <span
                className={classNames(
                  "mx-1 hidden h-px flex-1 transition-colors duration-300 sm:block",
                  isDone ? "bg-emerald-300" : "bg-ink-200"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
