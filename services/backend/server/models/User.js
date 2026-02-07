const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: false }, // Optional for Google OAuth users
  role: { type: String, enum: ['buyer', 'seller', 'admin'], default: 'buyer' },
  googleId: { type: String, unique: true, sparse: true }, // Google OAuth ID
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
