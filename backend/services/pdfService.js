const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const puppeteer = require("puppeteer");

const { DOC_LABELS, DUE_DATE_LABELS, GST_PERCENT } = require("../config/constants");
const { formatDisplayDate } = require("../utils/dateHelper");
const { formatAmount, round2 } = require("../utils/moneyHelper");
const { toAbsolutePublicPath, toPublicUrl } = require("../utils/fileHelper");

const TEMPLATES_DIR = path.join(__dirname, "..", "templates");

const templateCache = {};
let browserPromise = null;
let partialsRegistered = false;

const registerPartials = () => {
  if (partialsRegistered) return;
  const partialsDir = path.join(TEMPLATES_DIR, "partials");
  fs.readdirSync(partialsDir)
    .filter((file) => file.endsWith(".hbs"))
    .forEach((file) => {
      const name = path.basename(file, ".hbs");
      handlebars.registerPartial(
        name,
        fs.readFileSync(path.join(partialsDir, file), "utf8")
      );
    });
  partialsRegistered = true;
};

const getTemplate = (templateName) => {
  registerPartials();
  if (!templateCache[templateName]) {
    const source = fs.readFileSync(
      path.join(TEMPLATES_DIR, `${templateName}.hbs`),
      "utf8"
    );
    templateCache[templateName] = handlebars.compile(source);
  }
  return templateCache[templateName];
};

// Quotation has its own lighter template. Proforma and Tax Invoice share one.
const templateForDocType = (docType) =>
  docType === "quotation" ? "quotation" : "invoice";

const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

// Puppeteer renders from setContent with no origin, so local images must be inlined.
const toEmbeddedImage = (publicPath) => {
  if (!publicPath) return "";
  if (/^data:/i.test(publicPath)) return publicPath;
  try {
    const absolutePath = toAbsolutePublicPath(publicPath);
    if (!fs.existsSync(absolutePath)) return "";
    const mime = MIME_BY_EXT[path.extname(absolutePath).toLowerCase()];
    if (!mime) return "";
    return `data:${mime};base64,${fs.readFileSync(absolutePath).toString("base64")}`;
  } catch (error) {
    console.error("Embed Image Error:", error.message);
    return "";
  }
};

/*
 * Split-billing block for an installment proforma.
 *
 * The items table on a slice still prints the WHOLE scope of work - the client
 * is buying all of it - so without this block the line amounts would sum to the
 * contract value while the payable figure showed half of it. This is what
 * explains the gap on the page rather than over the phone.
 *
 * Everything here is read off the document itself, never off the plan, so the
 * preview and the printed file stay identical to what was saved.
 */
const buildInstallmentBlock = (document) => {
  if (document.billingMode !== "partial" || !document.installmentIndex) return null;

  const contractTotal = Number(document.contractTotal) || 0;
  const previouslyBilled = Number(document.previouslyBilledTotal) || 0;
  const balance = round2(contractTotal - previouslyBilled - document.totalAmount);

  return {
    index: document.installmentIndex,
    count: document.installmentCount,
    percent: document.installmentPercent,
    label: document.installmentLabel || "",
    // "Installment 1 of 2" - printed under the document title.
    caption: document.installmentCount
      ? `Installment ${document.installmentIndex} of ${document.installmentCount}`
      : `Installment ${document.installmentIndex}`,
    contractTotalFormatted: formatAmount(contractTotal),
    previouslyBilledFormatted: formatAmount(previouslyBilled),
    balanceFormatted: formatAmount(balance),
    hasBalance: balance > 0,
    hasPreviouslyBilled: previouslyBilled > 0,
  };
};

/*
 * Settlement block for the single tax invoice that closes a split-billed job.
 * It is raised for the full contract value after the installments have been
 * paid, so it prints the schedule it settles and nets the payable down to what
 * is genuinely still outstanding - normally zero.
 */
const buildSettlementBlock = (document) => {
  const rows = document.settledInstallments || [];
  if (rows.length === 0) return null;

  const received = Number(document.previouslyBilledTotal) || 0;
  const netPayable = round2((Number(document.totalAmount) || 0) - received);

  return {
    rows: rows.map((row) => ({
      label: row.label || `Installment ${row.index}`,
      docNumber: row.docNumber,
      percent: row.percent,
      amountFormatted: formatAmount(row.totalAmount),
      paidOnFormatted: formatDisplayDate(row.paidAt),
    })),
    receivedFormatted: formatAmount(received),
    netPayableFormatted: formatAmount(netPayable),
    isFullySettled: netPayable <= 0,
  };
};

