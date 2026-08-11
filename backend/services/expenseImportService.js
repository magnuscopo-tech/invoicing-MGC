const ExcelJS = require("exceljs");
const dayjs = require("dayjs");
const Transaction = require("../models/transactionModel");
const ImportBatch = require("../models/importBatchModel");
const { recordAudit } = require("./auditLogService");
const { parseStatementWorkbook } = require("./statementParserService");
const { removeFileIfExists } = require("../utils/fileHelper");
const { buildTransactionMatch, round2 } = require("../utils/cashBookScope");
const {
  TXN_CATEGORIES,
  TXN_CATEGORY_KIND,
  TXN_PAYMENT_MODES,
} = require("../config/constants");

// Only the first N rejections are stored on the batch. A structurally wrong file
// can reject every row, and the receipt should stay readable.
const MAX_STORED_ERRORS = 50;

/* ------------------------------- Bulk upload ------------------------------- */

/**
 * Imports one bank-statement / expense-tracker workbook.
 *
 * The whole operation is recorded as an ImportBatch and every transaction it
 * creates points back at that batch, so an import is a single reversible event
 * rather than a scatter of untraceable rows.
 */
const fetchBulkUploadStatement = async (req, res) => {
  const uploadedPath = req.file?.path;

  try {
    if (!req.file) {
      return res.status(422).json({
        success: false,
        message: "Attach an .xlsx bank statement to upload",
        statusCode: 422,
      });
    }

    const { bankAccount, sheetName, allowDuplicates, autoCategorize } = req.body;

    const parsed = await parseStatementWorkbook(uploadedPath, {
      sheetName,
      bankAccount,
      autoCategorize,
    });

    if (parsed.rows.length === 0) {
      return res.status(422).json({
        success: false,
        message:
          "No usable transaction rows were found in this file. Check that it has Date and Credit/Debit columns with data below them.",
        data: {
          sheetName: parsed.sheetName,
          rowsRead: parsed.rowsRead,
          errors: parsed.errors.slice(0, MAX_STORED_ERRORS),
        },
        statusCode: 422,
      });
    }

    /*
     * Deduplication happens against rows already in the book AND within the
     * file itself. Statements are re-uploaded with overlapping periods all the
     * time, and a genuinely repeated line inside one file is far more likely to
     * be a copy-paste than two identical payments to the paise.
     */
    let rowsToInsert = parsed.rows;
    let duplicates = 0;

    if (!allowDuplicates) {
      const fingerprints = parsed.rows.map((row) => row.fingerprint);
      const existing = await Transaction.find({
        fingerprint: { $in: fingerprints },
      })
        .select("fingerprint")
        .lean();

      const seen = new Set(existing.map((row) => row.fingerprint));
      rowsToInsert = parsed.rows.filter((row) => {
        if (seen.has(row.fingerprint)) return false;
        seen.add(row.fingerprint);
        return true;
      });
      duplicates = parsed.rows.length - rowsToInsert.length;
    }

    const batch = await ImportBatch.create({
      fileName: req.file.originalname,
      sheetName: parsed.sheetName,
      bankAccount: parsed.bankAccount,
      periodFrom: parsed.periodFrom,
      periodTo: parsed.periodTo,
      openingBalance: parsed.openingBalance,
      closingBalance: parsed.closingBalance,
      rowsRead: parsed.rowsRead,
      uploadedBy: req.user.mongoId,
    });

    const documents = rowsToInsert.map((row) => ({
      date: row.date,
      direction: row.direction,
      amount: row.amount,
      category: row.category,
      particulars: row.particulars,
      partyName: row.partyName,
      transactionId: row.transactionId,
      paymentMode: row.paymentMode,
      bankAccount: row.bankAccount,
      balance: row.balance,
      remarks: row.remarks,
      source: "bulk_upload",
      importBatch: batch._id,
      // Re-uploading with duplicates allowed must not trip the unique index, so
      // those rows are stored without a dedupe key.
      fingerprint: allowDuplicates ? null : row.fingerprint,
      createdBy: req.user.mongoId,
    }));

    let inserted = [];
    try {
      // Unordered, so one unexpected rejection does not abandon the rest.
      inserted = await Transaction.insertMany(documents, { ordered: false });
    } catch (error) {
      // insertMany reports partial success through the error on a bulk failure.
      inserted = error.insertedDocs || [];
      (error.writeErrors || []).slice(0, MAX_STORED_ERRORS).forEach((writeError) => {
        const index = writeError.index ?? writeError.err?.index;
        const sheetRow = rowsToInsert[index]?.sheetRow;
        parsed.errors.push({
          row: sheetRow ?? null,
          reason: writeError.errmsg || writeError.err?.errmsg || "Row rejected on save",
        });
      });
    }

    const insertedCount = inserted.length;
    const totals = rowsToInsert.slice(0, insertedCount).reduce(
      (accumulator, row) => {
        if (row.direction === "credit") accumulator.credit += row.amount;
        else accumulator.debit += row.amount;
        return accumulator;
      },
      { credit: 0, debit: 0 }
    );

    const skipped = parsed.errors.filter((item) => item.row !== null).length;
    batch.inserted = insertedCount;
    batch.duplicates = duplicates;
    batch.skipped = skipped;
    batch.totalCredit = round2(totals.credit);
    batch.totalDebit = round2(totals.debit);
    batch.rowErrors = parsed.errors.slice(0, MAX_STORED_ERRORS);
    /*
     * Importing nothing is only a failure if nothing was recognised either.
     * Re-uploading a statement that is already fully booked inserts zero rows
     * and is the correct, expected outcome - calling that "failed" would train
     * an admin to re-run an import that already worked.
     */
    if (skipped > 0) {
      batch.status = insertedCount === 0 ? "failed" : "partial";
    } else {
      batch.status = insertedCount === 0 && duplicates === 0 ? "failed" : "completed";
    }
    await batch.save();

    recordAudit({
      entityType: "import_batch",
      entityId: batch._id,
      action: "imported",
      performedBy: req.user.mongoId,
      meta: {
        fileName: batch.fileName,
        inserted: insertedCount,
        duplicates,
        skipped,
      },
    });

    const autoAssigned = rowsToInsert
      .slice(0, insertedCount)
      .filter((row) => row.inferredCategory).length;

    return res.status(201).json({
      success: true,
      message: `Imported ${insertedCount} transaction(s)${
        duplicates ? `, skipped ${duplicates} already in the book` : ""
      }${skipped ? `, ${skipped} row(s) could not be read` : ""}`,
      data: {
        batch: batch.toObject(),
        // Surfaced so the UI can point an admin straight at the rows that need
        // a human decision rather than leaving them to be discovered later.
        needsReview: autoAssigned,
        errors: batch.rowErrors,
      },
      statusCode: 201,
    });
  } catch (error) {
    console.error("Error Bulk Upload Statement:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      statusCode: error.statusCode || 500,
    });
  } finally {
    // The workbook has been read into the database; keeping the raw upload adds
    // nothing and grows without bound.
    removeFileIfExists(uploadedPath);
  }
};

