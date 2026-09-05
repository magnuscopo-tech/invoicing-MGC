const { formatDisplayDate } = require("../../utils/dateHelper");
const { formatCurrency } = require("../../utils/moneyHelper");

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const documentRows = (documents = []) =>
  documents.length
    ? documents
        .map(
          (document, index) => `
            <tr>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#374151;">${index + 1}</td>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:600;">${escapeHtml(document.docNumber)}</td>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#374151;">${escapeHtml(document.docLabel)}</td>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#374151;">${escapeHtml(document.company?.name)}</td>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#374151;">${escapeHtml(document.client?.name)}</td>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#374151;">${formatDisplayDate(document.issueDate)}</td>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#374151;">${formatDisplayDate(document.approvedAt)}</td>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#111827;text-align:right;font-weight:600;">${formatCurrency(document.totalAmount)}</td>
            </tr>`
        )
        .join("")
    : `
      <tr>
        <td colspan="8" style="padding:18px;border-bottom:1px solid #e5e7eb;color:#6b7280;text-align:center;">
          No approved documents found for this period.
        </td>
      </tr>`;

const monthlyApprovedDocumentsTemplate = ({ documents, periodLabel, totalAmount }) => `
<!DOCTYPE html>
<html>
  <body style="margin:0;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fa;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="860" cellspacing="0" cellpadding="0" style="width:860px;max-width:96%;background:#ffffff;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:24px 28px;border-bottom:4px solid #2563eb;">
                <div style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">MGC Invoicing Portal</div>
                <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;color:#111827;">Monthly Approved Documents</h1>
                <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">${escapeHtml(periodLabel)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="padding:14px;background:#f9fafb;border:1px solid #e5e7eb;">
                      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;">Approved Documents</div>
                      <div style="font-size:22px;font-weight:700;color:#111827;margin-top:4px;">${documents.length}</div>
                    </td>
                    <td style="width:16px;"></td>
                    <td style="padding:14px;background:#f9fafb;border:1px solid #e5e7eb;">
                      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;">Total Approved Value</div>
                      <div style="font-size:22px;font-weight:700;color:#111827;margin-top:4px;">${formatCurrency(totalAmount)}</div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #e5e7eb;">
                  <thead>
                    <tr>
                      <th align="left" style="padding:10px;background:#f3f4f6;color:#374151;font-size:12px;">#</th>
                      <th align="left" style="padding:10px;background:#f3f4f6;color:#374151;font-size:12px;">Document No</th>
                      <th align="left" style="padding:10px;background:#f3f4f6;color:#374151;font-size:12px;">Type</th>
                      <th align="left" style="padding:10px;background:#f3f4f6;color:#374151;font-size:12px;">Company</th>
                      <th align="left" style="padding:10px;background:#f3f4f6;color:#374151;font-size:12px;">Client</th>
                      <th align="left" style="padding:10px;background:#f3f4f6;color:#374151;font-size:12px;">Issue Date</th>
                      <th align="left" style="padding:10px;background:#f3f4f6;color:#374151;font-size:12px;">Approved On</th>
                      <th align="right" style="padding:10px;background:#f3f4f6;color:#374151;font-size:12px;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>${documentRows(documents)}</tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#f9fafb;color:#6b7280;font-size:12px;line-height:1.5;">
                This is an automated monthly email sent to active admin users.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

module.exports = monthlyApprovedDocumentsTemplate;
