import { useState } from "react";
import {
  BadgeIndianRupee,
  CircleSlash,
  FilePlus2,
  Layers,
  Receipt,
} from "lucide-react";
import CustomButton from "../custom/customButton";
import StatusBadge from "../custom/statusBadge";
import ConfirmDialog from "../modal/confirmDialog";
import RecordInstallmentPaymentModal from "../modal/documents/recordInstallmentPaymentModal";
import { classNames } from "../../Utlis/Common/commonMethod";
import { formatCurrency } from "../../Utlis/currencyFormat";
import { formatDisplayDate } from "../../Utlis/dateFormat";
import {
  BILLING_PLAN_LABELS,
  BILLING_PLAN_TONE,
  INSTALLMENT_LABELS,
  INSTALLMENT_TONE,
  INSTALLMENT_STATUS,
} from "../../constants/billing.constants";
import {
  handleGenerateInstallment,
  handleRaiseFinalInvoice,
} from "../../Services/apiCalling/billingPlanApis";
import { SuccessMessage } from "../../Utlis/Toastify/ToastMessage";

const Figure = ({ label, value, tone = "" }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
      {label}
    </p>
    <p
      className={classNames(
        "mt-0.5 text-[13px] font-semibold tabular-nums",
        tone || "text-ink-900"
      )}
    >
      {value}
    </p>
  </div>
);

/*
 * The schedule for a job the client pays in stages, and the one action that
 * makes sense at each point: raise the next installment, record what came in,
 * then close the job with a single tax invoice for the full contract value.
 *
 * Which actions are available is decided by the server and read off
 * `plan.actions`, so a disabled button here always matches what the API would
 * actually allow rather than guessing at it.
 */
