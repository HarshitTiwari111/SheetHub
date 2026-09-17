const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefresh,
  hashToken,
  refreshTokenDurationMs,
} = require('../utils/token');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { audit } = require('../utils/audit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
  message: { message: 'Too many auth attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: process.env.COOKIE_SECURE === 'true' ? 'none' : 'lax',
  secure: process.env.COOKIE_SECURE === 'true',
  domain: process.env.COOKIE_DOMAIN || undefined,
  maxAge: refreshTokenDurationMs(),
  path: '/api/auth',
});

const issueTokens = async (user, req, res) => {
  const accessToken = signAccessToken(user._id, user.role);
  const refreshToken = signRefreshToken(user._id);
  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    expiresAt: new Date(Date.now() + refreshTokenDurationMs()),
  });
  res.cookie('rt', refreshToken, cookieOptions());
  return accessToken;
};

router.post(
  '/login',
  authLimiter,
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 1, max: 200 }),
  validate,
  async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.active) {
      audit(req, { action: 'auth.login', status: 'failure', details: { email, reason: 'no-user-or-inactive' } });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isLocked()) {
      audit(req, { action: 'auth.login', status: 'failure', details: { email, reason: 'locked' } });
      return res.status(423).json({ message: 'Account temporarily locked. Try again later.' });
    }

    const ok = await user.matchPassword(password);
    if (!ok) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      audit(req, { action: 'auth.login', status: 'failure', details: { email, reason: 'bad-password' } });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip;
    await user.save();

    const accessToken = await issueTokens(user, req, res);
    audit(req, { action: 'auth.login' });
    res.json({ token: accessToken, user });
  }
);

router.post('/refresh', async (req, res) => {
  const token = req.cookies?.rt;
  if (!token) return res.status(401).json({ message: 'Missing refresh token' });
  try {
    const decoded = verifyRefresh(token);
    const record = await RefreshToken.findOne({ tokenHash: hashToken(token) });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    const user = await User.findById(decoded.id);
    if (!user || !user.active) return res.status(401).json({ message: 'User inactive' });

    // Rotate refresh token
    record.revokedAt = new Date();
    await record.save();
    const accessToken = await issueTokens(user, req, res);
    res.json({ token: accessToken, user });
  } catch {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
});

router.post('/logout', async (req, res) => {
  const token = req.cookies?.rt;
  if (token) {
    await RefreshToken.updateOne({ tokenHash: hashToken(token) }, { $set: { revokedAt: new Date() } });
  }
  res.clearCookie('rt', { path: '/api/auth' });
  if (req.user) audit(req, { action: 'auth.logout' });
  res.json({ message: 'Logged out' });
});

router.get('/me', protect, (req, res) => {
  res.json({ user: req.user });
});

router.put(
  '/change-password',
  protect,
  body('oldPassword').isString().isLength({ min: 1 }),
  body('newPassword').isString().isLength({ min: 6, max: 200 }),
  validate,
  async (req, res) => {
    const user = await User.findById(req.user._id).select('+password');
    const ok = await user.matchPassword(req.body.oldPassword);
    if (!ok) {
      audit(req, { action: 'auth.change_password', status: 'failure' });
      return res.status(400).json({ message: 'Old password incorrect' });
    }
    user.password = req.body.newPassword;
    await user.save();
    // Revoke all refresh tokens for this user
    await RefreshToken.updateMany(
      { user: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    audit(req, { action: 'auth.change_password' });
    res.json({ message: 'Password changed. Please log in again.' });
  }
);

module.exports = router;
