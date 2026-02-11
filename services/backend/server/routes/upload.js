const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const asyncHandler = require('express-async-handler');
const auth = require('../middleware/auth');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

// Upload single image to Cloudinary
router.post(
  '/image',
  auth(['seller', 'admin']),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload image to Cloudinary from buffer
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'material_mover_uploads', // Optional: organize uploads in a folder
          // Eager transformation to create a thumbnail
          eager: [{ width: 400, height: 300, crop: 'pad' }],
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    res.json({
      message: 'File uploaded successfully to Cloudinary',
      url: result.secure_url,
      thumbnail_url: result.eager[0].secure_url,
      public_id: result.public_id,
    });
  })
);

module.exports = router;
