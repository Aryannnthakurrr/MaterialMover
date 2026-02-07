const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Admin: Get all users
router.get('/users', auth(['admin']), async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Create user
router.post('/create-user', auth(['admin']), async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ message: 'All fields required' });
  }
  if (!['buyer', 'seller', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashed, role });
    await user.save();
    res.json({ message: 'User created', user: { email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error creating user', detail: err.message });
  }
});

// Admin: Update user role
router.post('/update-role', auth(['admin']), async (req, res) => {
  const { userId, role } = req.body;
  if (!userId || !role || !['buyer', 'seller', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid request' });
  }
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.role = role;
    await user.save();
    res.json({ message: 'Role updated', user: { email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Delete user (and their products)
router.delete('/users/:id', auth(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Remove user's products as cleanup
    const Product = require('../models/Product');
    await Product.deleteMany({ seller: user._id });

    await User.deleteOne({ _id: user._id });
    res.json({ message: 'User and associated products deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Email, password, and role are required' });
  }

  // Only allow buyer or seller roles during signup
  if (!['buyer', 'seller'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role selected' });
  }

  try {
    // Start a transaction
    const session = await mongoose.startSession();
    await session.startTransaction();

    try {
      // Check if email already exists within the transaction
      const existing = await User.findOne({ email }).session(session);
      if (existing) {
        await session.abortTransaction();
        await session.endSession();
        return res.status(400).json({ message: 'Email already registered' });
      }

      const hashed = await bcrypt.hash(password, 10);
      const user = new User({ email, password: hashed, role });
      await user.save({ session });

      // Commit the transaction
      await session.commitTransaction();
      await session.endSession();

      res.json({ message: 'User created', role });
    } catch (err) {
      // If there's an error, abort the transaction
      await session.abortTransaction();
      await session.endSession();
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Error creating user', detail: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'email and password required' });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'replace_with_a_strong_secret', { expiresIn: '7d' });
    res.json({ token, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