// mode "pdf" inlines images as data URIs; mode "html" links absolute public URLs so
// the browser preview and the PDF render from the exact same template and data.
const buildViewModel = (document, mode = "pdf") => {
  const company = document.company || {};
  const client = document.client || {};
  const bank = company.bankDetails || {};
  const isQuotation = document.docType === "quotation";
  const resolveImage = mode === "pdf" ? toEmbeddedImage : toPublicUrl;

  const showDiscountColumn = (document.items || []).some(
    (item) => Number(item.discountPercent) > 0
  );

  const items = (document.items || []).map((item, idx) => ({
    index: idx + 1,
    description: item.description,
    unit: item.unit,
    qty: item.qty,
    // An en dash reads as "no discount"; a printed 0 reads as a rate someone set.
    discountPercent: Number(item.discountPercent) > 0 ? item.discountPercent : "–",
    unitPriceFormatted: formatAmount(item.unitPrice),
    amountFormatted: formatAmount(item.amount),
  }));

  return {
    docType: document.docType,
    docLabel: document.docLabel || DOC_LABELS[document.docType],
    docNumber: document.docNumber,
    docNumberLabel: isQuotation ? "Quotation No" : "Invoice No",
    issueDateFormatted: formatDisplayDate(document.issueDate),
    dueDateFormatted: formatDisplayDate(document.dueDate),
    dueDateLabel: DUE_DATE_LABELS[document.docType],
    placeOfSupply: client.stateCode || company.stateCode || "-",
    introLine: isQuotation ? document.introLine || "" : "",
    // Buyer GSTIN is hidden on quotations even when the client record has one.
    showBuyerGstin: !isQuotation && Boolean(client.gstin),
    company: {
      name: company.name,
      address: company.address,
      gstin: company.gstin,
      pan: company.pan,
      stateCode: company.stateCode,
      email: company.email,
      phone: company.phone,
      logoUrl: resolveImage(company.logoUrl),
      // The signature comes from the DOCUMENT, not the company, and only once an
      // admin has approved it. This single line is what guarantees an unapproved
      // document can never render an authorised signature - the preview endpoint
      // and the PDF generator both render through here.
      signatureUrl:
        document.approvalStatus === "approved" && document.signatureUrl
          ? resolveImage(document.signatureUrl)
          : "",
    },
    client: {
      name: client.name,
      address: client.address,
      gstin: client.gstin,
      contactPerson: client.contactPerson,
    },
    bank: {
      accountName: bank.accountName,
      accountNumber: bank.accountNumber,
      ifsc: bank.ifsc,
      bankName: bank.bankName,
      branch: bank.branch,
      bankGstin: bank.bankGstin,
    },
    items,
    showDiscountColumn,
    gstApplicable: document.gstApplicable,
    gstPercent: GST_PERCENT,
    subTotalFormatted: formatAmount(document.subTotal),
    gstAmountFormatted: formatAmount(document.gstAmount),
    totalAmountFormatted: formatAmount(document.totalAmount),
    amountInWords: document.amountInWords,
    notesTerms: document.notesTerms,
    termsTitle: isQuotation ? "Terms & Conditions" : "Notes / Terms & Conditions",
    // Both are null on an ordinary document, so the template renders exactly
    // what it always did.
    installment: buildInstallmentBlock(document),
    settlement: buildSettlementBlock(document),
  };
};

const wrapHtml = (body) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
${body}
</html>`;

// The preview endpoint and the PDF generator both call this, which is what
// guarantees the on-screen preview is byte-identical to the printed document.
const renderHtml = (document, mode = "pdf") => {
  const template = getTemplate(templateForDocType(document.docType));
  return wrapHtml(`<body>${template(buildViewModel(document, mode))}</body>`);
};

const getBrowser = async () => {
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({
        headless: "new",
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      })
      .catch((error) => {
        browserPromise = null;
        throw error;
      });
  }
  return browserPromise;
};

const closeBrowser = async () => {
  if (!browserPromise) return;
  try {
    const browser = await browserPromise;
    await browser.close();
  } catch (error) {
    console.error("Puppeteer Close Error:", error.message);
  }
  browserPromise = null;
};

/*
 * Page numbering lives in the print footer rather than the document body, so a
 * two page invoice says so on both pages. Chrome renders this fragment in its
 * own context - no stylesheet from the page reaches it, hence the inline style.
 */
const PDF_FOOTER_TEMPLATE = `
  <div style="width:100%;padding:0 12mm;font-family:Helvetica,Arial,sans-serif;
              font-size:7.5px;letter-spacing:0.4px;color:#7c8798;text-align:right;">
    Page <span class="pageNumber"></span> of <span class="totalPages"></span>
  </div>`;

/*
 * Renders the document to an A4 PDF and returns the bytes. Nothing is written to
 * disk: a stored file is a copy that goes stale the moment the document, the
 * company letterhead or the signature changes, so every request re-renders from
 * the current state instead.
 */
const renderPdfBuffer = async (document) => {
  const html = renderHtml(document, "pdf");
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: "networkidle0" });
    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: false,
      /*
       * The margin belongs to the print job, not the markup. CSS padding on the
       * page container only pads the first and last page, so a document that
       * runs to three pages would print the middle one edge to edge.
       */
      margin: { top: "14mm", right: "12mm", bottom: "14mm", left: "12mm" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: PDF_FOOTER_TEMPLATE,
    });

    return Buffer.from(buffer);
  } finally {
    await page.close().catch(() => {});
  }
};

module.exports = {
  renderHtml,
  renderPdfBuffer,
  buildViewModel,
  templateForDocType,
  closeBrowser,
};
