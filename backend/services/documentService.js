const Document = require("../models/documentModel");
const Company = require("../models/companyModel");
const Client = require("../models/clientModel");
const User = require("../models/userModel");

const {
  DOC_LABELS,
  DOC_PREFIX,
  GST_PERCENT,
  CONVERSION_TARGETS,
  PRICE_LOCK_STATUSES,
} = require("../config/constants");
const BillingPlan = require("../models/billingPlanModel");
const { computeTotals } = require("./calculationService");
const { closePlanOnInvoiceApproval } = require("./billingPlanService");
const {
  peekNextNumber,
  commitNextNumber,
  commitSerialNumber,
  getYearKey,
  buildDocNumber,
  releaseSequenceIfLatest,
} = require("./numberingService");
const { renderHtml, renderPdfBuffer } = require("./pdfService");
const { recordAudit } = require("./auditLogService");
const {
  sendApprovalRequestEmail,
  sendDocumentApprovedEmail,
} = require("../mailer/documentMailer");
const { mapDocumentListItem, mapDocumentDetail } = require("../responses/documentResponse");
const { sanitizeFileName } = require("../utils/fileHelper");
const { compressImageToDataUrl } = require("../utils/imageAssetHelper");

const COMPANY_LIST_FIELDS = "name gstin";
const CLIENT_LIST_FIELDS = "name gstin";
const COMPANY_FULL_FIELDS =
  "name gstin pan stateCode address email phone website logoUrl signatureUrl bankDetails defaultTerms";
const CLIENT_FULL_FIELDS = "name address gstin stateCode contactPerson email phone";

// Statuses that lock a document against further edits.
const LOCKED_STATUSES = ["paid", "cancelled"];

const loadDocumentForRender = (id) =>
  Document.findById(id)
    .populate("company", COMPANY_FULL_FIELDS)
    .populate("client", CLIENT_FULL_FIELDS)
    .lean();

// Quotations are untaxed by default; proforma and invoice are taxable by default.
const resolveGstApplicable = (docType, requested) =>
  requested === undefined ? docType !== "quotation" : Boolean(requested);

// The agreed price is fixed at the proforma stage. A quotation is the negotiation
// document, so its figures stay open for as long as it is editable at all; a
// proforma or invoice freezes its money once it has gone out or been signed.
// Dates, notes and terms remain editable either way - only the money is frozen.
//
// An installment proforma is frozen from creation rather than from despatch: its
// figure was computed from a schedule the client agreed up front, and moving one
// slice would silently stop the slices adding up to the contract.
const isPriceLocked = (document) =>
  document.docType !== "quotation" &&
  (document.billingMode === "partial" ||
    PRICE_LOCK_STATUSES.includes(document.status) ||
    document.approvalStatus === "approved");

const priceLockReason = (document) => {
  if (document.billingMode === "partial") {
    return `This is installment ${document.installmentIndex} of a billing plan, so its amount comes from the agreed schedule.`;
  }
  if (document.approvalStatus === "approved") {
    return `This ${DOC_LABELS[document.docType].toLowerCase()} has been approved and signed, so its prices are final.`;
  }
  return `This ${DOC_LABELS[document.docType].toLowerCase()} has already been ${document.status} to the client, so its prices are final.`;
};

const readSeparatePricingOption = (req) => ({
  separatePricing: req.query?.separatePricing !== "false",
});

