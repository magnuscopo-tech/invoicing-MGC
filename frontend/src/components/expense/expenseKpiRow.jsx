import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  Scale,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "../../Utlis/currencyFormat";
import { formatDisplayDate } from "../../Utlis/dateFormat";
import { classNames } from "../../Utlis/Common/commonMethod";
import { DELTA_COLORS } from "../../constants/chart.constants";

const TONES = {
  primary: "bg-primary-50 text-primary-600",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
};

/*
 * Four headline numbers, so these are stat tiles rather than a chart. The delta
 * is only rendered when the API actually supplied a comparison window - an
 * unscoped view has no honest baseline to compare against.
 */
const Delta = ({ percent, higherIsBetter }) => {
  if (percent === null || percent === undefined) return null;

  const isUp = percent >= 0;
  const isGood = higherIsBetter ? isUp : !isUp;
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums"
      style={{ color: isGood ? DELTA_COLORS.positive : DELTA_COLORS.negative }}
    >
      <Icon size={13} strokeWidth={2.5} />
      {Math.abs(percent).toFixed(1)}%
      <span className="font-normal text-ink-400">vs previous period</span>
    </span>
  );
};

const Tile = ({
  label,
  value,
  caption,
  icon: Icon,
  tone,
  delay,
  delta = null,
  higherIsBetter = true,
}) => (
  <article
    style={{ animationDelay: `${delay}ms` }}
    className="card card-hover animate-fade-up p-5"
  >
    <div className="flex items-start justify-between gap-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
        {label}
      </p>
      <span
        className={classNames(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          TONES[tone]
        )}
      >
        <Icon size={17} strokeWidth={2} />
      </span>
    </div>

    <p className="mt-3 text-2xl font-bold tracking-tight text-ink-950">{value}</p>
    <Delta percent={delta} higherIsBetter={higherIsBetter} />
    {caption && <p className="mt-1 text-[12px] text-ink-400">{caption}</p>}
  </article>
);

export default function ExpenseKpiRow({ summary }) {
  if (!summary) return null;

  const { moneyIn, moneyOut, netFlow, balance, comparison, creditCount, debitCount } =
    summary;

  const isSurplus = netFlow >= 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Tile
        label="Money in"
        value={formatCurrency(moneyIn)}
        caption={`${creditCount} receipt${creditCount === 1 ? "" : "s"}`}
        icon={TrendingUp}
        tone="success"
        delta={comparison?.moneyInChange}
        higherIsBetter
        delay={0}
      />
      <Tile
        label="Money out"
        value={formatCurrency(moneyOut)}
        caption={`${debitCount} payment${debitCount === 1 ? "" : "s"}`}
        icon={TrendingDown}
        tone="warning"
        delta={comparison?.moneyOutChange}
        higherIsBetter={false}
        delay={70}
      />
      <Tile
        label="Net cash flow"
        value={formatCurrency(netFlow)}
        caption={
          isSurplus
            ? "The account grew over this period"
            : "More went out than came in"
        }
        icon={Scale}
        tone={isSurplus ? "primary" : "danger"}
        delay={140}
      />
      <Tile
        label="Closing balance"
        value={
          // Only ever the figure the bank itself printed. With no imported rows
          // in scope there is nothing to show, and inventing one by summing
          // movements onto an unknown opening balance would be a guess.
          balance.closing === null ? "—" : formatCurrency(balance.closing)
        }
        caption={
          balance.closing === null
            ? "No bank statement rows in this period"
            : `As per bank on ${formatDisplayDate(balance.asOf)}${
                balance.bankAccount ? ` · a/c ${balance.bankAccount}` : ""
              }`
        }
        icon={Landmark}
        tone="primary"
        delay={210}
      />
    </div>
  );
}
