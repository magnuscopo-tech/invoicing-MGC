import { useEffect, useState } from "react";
import { Hash, Info, Layers, Lock } from "lucide-react";
import BaseModal from "../baseModal";
import CustomButton from "../../custom/customButton";
import DatePickerField from "../../custom/datePickerField";
import InstallmentSplitEditor from "../../billing/installmentSplitEditor";
import { toInputDate } from "../../../Utlis/dateFormat";
import { formatCurrency } from "../../../Utlis/currencyFormat";
import { GST_PERCENT } from "../../../constants/document.constants";
import { isValidSplit } from "../../../constants/billing.constants";
import { handleCreateBillingPlan } from "../../../Services/apiCalling/billingPlanApis";
import { handleGetNextNumber } from "../../../Services/apiCalling/documentApis";
import { SuccessMessage } from "../../../Utlis/Toastify/ToastMessage";

const DEFAULT_SPLIT = [
  { percent: 50, label: "Advance" },
  { percent: 50, label: "Balance" },
];

/*
 * Cuts a quotation into a payment schedule instead of converting it to a single
 * proforma. The client is quoted the whole split up front - "50% now, 50% on
 * delivery" - so every figure is fixed here, at the point the plan is created,
 * rather than drifting as each installment is raised.
 */
export default function CreateBillingPlanModal({
  open,
  document: sourceDocument,
  onClose = () => {},
  onSuccess = () => {},
}) {
  const [installments, setInstallments] = useState(DEFAULT_SPLIT);
  const [issueDate, setIssueDate] = useState("");
  const [baseDocNumber, setBaseDocNumber] = useState("");
  const [saving, setSaving] = useState(false);

  // The slices are proformas, so GST applies even though the quotation they came
  // from is normally untaxed.
  const contractSubTotal = Number(sourceDocument?.subTotal) || 0;
  const contractGst = Math.round(contractSubTotal * (GST_PERCENT / 100) * 100) / 100;
  const contractTotal = Math.round((contractSubTotal + contractGst) * 100) / 100;

  useEffect(() => {
    if (!open || !sourceDocument) return;
    setInstallments(DEFAULT_SPLIT);
    setIssueDate(toInputDate(sourceDocument.issueDate));
    setBaseDocNumber("");

    // Preview only - the serial is not burned until the plan is saved.
    const companyId = sourceDocument.company?._id || sourceDocument.company;
    if (companyId) {
      handleGetNextNumber("proforma", companyId).then((preview) => {
        if (preview?.docNumber) setBaseDocNumber(preview.docNumber);
      });
    }
  }, [open, sourceDocument]);

  const percents = installments.map((row) => row.percent);
  const canSave = isValidSplit(percents);

  const onCreate = async () => {
    setSaving(true);
    try {
      const payload = {
        sourceDocument: sourceDocument._id,
        installments: installments.map((row) => ({
          percent: Number(row.percent),
          label: (row.label || "").trim(),
        })),
      };
      if (issueDate) payload.issueDate = issueDate;

      const plan = await handleCreateBillingPlan(payload);
      if (!plan) return;

      SuccessMessage(
        `Billing plan created on ${plan.baseDocNumber}. Raise the first installment when you are ready.`
      );
      onSuccess(plan);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!sourceDocument) return null;

  return (
    <BaseModal
      open={open}
      title="Bill this job in installments"
      description={`Split ${sourceDocument.docNumber} into a payment schedule instead of one proforma.`}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <CustomButton variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </CustomButton>
          <CustomButton
            size="sm"
            icon={Layers}
            loading={saving}
            disabled={!canSave}
            onClick={onCreate}
          >
            Create billing plan
          </CustomButton>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl bg-ink-50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
            Contract value
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-ink-950">
            {formatCurrency(contractTotal)}
          </p>
          <p className="mt-0.5 text-[12px] text-ink-500">
            {formatCurrency(contractSubTotal)} + GST @ {GST_PERCENT}%
          </p>
        </div>

        <InstallmentSplitEditor
          contractTotal={contractTotal}
          installments={installments}
          baseDocNumber={baseDocNumber}
          onChange={setInstallments}
        />

        <DatePickerField
          label="Issue date for the plan"
          name="issueDate"
          value={issueDate}
          onChange={(value) => setIssueDate(value)}
        />

        <p className="flex gap-2.5 rounded-xl bg-ink-50 px-4 py-3 text-[13px] leading-relaxed text-ink-600">
          <Hash size={15} className="mt-0.5 shrink-0 text-ink-400" />
          One number is reserved for the whole job. The installments print it
          with a letter appended
          {baseDocNumber ? ` — ${baseDocNumber}-A, ${baseDocNumber}-B` : ""}, and
          the closing tax invoice takes it bare
          {baseDocNumber ? ` — ${baseDocNumber}` : ""}.
        </p>

        <p className="flex gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-800">
          <Lock size={15} className="mt-0.5 shrink-0" />
          Every amount is fixed now, because this is the schedule the client
          agrees to. Installments cannot be edited afterwards — an installment
          can be cancelled and its share reallocated, but the figures themselves
          do not move.
        </p>

        <p className="flex gap-2.5 text-[12px] leading-relaxed text-ink-400">
          <Info size={13} className="mt-0.5 shrink-0" />
          One tax invoice closes the job at the end, for the full contract value,
          once every installment has been approved and paid.
        </p>
      </div>
    </BaseModal>
  );
}
