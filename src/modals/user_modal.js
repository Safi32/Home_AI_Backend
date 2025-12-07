const db = require('../config/database');

const getUserByEmail = async (email) => {
    const sql = "SELECT * FROM user WHERE email = ?";
    const [rows] = await db.query(sql, [email]);
    return rows[0];
};

const createUser = async (user) => {
    const { username, email, password } = user;
    const sql = "INSERT INTO user (username, email, password) VALUES (?, ?, ?)";
    const [result] = await db.query(sql, [username, email, password]);
    return result;
} ;


exports.findByResetToken = async (token) => {
  const [rows] = await db.query(
    "SELECT * FROM user WHERE resetToken = ? AND resetTokenExpire > NOW()",
    [token]
  );
  return rows[0];
};

exports.updatePassword = async (userId, hashedPassword) => {
  await db.query(
    "UPDATE user SET password = ?, resetToken = NULL, resetTokenExpire = NULL WHERE id = ?",
    [hashedPassword, userId]
  );
};

module.exports = {
    getUserByEmail,
    createUser
};