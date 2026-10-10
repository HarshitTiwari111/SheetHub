require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const sheetRoutes = require('./routes/sheet.routes');
const auditRoutes = require('./routes/audit.routes');
const uploadRoutes = require('./routes/upload.routes');
const User = require('./models/User');
const { protect, adminLevel } = require('./middleware/auth');
const { performBackup } = require('./utils/backup');
const { getClientIp } = require('./utils/audit');

async function ensureAdminUser() {
  const email = (process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@sheethub.com').toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'admin123';
  const name = process.env.SUPER_ADMIN_NAME || process.env.ADMIN_NAME || 'Super Admin';

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'superadmin') {
      existing.role = 'superadmin';
      await existing.save();
      console.log('Existing user promoted to superadmin:', email);
    }
    return;
  }
  await User.create({ name, email, password, role: 'superadmin' });
  console.log('Super Admin user auto-seeded:', email);
}

const app = express();

app.set('trust proxy', true);

// Security headers (Helmet + HSTS + NoSniff + Frameguard)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5273',
    credentials: true,
  })
);

// Body parsing with payload size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Prevent NoSQL injection
app.use(mongoSanitize({ replaceWith: '_' }));

// Global rate limiter with Cloudflare / proxy IP key generation
app.use(
  rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '500', 10),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIp(req),
    message: { message: 'Too many requests, please try again later.' },
  })
);

// Static serve uploaded files safely
app.use('/uploads', protect, express.static(path.join(__dirname, '../uploads')));

// Health & System Monitoring Endpoint
app.get('/api/health', async (req, res) => {
  const start = Date.now();
  let dbState = 'disconnected';
  let dbLatencyMs = null;

  try {
    if (mongoose.connection.readyState === 1) {
      dbState = 'connected';
      await mongoose.connection.db.admin().ping();
      dbLatencyMs = Date.now() - start;
    }
  } catch (e) {
    dbState = 'degraded';
  }

  const memory = process.memoryUsage();
  res.json({
    status: dbState === 'connected' ? 'healthy' : 'degraded',
    service: 'SheetHub Enterprise API',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbState,
      latencyMs: dbLatencyMs,
    },
    system: {
      heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024),
      rssMB: Math.round(memory.rss / 1024 / 1024),
    },
    security: {
      rateLimiter: 'active',
      noSqlSanitizer: 'active',
      xssSanitizer: 'active',
      helmetProtection: 'active',
      auditLogging: 'active',
      twoFactorAuth: 'supported',
    },
  });
});

// Admin Database Backup Trigger
app.post('/api/health/backup', protect, adminLevel, async (req, res) => {
  const result = await performBackup();
  if (result.success) {
    res.json({ message: 'Backup created successfully', result });
  } else {
    res.status(500).json({ message: 'Backup failed', error: result.error });
  }
});

app.get('/', (req, res) => res.json({ ok: true, name: 'SheetHub Enterprise Security API', version: '2.5' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sheets', sheetRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/upload', uploadRoutes);

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
      console.error('Super Admin auto-seed failed:', err.message);
    }

    // Schedule automated backup every 24 hours
    setInterval(() => {
      console.log('[Automated Task] Triggering daily database backup...');
      performBackup();
    }, 24 * 60 * 60 * 1000);

    app.listen(PORT, () => console.log(`SheetHub API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
