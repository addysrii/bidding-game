const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },
    code: {
      type: String,
      trim: true
    },
    purseBalance: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    initialPurse: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    soldPlayers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Team', teamSchema);
