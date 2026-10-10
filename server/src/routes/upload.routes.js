const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xssFilters = require('xss');
const { protect } = require('../middleware/auth');
const { audit } = require('../utils/audit');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'application/json',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'application/pdf',
]);

// Dangerous extensions blocklist
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.dll', '.bat', '.cmd', '.sh', '.php', '.php3', '.phtml',
  '.js', '.html', '.htm', '.vbs', '.ps1', '.jar', '.scr', '.msi',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return cb(new Error('Security Risk: Uploading executable or script files is prohibited.'));
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error(`Invalid file type (${file.mimetype}). Allowed types: CSV, JSON, TXT, Excel, PNG, JPG, PDF.`));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
});

router.use(protect);

router.post('/', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      audit(req, { action: 'upload.file', status: 'failure', details: { error: err.message } });
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    // Sanitize original filename
    const sanitizedOriginalName = xssFilters(req.file.originalname);

    audit(req, {
      action: 'upload.file',
      details: {
        filename: req.file.filename,
        originalName: sanitizedOriginalName,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });

    res.status(201).json({
      message: 'File uploaded securely.',
      file: {
        filename: req.file.filename,
        originalName: sanitizedOriginalName,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: `/uploads/${req.file.filename}`,
      },
    });
  });
});

module.exports = router;
