const BillingPlan = require("../models/billingPlanModel");
const Document = require("../models/documentModel");
const Company = require("../models/companyModel");
const Client = require("../models/clientModel");

const { DOC_LABELS, MIN_INSTALLMENTS } = require("../config/constants");
const { computeTotals, computeInstallmentSchedule } = require("./calculationService");
const { amountToWords } = require("./wordsService");
const { commitNextNumber, buildDocNumber } = require("./numberingService");
const { recordAudit } = require("./auditLogService");
const { round2 } = require("../utils/moneyHelper");
const {
  mapBillingPlanDetail,
  mapBillingPlanListItem,
} = require("../responses/billingPlanResponse");
const { mapDocumentDetail } = require("../responses/documentResponse");

const COMPANY_LIST_FIELDS = "name gstin";
const CLIENT_LIST_FIELDS = "name gstin";
const COMPANY_FULL_FIELDS =
  "name gstin pan stateCode address email phone website logoUrl signatureUrl bankDetails defaultTerms";
const CLIENT_FULL_FIELDS = "name address gstin stateCode contactPerson email phone";

const loadPlan = (id) =>
  BillingPlan.findById(id)
    .populate("company", COMPANY_LIST_FIELDS)
    .populate("client", CLIENT_LIST_FIELDS);

const loadDocumentForResponse = (id) =>
  Document.findById(id)
    .populate("company", COMPANY_FULL_FIELDS)
    .populate("client", CLIENT_FULL_FIELDS)
    .lean();

const fail = (res, statusCode, message) =>
  res.status(statusCode).json({ success: false, message, statusCode });

const serverError = (res, label, error) => {
  console.error(`Error ${label}:`, error.message);
  return res.status(500).json({ success: false, message: error.message, statusCode: 500 });
};

// Percentages are compared as hundredths so 33.33 + 33.33 + 33.34 reads as 100
// rather than as 99.99999999999999.
const percentTotal = (values) =>
  Math.round(values.reduce((sum, value) => sum + Number(value), 0) * 100) / 100;

/*
 * Rewrites the money on every slice that has not gone out yet.
 *
 * Issued and paid slices keep the figures the client was already given - those
 * are commitments, not estimates. Whatever is left of the contract after them
 * is spread across the pending slices by percentage, with the final pending
 * slice taking the residue so the live slices always sum to the contract to the
 * paisa. Called after anything that changes the shape of the plan.
 */
const rebalancePendingInstallments = (plan) => {
  const live = plan.liveInstallments();
  const frozen = live.filter((slice) => slice.status !== "pending");
  const pending = live.filter((slice) => slice.status === "pending");
  if (pending.length === 0) return;

  const remainingSubTotal = round2(
    plan.baseSubTotal - frozen.reduce((sum, slice) => sum + slice.subTotal, 0)
  );
  const remainingGst = round2(
    plan.baseGstAmount - frozen.reduce((sum, slice) => sum + slice.gstAmount, 0)
  );

  const pendingPercent = percentTotal(pending.map((slice) => slice.percent));
  // Re-expressed as a share of what is left, so computeInstallmentSchedule's
  // residue rule applies to the remainder rather than to the whole contract.
  const shares = pending.map((slice) =>
    pendingPercent > 0 ? (slice.percent / pendingPercent) * 100 : 100 / pending.length
  );

  const schedule = computeInstallmentSchedule(
    {
      subTotal: remainingSubTotal,
      gstApplicable: plan.baseGstApplicable,
      gstAmount: remainingGst,
    },
    shares
  );

  pending.forEach((slice, position) => {
    slice.subTotal = schedule[position].subTotal;
    slice.gstAmount = schedule[position].gstAmount;
    slice.totalAmount = schedule[position].totalAmount;
  });
};

/* ------------------------------ Create a plan ------------------------------ */

/*
 * A plan can be cut from an accepted quotation, or started from scratch when
 * there was never a quotation to begin with. Either way one MCP serial is
 * reserved here for the installment proformas; each slice prints it with a
 * letter appended.
 */
