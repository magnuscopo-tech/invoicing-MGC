const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");

dayjs.extend(utc);

// Escapes a user-supplied search term before it becomes a $regex, so a stray
// "(" in a bank narration cannot blow up the query.
const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/*
 * A transaction date is a calendar date, so the whole cash book works in UTC
 * days: rows are stored at UTC midnight and every range, bucket and label is
 * read back the same way. Mixing in a local-midnight boundary anywhere would
 * shift a row into the neighbouring day for any server not sitting on UTC.
 */
const toUtcDayStart = (value) => dayjs.utc(value).startOf("day").toDate();
const toUtcDayEnd = (value) => dayjs.utc(value).endOf("day").toDate();

/*
 * The one scope translator for the cash book. The ledger list and every
 * dashboard report run through it, so a filter set in the UI means exactly the
 * same thing to the table and to the charts above it.
 */
const buildTransactionMatch = (query = {}, extra = {}) => {
  const match = { ...extra };

  if (query.direction) match.direction = query.direction;
  if (query.category) match.category = query.category;
  if (query.paymentMode) match.paymentMode = query.paymentMode;
  if (query.source) match.source = query.source;

  if (query.partyName) {
    match.partyName = { $regex: `^${escapeRegex(query.partyName)}$`, $options: "i" };
  }

  if (query.fromDate || query.toDate) {
    match.date = {};
    if (query.fromDate) match.date.$gte = toUtcDayStart(query.fromDate);
    if (query.toDate) match.date.$lte = toUtcDayEnd(query.toDate);
  }

  if (query.search) {
    const term = escapeRegex(String(query.search).trim());
    match.$or = [
      { particulars: { $regex: term, $options: "i" } },
      { partyName: { $regex: term, $options: "i" } },
      { transactionId: { $regex: term, $options: "i" } },
      { remarks: { $regex: term, $options: "i" } },
    ];
  }

  return match;
};

const round2 = (value) =>
  Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;

module.exports = {
  buildTransactionMatch,
  escapeRegex,
  round2,
  toUtcDayStart,
  toUtcDayEnd,
};
