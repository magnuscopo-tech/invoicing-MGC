// Sends the approved documents summary email immediately.
// Usage: node scripts/sendApprovedDocumentsEmailScript.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");
const connectDb = require("../config/db");
const { sendMonthlyApprovedDocumentsEmail } = require("../mailer/documentMailer");
const { closeBrowser } = require("../services/pdfService");

const run = async () => {
  await connectDb();

  const sent = await sendMonthlyApprovedDocumentsEmail();
  console.log(
    sent
      ? "Approved documents email sent to admin users."
      : "Approved documents email was not sent. No active admin recipients were found or the mailer failed."
  );

  await closeBrowser();
  await mongoose.connection.close();
  process.exit(sent ? 0 : 1);
};

run().catch(async (error) => {
  console.error("Send Approved Documents Email Script Error:", error.message);
  await closeBrowser().catch(() => {});
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
