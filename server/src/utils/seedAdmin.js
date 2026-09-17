require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sheethub');
    const email = (process.env.ADMIN_EMAIL || process.env.SUPER_ADMIN_EMAIL || 'admin@sheethub.com').toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        await existing.save();
        console.log('Existing user promoted to admin:', email);
      } else {
        console.log('Admin already exists:', email);
      }
    } else {
      await User.create({
        name: process.env.ADMIN_NAME || process.env.SUPER_ADMIN_NAME || 'Admin',
        email,
        password: process.env.ADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD || 'admin123',
        role: 'admin',
      });
      console.log('Admin created:', email);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
