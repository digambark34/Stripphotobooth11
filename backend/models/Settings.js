const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  eventName: {
    type: String,
    default: ''
  },
  templateUrl: {
    type: String,
    default: null
  },
  // Keep track of Cloudinary public IDs for deletion
  templatePublicId: {
    type: String,
    default: null
  },
  // Singleton pattern - only one settings document
  _id: {
    type: String,
    default: 'photobooth-settings'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  _id: false // Disable auto _id generation since we're using custom _id
});

// Update the updatedAt field on save
settingsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Settings', settingsSchema);
