const { getUserByEmail, updateUserPassword } = require("../modals/user_modal");
const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");

const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "New password and confirm password do not match",
      });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      // For security, don't reveal if email exists
      return res.status(200).json({
        message: "If an account with that email exists, password has been reset"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(user.id, hashedPassword);

    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (err) {
    console.error("Password reset error:", err);
    res.status(500).json({
      message: "An error occurred while resetting password"
    });
  }
};

module.exports = {
  resetPassword
};