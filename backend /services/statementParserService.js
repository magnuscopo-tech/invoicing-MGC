const crypto = require("crypto");
const ExcelJS = require("exceljs");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const {
  TXN_CATEGORIES,
  TXN_CATEGORY_KIND,
  TXN_PAYMENT_MODES,
  IMPORT_MAX_ROWS,
} = require("../config/constants");
const { round2 } = require("../utils/cashBookScope");

dayjs.extend(customParseFormat);

/* ------------------------------ Header mapping ------------------------------
 *
 * Bank exports and hand-kept trackers name the same column half a dozen ways,
 * so the importer matches on a normalised header rather than a fixed position.
 * That is also why the header row is searched for instead of assumed: the file
 * this was built against carries a title and an account line above it.
 */

const normalizeHeader = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[₹().,:]/g, " ")
    .replace(/[^a-z0-9/ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const HEADER_ALIASES = {
  date: ["date", "txn date", "transaction date", "value date", "posting date", "tran date"],
  transactionId: [
    "transaction id",
    "txn id",
    "reference",
    "reference no",
    "ref no",
    "cheque no",
    "chq no",
    "utr",
    "utr no",
    "transaction ref",
  ],
  particulars: [
    "particulars",
    "narration",
    "description",
    "details",
    "transaction details",
    "remarks/narration",
  ],
  partyName: [
    "client/vendor name",
    "client vendor name",
    "party",
    "party name",
    "vendor",
    "vendor name",
    "client",
    "client name",
    "payee",
    "paid to/received from",
  ],
  category: ["category", "head", "expense head", "account head", "type of expense"],
  credit: ["credit", "credit amount", "deposit", "deposits", "cr", "cr amount", "amount credited", "money in"],
  debit: ["debit", "debit amount", "withdrawal", "withdrawals", "dr", "dr amount", "amount debited", "money out"],
  amount: ["amount", "transaction amount", "value"],
  drCr: ["dr/cr", "cr/dr", "type", "transaction type", "debit/credit", "direction"],
  paymentMode: ["payment mode", "mode", "mode of payment", "payment method", "channel"],
  balance: ["balance", "closing balance", "running balance", "available balance", "balance amount"],
  remarks: ["remarks", "notes", "note", "comment", "comments", "purpose"],
};

// Reversed once at module load - the per-cell lookup is then a plain map hit.
const HEADER_LOOKUP = Object.entries(HEADER_ALIASES).reduce(
  (lookup, [field, aliases]) => {
    aliases.forEach((alias) => {
      lookup[alias] = field;
    });
    return lookup;
  },
  {}
);

/* ------------------------------ Value coercion ------------------------------ */

// exceljs hands back plain values, formula objects, rich text and hyperlinks.
// Everything downstream wants a scalar, so it is flattened once here.
const cellValue = (cell) => {
  const value = cell?.value;
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    if (value.result !== undefined) return value.result;
    if (value.text !== undefined) return value.text;
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
    if (value.hyperlink !== undefined) return value.text ?? value.hyperlink;
    return null;
  }
  return value;
};

const cellText = (cell) => {
  const value = cellValue(cell);
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return dayjs(value).format("DD MMM YYYY");
  return String(value).trim();
};

// Indian statements are day-first. The order matters: "01/07/2026" is 1 July,
// never 7 January, and a month-first guess would silently misfile a third of
// every file.
const DATE_FORMATS = [
  "DD MMM YYYY",
  "DD-MMM-YYYY",
  "DD/MMM/YYYY",
  "DD-MM-YYYY",
  "DD/MM/YYYY",
  "DD.MM.YYYY",
  "YYYY-MM-DD",
  "YYYY/MM/DD",
  "DD MMMM YYYY",
  "DD-MM-YY",
  "DD/MM/YY",
  "MMM DD, YYYY",
];

/*
 * A transaction date is a calendar date, not an instant, so it is pinned to UTC
 * midnight. Storing local midnight would put an IST "01 Jul" row at 30 Jun
 * 18:30 UTC, and every $dateToString grouping in the dashboard buckets in UTC -
 * the July trend would be missing its first day and June would gain one.
 */
const UTC_DAY_MS = 24 * 60 * 60 * 1000;

const utcDate = (year, monthIndex, day) =>
  new Date(Date.UTC(year, monthIndex, day));

// Excel stores dates as days since 1899-12-30 in the workbook's 1900 system.
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

const fromExcelSerial = (serial) =>
  new Date(EXCEL_EPOCH_UTC + Math.floor(serial) * UTC_DAY_MS);

const parseDate = (value) => {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    // exceljs already yields date cells at UTC midnight, so its UTC parts are
    // the calendar date the sheet shows.
    return utcDate(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  }

  if (typeof value === "number") {
    // Below 20000 (mid-1954) a bare number is far more likely to be a stray
    // figure than a date, so it is rejected rather than guessed at.
    if (value < 20000 || value > 80000) return null;
    return fromExcelSerial(value);
  }

  const text = String(value).trim().replace(/\s+/g, " ");
  if (!text) return null;

  for (const format of DATE_FORMATS) {
    const parsed = dayjs(text, format, true);
    if (parsed.isValid()) {
      return utcDate(parsed.year(), parsed.month(), parsed.date());
    }
  }

  // Last resort - handles ISO strings with a time component.
  const loose = dayjs(text);
  return loose.isValid()
    ? utcDate(loose.year(), loose.month(), loose.date())
    : null;
};

// Strips currency symbols, thousands separators, trailing Cr/Dr markers and
// accounting-style parentheses for negatives.
const parseAmount = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  let text = String(value).trim();
  if (!text || text === "-" || text === "—") return null;

  const isParenNegative = /^\(.*\)$/.test(text);
  const trailingSign = /(cr|dr)\.?$/i.exec(text)?.[1]?.toLowerCase() || "";

  text = text
    .replace(/[₹$,\s]/g, "")
    .replace(/\((.*)\)/, "$1")
    .replace(/(cr|dr)\.?$/i, "");

  const numeric = Number(text);
  if (!Number.isFinite(numeric)) return null;

  const magnitude = Math.abs(numeric);
  if (isParenNegative || trailingSign === "dr" || numeric < 0) return -magnitude;
  return magnitude;
};

