const { getUserByEmail, createUser } = require("../modals/user_modal");
const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const { otpStore, OTP_EXPIRY_MINUTES } = require("../utils/otp_store");
const { sendOtpEmail } = require("../utils/emailService");

// Generate a random 4-digit OTP
const generateOtp = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const registerUser = async (req, res) => {
  try {
    console.log('registerUser function called');
    console.log('Request body:', { ...req.body, password: '***' });
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Railway Environment:', process.env.RAILWAY_ENVIRONMENT);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;
    console.log('Extracted data:', { username, email, password: '***' });

    console.log('Checking if user exists...');
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      console.log('User already exists:', existingUser.email);
      return res.status(400).json({ message: "Email already registered" });
    }

    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('Generating OTP...');
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    console.log('Storing OTP...');
    otpStore.set(email, {
      otp,
      expiresAt,
      userData: {
        username,
        email,
        password: hashedPassword
      }
    });

    console.log('Sending OTP email...');
    try {
      await sendOtpEmail(email, otp, OTP_EXPIRY_MINUTES);
      console.log('OTP email sent successfully');
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError.message);
      // Continue with registration even if email fails
      console.log('Registration continuing despite email failure');
    }

    console.log('Registration successful');
    return res.status(201).json({
      success: true,
      message: "Registration successful. OTP sent to your email for verification."
    });

  } catch (err) {
    console.error("Error in registerUser:", err);
    console.error("Error message:", err.message);
    console.error("Error code:", err.code);
    console.error("Error stack:", err.stack);

    // Railway-specific error handling
    if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') {
      console.error("Production environment error detected");
      // Log additional context for Railway
      console.error("Request headers:", req.headers);
      console.error("Request IP:", req.ip);
      console.error("Request user agent:", req.get('User-Agent'));
    }

    return res.status(500).json({
      message: "Server error",
      ...(process.env.NODE_ENV === 'development' && {
        error: err.message,
        stack: err.stack
      })
    });
  }
};

module.exports = {
  registerUser
};
