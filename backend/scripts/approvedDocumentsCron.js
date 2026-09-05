const cron = require("node-cron");
const { sendMonthlyApprovedDocumentsEmail } = require("../mailer/documentMailer");

const DEFAULT_CRON = "0 9 30 * *";
const DEFAULT_TIMEZONE = "Asia/Kolkata";

let approvedDocumentsCronTask = null;

const startApprovedDocumentsCron = () => {
  if (approvedDocumentsCronTask) return approvedDocumentsCronTask;
  if (process.env.DISABLE_APPROVED_DOCUMENTS_CRON === "true") return null;

  const schedule = process.env.APPROVED_DOCUMENTS_CRON || DEFAULT_CRON;
  const timezone = process.env.APPROVED_DOCUMENTS_CRON_TIMEZONE || DEFAULT_TIMEZONE;

  approvedDocumentsCronTask = cron.schedule(
    schedule,
    async () => {
      try {
        const now = new Date();
        const fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        await sendMonthlyApprovedDocumentsEmail({ fromDate, toDate: now });
      } catch (error) {
        console.error("Approved Documents Cron Error:", error.message);
      }
    },
    { timezone }
  );

  console.log(
    `Approved documents monthly email cron scheduled: ${schedule} (${timezone})`
  );
  return approvedDocumentsCronTask;
};

module.exports = { startApprovedDocumentsCron };
