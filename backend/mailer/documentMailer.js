const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/userModel");
const Document = require("../models/documentModel");
require("../models/companyModel");
require("../models/clientModel");
const documentApprovalTemplate = require("../emailTemplates/documents/documentApprovalTemplate");
const monthlyApprovedDocumentsTemplate = require("../emailTemplates/documents/monthlyApprovedDocumentsTemplate");
const { noReplyTransporter } = require("../config/transporter");

const { formatDisplayDate } = require("../utils/dateHelper");

const senderAddress = () =>
  process.env.HOSTINGER_EMAIL_FROM ||
  process.env.HOSTINGER_EMAIL_USER;

const uniqueEmails = (values) => [
  ...new Set(
    values
      .flat()
      .filter(Boolean)
      .map((email) => String(email).trim().toLowerCase())
      .filter(Boolean)
  ),
];

const findActiveEmailsByRole = async (role) => {
  const users = await User.find({ role, isActive: true }).select("email").lean();
  return users.map((user) => user.email);
};


const sendDocumentApprovalEmail = async ({
  document,
  actor,
  to,
  subject,
  eventLabel,
  recipientLabel,
}) => {
  const recipients = uniqueEmails(to);
  if (!recipients.length) return false;

  try {

    await noReplyTransporter.sendMail({
      from: senderAddress(),
      to: recipients,
      subject,
      html: documentApprovalTemplate({
        document,
        actor,
        eventLabel,
        recipientLabel,
      }),

    });
    return true;
  } catch (error) {
    console.error("Document Approval Email Error:", error.message);
    return false;
  }
};

const sendApprovalRequestEmail = async (document, submittedBy) => {
  const adminEmails = await findActiveEmailsByRole("admin");

  return sendDocumentApprovalEmail({
    document,
    actor: submittedBy,
    to: adminEmails,
    subject: `Approval required: ${document.docLabel} ${document.docNumber}`,
    eventLabel: "Document Sent For Approval",
    recipientLabel: "Admin",
  });
};

const sendDocumentApprovedEmail = async (document, approvedBy) => {
  const financeEmails = await findActiveEmailsByRole("finance_user");
  const adminEmails = await findActiveEmailsByRole("admin");

  return sendDocumentApprovalEmail({
    document,
    actor: approvedBy,
    to: uniqueEmails([financeEmails, adminEmails]),
    subject: `Approved: ${document.docLabel} ${document.docNumber}`,
    eventLabel: "Document Approved",
    recipientLabel: "Team",
  });
};

const sendMonthlyApprovedDocumentsEmail = async ({ fromDate, toDate } = {}) => {
  const adminEmails = await findActiveEmailsByRole("admin");
  const recipients = uniqueEmails(adminEmails);
  if (!recipients.length) return false;

  const now = new Date();
  const start = fromDate || new Date(now.getFullYear(), now.getMonth(), 1);
  const end = toDate || now;

  const documents = await Document.find({
    approvalStatus: "approved",
    approvedAt: { $gte: start, $lte: end },
  })
    .populate("company", "name gstin")
    .populate("client", "name gstin")
    .sort({ approvedAt: -1, createdAt: -1 })
    .lean();

  const totalAmount = documents.reduce(
    (sum, document) => sum + (Number(document.totalAmount) || 0),
    0
  );
  const periodLabel = `${formatDisplayDate(start)} to ${formatDisplayDate(end)}`;

  try {
    await noReplyTransporter.sendMail({
      from: senderAddress(),
      to: recipients,
      subject: `Monthly approved documents report: ${periodLabel}`,
      html: monthlyApprovedDocumentsTemplate({
        documents,
        periodLabel,
        totalAmount,
      }),
    });
    return true;
  } catch (error) {
    console.error("Monthly Approved Documents Email Error:", error.message);
    return false;
  }
};

module.exports = {
  sendApprovalRequestEmail,
  sendDocumentApprovedEmail,
  sendMonthlyApprovedDocumentsEmail,
};
