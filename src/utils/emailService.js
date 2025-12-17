const nodemailer = require("nodemailer");

// Simple Gmail transporter using environment variables.
// Expected env vars:
// - SMTP_USER: Gmail address used to send mails
// - SMTP_PASS: Gmail App Password (NOT normal password)
// - SMTP_FROM_NAME: optional display name

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const fromAddress = `${process.env.SMTP_FROM_NAME || "HomeAI"} <${
  process.env.SMTP_USER
}>`;

/**
 * Send a one-time password (OTP) email to the user.
 * @param {string} to Recipient email address.
 * @param {string} otp The OTP code to send.
 * @param {number} expiresInMinutes Expiry time in minutes.
 */
const sendOtpEmail = async (to, otp, expiresInMinutes = 10) => {
  const mailOptions = {
    from: fromAddress,
    to,
    subject: "Your One-Time Password (OTP)",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="margin-top: 0; color: #111827;">HomeAI Verification Code</h2>
        <p style="color: #374151;">Use the following one-time password (OTP) to complete your verification:</p>
        <p style="font-size: 28px; letter-spacing: 8px; font-weight: bold; color: #111827; text-align: center; margin: 24px 0;">${otp}</p>
        <p style="color: #374151;">This code will expire in <strong>${expiresInMinutes} minutes</strong>. For your security, do not share this code with anyone.</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">If you did not request this code, you can safely ignore this email.</p>
      </div>
    `,
  };

  try {
    console.log("Attempting to send email to:", to);
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return info;
  } catch (err) {
    // Log but do NOT throw, so API can still respond with OTP for debugging.
    console.error("Failed to send OTP email:", err.message);
    return null;
  }
};

module.exports = {
  sendOtpEmail,
};