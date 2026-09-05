const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const nodemailer = require("nodemailer");

const smtpPort = Number(process.env.HOSTINGER_SMTP_PORT || 465);

const noReplyTransporter = nodemailer.createTransport({
  host: process.env.HOSTINGER_SMTP_HOST || "smtp.hostinger.com",
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.HOSTINGER_EMAIL_USER,
    pass: process.env.HOSTINGER_EMAIL_PASSWORD,
  },
});

module.exports = { noReplyTransporter };
