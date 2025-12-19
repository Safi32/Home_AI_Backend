const { uploadFile } = require('../utils/fileUpload');
const imageModel = require('../modals/image_model');

const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Check if user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please log in to upload images.'
            });
        }

        // Upload to Cloudinary
        const uploadResult = await uploadFile(req.file);

        // Save to database
        const imageData = {
            originalname: req.file.originalname,
            url: uploadResult.url,
            public_id: uploadResult.public_id,
            format: uploadResult.format,
            bytes: uploadResult.bytes,
            userId: req.user.id
        };

        const imageId = await imageModel.createImage(imageData);
        const savedImage = await imageModel.getImageById(imageId, req.user.id);
        
        res.status(200).json({
            success: true,
            message: 'Image uploaded successfully',
            data: savedImage
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading image',
            error: error.message
        });
    }
};

const getUserImages = async (req, res) => {
    try {
        const images = await imageModel.getUserImages(req.user.id);
        res.status(200).json({
            success: true,
            data: images
        });
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching images',
            error: error.message
        });
    }
};

const deleteImage = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedImage = await imageModel.deleteImage(id, req.user.id);

        if (!deletedImage) {
            return res.status(404).json({
                success: false,
                message: 'Image not found or access denied'
            });
        }

        // Optional: Delete from Cloudinary as well
        // const cloudinary = require('cloudinary').v2;
        // await cloudinary.uploader.destroy(deletedImage.public_id);

        res.status(200).json({
            success: true,
            message: 'Image deleted successfully',
            data: deletedImage
        });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting image',
            error: error.message
        });
    }
};

module.exports = {
    uploadImage,
    getUserImages,
    deleteImage
};
