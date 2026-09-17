const User = require('../models/User');
const { verifyAccess } = require('../utils/token');

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const token = header.split(' ')[1];
    const decoded = verifyAccess(token);
    const user = await User.findById(decoded.id);
    if (!user || !user.active) return res.status(401).json({ message: 'User not found or inactive' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: `Requires one of: ${allowedRoles.join(', ')}` });
  }
  next();
};

const adminLevel = requireRole('admin');

module.exports = { protect, requireRole, adminLevel };