/* ---------------------------- Template / export ---------------------------- */

const HEADERS = [
  { key: "date", header: "Date", width: 14 },
  { key: "transactionId", header: "Transaction ID", width: 22 },
  { key: "particulars", header: "Particulars", width: 46 },
  { key: "partyName", header: "Client/Vendor Name", width: 26 },
  { key: "category", header: "Category", width: 24 },
  { key: "credit", header: "Credit (₹)", width: 14 },
  { key: "debit", header: "Debit (₹)", width: 14 },
  { key: "paymentMode", header: "Payment Mode", width: 16 },
  { key: "balance", header: "Balance (₹)", width: 15 },
  { key: "remarks", header: "Remarks", width: 28 },
];

const MONEY_FORMAT = "#,##0.00";

const styleHeaderRow = (row) => {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1D5DF5" },
  };
  row.alignment = { vertical: "middle" };
  row.height = 22;
};

const applyColumnWidths = (worksheet) => {
  HEADERS.forEach((column, index) => {
    worksheet.getColumn(index + 1).width = column.width;
  });
};

/*
 * The template is deliberately the same shape the importer reads back, so a
 * team that fills it in can upload it unchanged. Category and Payment Mode
 * carry dropdown validation, which is what keeps the closed lists closed at the
 * point of data entry rather than at the point of upload.
 */
const fetchDownloadTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Invoicing Tool";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Transactions");
    const headerRow = worksheet.addRow(HEADERS.map((column) => column.header));
    styleHeaderRow(headerRow);
    applyColumnWidths(worksheet);
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    worksheet.addRow([
      dayjs().format("DD MMM YYYY"),
      "UPI-123456789012",
      "UPI/TUSKER WORKSPAC/1234/Day pass booking",
      "Tusker Workspace",
      "Office/Coworking",
      null,
      944,
      "UPI",
      null,
      "Example row - delete before uploading",
    ]);
    worksheet.addRow([
      dayjs().format("DD MMM YYYY"),
      "NEFTINW-1653531850",
      "NEFT inward from client",
      "Trolex Products Pvt Ltd",
      "Income/Receipt",
      18845,
      null,
      "NEFT",
      null,
      "Example row - delete before uploading",
    ]);

    worksheet.getColumn(6).numFmt = MONEY_FORMAT;
    worksheet.getColumn(7).numFmt = MONEY_FORMAT;
    worksheet.getColumn(9).numFmt = MONEY_FORMAT;

    // Excel caps a literal dropdown list at 255 characters, so the allowed
    // values live on a lookup sheet and the rule points at that range.
    const lookup = workbook.addWorksheet("Lists");
    lookup.state = "hidden";
    TXN_CATEGORIES.forEach((category, index) => {
      lookup.getCell(index + 1, 1).value = category;
    });
    TXN_PAYMENT_MODES.forEach((mode, index) => {
      lookup.getCell(index + 1, 2).value = mode;
    });

    for (let rowNumber = 2; rowNumber <= 500; rowNumber += 1) {
      worksheet.getCell(rowNumber, 5).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`Lists!$A$1:$A$${TXN_CATEGORIES.length}`],
      };
      worksheet.getCell(rowNumber, 8).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`Lists!$B$1:$B$${TXN_PAYMENT_MODES.length}`],
      };
    }

    const guide = workbook.addWorksheet("How to use");
    guide.getColumn(1).width = 22;
    guide.getColumn(2).width = 96;
    const guideHeader = guide.addRow(["Column", "What to put in it"]);
    styleHeaderRow(guideHeader);

    [
      ["Date", "The date the money moved. Any common format works - 05 Jul 2026, 05/07/2026, 2026-07-05. Day comes first."],
      ["Transaction ID", "Optional. The bank reference, UTR or cheque number. Used to spot a row that has already been imported."],
      ["Particulars", "Required. The bank narration, or a plain description for a cash entry."],
      ["Client/Vendor Name", "Optional. Who paid you or who you paid. Drives the top-parties report."],
      ["Category", "Pick from the dropdown. Leave blank and it will be guessed from the narration, then flagged for review."],
      ["Credit (₹)", "Money received. Fill this OR Debit, never both."],
      ["Debit (₹)", "Money paid out. Fill this OR Credit, never both."],
      ["Payment Mode", "Pick from the dropdown. Left blank, it is read from the transaction reference where possible."],
      ["Balance (₹)", "Optional. The running balance printed by the bank, if the file has one."],
      ["Remarks", "Optional free text - what the payment was for."],
    ].forEach((row) => guide.addRow(row));

    guide.addRow([]);
    guide.addRow([
      "Re-uploading",
      "Safe by default. A row already in the book is recognised and skipped, so overlapping statement periods do not double count.",
    ]);
    guide.addRow([
      "Other formats",
      "A raw bank export works too. The importer looks for the header row itself and understands Narration/Description, Withdrawal/Deposit and a single signed Amount column.",
    ]);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="expense-tracker-template.xlsx"'
    );

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error("Error Download Template:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/*
 * Exports the currently filtered ledger in the same layout as the template, so
 * an export can be edited and re-uploaded. A second sheet carries the
 * category summary, which is the figure most often lifted out for the
 * accountant.
 */
const fetchExportTransactions = async (req, res) => {
  try {
    const match = buildTransactionMatch(req.query);

    const transactions = await Transaction.find(match)
      .sort({ date: 1, createdAt: 1 })
      .limit(20000)
      .lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Invoicing Tool";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Transactions");
    const headerRow = worksheet.addRow(HEADERS.map((column) => column.header));
    styleHeaderRow(headerRow);
    applyColumnWidths(worksheet);
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    let totalCredit = 0;
    let totalDebit = 0;

    transactions.forEach((transaction) => {
      const isCredit = transaction.direction === "credit";
      if (isCredit) totalCredit += transaction.amount;
      else totalDebit += transaction.amount;

      worksheet.addRow([
        dayjs(transaction.date).format("DD MMM YYYY"),
        transaction.transactionId || "",
        transaction.particulars,
        transaction.partyName || "",
        transaction.category,
        isCredit ? transaction.amount : null,
        isCredit ? null : transaction.amount,
        transaction.paymentMode,
        transaction.balance,
        transaction.remarks || "",
      ]);
    });

    const totalRow = worksheet.addRow([
      null,
      null,
      "TOTAL",
      null,
      null,
      round2(totalCredit),
      round2(totalDebit),
      null,
      null,
      null,
    ]);
    totalRow.font = { bold: true };

    [6, 7, 9].forEach((columnNumber) => {
      worksheet.getColumn(columnNumber).numFmt = MONEY_FORMAT;
    });

    // Category summary, computed from the same rows so the two sheets can never
    // disagree with each other.
    const summarySheet = workbook.addWorksheet("Category Summary");
    summarySheet.getColumn(1).width = 30;
    summarySheet.getColumn(2).width = 18;
    summarySheet.getColumn(3).width = 18;
    summarySheet.getColumn(4).width = 12;
    const summaryHeader = summarySheet.addRow([
      "Category",
      "Total Credit (₹)",
      "Total Debit (₹)",
      "Entries",
    ]);
    styleHeaderRow(summaryHeader);

    const byCategory = new Map();
    transactions.forEach((transaction) => {
      const bucket = byCategory.get(transaction.category) || {
        credit: 0,
        debit: 0,
        count: 0,
      };
      if (transaction.direction === "credit") bucket.credit += transaction.amount;
      else bucket.debit += transaction.amount;
      bucket.count += 1;
      byCategory.set(transaction.category, bucket);
    });

    TXN_CATEGORIES.filter((category) => byCategory.has(category)).forEach(
      (category) => {
        const bucket = byCategory.get(category);
        summarySheet.addRow([
          category,
          round2(bucket.credit),
          round2(bucket.debit),
          bucket.count,
        ]);
      }
    );

    const summaryTotal = summarySheet.addRow([
      "TOTAL",
      round2(totalCredit),
      round2(totalDebit),
      transactions.length,
    ]);
    summaryTotal.font = { bold: true };

    const netRow = summarySheet.addRow([
      "NET CASH FLOW",
      round2(totalCredit - totalDebit),
      null,
      null,
    ]);
    netRow.font = { bold: true };

    [2, 3].forEach((columnNumber) => {
      summarySheet.getColumn(columnNumber).numFmt = MONEY_FORMAT;
    });

    const stamp = dayjs().format("YYYY-MM-DD");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="cash-book-${stamp}.xlsx"`
    );

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error("Error Export Transactions:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/* --------------------------- Reference metadata --------------------------- */

// One call so the client never hard-codes a category list that can drift out of
// step with what the API will accept.
const fetchCashBookMeta = async (req, res) => {
  try {
    const parties = await Transaction.distinct("partyName", {
      partyName: { $nin: ["", null] },
    });

    return res.status(200).json({
      success: true,
      message: "Cash book metadata fetched successfully",
      data: {
        categories: TXN_CATEGORIES.map((category) => ({
          value: category,
          kind: TXN_CATEGORY_KIND[category],
        })),
        paymentModes: TXN_PAYMENT_MODES,
        parties: parties.sort((a, b) => a.localeCompare(b)).slice(0, 500),
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get Cash Book Meta:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

module.exports = {
  fetchBulkUploadStatement,
  fetchDownloadTemplate,
  fetchExportTransactions,
  fetchCashBookMeta,
};
