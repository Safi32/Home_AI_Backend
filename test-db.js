require('dotenv').config();
const mysql = require('mysql2/promise');

async function testDBConnection() {
  try {
    console.log('Testing database connection...');
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_USER:', process.env.DB_USER);
    console.log('DB_NAME:', process.env.DB_NAME);
    console.log('DB_PORT:', process.env.DB_PORT);
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 10000,
    });
    
    console.log('✅ Database connection successful');
    
    // Test if user table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'user'");
    console.log('User table exists:', tables.length > 0);
    
    if (tables.length > 0) {
      // Test user table structure
      const [columns] = await connection.execute("DESCRIBE user");
      console.log('User table columns:', columns.map(col => col.Field));
    }
    
    await connection.end();
    console.log('✅ Database test completed');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error number:', error.errno);
  }
}

testDBConnection();
