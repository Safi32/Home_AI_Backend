const { validationResult } = require("express-validator");
const { sendOtpEmail } = require("../utils/emailService");
const { otpStore, OTP_EXPIRY_MINUTES } = require("../utils/otp_store");
const fs = require('fs');

/**
 * Generates a random 4-digit OTP
 * @returns {string} 4-digit OTP
 */
const generateOtp = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Cleans up temporary files
 * @param {string} filePath - Path to the file to be deleted
 */
const cleanupFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Error cleaning up file:', err);
  }
};

/**
 * Handles sending OTP to the user's email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { email } = req.body;

    // Generate OTP and set expiration
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP in memory
    otpStore.set(email, { otp, expiresAt });

    // Send OTP via email
    await sendOtpEmail(email, otp, OTP_EXPIRY_MINUTES);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email address"
    });
  } catch (err) {
    console.error("Error in sendOtp:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

module.exports = {
  sendOtp,
  generateOtp,
  cleanupFile
}