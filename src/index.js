const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise"); // Promise-based MySQL
const userRoutes = require("./router/user_routes");
const imageRoutes = require("./router/imageRoutes");

dotenv.config();

// Global error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in production, log and continue
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // In production, we might want to exit, but for now just log
  console.error('Stack:', error.stack);
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create Express app
const app = express();

// CORS middleware for Railway deployment
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Request logging with error handling
app.use((req, res, next) => {
  try {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  } catch (error) {
    console.error('Error in request logging middleware:', error);
    next();
  }
});

// Serve uploads
app.use("/uploads", express.static(uploadsDir));

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    console.log('Health check endpoint hit');
    const healthcheck = {
      status: 'server is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'unknown',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: process.memoryUsage()
    };

    try {
      // Check database connection if available
      if (db) {
        const [rows] = await db.query('SELECT 1 as db_ok');
        healthcheck.database = rows && rows[0] && rows[0].db_ok === 1 ? 'connected' : 'disconnected';
      } else {
        healthcheck.database = 'not connected';
      }
    } catch (dbError) {
      console.error('Database check error:', dbError);
      healthcheck.database = 'connection failed';
      healthcheck.dbError = dbError.message;
    }

    res.status(200).json(healthcheck);
  } catch (error) {
    console.error('Error in health check:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Health check failed',
      error: error.message 
    });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  try {
    console.log('Root endpoint hit');
    res.json({
      status: 'success',
      message: 'HomeAI API is running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        apiDocs: '/api-docs',
        users: '/api/users',
        images: '/api/images'
      }
    });
  } catch (error) {
    console.error('Error in root endpoint:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Database connection
let db;
async function connectDB() {
  try {
    // Validate required environment variables
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
      throw new Error("Missing required database environment variables (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)");
    }

    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 10000, // 10 seconds timeout
    });
    console.log("✅ Database connected successfully");
    app.locals.db = db; // make DB available in routes
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    console.error("❌ Database error details:", err);
    process.exit(1); // stop the app if DB fails
  }
}

// Load routes
async function loadRoutes() {
  try {
    console.log("Loading user routes...");
    app.use("/api/users", userRoutes);
    console.log("User routes loaded successfully");

    console.log("Loading image routes...");
    app.use("/api/images", imageRoutes);
    console.log("Image routes loaded successfully");

    // Simple test endpoint
    app.get("/test", (req, res) => {
      res.json({ status: "ok", message: "Test endpoint working" });
    });

    // Error handler - MUST be registered AFTER routes
    app.use((err, req, res, next) => {
      console.error("🔥 Error handler triggered:", err);
      console.error("🔥 Error stack:", err.stack);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: err.message || "Something went wrong!" });
      }
    });

    // 404 handler - MUST be registered LAST, after all routes
    app.use((req, res) => {
      console.log(`404 - Route not found: ${req.method} ${req.path}`);
      if (!res.headersSent) {
        res.status(404).json({ message: "Route not found" });
      }
    });
  } catch (err) {
    console.error("Error loading routes:", err);
    console.error("Error stack:", err.stack);
    throw err; // Re-throw to be caught by startServer
  }
}

// Start server only after DB connection and routes loaded
async function startServer() {
  try {
    await connectDB();
    await loadRoutes();

    // Railway provides PORT environment variable - use it directly
    // Fallback to 3000 for local development
    const PORT = process.env.PORT || 3000;

    console.log(`🚀 Starting server on port ${PORT}...`);
    console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`🌐 Local URL: http://localhost:${PORT}`);
      console.log(`🌍 Network URL: http://0.0.0.0:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔄 API Base URL: http://localhost:${PORT}/api`);
      console.log(`📡 Server ready to accept connections`);
      console.log(`✅ Server listening and ready for requests`);
      
      // Verify server is actually listening
      if (server.listening) {
        console.log(`✅ Server confirmed listening on port ${PORT}`);
      } else {
        console.error(`❌ Server not listening!`);
      }
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        if (db) {
          db.end();
        }
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        if (db) {
          db.end();
        }
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
