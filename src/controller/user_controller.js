const {
  createUser,
  getUserByEmail,
  getUserById,
  updateUserPassword,
  updateUserProfile
} = require("../modals/user_modal");
const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const { sendOtpEmail } = require("../utils/emailService");
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

const OTP_EXPIRY_MINUTES = 10;
const otpStore = new Map();

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to clean up uploaded file
const cleanupFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Error cleaning up file:', err);
  }
};

const registerUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await createUser({
      username,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User registered successfully",
      userId: result.insertId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profile_picture: user.profile_picture
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { newPassword, confirmPassword } = req.body;
    // FIX: Consistent userId access (using userId from JWT)
    const userId = req.user.userId;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "New password and confirm password do not match",
      });
    }

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(userId, hashedPassword);

    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const sendOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    otpStore.set(email, { otp, expiresAt });

    await sendOtpEmail(email, otp, OTP_EXPIRY_MINUTES);

    return res.status(200).json({
      message: "OTP sent successfully to your email address",
    });
  } catch (err) {
    console.error("Error in sendOtp:", err);
    return res.status(500).json({
      message: "Server error",
      error: String(err),
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;

    const record = otpStore.get(email);
    if (!record) {
      return res
        .status(400)
        .json({ message: "No OTP request found for this email" });
    }

    const now = new Date();
    const { otp: storedOtp, expiresAt } = record;

    if (now > expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    if (storedOtp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    otpStore.delete(email);

    return res.status(200).json({
      message: "OTP verified successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const updateProfile = async (req, res) => {
  try {
    // FIX: Add validation check
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Clean up file if validation fails
      cleanupFile(req.file?.path);
      return res.status(400).json({ errors: errors.array() });
    }

    // FIX: Use consistent userId (matching JWT token structure)
    const userId = req.user.userId;
    const { username, email, password } = req.body;
    let profilePictureUrl = null;

    // DEBUG: Check what we received
    console.log('=== UPDATE PROFILE DEBUG ===');
    console.log('User ID:', userId);
    console.log('Request body:', req.body);
    console.log('File received:', req.file ? 'YES' : 'NO');
    if (req.file) {
      console.log('File details:', {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });
    }
    console.log('===========================');

    // Verify user exists first
    const currentUser = await getUserById(userId);
    if (!currentUser) {
      cleanupFile(req.file?.path);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Handle file upload if exists
    if (req.file) {
      console.log('File received:', {
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      try {
        console.log('Attempting Cloudinary upload...');
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'user-profiles',
          width: 500,
          height: 500,
          crop: 'limit',
          resource_type: 'image'
        });
        console.log('Cloudinary upload successful:', result.secure_url);
        profilePictureUrl = result.secure_url;
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
        cleanupFile(req.file.path);
        return res.status(500).json({
          success: false,
          message: 'Error uploading image. Please try again.'
        });
      } finally {
        // Always clean up the uploaded file
        cleanupFile(req.file.path);
      }
    }

    // FIX: Check if email is being changed to an existing email
    if (email && email !== currentUser.email) {
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use by another account'
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (username && username !== currentUser.username) {
      updateData.username = username.trim();
    }
    if (email && email !== currentUser.email) {
      updateData.email = email;
    }
    if (profilePictureUrl) {
      updateData.profilePicture = profilePictureUrl;
    }

    // Handle password update if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await updateUserPassword(userId, hashedPassword);
    }

    // Initialize response
    const response = {
      success: true,
      message: 'Profile updated successfully'
    };

    // Only update profile if there are fields to update
    if (Object.keys(updateData).length > 0) {
      const updatedUser = await updateUserProfile(userId, updateData);
      response.user = {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        profile_picture: updatedUser.profile_picture,
        created_at: updatedUser.created_at
      };
    } else if (password) {
      // If only password was updated, get fresh user data
      const freshUser = await getUserById(userId);
      response.user = {
        id: freshUser.id,
        username: freshUser.username,
        email: freshUser.email,
        profile_picture: freshUser.profile_picture,
        created_at: freshUser.created_at
      };
    } else {
      // No changes were made
      response.message = 'No changes to update';
      response.user = {
        id: currentUser.id,
        username: currentUser.username,
        email: currentUser.email,
        profile_picture: currentUser.profile_picture,
        created_at: currentUser.created_at
      };
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Update profile error:', error);
    // Clean up uploaded file if there was an error
    cleanupFile(req.file?.path);

    const statusCode = error.message.includes('already in use') ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Error updating profile'
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  resetPassword,
  sendOtp,
  verifyOtp,
  updateProfile
};