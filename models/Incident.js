const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema({
  userId: { type: String, required: true }, 
  type: String,
  description: String,
  verified: { type: Boolean, default: false },

  // GeoJSON structure
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  }

}, { timestamps: true });

// Enable geo queries
IncidentSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Incident', IncidentSchema);