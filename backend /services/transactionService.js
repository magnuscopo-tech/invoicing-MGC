const Transaction = require("../models/transactionModel");
const ImportBatch = require("../models/importBatchModel");
const { recordAudit } = require("./auditLogService");
const {
  buildTransactionMatch,
  round2,
  toUtcDayStart,
} = require("../utils/cashBookScope");

const fetchCreateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.create({
      ...req.body,
      // Pinned to UTC midnight so a hand-entered row buckets into the same day
      // as an imported one. Joi accepts a full timestamp; the cash book only
      // ever means the calendar date.
      date: toUtcDayStart(req.body.date),
      amount: round2(req.body.amount),
      source: "manual",
      createdBy: req.user.mongoId,
    });

    recordAudit({
      entityType: "transaction",
      entityId: transaction._id,
      action: "created",
      performedBy: req.user.mongoId,
      meta: {
        direction: transaction.direction,
        amount: transaction.amount,
        category: transaction.category,
      },
    });

    return res.status(201).json({
      success: true,
      message:
        transaction.direction === "credit"
          ? "Receipt recorded successfully"
          : "Expense recorded successfully",
      data: transaction.toObject(),
      statusCode: 201,
    });
  } catch (error) {
    console.error("Error Create Transaction:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/*
 * The ledger page. Totals are computed over the whole filtered set rather than
 * the current page, so the summary line under the table answers "what do these
 * filters add up to" instead of "what is visible right now".
 */
const fetchAllTransactions = async (req, res) => {
  try {
    const { page, limit, sortBy, sortOrder, importBatch } = req.query;

    const match = buildTransactionMatch(req.query);
    if (importBatch) match.importBatch = importBatch;

    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
    /*
     * A stable tiebreaker keeps pagination deterministic when many rows share a
     * date - without it the same row can appear on two pages. createdAt alone
     * is not enough: a bulk import writes every row with the same timestamp, so
     * the _id is what actually breaks the tie.
     */
    if (sortBy !== "createdAt") sort.createdAt = -1;
    sort._id = -1;

    const [transactions, total, totals] = await Promise.all([
      Transaction.find(match)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("createdBy", "name email")
        .lean(),
      Transaction.countDocuments(match),
      Transaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$direction",
            amount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const credit = totals.find((row) => row._id === "credit");
    const debit = totals.find((row) => row._id === "debit");
    const totalCredit = round2(credit?.amount || 0);
    const totalDebit = round2(debit?.amount || 0);

    return res.status(200).json({
      success: true,
      message: "Transactions fetched successfully",
      total,
      page,
      limit,
      totals: {
        totalCredit,
        totalDebit,
        netFlow: round2(totalCredit - totalDebit),
        creditCount: credit?.count || 0,
        debitCount: debit?.count || 0,
      },
      data: transactions,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get All Transactions:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchTransactionDetail = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate("importBatch", "fileName createdAt")
      .lean();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
        statusCode: 404,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction fetched successfully",
      data: transaction,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get Transaction Detail:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/*
 * An imported row is the bank's own record of what happened, so a finance user
 * cannot rewrite it - only an admin can, and that is normally to fix the
 * category the importer guessed. Hand-entered rows stay fully editable by the
 * team that keys them in.
 */
const fetchUpdateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
        statusCode: 404,
      });
    }

    if (transaction.source === "bulk_upload" && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message:
          "This row came from a bank statement import and can only be edited by an admin",
        statusCode: 403,
      });
    }

    const before = {
      direction: transaction.direction,
      amount: transaction.amount,
      category: transaction.category,
    };

    Object.assign(transaction, req.body);
    if (req.body.amount !== undefined) {
      transaction.amount = round2(req.body.amount);
    }
    if (req.body.date !== undefined) {
      transaction.date = toUtcDayStart(req.body.date);
    }
    transaction.updatedBy = req.user.mongoId;
    await transaction.save();

    recordAudit({
      entityType: "transaction",
      entityId: transaction._id,
      action: "updated",
      performedBy: req.user.mongoId,
      meta: { fields: Object.keys(req.body), before },
    });

    return res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      data: transaction.toObject(),
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Update Transaction:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

// Deleting is admin-only at the router. A row is removed outright rather than
// soft-deleted: nothing else in the system points at a transaction, and a cash
// book that keeps phantom rows out of its own totals is not a cash book.
const fetchDeleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
        statusCode: 404,
      });
    }

    await transaction.deleteOne();

    recordAudit({
      entityType: "transaction",
      entityId: transaction._id,
      action: "deleted",
      performedBy: req.user.mongoId,
      meta: {
        direction: transaction.direction,
        amount: transaction.amount,
        particulars: transaction.particulars,
        source: transaction.source,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
      data: { _id: transaction._id },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Delete Transaction:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchImportBatches = async (req, res) => {
  try {
    const { page, limit } = req.query;

    const [batches, total] = await Promise.all([
      ImportBatch.find({})
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("uploadedBy", "name email")
        .lean(),
      ImportBatch.countDocuments({}),
    ]);

    return res.status(200).json({
      success: true,
      message: "Import batches fetched successfully",
      total,
      page,
      limit,
      data: batches,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get Import Batches:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/*
 * Undo an upload. Every row an import created carries its batch id, so a file
 * uploaded against the wrong account or in the wrong format is reversed in one
 * action. Rows edited by hand afterwards are still removed - they only exist
 * because the import created them.
 */
const fetchDeleteImportBatch = async (req, res) => {
  try {
    const batch = await ImportBatch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Import batch not found",
        statusCode: 404,
      });
    }

    const { deletedCount } = await Transaction.deleteMany({
      importBatch: batch._id,
    });
    await batch.deleteOne();

    recordAudit({
      entityType: "import_batch",
      entityId: batch._id,
      action: "reverted",
      performedBy: req.user.mongoId,
      meta: { fileName: batch.fileName, removed: deletedCount },
    });

    return res.status(200).json({
      success: true,
      message: `Import reverted, ${deletedCount} transaction(s) removed`,
      data: { _id: batch._id, removed: deletedCount },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Delete Import Batch:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

module.exports = {
  fetchCreateTransaction,
  fetchAllTransactions,
  fetchTransactionDetail,
  fetchUpdateTransaction,
  fetchDeleteTransaction,
  fetchImportBatches,
  fetchDeleteImportBatch,
};
