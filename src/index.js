const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise"); // Promise-based MySQL
const userRoutes = require("./router/user_routes");
const imageRoutes = require("./router/imageRoutes");

dotenv.config();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create Express app
const app = express();
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Serve uploads
app.use("/uploads", express.static(uploadsDir));

// Health check endpoint
app.get("/health", async (req, res) => {
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

    res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.status = 'error';
    healthcheck.error = error.message;
    healthcheck.database = 'connection failed';
    res.status(503).json(healthcheck);
  }
});

// Root endpoint
app.get("/", (req, res) => {
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
});

// Database connection
let db;
async function connectDB() {
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    console.log("✅ Database connected successfully");
    app.locals.db = db; // make DB available in routes
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
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
  } catch (err) {
    console.error("Error loading routes:", err);
  }
}

// Error handler
app.use((err, req, res, next) => {
  console.error("🔥 Error handler triggered:", err.stack);
  res.status(500).json({ success: false, message: err.message || "Something went wrong!" });
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ message: "Route not found" });
});

// Function to find an available port
const getAvailablePort = async (startPort) => {
  const net = require('net');
  const server = net.createServer();

  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${port} is in use, trying ${port + 1}...`);
          tryPort(port + 1);
        } else {
          reject(err);
        }
      });

      server.once('listening', () => {
        server.close(() => resolve(port));
      });

      server.listen(port, '0.0.0.0');
    };

    tryPort(startPort);
  });
};

// Start server only after DB connection and routes loaded
async function startServer() {
  try {
    await connectDB();
    await loadRoutes();

    // Start with a different default port to avoid conflicts
    const DEFAULT_PORT = 3001; // Changed from 3000 to 3001
    const PORT = process.env.PORT || await getAvailablePort(DEFAULT_PORT);

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`🌐 Local URL: http://localhost:${PORT}`);
      console.log(`🌍 Network URL: http://0.0.0.0:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔄 API Base URL: http://localhost:${PORT}/api`);
    });

    // Handle server errors
    server.on('error', async (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is in use, trying next available port...`);
        // Try again with the next port
        const newPort = await getAvailablePort(PORT + 1);
        startServerWithPort(newPort);
      } else {
        console.error('❌ Server error:', error);
        process.exit(1);
      }
    });

    // Helper function to start server with specific port
    function startServerWithPort(port) {
      const newServer = app.listen(port, "0.0.0.0", () => {
        console.log(`✅ Server is running on port ${port}`);
        console.log(`🌐 Local URL: http://localhost:${port}`);
        console.log(`🌍 Network URL: http://0.0.0.0:${port}`);
        console.log(`📊 Health check: http://localhost:${port}/health`);
        console.log(`🔄 API Base URL: http://localhost:${port}/api`);
      });

      newServer.on('error', (err) => {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
      });
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
