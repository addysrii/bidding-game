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
    },
    soldStatus: {
      type: String,
      enum: ['OPEN', 'SOLD', 'UNSOLD'],
      default: 'OPEN'
    },
    currentBid: {
      type: Number,
      min: 0
    },
    highestBidder: {
      type: String,
      trim: true,
      default: null
    },
    isClosed: {
      type: Boolean,
      default: false
    },
    soldTo: {
      type: String,
      trim: true,
      default: null
    },
    soldToTeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null
    },
    soldPrice: {
      type: Number,
      min: 0
    },
    soldAt: {
      type: Date,
      default: null
    },
    previousTeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null
    },
    previousSoldPrice: {
      type: Number,
      min: 0,
      default: null
    },
    undoCount: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: false
    },
    auctionOrder: {
      type: Number,
      default: 0
    },
    bidHistory: [
      {
        bidderName: {
          type: String,
          trim: true
        },
        teamId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Team',
          default: null
        },
        amount: {
          type: Number,
          min: 0
        },
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    ],
    role: {
      type: String,
      trim: true
    },
    nationality: {
      type: String,
      trim: true
    },
    jerseyNumber: {
      type: Number,
      min: 0
    },
    assignedCard: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Player', playerSchema);
