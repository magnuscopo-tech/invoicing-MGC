import { useEffect, useMemo, useState } from "react";
import { Info, TrendingDown, TrendingUp } from "lucide-react";
import BaseModal from "../baseModal";
import InputField from "../../custom/inputField";
import SelectField from "../../custom/selectField";
import TextAreaField from "../../custom/textAreaField";
import DatePickerField from "../../custom/datePickerField";
import CustomButton from "../../custom/customButton";
import { commonValidator } from "../../../Utlis/Common/commonValidator";
import { classNames } from "../../../Utlis/Common/commonMethod";
import {
  handleCreateTransaction,
  handleUpdateTransaction,
} from "../../../Services/apiCalling/expenseApis";
import { SuccessMessage } from "../../../Utlis/Toastify/ToastMessage";
import { todayInputDate, toInputDate } from "../../../Utlis/dateFormat";
import {
  categoryOptionsFor,
  isCategoryAllowed,
  EXPENSE_MESSAGES,
  PAYMENT_MODE_OPTIONS,
  TXN_CATEGORIES,
  TXN_DIRECTION,
} from "../../../constants/expense.constants";

const emptyForm = (direction) => ({
  direction,
  date: todayInputDate(),
  amount: "",
  category: "",
  particulars: "",
  partyName: "",
  paymentMode: "UPI",
  transactionId: "",
  remarks: "",
});

/*
 * One form for both sides of the book. Direction is the first choice because it
 * changes what the rest of the form means - and which categories are even
 * offered - rather than being a detail buried at the bottom.
 */
