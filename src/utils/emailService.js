const nodemailer = require("nodemailer");

// Railway-specific email configuration
const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';

console.log('Email service configuration:');
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('Is Railway:', isRailway);

const transporter = nodemailer.createTransport({
  // Use explicit SMTP settings for Railway
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // Use STARTTLS for port 587
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  },
  // Railway-specific connection settings
  connectionTimeout: 60000, // 1 minute
  greetingTimeout: 30000,   // 30 seconds
  socketTimeout: 60000,     // 1 minute
  // Disable pooling for Railway to avoid connection issues
  pool: false,
  // Add TLS settings
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  },
  // Debug mode for Railway
  debug: isRailway,
  logger: isRailway
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