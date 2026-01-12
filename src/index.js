const express = require("express");
const userRoutes = require("./router/user_routes");
const imageRoutes = require("./router/imageRoutes");
const dotenv = require("dotenv");
const fs = require('fs');
const path = require('path');

dotenv.config();

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 8080;

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get("/", (req, res) => {
  console.log("Root endpoint hit");
  res.send("API is running!");
});

// Load routes with error handling
try {
  console.log("Loading user routes...");
  app.use("/api/users", userRoutes);
  console.log("User routes loaded successfully");

  console.log("Loading image routes...");
  app.use("/api/images", imageRoutes);
  console.log("Image routes loaded successfully");
} catch (error) {
  console.error('Error loading routes:', error.message);
  console.error('Full error:', error);
}

app.use((err, req, res, next) => {
  console.error('Error handler triggered:', err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Something went wrong!'
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
