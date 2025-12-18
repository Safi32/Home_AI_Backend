const {
  getUserByEmail,
  getUserById,
  updateUserPassword,
  updateUserProfile
} = require("../modals/user_modal");
const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const cloudinary = require('cloudinary').v2;
const { cleanupFile } = require('../utils/fileUtils');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const updateProfile = async (req, res) => {
  try {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      cleanupFile(req.file?.path);
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.userId;
    const { username, email, password } = req.body;
    let profilePictureUrl = null;
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

    const currentUser = await getUserById(userId);
    if (!currentUser) {
      cleanupFile(req.file?.path);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

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
        cleanupFile(req.file.path);
      }
    }

    if (email && email !== currentUser.email) {
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use by another account'
        });
      }
    }

    const updateData = {};
    if (username && username !== currentUser.username) {
      updateData.username = username.trim();
    }
    if (email && email !== currentUser.email) {
      updateData.email = email;
    }
    if (profilePictureUrl) {
      updateData.profile_picture = profilePictureUrl;
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await updateUserPassword(userId, hashedPassword);
    }

    const response = {
      success: true,
      message: 'Profile updated successfully'
    };

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
      const freshUser = await getUserById(userId);
      response.user = {
        id: freshUser.id,
        username: freshUser.username,
        email: freshUser.email,
        profile_picture: freshUser.profile_picture,
        created_at: freshUser.created_at
      };
    } else {
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
    cleanupFile(req.file?.path);

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB'
      });
    } else if (error.message.includes('File type not supported')) {
      return res.status(400).json({
        success: false,
        message: 'Only image files are allowed (JPEG, PNG, etc.)'
      });
    } else if (error.message.includes('already in use')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    } else if (error.message.includes('No valid fields to update')) {
      return res.status(400).json({
        success: false,
        message: 'No changes to update'
      });
    }

    console.error('Unexpected error updating profile:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while updating your profile. Please try again.'
    });
  }
};

module.exports = {
  updateProfile,
};