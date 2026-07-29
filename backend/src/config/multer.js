/**
 * Multer configuration for file uploads
 */
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const UPLOAD_BASE = path.join(__dirname, '../../..', 'uploads');

function makeStorage(subDir) {
  const dir = path.join(UPLOAD_BASE, subDir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase();
      const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, name);
    },
  });
}

const ALLOWED_IMAGE_TYPES = /jpeg|jpg|png|gif|webp/;

function imageFilter(req, file, cb) {
  const extOk  = ALLOWED_IMAGE_TYPES.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = ALLOWED_IMAGE_TYPES.test(file.mimetype);
  if (extOk && mimeOk) cb(null, true);
  else cb(new Error('Only image files are allowed (jpg, png, gif, webp).'));
}

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5 MB

const uploadAvatar     = multer({ storage: makeStorage('avatars'),     fileFilter: imageFilter, limits: { fileSize: MAX_SIZE } });
const uploadAttrImage  = multer({ storage: makeStorage('attractions'), fileFilter: imageFilter, limits: { fileSize: MAX_SIZE } });
const uploadPayment    = multer({ storage: makeStorage('payments'),    fileFilter: imageFilter, limits: { fileSize: MAX_SIZE } });

module.exports = { uploadAvatar, uploadAttrImage, uploadPayment };
