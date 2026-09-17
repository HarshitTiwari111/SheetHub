const router = require('express').Router();
const AuditLog = require('../models/AuditLog');
const { protect, adminLevel } = require('../middleware/auth');

router.use(protect, adminLevel);

router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
  const skip = parseInt(req.query.skip || '0', 10);
  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.userId) filter.actor = req.query.userId;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('actor', 'name email role'),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ logs, total, limit, skip });
});

module.exports = router;
