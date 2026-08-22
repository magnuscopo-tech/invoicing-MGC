const Counter = require("../models/counterModel");
const {
  DOC_PREFIX,
  YEAR_MODE,
  SERIAL_PAD_LENGTH,
  installmentSuffix,
} = require("../config/constants");
const { getFinancialYear, getCalendarYear } = require("../utils/dateHelper");

// Quotations reset on 1 January (calendar year), proforma/invoice on 1 April (FY).
const getYearKey = (docType, date) =>
  YEAR_MODE[docType] === "calendar"
    ? getCalendarYear(date)
    : getFinancialYear(date);

const buildCounterKey = (docType, companyId, yearKey) =>
  `${DOC_PREFIX[docType]}:${String(companyId)}:${yearKey}`;

const padSerial = (serial) => String(serial).padStart(SERIAL_PAD_LENGTH, "0");

/*
 * "MCQ/2026-008" for quotations, "MCP/26-27/003" for proformas,
 * and "MCI/26-27/003" for invoices.
 *
 * `installmentIndex` is set only for a slice of a split-billed job, and appends
 * a letter: MCP/26-27/003-A, MCP/26-27/003-B.
 */
const buildDocNumber = (docType, yearKey, serial, installmentIndex = null) => {
  const prefix = DOC_PREFIX[docType];
  const base =
    YEAR_MODE[docType] === "calendar"
      ? `${prefix}/${yearKey}-${padSerial(serial)}`
      : `${prefix}/${yearKey}/${padSerial(serial)}`;
  return installmentIndex ? `${base}-${installmentSuffix(installmentIndex)}` : base;
};

// Atomic increment - safe against concurrent document creation.
const getNextSequence = async (key) => {
  const result = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
};

const reserveSequenceAtLeast = async (key, serial) => {
  const result = await Counter.findOneAndUpdate(
    { key },
    { $max: { seq: serial } },
    { new: true, upsert: true }
  );
  return result.seq;
};

// Reclaims a deleted draft's number only when it is still the latest committed
// serial. Older gaps are left alone so a later document number is never reused.
const releaseSequenceIfLatest = async (docType, companyId, date, serial) => {
  const yearKey = getYearKey(docType, date);
  const key = buildCounterKey(docType, companyId, yearKey);
  const nextSeq = Math.max(Number(serial) - 1, 0);

  const result = await Counter.findOneAndUpdate(
    { key, seq: Number(serial) },
    { $set: { seq: nextSeq } },
    { new: true }
  ).lean();

  return Boolean(result);
};

// Read-only peek used by the wizard preview. Does NOT burn a serial, so abandoned
// drafts never leave gaps in the series.
const peekNextNumber = async (docType, companyId, date) => {
  const yearKey = getYearKey(docType, date);
  const counter = await Counter.findOne({
    key: buildCounterKey(docType, companyId, yearKey),
  }).lean();
  const serialNumber = (counter?.seq || 0) + 1;

  return {
    docType,
    yearKey,
    serialNumber,
    docNumber: buildDocNumber(docType, yearKey, serialNumber),
    committed: false,
  };
};

// Commits a serial. Called once, only on final document save.
const commitNextNumber = async (docType, companyId, date) => {
  const yearKey = getYearKey(docType, date);
  const serialNumber = await getNextSequence(
    buildCounterKey(docType, companyId, yearKey)
  );

  return {
    docType,
    yearKey,
    serialNumber,
    docNumber: buildDocNumber(docType, yearKey, serialNumber),
    committed: true,
  };
};

const commitSerialNumber = async (docType, companyId, date, serialNumber) => {
  const yearKey = getYearKey(docType, date);
  const key = buildCounterKey(docType, companyId, yearKey);

  await reserveSequenceAtLeast(key, serialNumber);

  return {
    docType,
    yearKey,
    serialNumber,
    docNumber: buildDocNumber(docType, yearKey, serialNumber),
    committed: true,
  };
};

module.exports = {
  getYearKey,
  buildCounterKey,
  buildDocNumber,
  padSerial,
  getNextSequence,
  reserveSequenceAtLeast,
  releaseSequenceIfLatest,
  peekNextNumber,
  commitNextNumber,
  commitSerialNumber,
};
