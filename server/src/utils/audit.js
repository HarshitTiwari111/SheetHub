const AuditLog = require('../models/AuditLog');

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
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    status,
  }).catch((err) => console.error('Audit log failed:', err.message));
};

module.exports = { audit };
