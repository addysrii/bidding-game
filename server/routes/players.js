var express = require('express');
var router = express.Router();
var Player = require('../models/Player');
var Team = require('../models/Team');
var ALLOWED_SOLD_STATUS = new Set(['OPEN', 'SOLD', 'UNSOLD']);

router.get('/', async function(req, res, next) {
  try {
    var players = await Player.find().sort({ createdAt: 1 });
    res.json(players);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', async function(req, res, next) {
  try {
    var playerId = req.params.id;
    var soldStatus = String(req.body?.soldStatus || '').toUpperCase();

    if (!ALLOWED_SOLD_STATUS.has(soldStatus)) {
      return res.status(400).json({ error: 'Invalid soldStatus value.' });
    }

    var updatedPlayer = await Player.findByIdAndUpdate(
      playerId,
      { $set: { soldStatus: soldStatus } },
      { new: true, runValidators: true }
    );

    if (!updatedPlayer) {
      return res.status(404).json({ error: 'Player not found.' });
    }

    res.json(updatedPlayer);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/auction', async function(req, res, next) {
  try {
    var playerId = req.params.id;
    var payload = req.body || {};
    var update = {};

    if (payload.currentBid !== undefined) {
      var currentBid = Number(payload.currentBid);
      if (!Number.isFinite(currentBid) || currentBid < 0) {
        return res.status(400).json({ error: 'Invalid currentBid.' });
      }
      update.currentBid = currentBid;
    }

    if (payload.highestBidder !== undefined) {
      update.highestBidder = payload.highestBidder || null;
    }

    if (payload.soldStatus !== undefined) {
      var soldStatus = String(payload.soldStatus || '').toUpperCase();
      if (!ALLOWED_SOLD_STATUS.has(soldStatus)) {
        return res.status(400).json({ error: 'Invalid soldStatus value.' });
      }
      update.soldStatus = soldStatus;
      update.isClosed = soldStatus !== 'OPEN';
    }

    if (payload.soldTo !== undefined) {
      update.soldTo = payload.soldTo || null;
    }

    if (payload.soldPrice !== undefined) {
      if (payload.soldPrice === null || payload.soldPrice === '') {
        update.soldPrice = null;
      } else {
        var soldPrice = Number(payload.soldPrice);
        if (!Number.isFinite(soldPrice) || soldPrice < 0) {
          return res.status(400).json({ error: 'Invalid soldPrice.' });
        }
        update.soldPrice = soldPrice;
      }
    }

    if (payload.assignedCard !== undefined) {
      update.assignedCard = payload.assignedCard || null;
    }

    if (payload.isClosed !== undefined) {
      update.isClosed = Boolean(payload.isClosed);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No auction fields provided.' });
    }

    var updatedPlayer = await Player.findByIdAndUpdate(
      playerId,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!updatedPlayer) {
      return res.status(404).json({ error: 'Player not found.' });
    }

    res.json(updatedPlayer);
  } catch (error) {
    next(error);
  }
});

router.post('/reset', async function(req, res, next) {
  try {
    await Player.updateMany(
      {},
      {
        $set: {
          soldStatus: 'OPEN',
          currentBid: null,
          highestBidder: null,
          isClosed: false,
          soldTo: null,
          soldToTeamId: null,
          soldPrice: null,
          soldAt: null,
          previousTeamId: null,
          previousSoldPrice: null,
          undoCount: 0,
          isActive: false,
          auctionOrder: 0,
          bidHistory: [],
          assignedCard: null
        }
      }
    );

    var teams = await Team.find({}, { _id: 1, initialPurse: 1 });
    await Promise.all(
      teams.map(function(team) {
        return Team.findByIdAndUpdate(team._id, {
          $set: {
            purseBalance: Number(team.initialPurse) || 0,
            soldPlayers: []
          }
        });
      })
    );

    var players = await Player.find().sort({ createdAt: 1 });
    res.json({
      message: 'Auction data reset successfully.',
      players: players
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
