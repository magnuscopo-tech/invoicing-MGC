const { GST_PERCENT } = require("../config/constants");
const { round2 } = require("../utils/moneyHelper");
const { amountToWords } = require("./wordsService");

// Line amount is always derived, never taken from the client payload.
const computeLineAmount = (item) => {
  const qty = Number(item.qty) || 0;
  const unitPrice = Number(item.unitPrice) || 0;
  const discountPercent = Number(item.discountPercent) || 0;
  return round2(qty * unitPrice * (1 - discountPercent / 100));
};

const normalizeItems = (items = []) =>
  items.map((item) => ({
    serviceRef: item.serviceRef || null,
    description: String(item.description || "").trim(),
    unit: item.unit ? String(item.unit).trim() : "unit",
    qty: Number(item.qty) || 0,
    unitPrice: round2(item.unitPrice),
    discountPercent: Number(item.discountPercent) || 0,
    amount: computeLineAmount(item),
  }));

// Single source of truth for document money. The client recalculates live for UI
// feedback, but this result is what gets persisted - client totals are discarded.
const computeTotals = (items = [], gstApplicable = true) => {
  const normalizedItems = normalizeItems(items);
  const subTotal = round2(
    normalizedItems.reduce((sum, item) => sum + item.amount, 0)
  );
  const gstAmount = gstApplicable ? round2(subTotal * (GST_PERCENT / 100)) : 0;
  const totalAmount = round2(subTotal + gstAmount);

  return {
    items: normalizedItems,
    subTotal,
    gstApplicable: Boolean(gstApplicable),
    gstPercent: gstApplicable ? GST_PERCENT : 0,
    gstAmount,
    totalAmount,
    amountInWords: amountToWords(totalAmount),
  };
};

/*
 * Carves an agreed total into the slices of a billing plan.
 *
 * Every slice but the last is a straight percentage of the contract. The LAST
 * slice is deliberately computed as the residue - contract minus everything
 * before it - rather than by its own percentage. Percentage maths on a split
 * like 33/33/34 leaves stray paise that would otherwise never be billed to
 * anyone, and since the closing tax invoice is raised for the full contract
 * value, any drift means the proformas stop reconciling against the invoice.
 *
 * `percents` must already be validated to total 100.
 */
const computeInstallmentSchedule = (base, percents = []) => {
  const gstApplicable = Boolean(base.gstApplicable);
  const baseSubTotal = round2(base.subTotal);
  const baseGstAmount = gstApplicable ? round2(base.gstAmount) : 0;

  let allocatedSubTotal = 0;
  let allocatedGst = 0;

  return percents.map((percent, position) => {
    const isLast = position === percents.length - 1;

    const subTotal = isLast
      ? round2(baseSubTotal - allocatedSubTotal)
      : round2(baseSubTotal * (Number(percent) / 100));

    let gstAmount = 0;
    if (gstApplicable) {
      gstAmount = isLast
        ? round2(baseGstAmount - allocatedGst)
        : round2(subTotal * (GST_PERCENT / 100));
    }

    allocatedSubTotal = round2(allocatedSubTotal + subTotal);
    allocatedGst = round2(allocatedGst + gstAmount);

    return {
      percent: Number(percent),
      subTotal,
      gstAmount,
      totalAmount: round2(subTotal + gstAmount),
    };
  });
};

module.exports = {
  computeLineAmount,
  normalizeItems,
  computeTotals,
  computeInstallmentSchedule,
};
