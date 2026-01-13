const { getUserByEmail } = require("../modals/user_modal");
const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const loginUser = async (req, res) => {
  try {
    console.log('🔐 Login attempt started');
    console.log('📧 Email:', req.body.email);
    console.log('🔑 JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('⏰ JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    console.log('🔍 Looking up user in database...');

    const user = await getUserByEmail(email);
    if (!user) {
      console.log('❌ User not found');
      return res.status(400).json({ message: "Invalid email or password" });
    }
    console.log('✅ User found:', { id: user.id, email: user.email, verified: user.is_email_verified });

    console.log('🔑 Comparing password...');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('❌ Password mismatch');
      return res.status(400).json({ message: "Invalid email or password" });
    }
    console.log('✅ Password match successful');

    // Check if email is verified
    if (!user.is_email_verified) {
      console.log('❌ Email not verified');
      return res.status(403).json({
        message: "Please verify your email address before logging in. Check your email for the verification OTP.",
        requiresVerification: true
      });
    }

    console.log('🎫 Generating JWT token...');
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    console.log('✅ Token generated successfully');

    console.log('🎉 Login successful for user:', user.id);
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profile_picture: user.profile_picture
      },
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    console.error('❌ Error stack:', err.stack);
    console.error('❌ Error details:', {
      message: err.message,
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage
    });
    res.status(500).json({
      message: "Server error",
      ...(process.env.NODE_ENV === 'development' && {
        error: err.message,
        stack: err.stack
      })
    });
  }
};

module.exports = {
  loginUser
};