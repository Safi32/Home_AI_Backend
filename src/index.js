const express = require("express");
const dotenv = require("dotenv");
const fs = require('fs');
const path = require('path');

// Load environment variables first
dotenv.config();

console.log('Environment check:');
console.log('DB_HOST:', process.env.DB_HOST ? 'SET' : 'MISSING');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'MISSING');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get("/", (req, res) => {
  res.send("API is running!");
});

app.get("/test", (req, res) => {
  res.json({
    message: "Test endpoint working",
    timestamp: new Date().toISOString()
  });
});

app.post("/test", (req, res) => {
  res.json({
    message: "POST test endpoint working",
    body: req.body
  });
});

// Load routes with error handling
try {
  const userRoutes = require("./router/user_routes");
  const imageRoutes = require("./router/imageRoutes");

  app.use("/api/users", userRoutes);
  app.use("/api/images", imageRoutes);
  console.log('Routes loaded successfully');
} catch (error) {
  console.error('Error loading routes:', error.message);
  console.error('Full error:', error);
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Something went wrong!'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
