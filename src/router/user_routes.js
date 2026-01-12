const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const multer = require('multer');
const authenticate = require("../middleware/middleware");
const upload = require('../middleware/upload');

const { registerUser } = require("../controller/register_user");
const { loginUser } = require("../controller/login_user");
const { resetPassword } = require("../controller/reset_password");
const { sendOtp } = require("../controller/send_otp");
const { verifyOtp } = require("../controller/verify_otp");
const { updateProfile } = require("../controller/user_controller");

router.post(
  "/register",
  [
    body("username").notEmpty().withMessage("Username is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  (req, res, next) => {
    console.log('Register route hit!');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    registerUser(req, res, next);
  }
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
    body("email").isEmail(),
    body("otp").isLength({ min: 4, max: 4 })
  ],
  verifyOtp
);

router.post(
  "/reset-password",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
    body("confirmPassword")
      .notEmpty()
      .withMessage("Confirm password is required"),
  ],
  resetPassword
);

router.put(
  '/profile',
  authenticate,
  (req, res, next) => {
    upload.single('profile_picture')(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      } else if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error uploading file'
        });
      }
      next();
    });
  },
  [
    body('username').optional().trim().notEmpty(),
    body('email').optional().isEmail(),
    body('password').optional().isLength({ min: 6 })
  ],
  updateProfile
);

module.exports = router;