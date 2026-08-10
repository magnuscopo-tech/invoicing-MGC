import dayjs from "dayjs";

export const formatDisplayDate = (value) => {
  if (!value) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : "—";
};

export const formatDisplayDateTime = (value) => {
  if (!value) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY, hh:mm A") : "—";
};

// The date pickers and the API both speak YYYY-MM-DD.
export const toInputDate = (value) => {
  if (!value) return "";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
};

export const todayInputDate = () => dayjs().format("YYYY-MM-DD");

export const addDaysToInputDate = (value, days) => {
  const parsed = dayjs(value || undefined);
  return parsed.add(days, "day").format("YYYY-MM-DD");
};

// Indian financial year runs 1 April → 31 March.
export const getFinancialYear = (value) => {
  const parsed = dayjs(value || undefined);
  const year = parsed.year();
  return parsed.month() + 1 >= 4
    ? `${String(year).slice(-2)}-${String(year + 1).slice(-2)}`
    : `${String(year - 1).slice(-2)}-${String(year).slice(-2)}`;
};

export const relativeFromNow = (value) => {
  if (!value) return "—";
  const parsed = dayjs(value);
  if (!parsed.isValid()) return "—";
  const diffDays = dayjs().diff(parsed, "day");
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  return parsed.format("DD MMM YYYY");
};
