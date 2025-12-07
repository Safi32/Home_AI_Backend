const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  resetPassword,
} = require("../controller/user_controller");
const { body } = require("express-validator");

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
  "/reset-password",
  [
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
    body("confirmPassword")
      .notEmpty()
      .withMessage("Confirm password is required"),
    body("token").notEmpty().withMessage("Reset token is required"),
  ],
  resetPassword
);

module.exports = router;
