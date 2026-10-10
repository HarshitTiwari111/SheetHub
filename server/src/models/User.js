const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['superadmin', 'admin', 'manager', 'employee', 'user'];
const ROLE_RANK = {
  superadmin: 4,
  admin: 3,
  manager: 2,
  employee: 1,
  user: 1, // alias for employee
};

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 200,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ROLES, default: 'employee', index: true },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
    lastLoginUserAgent: { type: String },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },

    // 2FA Fields
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },

    // Login Alerts & Device Tracking
    knownDevices: [
      {
        ip: { type: String },
        userAgent: { type: String },
        firstSeenAt: { type: Date, default: Date.now },
        lastSeenAt: { type: Date, default: Date.now },
      },
    ],
    suspiciousLogins: [
      {
        ip: { type: String },
        userAgent: { type: String },
        timestamp: { type: Date, default: Date.now },
        reason: { type: String },
      },
    ],
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.isLocked = function () {
  return !!(this.lockedUntil && this.lockedUntil > new Date());
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.twoFactorSecret;
  delete obj.failedLoginAttempts;
  delete obj.lockedUntil;
  return obj;
};

const User = mongoose.model('User', userSchema);
User.ROLES = ['superadmin', 'admin', 'manager', 'employee'];
User.ROLE_RANK = ROLE_RANK;
User.canManage = (actorRole, targetRole) =>
  (ROLE_RANK[actorRole] || 0) > (ROLE_RANK[targetRole] || 0);

module.exports = User;

