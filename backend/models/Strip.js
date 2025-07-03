const mongoose = require("mongoose");

const StripSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Image URL must be a valid URL'
    }
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  eventName: {
    type: String,
    maxlength: [100, 'Event name cannot exceed 100 characters'],
    trim: true
  },
  printed: {
    type: Boolean,
    default: false,
    index: true
  },
  template: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^data:image\//.test(v) || /^https?:\/\/.+/.test(v);
      },
      message: 'Template must be a valid image data URL or URL'
    }
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add indexes for better performance
StripSchema.index({ timestamp: -1 });
StripSchema.index({ printed: 1 });

module.exports = mongoose.model("Strip", StripSchema);