/* --------------------------- Category / mode mapping -------------------------- */

const CATEGORY_BY_NORMALIZED = TXN_CATEGORIES.reduce((map, category) => {
  map[normalizeHeader(category)] = category;
  return map;
}, {});

// Variants seen in real trackers that do not normalise onto a canonical head.
const CATEGORY_ALIASES = {
  income: "Income/Receipt",
  receipt: "Income/Receipt",
  receipts: "Income/Receipt",
  revenue: "Income/Receipt",
  sales: "Income/Receipt",
  "client payment": "Income/Receipt",
  refund: "Refund/Adjustment",
  adjustment: "Refund/Adjustment",
  salary: "Salary/Contractor Payment",
  payroll: "Salary/Contractor Payment",
  wages: "Salary/Contractor Payment",
  vendor: "Vendor Payment",
  contractor: "Contractor Payment",
  freelancer: "Contractor Payment",
  office: "Office/Coworking",
  coworking: "Office/Coworking",
  workspace: "Office/Coworking",
  utilities: "Utilities/Telecom",
  telecom: "Utilities/Telecom",
  internet: "Utilities/Telecom",
  electricity: "Utilities/Telecom",
  software: "Software/Subscription",
  subscription: "Software/Subscription",
  saas: "Software/Subscription",
  marketing: "Marketing/Advertising",
  advertising: "Marketing/Advertising",
  ads: "Marketing/Advertising",
  professional: "Professional Fees",
  "professional fee": "Professional Fees",
  legal: "Professional Fees",
  audit: "Professional Fees",
  tax: "Statutory/Tax",
  gst: "Statutory/Tax",
  tds: "Statutory/Tax",
  statutory: "Statutory/Tax",
  "bank charge": "Bank Charges",
  charges: "Bank Charges",
  equipment: "Equipment/Assets",
  assets: "Equipment/Assets",
  hardware: "Equipment/Assets",
  food: "Meals/Entertainment",
  meals: "Meals/Entertainment",
  entertainment: "Meals/Entertainment",
  repairs: "Repairs/Maintenance",
  maintenance: "Repairs/Maintenance",
  transfer: "Inter-account Transfer",
  "self transfer": "Inter-account Transfer",
  investment: "Investment",
  investments: "Investment",
  "mutual fund": "Investment",
  "fixed deposit": "Investment",
  sip: "Investment",
  misc: "Other Expense",
  miscellaneous: "Other Expense",
  other: "Other Expense",
  others: "Other Expense",
};

