const mysql = require('mysql2');
require('dotenv').config();

console.log('Database config check:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? 'SET' : 'MISSING');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
});

// Test database connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    console.error('Error code:', err.code);
    console.error('Error number:', err.errno);
  } else {
    console.log('Database connected successfully');
    connection.release();
  }
});

module.exports = pool.promise();
