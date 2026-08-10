const dayjs = require("dayjs");

// Indian financial year runs 1 April -> 31 March. Returns the short form "26-27".
const getFinancialYear = (date) => {
  const d = dayjs(date);
  const y = d.year();
  return d.month() + 1 >= 4
    ? `${String(y).slice(-2)}-${String(y + 1).slice(-2)}`
    : `${String(y - 1).slice(-2)}-${String(y).slice(-2)}`;
};

const getCalendarYear = (date) => String(dayjs(date).year());

const formatDisplayDate = (date) => (date ? dayjs(date).format("DD MMM YYYY") : "");

const isValidDate = (value) => Boolean(value) && dayjs(value).isValid();

// Normalizes any accepted date input to a Date at start of day.
const toStartOfDay = (value) => dayjs(value).startOf("day").toDate();

module.exports = {
  getFinancialYear,
  getCalendarYear,
  formatDisplayDate,
  isValidDate,
  toStartOfDay,
};
