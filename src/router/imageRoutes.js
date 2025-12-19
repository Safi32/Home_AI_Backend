const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadImage, getUserImages, deleteImage } = require('../controller/imageController');
const authMiddleware = require('../middleware/middleware');

// Debug middleware to log headers
router.use((req, res, next) => {
    console.log('Request Headers:', req.headers);
    next();
});

// Apply auth middleware to all routes
router.use(authMiddleware);

// Debug route to test authentication
router.get('/test-auth', (req, res) => {
    console.log('User from token:', req.user);
    res.json({
        success: true,
        message: 'You are authenticated!',
        user: req.user
    });
});

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Routes
router.post('/upload', upload.single('image'), uploadImage);
router.get('/', getUserImages);
router.delete('/:id', deleteImage);

module.exports = router;