const db = require('../config/database');

const getUserByEmail = async (email) => {
    const sql = "SELECT * FROM users WHERE email = ?";
    const [rows] = await db.query(sql, [email]);
    return rows[0];
};

const createUser = async (user) => {
    const { username, email, password } = user;
    const sql = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
    const [result] = await db.query(sql, [username, email, password]);
    return result;
} ;


module.exports = {
    getUserByEmail,
    createUser
};