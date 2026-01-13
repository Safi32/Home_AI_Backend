const mysql = require('mysql2');
require('dotenv').config();

console.log('Database config check:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? 'SET' : 'MISSING');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Railway-specific database configuration
const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';

const poolConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  // Add connection pooling settings for production
  connectionLimit: 10,
  acquireTimeout: 60000,
  // Enable SSL for Railway (required for production)
  ssl: isRailway ? {
    rejectUnauthorized: false
  } : false
};

console.log('Database config:', {
  ...poolConfig,
  password: poolConfig.password ? 'SET' : 'MISSING',
  ssl: poolConfig.ssl
});

const pool = mysql.createPool(poolConfig);

// Test database connection (non-blocking, in background)
// Don't block module loading - connection will happen when needed
setTimeout(() => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Database pool connection test failed:', err.message);
      console.error('Error code:', err.code);
      console.error('Error number:', err.errno);
      // Don't exit - pool will retry when needed
    } else {
      console.log('Database pool connection test successful');
      connection.release();
    }
  });
}, 100); // Small delay to not block startup

module.exports = pool.promise();
