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
  console.error('Stack:', reason?.stack || 'No stack trace');
  // Don't exit - log and continue to keep server running
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Log but don't exit immediately - give server a chance to handle it
  // In production, we might want to exit after logging
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

// Error handler for JSON parsing and other early middleware errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON parsing error:', err);
    return res.status(400).json({ success: false, message: 'Invalid JSON' });
  }
  next(err);
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
      // Check database connection if available (with timeout)
      if (db) {
        const dbCheckPromise = db.query('SELECT 1 as db_ok');
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database check timeout')), 2000)
        );
        
        try {
          const [rows] = await Promise.race([dbCheckPromise, timeoutPromise]);
          healthcheck.database = rows && rows[0] && rows[0].db_ok === 1 ? 'connected' : 'disconnected';
        } catch (timeoutError) {
          console.error('Database check timeout:', timeoutError);
          healthcheck.database = 'timeout';
        }
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

// Root endpoint - registered early to ensure it's always available
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
    if (!res.headersSent) {
      res.status(500).json({ 
        status: 'error', 
        message: 'Internal server error',
        error: error.message 
      });
    }
  }
});

// Simple ping endpoint for Railway health checks
app.get("/ping", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
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
    // Wrap route loading in try-catch to prevent crashes
    try {
      app.use("/api/users", userRoutes);
      console.log("User routes loaded successfully");
    } catch (userRouteError) {
      console.error("Error loading user routes:", userRouteError);
      throw userRouteError;
    }

    console.log("Loading image routes...");
    try {
      app.use("/api/images", imageRoutes);
      console.log("Image routes loaded successfully");
    } catch (imageRouteError) {
      console.error("Error loading image routes:", imageRouteError);
      throw imageRouteError;
    }

    // Simple test endpoint
    app.get("/test", (req, res) => {
      res.json({ status: "ok", message: "Test endpoint working" });
    });

    // Error handler - MUST be registered AFTER routes (this catches route errors)
    app.use((err, req, res, next) => {
      console.error("🔥 Error handler triggered:", err);
      console.error("🔥 Error message:", err.message);
      console.error("🔥 Error stack:", err.stack);
      if (!res.headersSent) {
        res.status(err.status || 500).json({ 
          success: false, 
          message: err.message || "Something went wrong!",
          ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
      } else {
        // If headers already sent, just log and end
        console.error("🔥 Headers already sent, cannot send error response");
        res.end();
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
    
    // Validate PORT
    if (!PORT || isNaN(PORT)) {
      throw new Error(`Invalid PORT: ${PORT}. PORT must be a number.`);
    }
    
    const portNumber = parseInt(PORT, 10);
    console.log(`🚀 Starting server on port ${portNumber}...`);
    console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📋 PORT from env: ${process.env.PORT}`);
    console.log(`📋 Using port: ${portNumber}`);

    // Create server and start listening
    // Railway requires binding to 0.0.0.0 to accept external connections
    const server = app.listen(portNumber, "0.0.0.0", () => {
      const address = server.address();
      console.log(`✅ Server is running on port ${portNumber}`);
      console.log(`🌐 Local URL: http://localhost:${portNumber}`);
      console.log(`🌍 Network URL: http://0.0.0.0:${portNumber}`);
      console.log(`📊 Health check: http://localhost:${portNumber}/health`);
      console.log(`🔄 API Base URL: http://localhost:${portNumber}/api`);
      console.log(`📡 Server ready to accept connections`);
      console.log(`✅ Server listening and ready for requests`);
      
      // Verify server is actually listening
      if (server.listening) {
        console.log(`✅ Server confirmed listening on port ${portNumber}`);
        console.log(`✅ Server address:`, JSON.stringify(address));
        console.log(`✅ Server family: ${address?.family || 'unknown'}`);
        console.log(`✅ Server port: ${address?.port || 'unknown'}`);
      } else {
        console.error(`❌ Server not listening!`);
        process.exit(1);
      }
      
      // Keep process alive
      console.log(`✅ Process PID: ${process.pid}`);
      console.log(`✅ Server startup complete - ready to handle requests`);
      console.log(`✅ Server will remain running - do not exit`);
    });

    // Ensure server stays alive
    server.keepAliveTimeout = 65000; // 65 seconds
    server.headersTimeout = 66000; // 66 seconds
    
    // Log when server closes
    server.on('close', () => {
      console.log('⚠️ Server closed');
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error event triggered:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${portNumber} is already in use`);
      } else {
        console.error('❌ Server error code:', error.code);
        console.error('❌ Server error message:', error.message);
        console.error('❌ Server error stack:', error.stack);
      }
      // Don't exit immediately - log and let Railway handle it
      console.error('❌ Server error - but keeping process alive for debugging');
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

// Start server and handle any startup errors
startServer().catch((error) => {
  console.error('❌ Fatal error starting server:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

// Keep process alive
process.on('beforeExit', (code) => {
  console.log(`⚠️ Process about to exit with code: ${code}`);
});

// Prevent accidental exits
process.on('exit', (code) => {
  console.log(`⚠️ Process exiting with code: ${code}`);
});
