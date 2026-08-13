import { GST_PERCENT } from "../constants/document.constants";
import { itemsOf } from "./Common/commonMethod";

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const computeLineAmount = (item) => {
  const qty = Number(item?.qty) || 0;
  const unitPrice = Number(item?.unitPrice) || 0;
  const discountPercent = Number(item?.discountPercent) || 0;
  return round2(qty * unitPrice * (1 - discountPercent / 100));
};

// Mirrors the server formulas so the wizard can show live totals. The server
// still recomputes and persists its own values on every write.
export const computeTotals = (items = [], gstApplicable = false) => {
  const itemList = itemsOf(items);
  const subTotal = round2(
    itemList.reduce((sum, item) => sum + computeLineAmount(item), 0)
  );
  const gstAmount = gstApplicable ? round2(subTotal * (GST_PERCENT / 100)) : 0;
  const totalAmount = round2(subTotal + gstAmount);

  return { subTotal, gstAmount, totalAmount };
};
