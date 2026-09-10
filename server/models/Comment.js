const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
    username: { type: String, default: 'Guest Critic' },
    rawContent: { type: String, required: true },
    sanitizedContent: { type: String, required: true },
    profanityDetected: { type: Boolean, default: false },
    rating: { type: Number, min: 1, max: 5 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);