const normalizeCategory = (value) => {
  const key = normalizeHeader(value);
  if (!key) return null;
  return CATEGORY_BY_NORMALIZED[key] || CATEGORY_ALIASES[key] || null;
};

/*
 * Keyword fallback, used only when the file leaves the category blank. It is a
 * guess and is labelled as one on the row, so an admin can find and correct
 * every auto-classified entry instead of trusting them silently.
 */
const CATEGORY_RULES = [
  [/\bchrg\b|charge|imps charge|amb chrg|sms chrg/i, "Bank Charges"],
  [/redbus|irctc|uber|ola|rapido|makemytrip|goibibo|indigo|air ?india|vistara|flight|railway|toll|fuel|petrol/i, "Travel"],
  [/workspac|coworking|co-working|we ?work|day ?pass|awfis|regus/i, "Office/Coworking"],
  [/microsoft|google|adobe|amazon web|aws|atlassian|github|openai|zoom|slack|canva|notion|figma|subscription|renewal/i, "Software/Subscription"],
  [/airtel|jio\b|vodafone|vi payments|bsnl|tata ?play|broadband|electricity|bescom|bses|recharge|paytm payments/i, "Utilities/Telecom"],
  [/salary|payroll|stipend/i, "Salary/Contractor Payment"],
  [/\brent\b|lease/i, "Rent"],
  [/\bgst\b|\btds\b|income ?tax|advance ?tax|challan|mca|roc\b/i, "Statutory/Tax"],
  [/insurance|policy premium/i, "Insurance"],
  [/refund|reversal|cashback/i, "Refund/Adjustment"],
  [/swiggy|zomato|restaurant|cafe|catering/i, "Meals/Entertainment"],
  [/repair|maintenance|amc\b/i, "Repairs/Maintenance"],
  [/laptop|monitor|furniture|hardware|equipment/i, "Equipment/Assets"],
  [/facebook|meta ads|google ads|linkedin|advertis|campaign/i, "Marketing/Advertising"],
  [/\bca\b fees|consultan|advocate|legal|audit/i, "Professional Fees"],
  [/mutual ?fund|\bsip\b|\bfd\b|fixed ?deposit|zerodha|groww|upstox|\bnps\b|\bmf\b/i, "Investment"],
];

const inferCategory = (text, direction) => {
  const haystack = String(text || "");

  for (const [pattern, category] of CATEGORY_RULES) {
    if (!pattern.test(haystack)) continue;
    // A rule may only fire onto a side its head is allowed to sit on, so a
    // "refund" narration on a debit row does not become an income category.
    const kind = TXN_CATEGORY_KIND[category];
    const allowed =
      kind === "both" ||
      (kind === "income" && direction === "credit") ||
      (kind === "expense" && direction === "debit");
    if (allowed) return category;
  }

  // Nothing matched: money in is a receipt, money out is left for a human.
  return direction === "credit" ? "Income/Receipt" : "Uncategorized";
};

const MODE_BY_NORMALIZED = TXN_PAYMENT_MODES.reduce((map, mode) => {
  map[normalizeHeader(mode)] = mode;
  return map;
}, {});

const MODE_ALIASES = {
  "pos": "POS/Card",
  "pos card": "POS/Card",
  card: "POS/Card",
  "debit card": "POS/Card",
  "credit card": "POS/Card",
  pcd: "POS/Card",
  mb: "Mobile Banking",
  mobile: "Mobile Banking",
  netbanking: "Net Banking",
  "internet banking": "Net Banking",
  chq: "Cheque",
  check: "Cheque",
  charges: "Bank Charge",
  charge: "Bank Charge",
  ach: "Auto Debit",
  nach: "Auto Debit",
  "standing instruction": "Auto Debit",
  si: "Auto Debit",
};

