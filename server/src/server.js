require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const sheetRoutes = require('./routes/sheet.routes');
const auditRoutes = require('./routes/audit.routes');
const User = require('./models/User');

async function ensureAdminUser() {
  const email = (process.env.ADMIN_EMAIL || process.env.SUPER_ADMIN_EMAIL || 'admin@sheethub.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || process.env.SUPER_ADMIN_NAME || 'Admin';
  if (!password) {
    console.warn('ADMIN_PASSWORD not set — skipping auto-seed');
    return;
  }
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      console.log('Existing user promoted to admin:', email);
    }
    return;
  }
  await User.create({ name, email, password, role: 'admin' });
  console.log('Admin user auto-seeded:', email);
}

const app = express();

app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5273',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Prevent NoSQL injection
app.use(mongoSanitize({ replaceWith: '_' }));

// Global rate limiter
app.use(rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
}));

app.get('/', (req, res) => res.json({ ok: true, name: 'SheetHub API', version: '2.0' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sheets', sheetRoutes);
app.use('/api/audit', auditRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5100;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sheethub';

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    try {
      await ensureAdminUser();
    } catch (err) {
      console.error('Admin auto-seed failed:', err.message);
    }
    app.listen(PORT, () => console.log(`SheetHub API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
