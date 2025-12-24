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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP and user data in memory
    otpStore.set(email, {
      otp,
      expiresAt,
      userData: {
        username,
        email,
        password: hashedPassword
      }
    });

    // Send OTP email using Resend
    await sendOtpEmail(email, otp, OTP_EXPIRY_MINUTES);

    return res.status(201).json({
      success: true,
      message: "Registration successful. OTP sent to your email for verification."
    });

  } catch (err) {
    console.error("Error in registerUser:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  registerUser
};
