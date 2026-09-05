const { formatDisplayDate } = require("../../utils/dateHelper");
const { formatCurrency } = require("../../utils/moneyHelper");

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatUser = (user) => user?.name || user?.email || "Portal user";

const itemRows = (items = []) =>
  items
    .map(
      (item, index) => `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#374151;">${index + 1}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#111827;">${escapeHtml(item.description)}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#374151;text-align:right;">${item.qty}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#374151;text-align:right;">${formatCurrency(item.unitPrice)}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#111827;text-align:right;font-weight:600;">${formatCurrency(item.amount)}</td>
        </tr>`
    )
    .join("");

const documentApprovalTemplate = ({ document, actor, eventLabel, recipientLabel }) => `
<!DOCTYPE html>
<html>
  <body style="margin:0;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fa;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:640px;max-width:94%;background:#ffffff;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:24px 28px;border-bottom:4px solid #2563eb;">
                <div style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">MGC Invoicing Portal</div>
                <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;color:#111827;">${escapeHtml(eventLabel)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;">
                <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#374151;">
                  Hello ${escapeHtml(recipientLabel)},<br />
                  ${escapeHtml(formatUser(actor))} has updated the approval status for this document. The PDF copy is attached.
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;margin:0 0 22px;">
                  <tr>
                    <td style="padding:10px 12px;background:#f9fafb;color:#6b7280;width:38%;">Document</td>
                    <td style="padding:10px 12px;color:#111827;font-weight:600;">${escapeHtml(document.docLabel)} ${escapeHtml(document.docNumber)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px;background:#f9fafb;color:#6b7280;">Company</td>
                    <td style="padding:10px 12px;color:#111827;">${escapeHtml(document.company?.name)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px;background:#f9fafb;color:#6b7280;">Client</td>
                    <td style="padding:10px 12px;color:#111827;">${escapeHtml(document.client?.name)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px;background:#f9fafb;color:#6b7280;">Issue Date</td>
                    <td style="padding:10px 12px;color:#111827;">${formatDisplayDate(document.issueDate)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px;background:#f9fafb;color:#6b7280;">Approval Status</td>
                    <td style="padding:10px 12px;color:#111827;text-transform:capitalize;">${escapeHtml(document.approvalStatus)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 12px;background:#f9fafb;color:#6b7280;">Total Amount</td>
                    <td style="padding:10px 12px;color:#111827;font-weight:700;">${formatCurrency(document.totalAmount)}</td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #e5e7eb;">
                  <thead>
                    <tr>
                      <th align="left" style="padding:10px;background:#f3f4f6;color:#374151;font-size:12px;">#</th>
                      <th align="left" style="padding:10px;background:#f3f4f6;color:#374151;font-size:12px;">Description</th>
                      <th align="right" style="padding:10px;background:#f3f4f6;color:#374151;font-size:12px;">Qty</th>
                      <th align="right" style="padding:10px;background:#f3f4f6;color:#374151;font-size:12px;">Rate</th>
                      <th align="right" style="padding:10px;background:#f3f4f6;color:#374151;font-size:12px;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>${itemRows(document.items)}</tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#f9fafb;color:#6b7280;font-size:12px;line-height:1.5;">
                This is an automated email from the invoicing portal.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

module.exports = documentApprovalTemplate;
