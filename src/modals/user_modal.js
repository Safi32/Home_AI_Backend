const db = require('../config/database');

const getUserByEmail = async (email) => {
    const [rows] = await db.query(
        "SELECT * FROM user WHERE email = ?",
        [email]
    );
    return rows[0];
};


// const getUserByEmail = async (email) => {
//     const [rows] = await db.query("SELECT * FROM user WHERE email = ?", [email]);
//     return rows[0];
// };

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
    const sql = `
        INSERT INTO user (username, email, password, is_email_verified)
        VALUES (?, ?, ?, false)
    `;
    const [result] = await db.query(sql, [username, email, password]);
    return result;
};


// const createUser = async (user) => {
//     const { username, email, password } = user;
//     const sql = "INSERT INTO user (username, email, password) VALUES (?, ?, ?)";
//     const [result] = await db.query(sql, [username, email, password]);
//     return result;
// };

const updateUserProfile = async (userId, updateData) => {
    const { username, email, profile_picture } = updateData;
    const updates = [];
    const params = [];

    if (username) {
        updates.push('username = ?');
        params.push(username);
    }

    if (email) {
        const existingUser = await getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
            throw new Error('Email already in use');
        }
        updates.push('email = ?');
        params.push(email);
    }

    if (profile_picture) {
        updates.push('profile_picture = ?');
        params.push(profile_picture);
    }

    const query = `UPDATE user SET ${updates.join(', ')} WHERE id = ?`;
    params.push(userId);

    await db.query(query, params);

    // Return the complete updated user
    const [updatedUser] = await db.query(`
        SELECT id, username, email, profile_picture, created_at 
        FROM user 
        WHERE id = ?
    `, [userId]);

    if (!updatedUser || updatedUser.length === 0) {
        throw new Error('User not found after update');
    }

    return updatedUser[0];
};

const verifyUserEmail = async (email) => {
    await db.query(
        "UPDATE user SET is_email_verified = true WHERE email = ?",
        [email]
    );
};


module.exports = {
    getUserByEmail,
    getUserById,
    createUser,
    setResetToken,
    updateUserPassword,
    updateUserOtp,
    clearUserOtp,
    updateUserProfile,
    verifyUserEmail
};