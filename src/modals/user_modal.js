const db = require('../config/database');

const getUserByEmail = async (email) => {
    const [rows] = await db.query("SELECT * FROM user WHERE email = ?", [email]);
    return rows[0];
};

const getUserById = async (userId) => {
    const [rows] = await db.query("SELECT * FROM user WHERE id = ?", [userId]);
    return rows[0];
};

const updateUserPassword = async (userId, hashedPassword) => {
    await db.query(
        "UPDATE user SET password = ? WHERE id = ?",
        [hashedPassword, userId]
    );
};

const setResetToken = async (userId, token, expiresAt) => {
    await db.query(
        "UPDATE user SET resetToken = ?, resetTokenExpire = ? WHERE id = ?",
        [token, expiresAt, userId]
    );
};

// Use the existing resetToken / resetTokenExpire columns to store OTP metadata by email.
const updateUserOtp = async (email, otpCode, expiresAt) => {
    await db.query(
        "UPDATE user SET resetToken = ?, resetTokenExpire = ? WHERE email = ?",
        [otpCode, expiresAt, email]
    );
};

const clearUserOtp = async (email) => {
    await db.query(
        "UPDATE user SET resetToken = NULL, resetTokenExpire = NULL WHERE email = ?",
        [email]
    );
};

const createUser = async (user) => {
    const { username, email, password } = user;
    const sql = "INSERT INTO user (username, email, password) VALUES (?, ?, ?)";
    const [result] = await db.query(sql, [username, email, password]);
    return result;
};

module.exports = {
    getUserByEmail,
    getUserById,
    createUser,
    setResetToken,
    updateUserPassword,
    updateUserOtp,
    clearUserOtp,
};