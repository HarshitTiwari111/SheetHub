const AuditLog = require('../models/AuditLog');

const getClientIp = (req) => {
  return (
    req.headers['cf-connecting-ip'] ||
    (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
    req.ip ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  );
};

// Fire-and-forget audit log write — never blocks response.
const audit = (req, { action, resourceType, resourceId, details, status = 'success' }) => {
  const actor = req.user;
  AuditLog.create({
    actor: actor?._id,
    actorEmail: actor?.email,
    action,
    resourceType,
    resourceId: resourceId ? String(resourceId) : undefined,
    details,
    ip: getClientIp(req),
    userAgent: req.headers['user-agent'],
    status,
  }).catch((err) => console.error('Audit log failed:', err.message));
};

module.exports = { audit, getClientIp };