// Falls back to reading the mode out of the bank reference ("UPI-6182…") when
// the file has no mode column at all.
const normalizePaymentMode = (value, transactionId = "", particulars = "") => {
  const key = normalizeHeader(value);
  const direct = MODE_BY_NORMALIZED[key] || MODE_ALIASES[key];
  if (direct) return direct;

  const probe = `${transactionId} ${particulars}`;
  if (/\bupi\b/i.test(probe)) return "UPI";
  if (/\bimps\b/i.test(probe)) return "IMPS";
  if (/\bneft\b/i.test(probe)) return "NEFT";
  if (/\brtgs\b/i.test(probe)) return "RTGS";
  if (/\bpcd\b|visa|mastercard|rupay/i.test(probe)) return "POS/Card";
  if (/^mb[:-]|mobile banking/i.test(probe)) return "Mobile Banking";
  if (/\bchrg\b|charge/i.test(probe)) return "Bank Charge";
  if (/cash/i.test(probe)) return "Cash";
  if (/cheque|chq/i.test(probe)) return "Cheque";
  return "Other";
};

/* ------------------------------ Sheet selection ------------------------------ */

// A tracker workbook usually carries a summary sheet next to the ledger, and
// importing a pivot table would book nonsense, so summary-looking sheets are
// passed over unless the caller names one explicitly.
const SUMMARY_SHEET = /summary|pivot|chart|dashboard|instruction|readme|help/i;

const findHeaderRow = (worksheet) => {
  const limit = Math.min(worksheet.rowCount, 25);

  for (let rowNumber = 1; rowNumber <= limit; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const columnMap = {};
    let matched = 0;

    row.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
      const field = HEADER_LOOKUP[normalizeHeader(cellValue(cell))];
      // First column wins, so a later "Balance amount" cannot displace "Balance".
      if (field && columnMap[field] === undefined) {
        columnMap[field] = columnNumber;
        matched += 1;
      }
    });

    const hasDate = columnMap.date !== undefined;
    const hasMoney =
      columnMap.credit !== undefined ||
      columnMap.debit !== undefined ||
      columnMap.amount !== undefined;

    if (hasDate && hasMoney && matched >= 3) {
      return { headerRow: rowNumber, columnMap };
    }
  }

  return null;
};

const pickWorksheet = (workbook, preferredName = "") => {
  const sheets = workbook.worksheets.filter((sheet) => sheet.rowCount > 0);

  if (preferredName) {
    const named = sheets.find(
      (sheet) => sheet.name.toLowerCase() === preferredName.toLowerCase()
    );
    // An explicitly named sheet is honoured even if it looks like a summary -
    // the caller is more informed than the heuristic.
    if (named && findHeaderRow(named)) return named;
    if (named) {
      const error = new Error(
        `Sheet "${named.name}" has no recognisable Date and Credit/Debit columns`
      );
      error.statusCode = 422;
      throw error;
    }
    const error = new Error(`The workbook has no sheet named "${preferredName}"`);
    error.statusCode = 422;
    throw error;
  }

  const ledgerSheets = sheets.filter((sheet) => !SUMMARY_SHEET.test(sheet.name));
  const candidate =
    ledgerSheets.find((sheet) => findHeaderRow(sheet)) ||
    sheets.find((sheet) => findHeaderRow(sheet));

  if (!candidate) {
    const error = new Error(
      "No sheet in this workbook has a Date column alongside Credit/Debit (or Amount) columns"
    );
    error.statusCode = 422;
    throw error;
  }

  return candidate;
};

/* -------------------------------- Header meta -------------------------------- */

// Account number and statement period are typically written into a banner above
// the table. Reading them is best-effort - the import works without them.
const readSheetMeta = (worksheet, headerRow) => {
  const lines = [];

  for (let rowNumber = 1; rowNumber < headerRow; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const seen = new Set();
    row.eachCell({ includeEmpty: false }, (cell) => {
      const text = cellText(cell);
      // Merged banner cells repeat their value across the span.
      if (text && !seen.has(text)) {
        seen.add(text);
        lines.push(text);
      }
    });
  }

  const banner = lines.join(" | ");

  const accountMatch = /a(?:\/c|ccount)\.?\s*(?:no\.?|number)?\s*[:\-]?\s*([0-9Xx*]{6,20})/i.exec(
    banner
  );

  const periodMatch =
    /(?:period|statement)\s*[:\-]?\s*([0-9]{1,2}[^0-9]{1,10}[0-9]{2,4})\s*(?:to|-|–|—)\s*([0-9]{1,2}[^0-9]{1,10}[0-9]{2,4})/i.exec(
      banner
    );

  return {
    banner,
    bankAccount: accountMatch ? accountMatch[1] : "",
    periodFrom: periodMatch ? parseDate(periodMatch[1]) : null,
    periodTo: periodMatch ? parseDate(periodMatch[2]) : null,
  };
};

