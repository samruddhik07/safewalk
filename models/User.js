const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, index: true },
  password: String,
  guardians: [{ name: String, phone: String }],
  persona: String
}, { timestamps: true });
module.exports = mongoose.model('User', userSchema);