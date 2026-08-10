/*
 * Split billing - a job the client pays in stages.
 *
 * The agreed amount goes out as several proformas (50% advance, 50% on
 * delivery) and ONE tax invoice closes the job at the end for the full contract
 * value. Splitting applies to proformas only; the tax invoice side is unchanged.
 */

export const BILLING_MODE = {
  full: "full",
  partial: "partial",
};

export const BILLING_PLAN_STATUS = {
  active: "active",
  fullyBilled: "fully_billed",
  invoiced: "invoiced",
  cancelled: "cancelled",
};

export const BILLING_PLAN_LABELS = {
  active: "In progress",
  fully_billed: "Ready to invoice",
  invoiced: "Closed",
  cancelled: "Cancelled",
};

export const BILLING_PLAN_TONE = {
  active: "info",
  fully_billed: "warning",
  invoiced: "success",
  cancelled: "danger",
};

export const INSTALLMENT_STATUS = {
  pending: "pending",
  issued: "issued",
  paid: "paid",
  cancelled: "cancelled",
};

export const INSTALLMENT_LABELS = {
  pending: "Not raised",
  issued: "Awaiting payment",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const INSTALLMENT_TONE = {
  pending: "neutral",
  issued: "warning",
  paid: "success",
  cancelled: "danger",
};

// Mirrors MIN_INSTALLMENTS / MAX_INSTALLMENTS on the server.
export const MIN_INSTALLMENTS = 2;
export const MAX_INSTALLMENTS = 12;

/*
 * The splits people actually ask for. Anything else is typed by hand - these
 * exist to save the common case, not to constrain it.
 */
export const SPLIT_PRESETS = [
  { label: "50 / 50", percents: [50, 50], names: ["Advance", "Balance"] },
  {
    label: "40 / 30 / 30",
    percents: [40, 30, 30],
    names: ["Advance", "Midway", "On delivery"],
  },
  {
    label: "30 / 30 / 40",
    percents: [30, 30, 40],
    names: ["Advance", "Midway", "On delivery"],
  },
  { label: "25 / 75", percents: [25, 75], names: ["Advance", "Balance"] },
];

// Percentages are compared as hundredths so 33.33 + 33.33 + 33.34 reads as 100
// rather than as 99.99999999999999. Same rule the server applies.
export const percentTotal = (values = []) =>
  Math.round(values.reduce((sum, value) => sum + (Number(value) || 0), 0) * 100) / 100;

export const isValidSplit = (percents = []) =>
  percents.length >= MIN_INSTALLMENTS &&
  percents.length <= MAX_INSTALLMENTS &&
  percents.every((value) => Number(value) > 0) &&
  percentTotal(percents) === 100;

/*
 * What a slice of a given size is worth, previewed live in the split editor.
 * The last slice takes the residue rather than its own percentage - the same
 * rule the server uses, so the preview matches what actually gets saved.
 */
export const previewInstallmentAmounts = (contractTotal, percents = []) => {
  const total = Number(contractTotal) || 0;
  let allocated = 0;

  return percents.map((percent, index) => {
    const isLast = index === percents.length - 1;
    const amount = isLast
      ? Math.round((total - allocated) * 100) / 100
      : Math.round(total * (Number(percent) / 100) * 100) / 100;
    allocated = Math.round((allocated + amount) * 100) / 100;
    return amount;
  });
};

// "A", "B", "C" - the letter a slice's document number will carry.
export const installmentSuffix = (index) => String.fromCharCode(64 + Number(index));
