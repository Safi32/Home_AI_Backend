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
      console.log('User already exists');
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
    const emailSent = await sendOtpEmail(email, otp, OTP_EXPIRY_MINUTES);

    console.log('Registration successful');
    const response = {
      success: true,
      message: emailSent
        ? "Registration successful. OTP sent to your email for verification."
        : "Registration successful. Email service not configured. See logs for OTP.",
      email: email
    };

    // Include OTP in response if email failed (for development/testing)
    if (!emailSent || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      response.otp = otp;
      response.otpExpiresIn = `${OTP_EXPIRY_MINUTES} minutes`;
      response.note = "Email service not configured. Use this OTP for verification.";
    }

    return res.status(201).json(response);

  } catch (err) {
    console.error("Error in registerUser:", err);
    console.error("Error stack:", err.stack);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  registerUser
};
