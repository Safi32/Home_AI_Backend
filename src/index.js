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

app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get("/", (req, res) => {
  res.send("API is running!");
});

app.use("/api/users", userRoutes);
app.use("/api/images", imageRoutes);

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
