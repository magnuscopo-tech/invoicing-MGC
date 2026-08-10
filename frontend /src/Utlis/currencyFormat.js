const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatCurrency = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return currencyFormatter.format(0);
  return currencyFormatter.format(numeric);
};

export const formatAmount = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return numberFormatter.format(0);
  return numberFormatter.format(numeric);
};

export const formatCompactCurrency = (value) => {
  const numeric = Number(value) || 0;
  if (numeric >= 10000000) return `₹${(numeric / 10000000).toFixed(2)} Cr`;
  if (numeric >= 100000) return `₹${(numeric / 100000).toFixed(2)} L`;
  if (numeric >= 1000) return `₹${(numeric / 1000).toFixed(1)} K`;
  return `₹${numeric.toFixed(0)}`;
};