const DirectionToggle = ({ value, disabled, onChange }) => {
  const options = [
    {
      value: TXN_DIRECTION.debit,
      label: "Money out",
      hint: "An expense you paid",
      icon: TrendingDown,
      active: "border-amber-300 bg-amber-50 text-amber-800",
    },
    {
      value: TXN_DIRECTION.credit,
      label: "Money in",
      hint: "A payment you received",
      icon: TrendingUp,
      active: "border-emerald-300 bg-emerald-50 text-emerald-800",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={classNames(
            "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200",
            "disabled:cursor-not-allowed disabled:opacity-60",
            value === option.value
              ? option.active
              : "border-ink-200 bg-white text-ink-600 hover:border-ink-300"
          )}
        >
          <option.icon size={18} strokeWidth={2.2} className="shrink-0" />
          <span>
            <span className="block text-[13px] font-semibold">{option.label}</span>
            <span className="block text-[11px] opacity-80">{option.hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
};

export default function TransactionModal({
  open,
  transaction = null,
  defaultDirection = TXN_DIRECTION.debit,
  categories = TXN_CATEGORIES,
  parties = [],
  onClose = () => {},
  onSuccess = () => {},
}) {
  const isEdit = Boolean(transaction?._id);
  const [formData, setFormData] = useState(emptyForm(defaultDirection));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setErrors({});
    setFormData(
      transaction
        ? {
            direction: transaction.direction,
            date: toInputDate(transaction.date),
            amount: String(transaction.amount ?? ""),
            category: transaction.category || "",
            particulars: transaction.particulars || "",
            partyName: transaction.partyName || "",
            paymentMode: transaction.paymentMode || "Other",
            transactionId: transaction.transactionId || "",
            remarks: transaction.remarks || "",
          }
        : emptyForm(defaultDirection)
    );
  }, [open, transaction, defaultDirection]);

  const categoryOptions = useMemo(
    () => categoryOptionsFor(formData.direction, categories),
    [formData.direction, categories]
  );

  const onFieldChange = (value, field) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
  };

  /*
   * Flipping the direction can strand a category on the wrong side of the book
   * - "Travel" has no meaning as money received. Clearing it is better than
   * carrying an invalid value to a server rejection.
   */
  const onDirectionChange = (direction) => {
    setFormData((previous) => ({
      ...previous,
      direction,
      category: isCategoryAllowed(previous.category, direction, categories)
        ? previous.category
        : "",
    }));
    setErrors((previous) => ({ ...previous, direction: "", category: "" }));
  };

  const validate = () => {
    const nextErrors = {
      date: commonValidator("required", formData.date),
      amount: commonValidator("positiveNumber", formData.amount),
      category: commonValidator("required", formData.category),
      particulars: commonValidator("name", formData.particulars),
    };

    if (!nextErrors.amount && Number(formData.amount) <= 0) {
      nextErrors.amount = "Amount must be greater than zero.";
    }

    const cleaned = Object.fromEntries(
      Object.entries(nextErrors).filter(([, message]) => message)
    );
    setErrors(cleaned);
    return Object.keys(cleaned).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        // The server revalidates the pair, so both always travel together -
        // sending a category without its direction would be rejected.
        direction: formData.direction,
        category: formData.category,
        date: formData.date,
        amount: Number(formData.amount),
        particulars: formData.particulars.trim(),
        partyName: formData.partyName?.trim() || "",
        paymentMode: formData.paymentMode || "Other",
        transactionId: formData.transactionId?.trim() || "",
        remarks: formData.remarks?.trim() || "",
      };

      const result = isEdit
        ? await handleUpdateTransaction(transaction._id, payload)
        : await handleCreateTransaction(payload);

      if (result) {
        SuccessMessage(
          isEdit
            ? EXPENSE_MESSAGES.updated
            : formData.direction === TXN_DIRECTION.credit
            ? EXPENSE_MESSAGES.savedReceipt
            : EXPENSE_MESSAGES.savedExpense
        );
        onSuccess(result);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const isCredit = formData.direction === TXN_DIRECTION.credit;
  const isImported = transaction?.source === "bulk_upload";

  return (
    <BaseModal
      open={open}
      title={
        isEdit
          ? "Edit transaction"
          : isCredit
          ? "Record money received"
          : "Record an expense"
      }
      description="Money that actually moved through the account. Nothing here touches quotations, proformas or invoices."
      size="lg"
      onClose={onClose}
      footer={
        <>
          <CustomButton variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </CustomButton>
          <CustomButton size="sm" loading={saving} onClick={onSubmit}>
            {isEdit ? "Save changes" : "Record it"}
          </CustomButton>
        </>
      }
    >
      <div className="space-y-4">
        <DirectionToggle
          value={formData.direction}
          // Flipping an imported row's direction would put it at odds with the
          // bank statement it came from.
          disabled={isImported}
          onChange={onDirectionChange}
        />

        {isImported && (
          <p className="flex gap-2 rounded-xl bg-primary-50 px-4 py-3 text-[13px] leading-relaxed text-primary-900">
            <Info size={15} className="mt-0.5 shrink-0" />
            This row came from a bank statement import. The amount and direction
            are the bank&apos;s record and stay fixed — correct the category,
            party or remarks instead.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <DatePickerField
            label="Date"
            name="date"
            required
            value={formData.date}
            error={errors.date}
            onChange={onFieldChange}
          />

          <InputField
            label="Amount"
            name="amount"
            type="number"
            required
            prefix="₹"
            placeholder="0.00"
            disabled={isImported}
            value={formData.amount}
            error={errors.amount}
            onChange={onFieldChange}
          />

          <TextAreaField
            className="sm:col-span-2"
            label="Description"
            name="particulars"
            required
            rows={2}
            placeholder={
              isCredit
                ? "Payment received against KIT training"
                : "Day pass booking at Tusker Workspace"
            }
            value={formData.particulars}
            error={errors.particulars}
            onChange={onFieldChange}
          />

          <SelectField
            label="Category"
            name="category"
            required
            placeholder="Select a category"
            value={formData.category}
            options={categoryOptions}
            error={errors.category}
            hint={
              isCredit
                ? "Only income heads are offered for money in."
                : "Only expense heads are offered for money out."
            }
            onChange={onFieldChange}
          />

          <InputField
            label={isCredit ? "Received from" : "Paid to"}
            name="partyName"
            placeholder={isCredit ? "Guddpin LLP" : "Tusker Workspace"}
            list="cash-book-parties"
            value={formData.partyName}
            hint={
              parties.length
                ? "Reuse an existing name so the party reports group correctly."
                : ""
            }
            onChange={onFieldChange}
          />

          <SelectField
            label="Payment mode"
            name="paymentMode"
            value={formData.paymentMode}
            options={PAYMENT_MODE_OPTIONS}
            onChange={onFieldChange}
          />

          <InputField
            label="Reference"
            name="transactionId"
            placeholder="UPI / IMPS / cheque number"
            disabled={isImported}
            value={formData.transactionId}
            hint="Optional. Helps match this against the bank statement later."
            onChange={onFieldChange}
          />

          <TextAreaField
            className="sm:col-span-2"
            label="Remarks"
            name="remarks"
            rows={2}
            placeholder="What this was for"
            value={formData.remarks}
            onChange={onFieldChange}
          />
        </div>

        {/* A datalist gives free-text plus suggestions, so an existing party can
            be reused without locking the field to names already in the book. */}
        <datalist id="cash-book-parties">
          {parties.map((party) => (
            <option key={party} value={party} />
          ))}
        </datalist>
      </div>
    </BaseModal>
  );
}