const fetchCreateBillingPlan = async (req, res) => {
  try {
    const { sourceDocument: sourceId, installments } = req.body;

    let source = null;
    let companyId = req.body.company;
    let clientId = req.body.client;
    let items = req.body.items;
    let notesTerms = req.body.notesTerms;

    if (sourceId) {
      source = await Document.findById(sourceId).lean();
      if (!source) return fail(res, 404, "Source document not found");

      // Only a quotation may seed a plan. A proforma has already fixed the
      // price as a single figure, and re-cutting it would mean withdrawing a
      // document the client is holding.
      if (source.docType !== "quotation") {
        return fail(
          res,
          422,
          "A billing plan is cut from a quotation. Raise the quotation first, then split it into installments."
        );
      }
      if (source.status === "cancelled") {
        return fail(res, 422, "A cancelled quotation cannot be split into installments");
      }

      const existingPlan = await BillingPlan.findOne({
        sourceDocument: source._id,
        status: { $ne: "cancelled" },
      })
        .select("_id baseDocNumber")
        .lean();
      if (existingPlan) {
        return fail(
          res,
          422,
          `This quotation already has a billing plan (${existingPlan.baseDocNumber})`
        );
      }

      const existingProforma = await Document.findOne({
        convertedFrom: source._id,
        docType: "proforma",
      })
        .select("docNumber")
        .lean();
      if (existingProforma) {
        return fail(
          res,
          422,
          `This quotation was already converted to a proforma (${existingProforma.docNumber}). A job is billed either in one proforma or in installments, not both.`
        );
      }

      companyId = source.company;
      clientId = source.client;
      items = source.items;
      notesTerms = notesTerms ?? source.notesTerms;
    }

    if (!companyId || !clientId || !items || items.length === 0) {
      return fail(
        res,
        422,
        "Provide a source quotation, or a company, client and at least one item"
      );
    }

    const company = await Company.findById(companyId).lean();
    if (!company) return fail(res, 404, "Company not found");

    const client = await Client.findById(clientId).select("gstin").lean();
    if (!client) return fail(res, 404, "Client not found");
    // The slices are proformas, and a proforma is a tax document.
    if (!client.gstin) {
      return fail(res, 422, "Client GSTIN is required before billing in installments");
    }

    const percents = installments.map((slice) => slice.percent);
    if (percents.length < MIN_INSTALLMENTS) {
      return fail(
        res,
        422,
        `A plan needs at least ${MIN_INSTALLMENTS} installments. For a single payment, convert the quotation to a proforma instead.`
      );
    }
    if (percentTotal(percents) !== 100) {
      return fail(
        res,
        422,
        `Installments must add up to exactly 100% (they currently total ${percentTotal(percents)}%)`
      );
    }

    const issueDate = req.body.issueDate ? new Date(req.body.issueDate) : new Date();
    // A quotation is untaxed by default, but the slices coming off it are
    // proformas, so GST applies unless it is explicitly turned off.
    const gstApplicable =
      req.body.gstApplicable === undefined ? true : Boolean(req.body.gstApplicable);
    const baseTotals = computeTotals(items, gstApplicable);

    // Burns the serial for the whole job. Done here rather than at first
    // installment so every slice can be numbered from a known base.
    const numbering = await commitNextNumber("proforma", companyId, issueDate);
    const schedule = computeInstallmentSchedule(baseTotals, percents);

    const plan = await BillingPlan.create({
      company: companyId,
      client: clientId,
      sourceDocument: source ? source._id : null,
      baseDocNumber: numbering.docNumber,
      baseYearKey: numbering.yearKey,
      baseSerialNumber: numbering.serialNumber,
      baseItems: baseTotals.items,
      baseSubTotal: baseTotals.subTotal,
      baseGstApplicable: baseTotals.gstApplicable,
      baseGstAmount: baseTotals.gstAmount,
      baseTotalAmount: baseTotals.totalAmount,
      baseNotesTerms:
        notesTerms ?? (company.defaultTerms && company.defaultTerms.proforma) ?? "",
      installments: schedule.map((slice, position) => ({
        index: position + 1,
        label: installments[position].label || "",
        percent: slice.percent,
        subTotal: slice.subTotal,
        gstAmount: slice.gstAmount,
        totalAmount: slice.totalAmount,
        status: "pending",
      })),
      status: "active",
      createdBy: req.user.mongoId,
      updatedBy: req.user.mongoId,
    });

    recordAudit({
      documentId: source ? source._id : null,
      entityType: "billing_plan",
      entityId: plan._id,
      action: "billing_plan_created",
      performedBy: req.user.mongoId,
      meta: {
        baseDocNumber: plan.baseDocNumber,
        contractTotal: plan.baseTotalAmount,
        installments: percents,
      },
    });

    const created = await loadPlan(plan._id);
    return res.status(201).json({
      success: true,
      message: `Billing plan created. Installments will be raised as ${plan.baseDocNumber}-A, -B and so on.`,
      data: mapBillingPlanDetail(created),
      statusCode: 201,
    });
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 422, "A document with this number already exists");
    }
    return serverError(res, "Create Billing Plan", error);
  }
};

