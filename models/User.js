const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },

  // 👇 ADD THIS SECTION TO STORE CONTACTS 👇
  emergencyContacts: [{
    id: String,
    name: String,
    phone: String,
    relationship: String
  }]
});

module.exports = mongoose.model('User', UserSchema);