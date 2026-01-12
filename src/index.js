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

// Health check endpoint for Railway
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Root endpoint
app.get("/", (req, res) => res.send("API is running!"));

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

// Start server only after DB connection and routes loaded
async function startServer() {
  await connectDB();
  await loadRoutes();

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
}

startServer();