/* --------------------------------- Reads --------------------------------- */

const fetchBillingPlanDetail = async (req, res) => {
  try {
    const plan = await loadPlan(req.params.id);
    if (!plan) return fail(res, 404, "Billing plan not found");

    return res.status(200).json({
      success: true,
      message: "Billing plan fetched successfully",
      data: mapBillingPlanDetail(plan),
      statusCode: 200,
    });
  } catch (error) {
    return serverError(res, "Get Billing Plan", error);
  }
};

/*
 * Resolves the plan from any document in the job - a slice proforma, the
 * closing invoice, or the quotation it was cut from. The detail screen calls
 * this without needing to know which of the three it is showing.
 */
const fetchBillingPlanForDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .select("billingPlan docType")
      .lean();
    if (!document) return fail(res, 404, "Document not found");

    const query = document.billingPlan
      ? { _id: document.billingPlan }
      : { sourceDocument: req.params.id, status: { $ne: "cancelled" } };

    const plan = await BillingPlan.findOne(query)
      .populate("company", COMPANY_LIST_FIELDS)
      .populate("client", CLIENT_LIST_FIELDS);

    return res.status(200).json({
      success: true,
      message: plan ? "Billing plan fetched successfully" : "No billing plan on this document",
      data: plan ? mapBillingPlanDetail(plan) : null,
      statusCode: 200,
    });
  } catch (error) {
    return serverError(res, "Get Billing Plan For Document", error);
  }
};

const fetchAllBillingPlans = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const query = {};
    if (req.query.client) query.client = req.query.client;
    if (req.query.company) query.company = req.query.company;
    if (req.query.status) query.status = req.query.status;
    if (req.query.search) {
      query.baseDocNumber = { $regex: String(req.query.search).trim(), $options: "i" };
    }

    const plans = await BillingPlan.find(query)
      .populate("company", COMPANY_LIST_FIELDS)
      .populate("client", CLIENT_LIST_FIELDS)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await BillingPlan.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: "Billing plans fetched successfully",
      total,
      page,
      limit,
      data: plans.map(mapBillingPlanListItem),
      statusCode: 200,
    });
  } catch (error) {
    return serverError(res, "Get All Billing Plans", error);
  }
};

/* --------------------------- Raise the next slice --------------------------- */

