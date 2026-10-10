const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const jwt = require('jsonwebtoken');
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
const { audit, getClientIp } = require('../utils/audit');

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
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    userAgent,
    ip,
    expiresAt: new Date(Date.now() + refreshTokenDurationMs()),
  });
  res.cookie('rt', refreshToken, cookieOptions());
  return accessToken;
};

// Check & track device for login alerts
const checkDeviceAndAlert = async (user, req) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';

  const knownIndex = (user.knownDevices || []).findIndex(
    (d) => d.ip === ip && d.userAgent === userAgent
  );

  let isNewDevice = false;

  if (knownIndex === -1) {
    isNewDevice = true;
    user.knownDevices.push({
      ip,
      userAgent,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    });
    user.suspiciousLogins.push({
      ip,
      userAgent,
      timestamp: new Date(),
      reason: 'Login from unrecognized device or IP address',
    });
    audit(req, {
      action: 'auth.login.new_device',
      details: { email: user.email, ip, userAgent, isNewDevice: true },
    });
  } else {
    user.knownDevices[knownIndex].lastSeenAt = new Date();
  }

  return isNewDevice;
};

router.post(
  '/login',
  authLimiter,
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 1, max: 200 }),
  validate,
  async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +twoFactorSecret');
    if (!user || !user.active) {
      audit(req, { action: 'auth.login', status: 'failure', details: { email, reason: 'no-user-or-inactive' } });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isLocked()) {
      audit(req, { action: 'auth.login', status: 'failure', details: { email, reason: 'locked' } });
      return res.status(423).json({ message: 'Account temporarily locked due to failed attempts. Try again later.' });
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

    // Reset login failures
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    user.lastLoginIp = getClientIp(req);
    user.lastLoginUserAgent = req.headers['user-agent'];

    const isNewDevice = await checkDeviceAndAlert(user, req);
    await user.save();

    // If 2FA is enabled, require 2FA verification step
    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign(
        { id: user._id, type: '2fa-temp' },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '5m' }
      );
      audit(req, { action: 'auth.login.2fa_prompt', details: { email: user.email } });
      return res.json({
        twoFactorRequired: true,
        tempToken,
        message: '2FA authentication code required.',
      });
    }

    const accessToken = await issueTokens(user, req, res);
    audit(req, { action: 'auth.login', details: { isNewDevice } });
    res.json({ token: accessToken, user, newDeviceAlert: isNewDevice });
  }
);

// Verify 2FA code during login
router.post(
  '/2fa/verify-login',
  authLimiter,
  body('tempToken').isString().notEmpty(),
  body('twoFactorCode').isString().isLength({ min: 6, max: 6 }),
  validate,
  async (req, res) => {
    const { tempToken, twoFactorCode } = req.body;
    try {
      const decoded = jwt.verify(tempToken, process.env.JWT_ACCESS_SECRET);
      if (decoded.type !== '2fa-temp') {
        return res.status(401).json({ message: 'Invalid session token' });
      }

      const user = await User.findById(decoded.id).select('+twoFactorSecret');
      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return res.status(400).json({ message: '2FA not configured for user' });
      }

      const verified = authenticator.check(twoFactorCode, user.twoFactorSecret);
      if (!verified) {
        audit(req, { action: 'auth.2fa.verify_login', status: 'failure', details: { email: user.email } });
        return res.status(401).json({ message: 'Invalid 2FA authentication code' });
      }

      const accessToken = await issueTokens(user, req, res);
      audit(req, { action: 'auth.login.2fa_success', details: { email: user.email } });
      res.json({ token: accessToken, user });
    } catch {
      return res.status(401).json({ message: 'Expired or invalid 2FA session token' });
    }
  }
);

// 2FA Setup: Generate QR Code & Secret
router.post('/2fa/generate', protect, async (req, res) => {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(req.user.email, 'SheetHub', secret);
  const qrCodeUrl = await qrcode.toDataURL(otpauth);

  audit(req, { action: 'auth.2fa.generate_requested' });
  res.json({ secret, qrCodeUrl });
});

// 2FA Setup: Confirm & Enable
router.post(
  '/2fa/enable',
  protect,
  body('secret').isString().notEmpty(),
  body('twoFactorCode').isString().isLength({ min: 6, max: 6 }),
  validate,
  async (req, res) => {
    const { secret, twoFactorCode } = req.body;
    const verified = authenticator.check(twoFactorCode, secret);

    if (!verified) {
      audit(req, { action: 'auth.2fa.enable_failed', status: 'failure' });
      return res.status(400).json({ message: 'Invalid code. 2FA verification failed.' });
    }

    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    user.twoFactorEnabled = true;
    user.twoFactorSecret = secret;
    await user.save();

    audit(req, { action: 'auth.2fa.enabled' });
    res.json({ message: '2FA successfully enabled for your account.', twoFactorEnabled: true });
  }
);

// 2FA Setup: Disable
router.post(
  '/2fa/disable',
  protect,
  body('password').isString().notEmpty(),
  validate,
  async (req, res) => {
    const user = await User.findById(req.user._id).select('+password +twoFactorSecret');
    const ok = await user.matchPassword(req.body.password);
    if (!ok) {
      audit(req, { action: 'auth.2fa.disable_failed', status: 'failure' });
      return res.status(400).json({ message: 'Incorrect password.' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    audit(req, { action: 'auth.2fa.disabled' });
    res.json({ message: '2FA disabled.', twoFactorEnabled: false });
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

    await RefreshToken.updateMany(
      { user: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    audit(req, { action: 'auth.change_password' });
    res.json({ message: 'Password changed. Please log in again.' });
  }
);

module.exports = router;
