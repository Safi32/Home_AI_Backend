const db = require('../config/database');

const createImage = async (imageData) => {
    const { originalname, url, public_id, format, bytes, userId } = imageData;
    
    const [result] = await db.query(
        `INSERT INTO images 
        (original_name, url, public_id, format, size_bytes, user_id, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [originalname, url, public_id, format, bytes, userId]
    );
    
    return result.insertId;
};

const getImageById = async (imageId, userId) => {
    const [rows] = await db.query(
        `SELECT id, original_name, url, public_id, format, size_bytes, created_at 
         FROM images 
         WHERE id = ? AND user_id = ?`,
        [imageId, userId]
    );
    return rows[0];
};

const getUserImages = async (userId) => {
    const [rows] = await db.query(
        `SELECT id, original_name, url, public_id, format, size_bytes, created_at 
         FROM images 
         WHERE user_id = ? 
         ORDER BY created_at DESC`,
        [userId]
    );
    return rows;
};

const deleteImage = async (imageId, userId) => {
    // First get the image to return it after deletion
    const image = await getImageById(imageId, userId);
    if (!image) return null;
    
    await db.query(
        'DELETE FROM images WHERE id = ? AND user_id = ?',
        [imageId, userId]
    );
    
    return image; // Return the deleted image data (including public_id for Cloudinary cleanup if needed)
};

module.exports = {
    createImage,
    getImageById,
    getUserImages,
    deleteImage
};