const fetchNextNumber = async (req, res) => {
  try {
    const { type, companyId, date } = req.query;

    const company = await Company.findById(companyId).select("_id").lean();
    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found", statusCode: 404 });
    }

    // Preview only - the counter is committed at save time so abandoned drafts
    // never burn a serial number.
    const preview = await peekNextNumber(type, companyId, date || new Date());

    return res.status(200).json({
      success: true,
      message: "Next document number generated",
      data: { ...preview, docLabel: DOC_LABELS[type] },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get Next Number:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchCreateDocument = async (req, res) => {
  try {
    const { docType, company: companyId, client: clientId } = req.body;

    const company = await Company.findById(companyId).lean();
    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found", statusCode: 404 });
    }

    const client = await Client.findById(clientId).lean();
    if (!client) {
      return res
        .status(404)
        .json({ success: false, message: "Client not found", statusCode: 404 });
    }

    // A tax document must carry the buyer GSTIN; a quotation never prints it.
    if (docType !== "quotation" && !client.gstin) {
      return res.status(422).json({
        success: false,
        message: "Client GSTIN is required for a proforma or tax invoice",
        statusCode: 422,
      });
    }

    const issueDate = new Date(req.body.issueDate);
    const gstApplicable = resolveGstApplicable(docType, req.body.gstApplicable);
    // Client-supplied totals are ignored - everything money related is recomputed here.
    const totals = computeTotals(req.body.items, gstApplicable);

    const requestedSerialNumber = req.body.serialNumber
      ? Number(req.body.serialNumber)
      : null;

    if (requestedSerialNumber) {
      const yearKey = getYearKey(docType, issueDate);
      const docNumber = buildDocNumber(docType, yearKey, requestedSerialNumber);
      const existing = await Document.findOne({ docType, docNumber })
        .select("_id")
        .lean();
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Document number ${docNumber} already exists`,
          statusCode: 409,
        });
      }
    }

    const numbering = requestedSerialNumber
      ? await commitSerialNumber(docType, companyId, issueDate, requestedSerialNumber)
      : await commitNextNumber(docType, companyId, issueDate);

    const document = await Document.create({
      docType,
      docLabel: DOC_LABELS[docType],
      docNumber: numbering.docNumber,
      financialYearOrYear: numbering.yearKey,
      serialNumber: numbering.serialNumber,
      company: companyId,
      client: clientId,
      issueDate,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      introLine: docType === "quotation" ? req.body.introLine || "" : "",
      items: totals.items,
      subTotal: totals.subTotal,
      gstApplicable: totals.gstApplicable,
      gstAmount: totals.gstAmount,
      totalAmount: totals.totalAmount,
      amountInWords: totals.amountInWords,
      // Seeded from the terms slot matching this document type.
      notesTerms:
        req.body.notesTerms ?? (company.defaultTerms && company.defaultTerms[docType]) ?? "",
      status: req.body.status || "draft",
      version: 1,
      createdBy: req.user.mongoId,
      updatedBy: req.user.mongoId,
    });

    recordAudit({
      documentId: document._id,
      action: "created",
      performedBy: req.user.mongoId,
      meta: { docNumber: document.docNumber, docType: document.docType },
    });

    const created = await loadDocumentForRender(document._id);

    return res.status(201).json({
      success: true,
      message: "Document created successfully",
      data: mapDocumentDetail(created),
      statusCode: 201,
    });
  } catch (error) {
    console.error("Error Create Document:", error.message);
    if (error.code === 11000) {
      return res.status(422).json({
        success: false,
        message: "A document with this number and type already exists",
        statusCode: 422,
      });
    }
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchAllDocuments = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    // Allowlisted filters only - request values never reach the query untouched.
    const query = {};
    if (req.query.client) query.client = req.query.client;
    if (req.query.company) query.company = req.query.company;
    if (req.query.docType) query.docType = req.query.docType;
    if (req.query.status) query.status = req.query.status;
    if (req.query.approvalStatus) query.approvalStatus = req.query.approvalStatus;
    // "full" must also match documents predating split billing, which carry no
    // billingMode at all.
    if (req.query.billingMode === "partial") {
      query.billingMode = "partial";
    } else if (req.query.billingMode === "full") {
      query.billingMode = { $ne: "partial" };
    }
    if (req.query.fromDate || req.query.toDate) {
      query.issueDate = {};
      if (req.query.fromDate) query.issueDate.$gte = new Date(req.query.fromDate);
      if (req.query.toDate) query.issueDate.$lte = new Date(req.query.toDate);
    }
    if (req.query.search) {
      query.docNumber = { $regex: String(req.query.search).trim(), $options: "i" };
    }

    const documents = await Document.find(query)
      .populate("company", COMPANY_LIST_FIELDS)
      .populate("client", CLIENT_LIST_FIELDS)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const total = await Document.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: "Documents fetched successfully",
      total,
      page,
      limit,
      data: documents.map(mapDocumentListItem),
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get All Documents:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchDocumentDetail = async (req, res) => {
  try {
    const document = await loadDocumentForRender(req.params.id);
    if (!document) {
      return res
        .status(404)
        .json({ success: false, message: "Document not found", statusCode: 404 });
    }

    return res.status(200).json({
      success: true,
      message: "Document fetched successfully",
      data: { ...mapDocumentDetail(document), gstPercentConstant: GST_PERCENT },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get Document Detail:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchUpdateDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res
        .status(404)
        .json({ success: false, message: "Document not found", statusCode: 404 });
    }
    if (LOCKED_STATUSES.includes(document.status)) {
      return res.status(422).json({
        success: false,
        message: `A ${document.status} document can no longer be edited`,
        statusCode: 422,
      });
    }
    // Editing under review would change what the approver is looking at; editing
    // after approval would invalidate the signature already printed on it.
    if (document.approvalStatus === "pending") {
      return res.status(422).json({
        success: false,
        message:
          "This document is awaiting approval and cannot be edited. Ask an admin to reject it first.",
        statusCode: 422,
      });
    }
    if (document.approvalStatus === "approved") {
      return res.status(422).json({
        success: false,
        message: "An approved and signed document can no longer be edited",
        statusCode: 422,
      });
    }
    // Everything else about a sent proforma stays editable - only the money is
    // frozen, because that figure is what the client agreed to pay.
    const priceChangeRequested =
      req.body.items !== undefined || req.body.gstApplicable !== undefined;
    if (priceChangeRequested && isPriceLocked(document)) {
      const remedy =
        document.billingMode === "partial"
          ? "Cancel the installment on its billing plan and re-cut the split if the amounts have to change."
          : "Cancel it and raise a fresh one from the quotation if the amount has to change.";
      return res.status(422).json({
        success: false,
        message: `${priceLockReason(document)} ${remedy}`,
        statusCode: 422,
      });
    }

    if (req.body.company) {
      const company = await Company.findById(req.body.company).select("_id").lean();
      if (!company) {
        return res
          .status(404)
          .json({ success: false, message: "Company not found", statusCode: 404 });
      }
      document.company = req.body.company;
    }

    if (req.body.client) {
      const client = await Client.findById(req.body.client).select("gstin").lean();
      if (!client) {
        return res
          .status(404)
          .json({ success: false, message: "Client not found", statusCode: 404 });
      }
      if (document.docType !== "quotation" && !client.gstin) {
        return res.status(422).json({
          success: false,
          message: "Client GSTIN is required for a proforma or tax invoice",
          statusCode: 422,
        });
      }
      document.client = req.body.client;
    }

    if (req.body.issueDate) document.issueDate = new Date(req.body.issueDate);
    if (req.body.dueDate !== undefined) {
      document.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
    }
    if (document.dueDate && document.dueDate < document.issueDate) {
      return res.status(422).json({
        success: false,
        message: "Due date cannot be earlier than the issue date",
        statusCode: 422,
      });
    }

    if (req.body.introLine !== undefined && document.docType === "quotation") {
      document.introLine = req.body.introLine;
    }
    if (req.body.notesTerms !== undefined) document.notesTerms = req.body.notesTerms;
    if (req.body.status) {
      // Same rule as the status endpoint - paid is reached by approving the tax
      // invoice, never by writing the status directly.
      if (req.body.status === "paid" && document.status !== "paid") {
        return res.status(422).json({
          success: false,
          message:
            "A document is marked paid by approving its tax invoice - that approval is what confirms the payment.",
          statusCode: 422,
        });
      }
      document.status = req.body.status;
    }

    // Any change to items or the GST flag forces a full recalculation.
    if (req.body.items || req.body.gstApplicable !== undefined) {
      const gstApplicable =
        req.body.gstApplicable === undefined
          ? document.gstApplicable
          : Boolean(req.body.gstApplicable);
      const totals = computeTotals(req.body.items || document.items, gstApplicable);
      document.items = totals.items;
      document.subTotal = totals.subTotal;
      document.gstApplicable = totals.gstApplicable;
      document.gstAmount = totals.gstAmount;
      document.totalAmount = totals.totalAmount;
      document.amountInWords = totals.amountInWords;
    }

    // Nothing is cached to invalidate - the next print picks the edit up on its
    // own. The version still moves so the audit trail keeps its numbering.
    document.version += 1;
    document.updatedBy = req.user.mongoId;
    await document.save();

    recordAudit({
      documentId: document._id,
      action: "updated",
      performedBy: req.user.mongoId,
      meta: { version: document.version, fields: Object.keys(req.body) },
    });

    const updated = await loadDocumentForRender(document._id);

    return res.status(200).json({
      success: true,
      message: "Document updated successfully",
      data: mapDocumentDetail(updated),
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Update Document:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

// Quotation -> Proforma -> Invoice. Everything in the company/client/items block is
// cloned byte-identical; only the type-specific content is swapped.
const fetchConvertDocument = async (req, res) => {
  try {
    const { toType, termsStrategy = "auto" } = req.body;

    const source = await Document.findById(req.params.id);
    if (!source) {
      return res.status(404).json({
        success: false,
        message: "Source document not found",
        statusCode: 404,
      });
    }
    if (source.docType === toType) {
      return res.status(422).json({
        success: false,
        message: `Document is already a ${toType}`,
        statusCode: 422,
      });
    }
    // The chain advances one stage at a time. Notably a quotation cannot jump
    // straight to a tax invoice - the proforma in between is what turns the
    // negotiated figure into the fixed price the client actually pays against.
    const allowedTargets = CONVERSION_TARGETS[source.docType] || [];
    if (!allowedTargets.includes(toType)) {
      const message =
        allowedTargets.length === 0
          ? "A tax invoice is the final stage and cannot be converted further"
          : `A ${DOC_LABELS[source.docType].toLowerCase()} can only become a ${DOC_LABELS[
              allowedTargets[0]
            ].toLowerCase()}. Raise the ${DOC_LABELS[
              allowedTargets[0]
            ].toLowerCase()} first, then convert that once the client has paid.`;
      return res.status(422).json({ success: false, message, statusCode: 422 });
    }
    if (source.status === "cancelled") {
      return res.status(422).json({
        success: false,
        message: "A cancelled document cannot be converted",
        statusCode: 422,
      });
    }

    /*
     * A job billed in installments does not move through this endpoint. Its
     * proformas are raised slice by slice from the plan, and its single closing
     * tax invoice is raised from the plan once every slice is settled - so a
     * plain conversion here would either mint a second, unplanned proforma or
     * bill the whole contract as though nothing had been paid.
     */
    if (source.billingPlan) {
      return res.status(422).json({
        success: false,
        message:
          source.docType === "proforma"
            ? `${source.docNumber} is installment ${source.installmentIndex} of a billing plan. The tax invoice for this job is raised from the plan once every installment is settled, and covers the whole contract.`
            : "This document belongs to a billing plan. Raise its installments and closing invoice from the plan instead.",
        statusCode: 422,
      });
    }
    if (source.docType === "quotation") {
      const plan = await BillingPlan.findOne({
        sourceDocument: source._id,
        status: { $ne: "cancelled" },
      })
        .select("baseDocNumber")
        .lean();
      if (plan) {
        return res.status(422).json({
          success: false,
          message: `This quotation is billed in installments under plan ${plan.baseDocNumber}. Raise the next installment from the plan rather than converting it.`,
          statusCode: 422,
        });
      }
    }

    const alreadyConverted = await Document.findOne({
      convertedFrom: source._id,
      docType: toType,
    })
      .select("_id docNumber")
      .lean();
    if (alreadyConverted) {
      return res.status(422).json({
        success: false,
        message: `This document was already converted to a ${toType} (${alreadyConverted.docNumber})`,
        statusCode: 422,
      });
    }

    const company = await Company.findById(source.company).lean();
    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found", statusCode: 404 });
    }

    const client = await Client.findById(source.client).select("gstin").lean();
    if (!client || !client.gstin) {
      return res.status(422).json({
        success: false,
        message: "Client GSTIN is required before converting to a proforma or tax invoice",
        statusCode: 422,
      });
    }

    const issueDate = req.body.issueDate ? new Date(req.body.issueDate) : source.issueDate;

    // Documents reuse a number only when they remain in the same series. With MCP
    // proformas and MCI tax invoices, conversion mints the target series number.
    const requestedSerialNumber = req.body.serialNumber
      ? Number(req.body.serialNumber)
      : null;
    if (requestedSerialNumber) {
      const yearKey = getYearKey(toType, issueDate);
      const docNumber = buildDocNumber(toType, yearKey, requestedSerialNumber);
      const existing = await Document.findOne({ docType: toType, docNumber })
        .select("_id")
        .lean();
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Document number ${docNumber} already exists`,
          statusCode: 409,
        });
      }
    }

    const sameSeries = DOC_PREFIX[source.docType] === DOC_PREFIX[toType];
    const numbering = sameSeries
      ? {
          docNumber: source.docNumber,
          yearKey: source.financialYearOrYear,
          serialNumber: source.serialNumber,
        }
      : requestedSerialNumber
        ? await commitSerialNumber(toType, source.company, issueDate, requestedSerialNumber)
        : await commitNextNumber(toType, source.company, issueDate);

    const sourceTerms = source.notesTerms || "";
    const sourceDefault = (company.defaultTerms && company.defaultTerms[source.docType]) || "";
    const targetDefault = (company.defaultTerms && company.defaultTerms[toType]) || "";
    // "auto" swaps the standard clause set only when the user never edited it.
    const wasDefaultTerms = sourceTerms === sourceDefault;
    let notesTerms = sourceTerms;
    if (termsStrategy === "swap") notesTerms = targetDefault;
    else if (termsStrategy === "auto" && wasDefaultTerms) notesTerms = targetDefault;

    const gstApplicable = toType !== "quotation";
    const totals = computeTotals(source.items, gstApplicable);

    const newDocument = await Document.create({
      docType: toType,
      docLabel: DOC_LABELS[toType],
      docNumber: numbering.docNumber,
      financialYearOrYear: numbering.yearKey,
      serialNumber: numbering.serialNumber,
      company: source.company,
      client: source.client,
      issueDate,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : source.dueDate,
      // The enquiry-reference line belongs to quotations only.
      introLine: "",
      items: totals.items,
      subTotal: totals.subTotal,
      gstApplicable: totals.gstApplicable,
      gstAmount: totals.gstAmount,
      totalAmount: totals.totalAmount,
      amountInWords: totals.amountInWords,
      notesTerms,
      status: "draft",
      version: 1,
      convertedFrom: source._id,
      createdBy: req.user.mongoId,
      updatedBy: req.user.mongoId,
    });

    source.convertedTo.push(newDocument._id);
    await source.save();

    recordAudit({
      documentId: newDocument._id,
      action: "converted",
      performedBy: req.user.mongoId,
      meta: {
        fromId: String(source._id),
        fromType: source.docType,
        toType,
        reusedDocNumber: sameSeries,
        termsStrategy,
        termsWereCustom: !wasDefaultTerms,
      },
    });

    const created = await loadDocumentForRender(newDocument._id);

    return res.status(201).json({
      success: true,
      message: `Converted to ${DOC_LABELS[toType]} successfully`,
      data: {
        ...mapDocumentDetail(created),
        conversion: {
          reusedDocNumber: sameSeries,
          termsWereCustom: !wasDefaultTerms,
          termsStrategyApplied: termsStrategy,
        },
      },
      statusCode: 201,
    });
  } catch (error) {
    console.error("Error Convert Document:", error.message);
    if (error.code === 11000) {
      return res.status(422).json({
        success: false,
        message: "A document with this number and type already exists",
        statusCode: 422,
      });
    }
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchUpdateDocumentStatus = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res
        .status(404)
        .json({ success: false, message: "Document not found", statusCode: 404 });
    }

    // Payment is recorded by approving the tax invoice, which settles both it and
    // its proforma in one action. Setting it by hand would let the two disagree.
    if (req.body.status === "paid" && document.status !== "paid") {
      return res.status(422).json({
        success: false,
        message:
          "A document is marked paid by approving its tax invoice - that approval is what confirms the payment.",
        statusCode: 422,
      });
    }

    // Cancelling a slice by hand would strand its percentage on the plan, so it
    // goes through the plan's own cancel action instead.
    if (req.body.status === "cancelled" && document.billingPlan) {
      return res.status(422).json({
        success: false,
        message:
          "This document belongs to a billing plan. Cancel it from the plan so its share of the contract is released.",
        statusCode: 422,
      });
    }

    const previousStatus = document.status;
    document.status = req.body.status;
    document.updatedBy = req.user.mongoId;
    await document.save();

    recordAudit({
      documentId: document._id,
      action: "status_changed",
      performedBy: req.user.mongoId,
      meta: { from: previousStatus, to: document.status },
    });

    return res.status(200).json({
      success: true,
      message: "Document status updated successfully",
      data: { _id: document._id, status: document.status },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Update Document Status:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

// Returns the same Handlebars output the PDF is printed from, so the on-screen
// preview and the downloaded file can never drift apart.
const fetchPreviewHtml = async (req, res) => {
  try {
    const document = await loadDocumentForRender(req.params.id);
    if (!document) {
      return res
        .status(404)
        .json({ success: false, message: "Document not found", statusCode: 404 });
    }

    const html = renderHtml(document, "html", readSeparatePricingOption(req));
    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error) {
    console.error("Error Preview Document Html:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/*
 * Prints the document on the spot and streams the bytes back. There is no stored
 * file to serve or to invalidate: whatever the document, letterhead and
 * signature say right now is what comes down the wire, which is the same source
 * the on-screen preview renders from.
 */
const fetchDownloadDocument = async (req, res) => {
  try {
    const document = await loadDocumentForRender(req.params.id);
    if (!document) {
      return res
        .status(404)
        .json({ success: false, message: "Document not found", statusCode: 404 });
    }
    if (!document.items || document.items.length === 0) {
      return res.status(422).json({
        success: false,
        message: "At least one item is required before printing a PDF",
        statusCode: 422,
      });
    }

    const buffer = await renderPdfBuffer(document, readSeparatePricingOption(req));

    // Handing over the file is the moment a draft stops being one - it is the
    // first point at which the document can leave the building.
    if (document.status === "draft") {
      await Document.findByIdAndUpdate(document._id, {
        status: "generated",
        updatedBy: req.user.mongoId,
      });
      recordAudit({
        documentId: document._id,
        action: "pdf_generated",
        performedBy: req.user.mongoId,
        meta: { docNumber: document.docNumber, version: document.version },
      });
    }

    const downloadName = `${sanitizeFileName(document.docNumber)}-${document.docType}.pdf`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${downloadName}"`,
      "Content-Length": buffer.length,
      // A rendered document is only ever as current as this request.
      "Cache-Control": "no-store",
    });
    return res.status(200).send(buffer);
  } catch (error) {
    console.error("Error Download Document:", error.message);
    return res.status(500).json({
      success: false,
      message: `PDF generation failed: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Full Quotation -> Proforma -> Invoice chain for the history screen.
const fetchDocumentChain = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id).select("_id").lean();
    if (!document) {
      return res
        .status(404)
        .json({ success: false, message: "Document not found", statusCode: 404 });
    }

    // Walk to the head of the chain, then collect every descendant.
    let rootId = document._id;
    for (let depth = 0; depth < 10; depth += 1) {
      const current = await Document.findById(rootId).select("convertedFrom").lean();
      if (!current || !current.convertedFrom) break;
      rootId = current.convertedFrom;
    }

    const chain = [];
    let frontier = [rootId];
    for (let depth = 0; depth < 10 && frontier.length; depth += 1) {
      const level = await Document.find({ _id: { $in: frontier } })
        .populate("company", COMPANY_LIST_FIELDS)
        .populate("client", CLIENT_LIST_FIELDS)
        .sort({ createdAt: 1 })
        .lean();
      chain.push(...level.map(mapDocumentListItem));
      frontier = level.flatMap((item) => item.convertedTo || []);
    }

    return res.status(200).json({
      success: true,
      message: "Document chain fetched successfully",
      data: { rootId, chain },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get Document Chain:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

// Only an unconverted draft can be removed. Anything further along is cancelled
// instead, so the numbering series and audit trail stay intact.
const fetchDeleteDocument = async (req, res) => {
  try {
    const user = await User.findById(req.user.mongoId).select("role");
    if (!user || user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only an admin can delete a document",
        statusCode: 403,
      });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res
        .status(404)
        .json({ success: false, message: "Document not found", statusCode: 404 });
    }

    /*
     * A document inside a billing plan is not deleted on its own - the plan
     * holds the percentages, and removing a slice here would leave the plan
     * allocating less than 100% with nothing to say why. The plan's own cancel
     * actions do it properly, returning the percentage to the pool.
     */
    if (document.billingPlan) {
      return res.status(422).json({
        success: false,
        message:
          document.billingMode === "partial"
            ? `${document.docNumber} is installment ${document.installmentIndex} of a billing plan. Cancel it from the plan so its share of the contract is released.`
            : `${document.docNumber} closes a billing plan and cannot be removed on its own.`,
        statusCode: 422,
      });
    }

    if (document.status !== "draft" || (document.convertedTo || []).length > 0) {
      document.status = "cancelled";
      document.updatedBy = req.user.mongoId;
      await document.save();

      recordAudit({
        documentId: document._id,
        action: "status_changed",
        performedBy: req.user.mongoId,
        meta: { to: "cancelled", reason: "delete requested on a non-draft document" },
      });

      return res.status(200).json({
        success: true,
        message: "Document is no longer a draft, so it was cancelled instead of deleted",
        data: { _id: document._id, status: "cancelled", softDeleted: true },
        statusCode: 200,
      });
    }

    if (document.convertedFrom) {
      await Document.findByIdAndUpdate(document.convertedFrom, {
        $pull: { convertedTo: document._id },
      });
    }
    await document.deleteOne();
    const numberReleased = await releaseSequenceIfLatest(
      document.docType,
      document.company,
      document.issueDate,
      document.serialNumber
    );

    recordAudit({
      documentId: document._id,
      action: "deleted",
      performedBy: req.user.mongoId,
      meta: {
        docNumber: document.docNumber,
        docType: document.docType,
        numberReleased,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully",
      data: { _id: document._id, softDeleted: false, numberReleased },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Delete Document:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

/* ------------------------------ Approval flow ------------------------------ */

const fetchSubmitForApproval = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res
        .status(404)
        .json({ success: false, message: "Document not found", statusCode: 404 });
    }
    if (document.status === "cancelled") {
      return res.status(422).json({
        success: false,
        message: "A cancelled document cannot be sent for approval",
        statusCode: 422,
      });
    }
    if (document.approvalStatus === "pending") {
      return res.status(422).json({
        success: false,
        message: "This document is already awaiting approval",
        statusCode: 422,
      });
    }
    if (document.approvalStatus === "approved") {
      return res.status(422).json({
        success: false,
        message: "This document is already approved",
        statusCode: 422,
      });
    }
    if (!document.items || document.items.length === 0) {
      return res.status(422).json({
        success: false,
        message: "At least one item is required before sending for approval",
        statusCode: 422,
      });
    }

    document.approvalStatus = "pending";
    document.submittedForApprovalAt = new Date();
    document.submittedBy = req.user.mongoId;
    // A resubmission clears the previous rejection so the reviewer starts clean.
    document.rejectionReason = "";
    document.rejectedAt = null;
    document.rejectedBy = null;
    document.updatedBy = req.user.mongoId;
    if (document.status === "draft") document.status = "generated";
    await document.save();

    recordAudit({
      documentId: document._id,
      action: "submitted_for_approval",
      performedBy: req.user.mongoId,
      meta: { docNumber: document.docNumber },
    });

    const updated = await loadDocumentForRender(document._id);
    sendApprovalRequestEmail(updated, req.user).catch((error) => {
      console.error("Approval Request Email Hook Error:", error.message);
    });

    return res.status(200).json({
      success: true,
      message: "Document sent for approval",
      data: mapDocumentDetail(updated),
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Submit For Approval:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchApproveDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res
        .status(404)
        .json({ success: false, message: "Document not found", statusCode: 404 });
    }
    if (document.approvalStatus !== "pending") {
      return res.status(422).json({
        success: false,
        message: `Only a document awaiting approval can be approved (this one is ${document.approvalStatus})`,
        statusCode: 422,
      });
    }

    // The signature is either uploaded with this request or taken from the
    // company's saved authorised signature. One of the two must exist.
    let signaturePath = "";
    if (req.file) {
      signaturePath = await compressImageToDataUrl(req.file, "signatures");
    } else {
      const company = await Company.findById(document.company)
        .select("signatureUrl")
        .lean();
      signaturePath = company?.signatureUrl || "";
    }

    if (!signaturePath) {
      return res.status(422).json({
        success: false,
        message:
          "A signature is required to approve. Upload one here, or save an authorised signature on the company first.",
        statusCode: 422,
      });
    }

    const approvedAt = new Date();
    document.approvalStatus = "approved";
    document.approvedAt = approvedAt;
    document.approvedBy = req.user.mongoId;
    document.signatureUrl = signaturePath;
    document.isSigned = true;
    document.rejectionReason = "";
    document.updatedBy = req.user.mongoId;

    // A tax invoice is only ever raised once the client has settled, so signing
    // it is the moment payment is confirmed. The proforma it came from is
    // settled at the same time - it is the same money, billed once.
    const settlesPayment = document.docType === "invoice";
    if (settlesPayment) {
      document.status = "paid";
      document.paidAt = approvedAt;
      document.paymentConfirmedBy = req.user.mongoId;
    }
    await document.save();

    /*
     * Which proformas this invoice settles.
     *
     * An ordinary invoice settles the one proforma it was converted from. An
     * invoice closing a billing plan settles every installment proforma behind
     * it - they are already paid slice by slice, so this is the final state
     * change rather than a money movement, and it closes the plan with them.
     */
    if (settlesPayment) {
      const settledIds = document.billingPlan
        ? (document.coveredProformas || [])
        : document.convertedFrom
        ? [document.convertedFrom]
        : [];

      if (settledIds.length > 0) {
        await Document.updateMany(
          {
            _id: { $in: settledIds },
            docType: "proforma",
            status: { $ne: "cancelled" },
          },
          {
            status: "paid",
            paidAt: approvedAt,
            paymentConfirmedBy: req.user.mongoId,
            updatedBy: req.user.mongoId,
          }
        );
        settledIds.forEach((settledId) => {
          recordAudit({
            documentId: settledId,
            action: "status_changed",
            performedBy: req.user.mongoId,
            meta: {
              to: "paid",
              reason: `tax invoice ${document.docNumber} was approved, confirming payment`,
            },
          });
        });
      }

      if (document.billingPlan) {
        await closePlanOnInvoiceApproval(
          document.billingPlan,
          approvedAt,
          req.user.mongoId
        );
        recordAudit({
          documentId: document._id,
          entityType: "billing_plan",
          entityId: document.billingPlan,
          action: "billing_plan_invoiced",
          performedBy: req.user.mongoId,
          meta: {
            docNumber: document.docNumber,
            installmentsSettled: settledIds.length,
          },
        });
      }
    }

    recordAudit({
      documentId: document._id,
      action: "approved",
      performedBy: req.user.mongoId,
      meta: {
        docNumber: document.docNumber,
        signatureUploaded: Boolean(req.file),
        paymentConfirmed: settlesPayment,
      },
    });

    const updated = await loadDocumentForRender(document._id);
    sendDocumentApprovedEmail(updated, req.user).catch((error) => {
      console.error("Document Approved Email Hook Error:", error.message);
    });

    return res.status(200).json({
      success: true,
      message: settlesPayment
        ? document.billingPlan
          ? "Tax invoice approved and signed. Every installment behind it is settled, so the billing plan is now closed."
          : "Tax invoice approved and signed. Payment is confirmed, so the invoice and its proforma are now marked paid."
        : "Document approved and signed",
      data: mapDocumentDetail(updated),
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Approve Document:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchRejectDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res
        .status(404)
        .json({ success: false, message: "Document not found", statusCode: 404 });
    }
    if (document.approvalStatus !== "pending") {
      return res.status(422).json({
        success: false,
        message: `Only a document awaiting approval can be rejected (this one is ${document.approvalStatus})`,
        statusCode: 422,
      });
    }

    document.approvalStatus = "rejected";
    document.rejectedAt = new Date();
    document.rejectedBy = req.user.mongoId;
    document.rejectionReason = req.body.rejectionReason;
    // A rejected document never carries a signature.
    document.signatureUrl = "";
    document.isSigned = false;
    document.updatedBy = req.user.mongoId;
    await document.save();

    recordAudit({
      documentId: document._id,
      action: "rejected",
      performedBy: req.user.mongoId,
      meta: { docNumber: document.docNumber, reason: document.rejectionReason },
    });

    const updated = await loadDocumentForRender(document._id);
    return res.status(200).json({
      success: true,
      message: "Document rejected",
      data: mapDocumentDetail(updated),
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Reject Document:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

module.exports = {
  fetchNextNumber,
  fetchCreateDocument,
  fetchAllDocuments,
  fetchDocumentDetail,
  fetchUpdateDocument,
  fetchConvertDocument,
  fetchUpdateDocumentStatus,
  fetchPreviewHtml,
  fetchDownloadDocument,
  fetchDocumentChain,
  fetchDeleteDocument,
  fetchSubmitForApproval,
  fetchApproveDocument,
  fetchRejectDocument,
};