const fetchGenerateInstallment = async (req, res) => {
  try {
    const plan = await BillingPlan.findById(req.params.id);
    if (!plan) return fail(res, 404, "Billing plan not found");
    if (plan.status === "cancelled") {
      return fail(res, 422, "This billing plan has been cancelled");
    }
    if (plan.finalInvoice) {
      return fail(
        res,
        422,
        "The closing tax invoice has already been raised, so no further installments can be added"
      );
    }

    const slice = plan.nextPendingInstallment();
    if (!slice) {
      return fail(
        res,
        422,
        "Every installment on this plan has already been raised"
      );
    }

    const company = await Company.findById(plan.company).lean();
    if (!company) return fail(res, 404, "Company not found");

    const live = plan.liveInstallments();
    // Only slices that have actually gone out count as billed, so a plan whose
    // middle slice is still pending does not overstate what the client owes.
    const previouslyBilled = round2(
      live
        .filter((other) => other.index < slice.index && other.status !== "pending")
        .reduce((sum, other) => sum + other.totalAmount, 0)
    );

    const issueDate = req.body.issueDate ? new Date(req.body.issueDate) : new Date();
    const docNumber = buildDocNumber(
      "proforma",
      plan.baseYearKey,
      plan.baseSerialNumber,
      slice.index
    );

    const document = await Document.create({
      docType: "proforma",
      docLabel: DOC_LABELS.proforma,
      docNumber,
      financialYearOrYear: plan.baseYearKey,
      serialNumber: plan.baseSerialNumber,
      company: plan.company,
      client: plan.client,
      issueDate,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      introLine: "",
      // The full scope is printed on every slice - the client should see what
      // they are buying. Only the totals block carries the percentage.
      items: plan.baseItems,
      subTotal: slice.subTotal,
      gstApplicable: plan.baseGstApplicable,
      gstAmount: slice.gstAmount,
      totalAmount: slice.totalAmount,
      amountInWords: amountToWords(slice.totalAmount),
      notesTerms:
        req.body.notesTerms ??
        plan.baseNotesTerms ??
        (company.defaultTerms && company.defaultTerms.proforma) ??
        "",
      status: "draft",
      version: 1,
      convertedFrom: plan.sourceDocument || null,
      billingPlan: plan._id,
      billingMode: "partial",
      installmentIndex: slice.index,
      installmentCount: live.length,
      installmentPercent: slice.percent,
      installmentLabel: slice.label || "",
      contractSubTotal: plan.baseSubTotal,
      contractGstAmount: plan.baseGstAmount,
      contractTotal: plan.baseTotalAmount,
      previouslyBilledTotal: previouslyBilled,
      createdBy: req.user.mongoId,
      updatedBy: req.user.mongoId,
    });

    slice.status = "issued";
    slice.document = document._id;
    slice.docNumber = docNumber;
    slice.issuedAt = new Date();
    plan.updatedBy = req.user.mongoId;
    await plan.save();

    if (plan.sourceDocument) {
      await Document.findByIdAndUpdate(plan.sourceDocument, {
        $addToSet: { convertedTo: document._id },
      });
    }

    recordAudit({
      documentId: document._id,
      entityType: "document",
      entityId: document._id,
      action: "installment_generated",
      performedBy: req.user.mongoId,
      meta: {
        planId: String(plan._id),
        docNumber,
        installmentIndex: slice.index,
        percent: slice.percent,
        totalAmount: slice.totalAmount,
      },
    });

    const created = await loadDocumentForResponse(document._id);
    return res.status(201).json({
      success: true,
      message: `Installment ${slice.index} of ${live.length} raised as ${docNumber}`,
      data: {
        document: mapDocumentDetail(created),
        plan: mapBillingPlanDetail(await loadPlan(plan._id)),
      },
      statusCode: 201,
    });
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 422, "A proforma with this number already exists");
    }
    return serverError(res, "Generate Installment", error);
  }
};

/* ------------------------------ Record payment ------------------------------ */

/*
 * A slice is the payment schedule, so it settles in full or not at all - there
 * is no partial payment of a part payment. If the client pays a different
 * figure, the plan itself was cut wrong and should be re-cut.
 */
const fetchRecordInstallmentPayment = async (req, res) => {
  try {
    const plan = await BillingPlan.findById(req.params.id);
    if (!plan) return fail(res, 404, "Billing plan not found");
    if (plan.status === "cancelled") {
      return fail(res, 422, "This billing plan has been cancelled");
    }

    const index = Number(req.params.index);
    const slice = plan.installments.find((item) => item.index === index);
    if (!slice) return fail(res, 404, `Installment ${index} not found on this plan`);
    if (slice.status === "cancelled") {
      return fail(res, 422, "This installment was cancelled");
    }
    if (slice.status === "pending") {
      return fail(
        res,
        422,
        "Raise the proforma for this installment before recording a payment against it"
      );
    }
    if (slice.status === "paid") {
      return fail(res, 422, "This installment is already marked paid");
    }

    const amountReceived =
      req.body.amountReceived === undefined
        ? slice.totalAmount
        : round2(req.body.amountReceived);
    if (amountReceived !== slice.totalAmount) {
      return fail(
        res,
        422,
        `This installment is for ${slice.totalAmount}. Record the exact amount, or cancel the installment and re-cut the plan if the agreed split has changed.`
      );
    }

    const paidAt = req.body.paidAt ? new Date(req.body.paidAt) : new Date();

    slice.status = "paid";
    slice.paidAt = paidAt;
    slice.amountReceived = amountReceived;
    slice.paymentMode = req.body.paymentMode || "";
    slice.paymentReference = req.body.paymentReference || "";
    slice.paymentRecordedBy = req.user.mongoId;

    // Every live slice settled means the closing tax invoice can now be raised.
    if (plan.isSettled()) plan.status = "fully_billed";
    plan.updatedBy = req.user.mongoId;
    await plan.save();

    if (slice.document) {
      await Document.findByIdAndUpdate(slice.document, {
        status: "paid",
        paidAt,
        paymentConfirmedBy: req.user.mongoId,
        updatedBy: req.user.mongoId,
      });
    }

    recordAudit({
      documentId: slice.document || null,
      entityType: "document",
      entityId: slice.document || plan._id,
      action: "installment_payment_recorded",
      performedBy: req.user.mongoId,
      meta: {
        planId: String(plan._id),
        installmentIndex: slice.index,
        docNumber: slice.docNumber,
        amountReceived,
        paymentMode: slice.paymentMode,
      },
    });

    return res.status(200).json({
      success: true,
      message: plan.isSettled()
        ? "Payment recorded. Every installment is settled, so the closing tax invoice can now be raised."
        : "Payment recorded",
      data: mapBillingPlanDetail(await loadPlan(plan._id)),
      statusCode: 200,
    });
  } catch (error) {
    return serverError(res, "Record Installment Payment", error);
  }
};

