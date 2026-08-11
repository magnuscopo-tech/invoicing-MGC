// All money in this system is INR and stored as a plain Number rounded to paise.
const round2 = (value) => {
  const n = Number(value) || 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

// "14,160.00" - Indian digit grouping, no currency symbol (templates add the symbol).
const formatAmount = (value) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(round2(value));

const formatCurrency = (value) => `₹ ${formatAmount(value)}`;

module.exports = { round2, formatAmount, formatCurrency };
