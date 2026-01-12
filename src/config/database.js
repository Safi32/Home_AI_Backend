const mysql = require('mysql2');
require('dotenv').config();

console.log('DEBUG: All env vars starting with MYSQL:');
Object.keys(process.env).forEach(key => {
  if (key.startsWith('MYSQL')) {
    console.log(`${key}: ${key.includes('PASSWORD') ? '********' : process.env[key]}`);
  }
});

console.log('DEBUG: MYSQLHOST:', process.env.MYSQLHOST);
console.log('DEBUG: MYSQLUSER:', process.env.MYSQLUSER);
console.log('DEBUG: MYSQLPASSWORD:', process.env.MYSQLPASSWORD ? '********' : 'undefined');
console.log('DEBUG: MYSQLDATABASE:', process.env.MYSQLDATABASE);
console.log('DEBUG: MYSQLPORT:', process.env.MYSQLPORT);

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST,
  user: process.env.MYSQLUSER || process.env.DB_USER,
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQLDATABASE || process.env.DB_NAME,
  port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000
});

// Test database connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    console.error('Connection details:', {
      host: process.env.MYSQLHOST || process.env.DB_HOST,
      user: process.env.MYSQLUSER || process.env.DB_USER,
      database: process.env.MYSQLDATABASE || process.env.DB_NAME,
      port: process.env.MYSQLPORT || process.env.DB_PORT || 3306
    });
  } else {
    console.log('Database connected successfully');
    connection.release();
  }
});

module.exports = pool.promise();
