const router = require('express').Router();
const { body, param } = require('express-validator');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { protect, adminLevel } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { audit } = require('../utils/audit');

router.use(protect, adminLevel);

router.get('/', async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
});

router.post(
  '/',
  body('name').isString().trim().isLength({ min: 1, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 6, max: 200 }),
  body('role').isIn(User.ROLES),
  validate,
  async (req, res) => {
    const { name, email, password, role } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already in use' });

    const user = await User.create({ name, email, password, role });
    audit(req, { action: 'user.create', resourceType: 'User', resourceId: user._id, details: { email, role } });
    res.status(201).json(user);
  }
);

router.put(
  '/:id',
  param('id').isMongoId(),
  body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(User.ROLES),
  body('password').optional().isString().isLength({ min: 6, max: 200 }),
  body('active').optional().isBoolean(),
  validate,
  async (req, res) => {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });

    const before = { name: target.name, email: target.email, role: target.role, active: target.active };
    if (req.body.name) target.name = req.body.name;
    if (req.body.email) target.email = req.body.email;
    if (req.body.role) target.role = req.body.role;
    if (typeof req.body.active === 'boolean') target.active = req.body.active;
    if (req.body.password) target.password = req.body.password;
    await target.save();

    if (req.body.password) {
      await RefreshToken.updateMany(
        { user: target._id, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
    }

    audit(req, {
      action: 'user.update',
      resourceType: 'User',
      resourceId: target._id,
      details: { before, after: { name: target.name, email: target.email, role: target.role, active: target.active } },
    });
    res.json(target);
  }
);

router.delete('/:id', param('id').isMongoId(), validate, async (req, res) => {
  if (String(req.user._id) === String(req.params.id))
    return res.status(400).json({ message: 'Cannot delete yourself' });
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: 'User not found' });

  await User.deleteOne({ _id: target._id });
  await RefreshToken.deleteMany({ user: target._id });
  audit(req, { action: 'user.delete', resourceType: 'User', resourceId: target._id, details: { email: target.email } });
  res.json({ message: 'User deleted' });
});

module.exports = router;