/*
 * Trailer and banner rows that live inside the table. They carry no date, so
 * they are already skipped, but they DO carry balances worth keeping and must
 * never be reported as broken rows.
 */
const OPENING_LABEL = /^(opening|open)\s*(balance|bal)|balance\s*b\/?f|b\/?f$/i;
const CLOSING_LABEL = /^(closing|close)\s*(balance|bal)|balance\s*c\/?f|c\/?f$/i;
const TOTAL_LABEL = /^(grand\s*)?total|sub\s*total|net\s*(total|movement)$/i;

const fingerprintOf = (row) =>
  crypto
    .createHash("sha1")
    .update(
      [
        // UTC slice, matching how the date was stored. A local format would
        // produce a different key for the same row on a different server.
        row.date.toISOString().slice(0, 10),
        row.transactionId || "",
        row.direction,
        row.amount.toFixed(2),
        (row.particulars || "").slice(0, 120).toLowerCase(),
        row.bankAccount || "",
      ].join("|")
    )
    .digest("hex");

/* --------------------------------- The parse --------------------------------- */

/**
 * Reads a bank statement / expense tracker workbook into cash-book rows.
 * Returns everything it managed to read plus a per-row rejection list - a file
 * with three bad rows imports the other forty rather than failing outright.
 */
const parseStatementWorkbook = async (filePath, options = {}) => {
  const { sheetName = "", autoCategorize = true, bankAccount = "" } = options;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  if (workbook.worksheets.length === 0) {
    const error = new Error("The uploaded workbook has no sheets");
    error.statusCode = 422;
    throw error;
  }

  const worksheet = pickWorksheet(workbook, sheetName);
  const { headerRow, columnMap } = findHeaderRow(worksheet);
  const meta = readSheetMeta(worksheet, headerRow);

  const resolvedAccount = bankAccount || meta.bankAccount || "";

  const rows = [];
  const errors = [];
  let rowsRead = 0;
  let openingBalance = null;
  let closingBalance = null;

  const at = (row, field) =>
    columnMap[field] === undefined ? null : cellValue(row.getCell(columnMap[field]));

  const textAt = (row, field) =>
    columnMap[field] === undefined ? "" : cellText(row.getCell(columnMap[field]));

  for (
    let rowNumber = headerRow + 1;
    rowNumber <= worksheet.rowCount;
    rowNumber += 1
  ) {
    const row = worksheet.getRow(rowNumber);

    const particulars = textAt(row, "particulars");
    const label = particulars || textAt(row, "partyName");
    const balance = parseAmount(at(row, "balance"));
    const date = parseDate(at(row, "date"));

    /*
     * Trailer rows: keep the balance they state, then move on. The label alone
     * is what makes a row a trailer - a "Closing Balance" line whose figure is
     * a formula the sheet never calculated is still a trailer, and reporting it
     * as a broken transaction would train an admin to ignore the error list.
     */
    if (OPENING_LABEL.test(label)) {
      if (balance !== null) openingBalance = balance;
      continue;
    }
    if (CLOSING_LABEL.test(label)) {
      if (balance !== null) closingBalance = balance;
      continue;
    }
    if (TOTAL_LABEL.test(label)) continue;

    if (!date) {
      // A genuinely empty row is padding, not an error.
      const isEmpty =
        !label &&
        parseAmount(at(row, "credit")) === null &&
        parseAmount(at(row, "debit")) === null &&
        parseAmount(at(row, "amount")) === null;
      if (isEmpty) continue;

      rowsRead += 1;
      errors.push({ row: rowNumber, reason: "Date is missing or unreadable" });
      continue;
    }

    rowsRead += 1;

    if (rows.length >= IMPORT_MAX_ROWS) {
      errors.push({
        row: rowNumber,
        reason: `Row limit of ${IMPORT_MAX_ROWS} reached, the rest of the sheet was not read`,
      });
      break;
    }

    /*
     * Direction and amount. Separate Credit/Debit columns are the common case;
     * a single signed Amount column with an optional Dr/Cr marker is the
     * fallback, and a negative amount there means money out.
     */
    let direction = null;
    let amount = null;

    const credit = parseAmount(at(row, "credit"));
    const debit = parseAmount(at(row, "debit"));

    if (credit !== null && credit !== 0 && (debit === null || debit === 0)) {
      direction = "credit";
      amount = Math.abs(credit);
    } else if (debit !== null && debit !== 0) {
      direction = "debit";
      amount = Math.abs(debit);
      if (credit !== null && credit !== 0) {
        errors.push({
          row: rowNumber,
          reason: "Both Credit and Debit are filled, treated as a debit",
        });
      }
    } else {
      const single = parseAmount(at(row, "amount"));
      if (single !== null && single !== 0) {
        const marker = normalizeHeader(textAt(row, "drCr"));
        const isDebit =
          single < 0 ||
          /^(dr|debit|withdrawal|paid|out|expense|payment)$/.test(marker);
        direction = isDebit ? "debit" : "credit";
        amount = Math.abs(single);
      }
    }

    if (direction === null || !amount) {
      errors.push({
        row: rowNumber,
        reason: "No credit or debit amount on this row",
      });
      continue;
    }

    const transactionId = textAt(row, "transactionId").replace(/^[-—]$/, "");
    const partyName = textAt(row, "partyName");
    const remarks = textAt(row, "remarks");

    const description = particulars || partyName || "Bank transaction";

    let category = normalizeCategory(textAt(row, "category"));
    let inferred = false;
    if (!category) {
      if (autoCategorize) {
        category = inferCategory(
          `${description} ${partyName} ${remarks}`,
          direction
        );
        inferred = true;
      } else {
        category = direction === "credit" ? "Income/Receipt" : "Uncategorized";
      }
    }

    /*
     * A category read straight off the file can still contradict the side the
     * money moved on - a tracker that files a client refund under a spend head,
     * for instance. The bank's direction is the fact; the label is the opinion,
     * so the label gives way and the row is flagged.
     */
    const kind = TXN_CATEGORY_KIND[category];
    const conflicts =
      (kind === "income" && direction === "debit") ||
      (kind === "expense" && direction === "credit");

    if (conflicts) {
      errors.push({
        row: rowNumber,
        reason: `Category "${category}" does not match a ${direction} row, imported as ${
          direction === "credit" ? "Income/Receipt" : "Uncategorized"
        }`,
      });
      category = direction === "credit" ? "Income/Receipt" : "Uncategorized";
    }

    const parsed = {
      date,
      direction,
      amount: round2(amount),
      category,
      particulars: description.slice(0, 400),
      partyName: partyName.slice(0, 180),
      transactionId: transactionId.slice(0, 80),
      paymentMode: normalizePaymentMode(
        textAt(row, "paymentMode"),
        transactionId,
        description
      ),
      bankAccount: resolvedAccount,
      balance: balance === null ? null : round2(balance),
      remarks: (inferred && !remarks
        ? "Category auto-assigned on import"
        : remarks
      ).slice(0, 400),
      sheetRow: rowNumber,
      inferredCategory: inferred,
    };

    parsed.fingerprint = fingerprintOf(parsed);
    rows.push(parsed);
  }

  // No explicit closing line: the last row that carried a balance is the next
  // best statement of where the account ended up.
  if (closingBalance === null) {
    const withBalance = [...rows].reverse().find((row) => row.balance !== null);
    if (withBalance) closingBalance = withBalance.balance;
  }

  const dates = rows.map((row) => row.date.getTime());

  return {
    sheetName: worksheet.name,
    bankAccount: resolvedAccount,
    periodFrom: meta.periodFrom || (dates.length ? new Date(Math.min(...dates)) : null),
    periodTo: meta.periodTo || (dates.length ? new Date(Math.max(...dates)) : null),
    openingBalance,
    closingBalance,
    rowsRead,
    rows,
    errors,
    columnMap,
    headerRow,
  };
};

module.exports = {
  parseStatementWorkbook,
  parseDate,
  parseAmount,
  normalizeCategory,
  normalizePaymentMode,
  inferCategory,
  fingerprintOf,
};
