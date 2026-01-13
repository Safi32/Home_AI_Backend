require('dotenv').config();
const express = require('express');
const { body, validationResult } = require('express-validator');
const { getUserByEmail } = require('./src/modals/user_modal');
const bcrypt = require('bcrypt');
const { otpStore, OTP_EXPIRY_MINUTES } = require('./src/utils/otp_store');
const { sendOtpEmail } = require('./src/utils/emailService');

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
    await sendOtpEmail(email, otp, OTP_EXPIRY_MINUTES);

    console.log('Registration successful');
    return res.status(201).json({
      success: true,
      message: "Registration successful. OTP sent to your email for verification."
    });

  } catch (err) {
    console.error("Error in registerUser:", err);
    console.error("Error stack:", err.stack);
    return res.status(500).json({ message: "Server error" });
  }
};

// Create test app
const app = express();
app.use(express.json());

// Test endpoint
app.post('/test-register', [
  body("username").notEmpty().withMessage("Username is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
], registerUser);

// Test the registration
async function testRegistration() {
  const testData = {
    username: "testuser",
    email: "test@example.com",
    password: "password123"
  };

  try {
    console.log('Testing registration with data:', testData);
    
    // Mock request and response
    const req = { body: testData };
    const res = {
      status: (code) => ({
        json: (data) => {
          console.log(`Response ${code}:`, data);
          return data;
        }
      })
    };

    await registerUser(req, res);
    console.log('✅ Registration test completed successfully');
  } catch (error) {
    console.error('❌ Registration test failed:', error.message);
    console.error('Error stack:', error.stack);
  }
}

testRegistration();