/* --------------------------- Cancel one installment --------------------------- */

/*
 * Cancelling returns the slice's percentage to the plan's unallocated pool. The
 * plan cannot close until it is back at 100%, so the caller either reallocates
 * the freed percentage across the slices still pending, or closes the plan
 * early at what has actually been billed.
 */
const fetchCancelInstallment = async (req, res) => {
  try {
    const plan = await BillingPlan.findById(req.params.id);
    if (!plan) return fail(res, 404, "Billing plan not found");
    if (plan.status === "cancelled") {
      return fail(res, 422, "This billing plan has already been cancelled");
    }
    if (plan.finalInvoice) {
      return fail(
        res,
        422,
        "The closing tax invoice has been raised, so the installments behind it can no longer change"
      );
    }

    const index = Number(req.params.index);
    const slice = plan.installments.find((item) => item.index === index);
    if (!slice) return fail(res, 404, `Installment ${index} not found on this plan`);
    if (slice.status === "cancelled") {
      return fail(res, 422, "This installment is already cancelled");
    }
    // A paid slice is money in the bank. Reversing it is a refund, not a
    // cancellation, and nothing here models a refund.
    if (slice.status === "paid") {
      return fail(
        res,
        422,
        "A paid installment cannot be cancelled. Refunding it is a separate transaction outside this plan."
      );
    }

    slice.status = "cancelled";
    slice.cancelledAt = new Date();
    slice.cancellationReason = req.body.reason;

    // The proforma for it, if one went out, is withdrawn with it.
    if (slice.document) {
      await Document.findByIdAndUpdate(slice.document, {
        status: "cancelled",
        updatedBy: req.user.mongoId,
      });
    }

    if (req.body.reallocation && req.body.reallocation.length > 0) {
      const pending = plan
        .liveInstallments()
        .filter((item) => item.status === "pending");

      for (const entry of req.body.reallocation) {
        const target = pending.find((item) => item.index === entry.index);
        if (!target) {
          return fail(
            res,
            422,
            `Installment ${entry.index} cannot be reallocated - only installments that have not gone out yet can change`
          );
        }
        target.percent = entry.percent;
      }

      if (plan.allocatedPercent() !== 100) {
        return fail(
          res,
          422,
          `After reallocation the installments total ${plan.allocatedPercent()}%. They must total exactly 100%.`
        );
      }
      rebalancePendingInstallments(plan);
    }

    plan.updatedBy = req.user.mongoId;
    await plan.save();

    recordAudit({
      documentId: slice.document || null,
      entityType: "billing_plan",
      entityId: plan._id,
      action: "installment_cancelled",
      performedBy: req.user.mongoId,
      meta: {
        planId: String(plan._id),
        installmentIndex: slice.index,
        docNumber: slice.docNumber,
        reason: slice.cancellationReason,
        allocatedPercentAfter: plan.allocatedPercent(),
      },
    });

    const allocated = plan.allocatedPercent();
    return res.status(200).json({
      success: true,
      message:
        allocated === 100
          ? "Installment cancelled and the plan is back at 100%"
          : `Installment cancelled. The plan now allocates ${allocated}% - reallocate the remaining ${round2(100 - allocated)}% or close the plan early.`,
      data: mapBillingPlanDetail(await loadPlan(plan._id)),
      statusCode: 200,
    });
  } catch (error) {
    return serverError(res, "Cancel Installment", error);
  }
};

