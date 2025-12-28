const { validationResult } = require("express-validator");
const { getUserByEmail, verifyUserEmail, createUser } = require("../modals/user_modal");
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

    const { otp: storedOtp, expiresAt, userData } = record;

    // Check if OTP is expired
    if (new Date() > expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({
        success: false,
        message: "OTP expired"
      });
    }

    // Verify OTP matches
    if (storedOtp.toString() !== otp.toString()) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid OTP" 
      });
    }

    try {
      // Check if user already exists
      const existingUser = await getUserByEmail(email);

      if (existingUser) {
        // If user exists but email is not verified, just verify it
        if (!existingUser.isEmailVerified) {
          await verifyUserEmail(email);
          otpStore.delete(email);

          return res.status(200).json({
            success: true,
            message: "Email verified successfully"
          });
        } else {
          // User already exists and is verified
          otpStore.delete(email);
          return res.status(400).json({
            success: false,
            message: "User already exists and is verified"
          });
        }
      }

      // Validate userData before creating user
      if (!userData || !userData.email || !userData.password) {
        console.error("Invalid userData:", userData);
        return res.status(400).json({
          success: false,
          message: "Invalid user data stored in OTP record"
        });
      }

      // Create the user in the database
      const result = await createUser(userData);
      console.log("User created successfully:", result);

      // Verify the user's email
      await verifyUserEmail(email);
      console.log("Email verified successfully for:", email);
      
      // Clear the OTP after successful verification and user creation
      otpStore.delete(email);

      return res.status(200).json({ 
        success: true,
        message: "Email verified successfully",
        userId: result.insertId || result.id
      });

    } catch (error) {
      console.error("Error verifying email - Full error:", error);
      console.error("Error stack:", error.stack);
      console.error("User data attempted:", userData);

      // More specific error messages
      let errorMessage = "Failed to verify email";

      if (error.code === 'ER_DUP_ENTRY') {
        errorMessage = "User with this email already exists";
      } else if (error.code === 'ER_NO_SUCH_TABLE') {
        errorMessage = "Database table not found";
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = "Database connection failed";
      }

      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        errorCode: process.env.NODE_ENV === 'development' ? error.code : undefined
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