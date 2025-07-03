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
  customBackground: {
    type: Object,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return v.type && v.value;
      },
      message: 'Custom background must have type and value'
    }
  },
  logo: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Logo must be a valid URL'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add indexes for better performance
StripSchema.index({ timestamp: -1 });
StripSchema.index({ printed: 1 });

module.exports = mongoose.model("Strip", StripSchema);
