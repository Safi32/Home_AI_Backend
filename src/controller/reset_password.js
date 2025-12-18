const { getUserById, updateUserPassword } = require("../modals/user_modal");
const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");

const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { newPassword, confirmPassword } = req.body;
    // FIX: Consistent userId access (using userId from JWT)
    const userId = req.user.userId;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "New password and confirm password do not match",
      });
    }

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(userId, hashedPassword);

    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  resetPassword
};