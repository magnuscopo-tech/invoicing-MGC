import { useEffect, useState } from "react";
import { BadgeIndianRupee, Info } from "lucide-react";
import BaseModal from "../baseModal";
import CustomButton from "../../custom/customButton";
import InputField from "../../custom/inputField";
import SelectField from "../../custom/selectField";
import DatePickerField from "../../custom/datePickerField";
import { formatCurrency } from "../../../Utlis/currencyFormat";
import { handleRecordInstallmentPayment } from "../../../Services/apiCalling/billingPlanApis";
import { SuccessMessage } from "../../../Utlis/Toastify/ToastMessage";

// Mirrors the cash book's payment modes, so a receipt recorded here reads the
// same way as the bank row it will eventually be reconciled against.
const PAYMENT_MODES = [
  "UPI",
  "IMPS",
  "NEFT",
  "RTGS",
  "Net Banking",
  "Cheque",
  "Cash",
  "Other",
].map((mode) => ({ value: mode, label: mode }));

/*
 * An installment settles in full or not at all - it IS the payment schedule, so
 * there is no partial payment of a part payment. The amount is therefore shown
 * rather than typed; if the client pays something else, the split itself was
 * wrong and the installment should be cancelled and re-cut.
 */
export default function RecordInstallmentPaymentModal({
  open,
  plan,
  installment,
  onClose = () => {},
  onSuccess = () => {},
}) {
  const [paidAt, setPaidAt] = useState("");
  const [paymentMode, setPaymentMode] = useState("NEFT");
  const [paymentReference, setPaymentReference] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPaidAt(new Date().toISOString().slice(0, 10));
    setPaymentMode("NEFT");
    setPaymentReference("");
  }, [open]);

  const onRecord = async () => {
    setSaving(true);
    try {
      const result = await handleRecordInstallmentPayment(
        plan._id,
        installment.index,
        {
          paidAt: paidAt || undefined,
          paymentMode,
          paymentReference: paymentReference.trim(),
        }
      );
      if (!result) return;

      SuccessMessage(
        result.summary?.isSettled
          ? "Payment recorded. Every installment is settled — the closing tax invoice can now be raised."
          : `Payment recorded against ${installment.docNumber}.`
      );
      onSuccess(result);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!plan || !installment) return null;

  return (
    <BaseModal
      open={open}
      title="Record payment"
      description={`Mark ${installment.docNumber} as received.`}
      size="md"
      onClose={onClose}
      footer={
        <>
          <CustomButton variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </CustomButton>
          <CustomButton
            size="sm"
            icon={BadgeIndianRupee}
            loading={saving}
            onClick={onRecord}
          >
            Record payment
          </CustomButton>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl bg-emerald-50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            Amount received
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-emerald-900">
            {formatCurrency(installment.totalAmount)}
          </p>
          <p className="mt-0.5 text-[12px] text-emerald-700">
            Installment {installment.index} · {installment.percent}% of{" "}
            {formatCurrency(plan.contractTotal)}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DatePickerField
            label="Received on"
            name="paidAt"
            value={paidAt}
            onChange={(value) => setPaidAt(value)}
          />
          <SelectField
            label="Payment mode"
            name="paymentMode"
            value={paymentMode}
            options={PAYMENT_MODES}
            onChange={(value) => setPaymentMode(value)}
          />
        </div>

        <InputField
          label="Reference"
          name="paymentReference"
          value={paymentReference}
          placeholder="UTR / cheque number"
          onChange={(value) => setPaymentReference(value)}
        />

        <p className="flex gap-2.5 text-[12px] leading-relaxed text-ink-400">
          <Info size={13} className="mt-0.5 shrink-0" />
          An installment is settled in full or not at all. If the client paid a
          different figure, cancel this installment and re-cut the split instead.
        </p>
      </div>
    </BaseModal>
  );
}
