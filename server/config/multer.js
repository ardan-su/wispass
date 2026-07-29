/**
 * Multer configuration for file uploads
 */
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    let subDir = 'misc';
    if (req.baseUrl.includes('attraction')) subDir = 'attractions';
    if (req.baseUrl.includes('user') || req.baseUrl.includes('profile')) subDir = 'avatars';
    if (req.baseUrl.includes('payment')) subDir = 'payments';
    const dest = path.join(UPLOAD_ROOT, subDir);
    ensureDir(dest);
    cb(null, dest);
  },
  filename(req, file, cb) {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext  = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
});

module.exports = upload;