/* ---------------------------- Close a plan early ---------------------------- */

/*
 * For the job the client walked away from halfway through. Everything not yet
 * raised is dropped and what WAS billed becomes the whole contract, rescaled to
 * 100%, so the closing tax invoice can still be raised - for the smaller
 * figure. Without this a stalled plan sits in receivables forever.
 */
const fetchCloseBillingPlanEarly = async (req, res) => {
  try {
    const plan = await BillingPlan.findById(req.params.id);
    if (!plan) return fail(res, 404, "Billing plan not found");
    if (plan.status === "cancelled") {
      return fail(res, 422, "This billing plan has already been cancelled");
    }
    if (plan.finalInvoice) {
      return fail(res, 422, "This plan is already closed by its tax invoice");
    }

    const live = plan.liveInstallments();
    const issued = live.filter((slice) => slice.status !== "pending");
    if (issued.length === 0) {
      return fail(
        res,
        422,
        "Nothing has been billed on this plan yet, so there is nothing to close it at. Cancel the plan instead."
      );
    }
    if (issued.length === live.length) {
      return fail(
        res,
        422,
        "Every installment on this plan has already been raised, so there is nothing left to close early"
      );
    }

    const closedAt = new Date();
    live
      .filter((slice) => slice.status === "pending")
      .forEach((slice) => {
        slice.status = "cancelled";
        slice.cancelledAt = closedAt;
        slice.cancellationReason = req.body.reason;
      });

    const newSubTotal = round2(issued.reduce((sum, s) => sum + s.subTotal, 0));
    const newGstAmount = round2(issued.reduce((sum, s) => sum + s.gstAmount, 0));
    const newTotal = round2(newSubTotal + newGstAmount);

    plan.originalTotalAmount = plan.baseTotalAmount;
    plan.baseSubTotal = newSubTotal;
    plan.baseGstAmount = newGstAmount;
    plan.baseTotalAmount = newTotal;

    /*
     * The surviving slices are rescaled so they read as a share of the smaller
     * contract - a 50% advance on a job that stopped at 50% is now 100% of what
     * was actually agreed. The last one absorbs the rounding, so they total 100
     * exactly rather than 99.99.
     */
    let allocated = 0;
    issued.forEach((slice, position) => {
      if (position === issued.length - 1) {
        slice.percent = round2(100 - allocated);
      } else {
        slice.percent = newTotal > 0 ? round2((slice.totalAmount / newTotal) * 100) : 0;
        allocated = round2(allocated + slice.percent);
      }
    });

    plan.closedEarlyAt = closedAt;
    plan.closedEarlyReason = req.body.reason;
    plan.status = plan.isSettled() ? "fully_billed" : "active";
    plan.updatedBy = req.user.mongoId;
    await plan.save();

    recordAudit({
      documentId: plan.sourceDocument || null,
      entityType: "billing_plan",
      entityId: plan._id,
      action: "billing_plan_closed_early",
      performedBy: req.user.mongoId,
      meta: {
        planId: String(plan._id),
        reason: req.body.reason,
        originalTotal: plan.originalTotalAmount,
        closedTotal: newTotal,
        installmentsDropped: live.length - issued.length,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Plan closed at ${newTotal}. The unraised installments were cancelled and the remaining ones now represent the whole job.`,
      data: mapBillingPlanDetail(await loadPlan(plan._id)),
      statusCode: 200,
    });
  } catch (error) {
    return serverError(res, "Close Billing Plan Early", error);
  }
};

/* --------------------------- Cancel the whole plan --------------------------- */

const fetchCancelBillingPlan = async (req, res) => {
  try {
    const plan = await BillingPlan.findById(req.params.id);
    if (!plan) return fail(res, 404, "Billing plan not found");
    if (plan.status === "cancelled") {
      return fail(res, 422, "This billing plan is already cancelled");
    }
    if (plan.finalInvoice) {
      return fail(res, 422, "A plan closed by a tax invoice cannot be cancelled");
    }

    const paid = plan.liveInstallments().filter((slice) => slice.status === "paid");
    if (paid.length > 0) {
      return fail(
        res,
        422,
        "Money has already been received against this plan. Close it early at what was billed instead of cancelling it."
      );
    }

    const cancelledAt = new Date();
    const documentIds = [];
    plan.liveInstallments().forEach((slice) => {
      slice.status = "cancelled";
      slice.cancelledAt = cancelledAt;
      slice.cancellationReason = req.body.reason;
      if (slice.document) documentIds.push(slice.document);
    });

    plan.status = "cancelled";
    plan.updatedBy = req.user.mongoId;
    await plan.save();

    if (documentIds.length > 0) {
      await Document.updateMany(
        { _id: { $in: documentIds } },
        { status: "cancelled", updatedBy: req.user.mongoId }
      );
    }

    recordAudit({
      documentId: plan.sourceDocument || null,
      entityType: "billing_plan",
      entityId: plan._id,
      action: "billing_plan_cancelled",
      performedBy: req.user.mongoId,
      meta: { planId: String(plan._id), reason: req.body.reason },
    });

    return res.status(200).json({
      success: true,
      message: "Billing plan cancelled",
      data: mapBillingPlanDetail(await loadPlan(plan._id)),
      statusCode: 200,
    });
  } catch (error) {
    return serverError(res, "Cancel Billing Plan", error);
  }
};

/* -------------------------- Raise the closing invoice -------------------------- */

/*
 * ONE tax invoice for the whole job. Splitting is a
 * proforma-only feature: however many slices the client paid in, the tax
 * document is single and carries the full contract value.
 *
 * Gated on every slice being approved AND paid, because raising a tax invoice
 * is what this system treats as confirming payment.
 */
const fetchRaiseFinalInvoice = async (req, res) => {
  try {
    const plan = await BillingPlan.findById(req.params.id);
    if (!plan) return fail(res, 404, "Billing plan not found");
    if (plan.status === "cancelled") {
      return fail(res, 422, "A cancelled billing plan cannot be invoiced");
    }
    if (plan.finalInvoice) {
      const existing = await Document.findById(plan.finalInvoice)
        .select("docNumber")
        .lean();
      return fail(
        res,
        422,
        `The closing tax invoice for this plan has already been raised (${existing?.docNumber || ""})`
      );
    }

    const live = plan.liveInstallments();
    if (live.length === 0) {
      return fail(res, 422, "Every installment on this plan was cancelled");
    }

    const allocated = plan.allocatedPercent();
    if (allocated !== 100) {
      return fail(
        res,
        422,
        `The installments on this plan allocate ${allocated}%, not 100%. Reallocate the remainder or close the plan early before invoicing.`
      );
    }

    const unpaid = live.filter((slice) => slice.status !== "paid");
    if (unpaid.length > 0) {
      const pending = unpaid.map((slice) => slice.docNumber || `installment ${slice.index}`);
      return fail(
        res,
        422,
        `A tax invoice is raised once the client has settled. Still outstanding: ${pending.join(", ")}.`
      );
    }

    // Signing the proformas is what makes them issued documents. An invoice
    // built on an unsigned proforma would be settling something never approved.
    const sliceDocs = await Document.find({
      _id: { $in: live.map((slice) => slice.document).filter(Boolean) },
    })
      .select("docNumber approvalStatus")
      .lean();
    const unapproved = sliceDocs.filter((doc) => doc.approvalStatus !== "approved");
    if (unapproved.length > 0) {
      return fail(
        res,
        422,
        `These installments are not approved and signed yet: ${unapproved
          .map((doc) => doc.docNumber)
          .join(", ")}`
      );
    }

    const company = await Company.findById(plan.company).lean();
    if (!company) return fail(res, 404, "Company not found");

    const issueDate = req.body.issueDate ? new Date(req.body.issueDate) : new Date();
    const lastPaidAt = live.reduce(
      (latest, slice) =>
        slice.paidAt && (!latest || slice.paidAt > latest) ? slice.paidAt : latest,
      null
    );

    const numbering = await commitNextNumber("invoice", plan.company, issueDate);

    const invoice = await Document.create({
      docType: "invoice",
      docLabel: DOC_LABELS.invoice,
      docNumber: numbering.docNumber,
      financialYearOrYear: numbering.yearKey,
      serialNumber: numbering.serialNumber,
      company: plan.company,
      client: plan.client,
      issueDate,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      introLine: "",
      items: plan.baseItems,
      subTotal: plan.baseSubTotal,
      gstApplicable: plan.baseGstApplicable,
      gstAmount: plan.baseGstAmount,
      totalAmount: plan.baseTotalAmount,
      amountInWords: amountToWords(plan.baseTotalAmount),
      notesTerms:
        req.body.notesTerms ??
        (company.defaultTerms && company.defaultTerms.invoice) ??
        plan.baseNotesTerms ??
        "",
      status: "draft",
      version: 1,
      convertedFrom: plan.sourceDocument || null,
      billingPlan: plan._id,
      // The invoice is not itself a slice - it is the single tax document for
      // the whole contract, which is why it stays "full".
      billingMode: "full",
      contractSubTotal: plan.baseSubTotal,
      contractGstAmount: plan.baseGstAmount,
      contractTotal: plan.baseTotalAmount,
      previouslyBilledTotal: round2(plan.receivedTotal()),
      coveredProformas: live.map((slice) => slice.document).filter(Boolean),
      settledInstallments: live.map((slice) => ({
        index: slice.index,
        label: slice.label || "",
        percent: slice.percent,
        docNumber: slice.docNumber,
        totalAmount: slice.totalAmount,
        paidAt: slice.paidAt,
      })),
      createdBy: req.user.mongoId,
      updatedBy: req.user.mongoId,
    });

    plan.finalInvoice = invoice._id;
    plan.status = "fully_billed";
    plan.updatedBy = req.user.mongoId;
    await plan.save();

    if (plan.sourceDocument) {
      await Document.findByIdAndUpdate(plan.sourceDocument, {
        $addToSet: { convertedTo: invoice._id },
      });
    }

    recordAudit({
      documentId: invoice._id,
      entityType: "document",
      entityId: invoice._id,
      action: "final_invoice_raised",
      performedBy: req.user.mongoId,
      meta: {
        planId: String(plan._id),
        docNumber: invoice.docNumber,
        contractTotal: plan.baseTotalAmount,
        installmentsCovered: live.length,
        lastPaymentAt: lastPaidAt,
      },
    });

    const created = await loadDocumentForResponse(invoice._id);
    return res.status(201).json({
      success: true,
      message: `Closing tax invoice ${invoice.docNumber} raised for the full contract value. Approve it to close the plan.`,
      data: {
        document: mapDocumentDetail(created),
        plan: mapBillingPlanDetail(await loadPlan(plan._id)),
      },
      statusCode: 201,
    });
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 422, "A tax invoice with this number already exists");
    }
    return serverError(res, "Raise Final Invoice", error);
  }
};

/* ------------------------- Hook used by documentService ------------------------- */

/*
 * Called when a tax invoice belonging to a plan is approved. Approval is the
 * act that confirms payment, so it closes the plan the same way it settles an
 * ordinary proforma - the slices are already paid, so this is the final state
 * change rather than a money movement.
 */
const closePlanOnInvoiceApproval = async (planId, approvedAt, userId) => {
  try {
    const plan = await BillingPlan.findById(planId);
    if (!plan || plan.status === "cancelled") return null;

    plan.status = "invoiced";
    plan.updatedBy = userId;

    const unsettled = plan
      .liveInstallments()
      .filter((slice) => slice.status !== "paid" && slice.document);
    unsettled.forEach((slice) => {
      slice.status = "paid";
      slice.paidAt = slice.paidAt || approvedAt;
      slice.amountReceived = slice.amountReceived || slice.totalAmount;
    });
    await plan.save();

    return plan;
  } catch (error) {
    console.error("Error Close Plan On Invoice Approval:", error.message);
    return null;
  }
};

module.exports = {
  fetchCreateBillingPlan,
  fetchBillingPlanDetail,
  fetchBillingPlanForDocument,
  fetchAllBillingPlans,
  fetchGenerateInstallment,
  fetchRecordInstallmentPayment,
  fetchCancelInstallment,
  fetchCloseBillingPlanEarly,
  fetchCancelBillingPlan,
  fetchRaiseFinalInvoice,
  closePlanOnInvoiceApproval,
  rebalancePendingInstallments,
};
