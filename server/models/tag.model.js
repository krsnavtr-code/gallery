import mongoose from 'mongoose';

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true
    },
    mediaCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Create slug from name before saving
tagSchema.pre('save', function (next) {
    if (this.isModified('name')) {
        this.slug = this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    }
    
    // Only call next if it's a function (for async/await support)
    if (typeof next === 'function') {
        return next();
    }
    return Promise.resolve();
});

// Prevent duplicate tags
tagSchema.index({ name: 1 }, { unique: true });

const Tag = mongoose.model('Tag', tagSchema);

export default Tag;
