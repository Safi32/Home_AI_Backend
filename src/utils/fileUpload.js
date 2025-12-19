const cloudinary = require('cloudinary').v2;
const { promisify } = require('util');
const fs = require('fs');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadFile = async (file) => {
    try {
        if (!file) {
            throw new Error('No file provided');
        }

        const result = await cloudinary.uploader.upload(file.path, {
            folder: 'home_ai',
            resource_type: 'auto'
        });

        await promisify(fs.unlink)(file.path);

        return {
            url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            bytes: result.bytes
        };
    } catch (error) {
        if (file && file.path) {
            await promisify(fs.unlink)(file.path).catch(console.error);
        }
        throw error;
    }
};

module.exports = {
    uploadFile
};
