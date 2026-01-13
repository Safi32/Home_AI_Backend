const nodemailer = require("nodemailer");

// Railway-specific email configuration
const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  service: process.env.SMTP_SERVICE || "gmail",
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  },
  // Add connection settings for Railway
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  // Add timeout settings
  connectionTimeout: 60000,
  greetingTimeout: 30000,
  socketTimeout: 60000,
});

const fromAddress = `${process.env.SMTP_FROM_NAME || "HomeAI"} <${process.env.SMTP_USER || process.env.EMAIL_USER}>`;

/**
 * Sends an OTP email to the specified email address
 * @param {string} to - Recipient email address
 * @param {string} otp - The OTP to send
 * @param {number} expiryMinutes - Number of minutes until the OTP expires
 */
const sendOtpEmail = async (to, otp, expiryMinutes) => {
  const mailOptions = {
    from: fromAddress,
    to,
    subject: 'Your OTP for HomeAI',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a90e2;">Your One-Time Password (OTP)</h2>
        <p>Your OTP for verification is: <strong>${otp}</strong></p>
        <p>This OTP will expire in ${expiryMinutes} minutes.</p>
        <p>If you didn't request this OTP, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply to this email.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

module.exports = {
  sendOtpEmail,
};