export default function BillingPlanPanel({
  plan,
  currentDocumentId = null,
  onChanged = () => {},
  onOpenDocument = () => {},
}) {
  const [busy, setBusy] = useState(false);
  const [paymentFor, setPaymentFor] = useState(null);
  const [confirmInvoice, setConfirmInvoice] = useState(false);

  if (!plan) return null;

  const { summary, actions } = plan;

  const onGenerate = async () => {
    setBusy(true);
    try {
      const result = await handleGenerateInstallment(plan._id);
      if (!result) return;
      SuccessMessage(`Installment raised as ${result.document.docNumber}.`);
      onChanged(result.plan);
      onOpenDocument(result.document);
    } finally {
      setBusy(false);
    }
  };

  const onRaiseInvoice = async () => {
    setBusy(true);
    try {
      const result = await handleRaiseFinalInvoice(plan._id);
      if (!result) return;
      SuccessMessage(
        `Closing tax invoice ${result.document.docNumber} raised. Approve it to close the plan.`
      );
      setConfirmInvoice(false);
      onChanged(result.plan);
      onOpenDocument(result.document);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="card animate-fade-up p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-ink-400">
            <Layers size={14} /> Billing plan
          </h2>
          <StatusBadge
            label={BILLING_PLAN_LABELS[plan.status]}
            tone={BILLING_PLAN_TONE[plan.status]}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Figure
            label="Contract value"
            value={formatCurrency(plan.contractTotal)}
          />
          <Figure
            label="Received"
            value={formatCurrency(summary.receivedTotal)}
            tone="text-emerald-700"
          />
          <Figure
            label="Billed"
            value={formatCurrency(summary.billedTotal)}
          />
          <Figure
            label="Yet to bill"
            value={formatCurrency(summary.unbilledTotal)}
            tone={summary.unbilledTotal > 0 ? "text-amber-700" : ""}
          />
        </div>

        {/* A plan that does not allocate 100% cannot be closed by an invoice, so
            it is said outright rather than left as a disabled button. */}
        {!summary.isFullyAllocated && (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-800">
            An installment was cancelled, so this plan now allocates{" "}
            {summary.allocatedPercent}% of the contract. Reallocate the remaining{" "}
            {summary.unallocatedPercent}% across the installments still to be
            raised, or close the plan at what has already been billed — the
            closing tax invoice needs the schedule to total 100%.
          </p>
        )}

        {plan.closedEarlyAt && (
          <p className="mt-4 rounded-xl bg-ink-50 px-4 py-3 text-[13px] leading-relaxed text-ink-600">
            Closed early on {formatDisplayDate(plan.closedEarlyAt)} at{" "}
            {formatCurrency(plan.contractTotal)}, down from{" "}
            {formatCurrency(plan.originalTotalAmount)}. The remaining
            installments were cancelled.
          </p>
        )}

        <div className="mt-5 space-y-2.5 border-t border-ink-100 pt-4">
          {plan.installments.map((slice) => {
            const isCurrent =
              currentDocumentId &&
              String(slice.documentId) === String(currentDocumentId);

            return (
              <div
                key={slice.index}
                className={classNames(
                  "rounded-xl border p-3 transition-colors",
                  isCurrent
                    ? "border-primary-300 bg-primary-50/50"
                    : "border-ink-200 bg-white",
                  slice.status === INSTALLMENT_STATUS.cancelled && "opacity-60"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[13px] font-bold text-ink-950">
                        {slice.docNumber}
                      </span>
                      <StatusBadge
                        label={INSTALLMENT_LABELS[slice.status]}
                        tone={INSTALLMENT_TONE[slice.status]}
                      />
                    </div>
                    <p className="mt-0.5 text-[12px] text-ink-500">
                      {slice.percent}%
                      {slice.label ? ` · ${slice.label}` : ""}
                      {slice.paidAt
                        ? ` · received ${formatDisplayDate(slice.paidAt)}`
                        : ""}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[13px] font-bold tabular-nums text-ink-950">
                      {formatCurrency(slice.totalAmount)}
                    </p>
                    {slice.documentId && !isCurrent && (
                      <button
                        type="button"
                        onClick={() => onOpenDocument({ _id: slice.documentId })}
                        className="text-[12px] font-semibold text-primary-600 transition-colors hover:text-primary-800"
                      >
                        Open
                      </button>
                    )}
                  </div>
                </div>

                {slice.status === INSTALLMENT_STATUS.issued && (
                  <div className="mt-2.5 border-t border-ink-100 pt-2.5">
                    <CustomButton
                      variant="secondary"
                      size="sm"
                      icon={BadgeIndianRupee}
                      onClick={() => setPaymentFor(slice)}
                    >
                      Record payment
                    </CustomButton>
                  </div>
                )}

                {slice.status === INSTALLMENT_STATUS.cancelled &&
                  slice.cancellationReason && (
                    <p className="mt-2 flex gap-1.5 text-[12px] leading-relaxed text-ink-500">
                      <CircleSlash size={12} className="mt-0.5 shrink-0" />
                      {slice.cancellationReason}
                    </p>
                  )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          {actions.canGenerateInstallment && (
            <CustomButton
              size="sm"
              icon={FilePlus2}
              loading={busy}
              onClick={onGenerate}
            >
              Raise installment {summary.nextInstallmentIndex}
            </CustomButton>
          )}

          {actions.canRaiseFinalInvoice && (
            <CustomButton
              size="sm"
              icon={Receipt}
              loading={busy}
              onClick={() => setConfirmInvoice(true)}
            >
              Raise closing tax invoice
            </CustomButton>
          )}

          {plan.finalInvoice && (
            <CustomButton
              variant="secondary"
              size="sm"
              icon={Receipt}
              onClick={() => onOpenDocument({ _id: plan.finalInvoice })}
            >
              Open tax invoice
            </CustomButton>
          )}
        </div>

        {/* Why the invoice button is not there yet, rather than an inert button
            with no explanation. */}
        {!actions.canRaiseFinalInvoice &&
          !plan.finalInvoice &&
          summary.isFullyAllocated && (
            <p className="mt-3 text-[12px] leading-relaxed text-ink-400">
              The closing tax invoice can be raised once every installment has
              been approved, signed and paid — {summary.paidCount} of{" "}
              {summary.installmentCount} settled so far.
            </p>
          )}
      </section>

      <RecordInstallmentPaymentModal
        open={Boolean(paymentFor)}
        plan={plan}
        installment={paymentFor}
        onClose={() => setPaymentFor(null)}
        onSuccess={onChanged}
      />

      <ConfirmDialog
        open={confirmInvoice}
        title="Raise the closing tax invoice?"
        message={`${plan.baseDocNumber} will be raised for the full contract value of ${formatCurrency(
          plan.contractTotal
        )}, settling all ${summary.installmentCount} installments. Approving it closes the plan.`}
        confirmLabel="Raise invoice"
        tone="primary"
        loading={busy}
        onConfirm={onRaiseInvoice}
        onClose={() => setConfirmInvoice(false)}
      />
    </>
  );
}
