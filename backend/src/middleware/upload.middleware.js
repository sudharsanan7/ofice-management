const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../uploads/company');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage engine with cryptographic random filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const randomHex = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo_${randomHex}${ext}`);
  }
});

// Strict MIME and Extension validator
const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (!allowedExtensions.includes(ext) || !allowedMimeTypes.includes(mime)) {
    const error = new Error('Invalid file format. Only PNG, JPG, and WebP images are allowed.');
    error.statusCode = 400;
    return cb(error, false);
  }

  cb(null, true);
};

// 2MB file size limit
const uploadLogo = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2 Megabytes
  },
  fileFilter
});

module.exports = {
  uploadLogo
};
