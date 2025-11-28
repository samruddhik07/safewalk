const mongoose = require('mongoose');
const sosSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lat: Number,
  lon: Number,
  reason: String,
  resolved: { type: Boolean, default: false }
}, { timestamps: true });
module.exports = mongoose.model('SOSLog', sosSchema);