const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    rating: {
      type: Number,
      required: true,
      min: 0
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0
    },
    profilePicture: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Player', playerSchema);
