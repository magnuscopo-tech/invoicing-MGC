import {
  AlertTriangle,
  CircleDollarSign,
  Landmark,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "../../Utlis/currencyFormat";
import { classNames } from "../../Utlis/Common/commonMethod";

const TONES = {
  primary: "bg-primary-50 text-primary-600",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
};

const EMPTY_BUCKET = {
  totalAmount: 0,
  taxableValue: 0,
  gstAmount: 0,
  count: 0,
};

// Headline numbers are stat tiles, not a chart. Four values, no plot.
const Tile = ({ label, value, caption, icon: Icon, tone, delay }) => (
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

    <p className="mt-3 text-2xl font-bold tracking-tight text-ink-950">
      {value}
    </p>
    {caption && <p className="mt-1 text-[12px] text-ink-400">{caption}</p>}
  </article>
);

export default function AdminKpiRow({ summary }) {
  const invoiced = summary?.invoiced || EMPTY_BUCKET;
  const collected = summary?.collected || EMPTY_BUCKET;
  const outstanding = summary?.outstanding || EMPTY_BUCKET;
  const overdue = summary?.overdue || EMPTY_BUCKET;
  const gst = summary?.gst || EMPTY_BUCKET;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Tile
        label="Invoiced"
        value={formatCurrency(invoiced.totalAmount)}
        caption={`${invoiced.count} tax invoices · excludes cancelled`}
        icon={CircleDollarSign}
        tone="primary"
        delay={0}
      />
      <Tile
        label="Collected"
        value={formatCurrency(collected.totalAmount)}
        caption={`${collected.count} paid on invoice approval`}
        icon={Wallet}
        tone="success"
        delay={70}
      />
      <Tile
        label="Outstanding"
        value={formatCurrency(outstanding.totalAmount)}
        caption={
          overdue.count
            ? `${overdue.count} overdue · ${formatCurrency(overdue.totalAmount)}`
            : `${outstanding.count} proformas awaiting payment`
        }
        icon={AlertTriangle}
        tone={overdue.count ? "danger" : "warning"}
        delay={140}
      />
      <Tile
        label="GST liability"
        value={formatCurrency(gst.gstAmount)}
        caption={`on ${formatCurrency(gst.taxableValue)} taxable value`}
        icon={Landmark}
        tone="warning"
        delay={210}
      />
    </div>
  );
}
