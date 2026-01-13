const { Resend } = require('resend');

// Initialize Resend with API key or null for development
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const fromAddress = process.env.RESEND_FROM_EMAIL || process.env.SMTP_USER || process.env.EMAIL_USER;
const fromName = process.env.RESEND_FROM_NAME || "HomeAI";

// Debug environment variables on startup
console.log('🔧 Email Service Configuration:');
console.log('📧 RESEND_API_KEY exists:', !!resendApiKey);
console.log('📧 RESEND_API_KEY format:', resendApiKey?.startsWith('re_') ? 'valid' : 'invalid');
console.log('📧 RESEND_FROM_EMAIL:', fromAddress);
console.log('📧 RESEND_FROM_NAME:', fromName);

/**
 * Sends an OTP email to the specified email address
 * @param {string} to - Recipient email address
 * @param {string} otp - The OTP to send
 * @param {number} expiryMinutes - Number of minutes until the OTP expires
 */
const sendOtpEmail = async (to, otp, expiryMinutes) => {
  // If no Resend API key, log OTP for development
  if (!resend) {
    console.log('🔧 DEVELOPMENT MODE - No Resend API key found');
    console.log(`📧 OTP for ${to}: ${otp}`);
    console.log(`⏰ Expires in: ${expiryMinutes} minutes`);
    return true;
  }

  // Validate from address
  if (!fromAddress || !fromAddress.includes('@')) {
    console.error('❌ Invalid from address:', fromAddress);
    console.error('❌ RESEND_FROM_EMAIL should be a full email like: noreply@yourdomain.com');
    throw new Error('Invalid sender email configuration');
  }

  // Additional validation for proper email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(fromAddress)) {
    console.error('❌ Invalid email format:', fromAddress);
    console.error('❌ Expected format: name@domain.com');
    throw new Error('Invalid sender email format');
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #4a90e2;">Your One-Time Password (OTP)</h2>
      <p>Your OTP for verification is: <strong>${otp}</strong></p>
      <p>This OTP will expire in ${expiryMinutes} minutes.</p>
      <p>If you didn't request this OTP, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply to this email.</p>
    </div>
  `;

  try {
    console.log(`📧 Attempting to send email to ${to}`);
    console.log(`📧 From address: ${fromAddress}`);
    console.log(`📧 API Key exists: ${!!resendApiKey}`);

    const { data, error } = await resend.emails.send({
      from: fromAddress.includes('<') ? fromAddress : `${fromName} <${fromAddress}>`,
      to: [to],
      subject: 'Your OTP for HomeAI',
      html: htmlContent,
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));

      // Fallback for Railway: log OTP and continue
      console.log('🔧 FALLBACK MODE - Email failed, logging OTP for Railway');
      console.log(`📧 OTP for ${to}: ${otp}`);
      console.log(`⏰ Expires in: ${expiryMinutes} minutes`);
      return true;
    }

    console.log(`✅ OTP email sent to ${to} via Resend`);
    console.log('📧 Email ID:', data.id);
    return true;
  } catch (error) {
    console.error('❌ Error sending OTP email via Resend:', error);
    console.error('❌ Error stack:', error.stack);

    // Fallback for Railway: log OTP and continue
    console.log('🔧 FALLBACK MODE - Email failed, logging OTP for Railway');
    console.log(`📧 OTP for ${to}: ${otp}`);
    console.log(`⏰ Expires in: ${expiryMinutes} minutes`);
    return true;
  }
};

module.exports = {
  sendOtpEmail,
};