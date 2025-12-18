const { validationResult } = require("express-validator");
const { getUserByEmail, verifyUserEmail } = require("../modals/user_modal");
const { otpStore } = require("../utils/otp_store");

const verifyOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;

    // Get the OTP record from store
    const record = otpStore.get(email);
    if (!record) {
      return res.status(400).json({ 
        success: false,
        message: "No OTP request found for this email" 
      });
    }

    const { otp: storedOtp, expiresAt } = record;

    if (new Date() > expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP expired" });
    }

// In verify_otp.js, update the comparison to:
    if (storedOtp.toString() !== otp.toString()) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid OTP" 
      });
    }

    try {
      // Verify the user's email using the dedicated function
      await verifyUserEmail(email);
      
      // Clear the OTP after successful verification
      otpStore.delete(email);

      return res.status(200).json({ 
        success: true,
        message: "Email verified successfully" 
      });
    } catch (error) {
      console.error("Error verifying email:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to verify email",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during OTP verification",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = { verifyOtp };
