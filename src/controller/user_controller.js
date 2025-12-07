const { createUser, getUserByEmail } = require("../modals/user_modal");
const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const db = require("../config/database");

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
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await createUser({
      username,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User registered successfully",
      userId: result.insertId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { newPassword, confirmPassword, token } = req.body;

    // Check passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        errors: [{ msg: "New password and confirm password do not match" }],
      });
    }

    // Check token in DB
    const [user] = await db.query(
      "SELECT * FROM user WHERE resetToken = ? AND resetTokenExpire > NOW()",
      [token]
    );

    if (!user.length) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Invalid or expired token" }] });
    }

    const userId = user[0].id;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update DB
    await db.query(
      "UPDATE user SET password = ?, resetToken = NULL, resetTokenExpire = NULL WHERE id = ?",
      [hashedPassword, userId]
    );

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ errors: [{ msg: "Server error" }] });
  }
};

module.exports = {
  registerUser,
  loginUser,
  resetPassword,
};
