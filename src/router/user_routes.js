const express = require("express");
const router = express.Router();
const { registerUser, loginUser, resetPassword, sendOtp, verifyOtp } = require("../controller/user_controller");
const { body } = require("express-validator");
const authenticate = require("../middleware/middleware");

router.post(
  "/register",
  [
    body("username").notEmpty().withMessage("Username is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  registerUser
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  loginUser
);

router.post(
  "/send-otp",
  [
    body("email").isEmail().withMessage("Valid email is required"),
  ],
  sendOtp
);

router.post(
  "/verify-otp",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("otp")
      .isLength({ min: 6, max: 6 })
      .withMessage("OTP must be a 6-digit code"),
  ],
  verifyOtp
);

// Reset Password Route (Protected)
router.post(
  "/reset-password",
  authenticate,
  [
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
    body("confirmPassword")
      .notEmpty()
      .withMessage("Confirm password is required"),
  ],
  resetPassword
);

module.exports = router;