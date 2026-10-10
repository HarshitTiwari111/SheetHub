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
  
  // Allow superadmin for all admin routes, user -> employee alias
  const userRole = req.user.role === 'user' ? 'employee' : req.user.role;
  const isAllowed = allowedRoles.includes(userRole) || userRole === 'superadmin';

  if (!isAllowed) {
    return res.status(403).json({ message: `Access denied. Requires one of: ${allowedRoles.join(', ')}` });
  }
  next();
};

const requireMinRole = (minRole) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  const userRank = User.ROLE_RANK[req.user.role] || 1;
  const minRank = User.ROLE_RANK[minRole] || 1;
  if (userRank < minRank) {
    return res.status(403).json({ message: `Access denied. Requires minimum role: ${minRole}` });
  }
  next();
};

const superAdminLevel = requireRole('superadmin');
const adminLevel = requireRole('superadmin', 'admin');
const managerLevel = requireRole('superadmin', 'admin', 'manager');

module.exports = {
  protect,
  requireRole,
  requireMinRole,
  superAdminLevel,
  adminLevel,
  managerLevel,
};
