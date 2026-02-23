var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();

var Player = require('../models/Player');
var Team = require('../models/Team');

var isValidObjectId = function(id) {
  return mongoose.Types.ObjectId.isValid(id);
};

router.post('/sell', async function(req, res, next) {
  try {
    var body = req.body || {};
    var playerId = body.playerId;
    var teamId = body.teamId;
    var soldPrice = Number(body.soldPrice);

    if (!isValidObjectId(playerId) || !isValidObjectId(teamId)) {
      return res.status(400).json({ error: 'Invalid playerId or teamId.' });
    }

    if (!Number.isFinite(soldPrice) || soldPrice < 0) {
      return res.status(400).json({ error: 'Invalid soldPrice.' });
    }

    var player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found.' });
    }

    var team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found.' });
    }

    if (player.soldStatus === 'SOLD') {
      return res.status(409).json({ error: 'Player is already sold.' });
    }

    if ((team.purseBalance || 0) < soldPrice) {
      return res.status(400).json({ error: 'Insufficient purse balance.' });
    }

    team.soldPlayers = Array.isArray(team.soldPlayers) ? team.soldPlayers : [];
    if (team.soldPlayers.length >= 6) {
      return res.status(400).json({ error: 'Team already has 6 players. Maximum limit reached.' });
    }

    player.soldStatus = 'SOLD';
    player.soldTo = team.name || team.code || String(team._id);
    player.soldToTeamId = team._id;
    player.soldPrice = soldPrice;
    player.soldAt = new Date();
    player.isClosed = true;

    team.soldPlayers.push(player._id);
    team.purseBalance = (team.purseBalance || 0) - soldPrice;

    await player.save();
    await team.save();

    var updatedPlayer = await Player.findById(player._id)
      .populate('soldToTeamId')
      .populate('bidHistory.teamId');
    var updatedTeam = await Team.findById(team._id).populate('soldPlayers');

    return res.json({
      message: 'Player sold successfully.',
      player: updatedPlayer,
      team: updatedTeam
    });
  } catch (error) {
    next(error);
  }
});

router.post('/undo', async function(req, res, next) {
  try {
    var body = req.body || {};
    var playerId = body.playerId;

    if (!isValidObjectId(playerId)) {
      return res.status(400).json({ error: 'Invalid playerId.' });
    }

    var player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found.' });
    }

    if (player.soldStatus !== 'SOLD') {
      return res.status(400).json({ error: 'Undo is only allowed for SOLD players.' });
    }

    if (!player.soldToTeamId) {
      return res.status(400).json({ error: 'No team is associated with this sold player.' });
    }

    var team = await Team.findById(player.soldToTeamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found for this player.' });
    }

    var soldPrice = Number(player.soldPrice) || 0;

    player.previousTeamId = player.soldToTeamId;
    player.previousSoldPrice = soldPrice;
    player.soldStatus = 'OPEN';
    player.soldTo = null;
    player.soldToTeamId = null;
    player.soldPrice = null;
    player.soldAt = null;
    player.isClosed = false;
    player.undoCount = (player.undoCount || 0) + 1;

    team.soldPlayers = Array.isArray(team.soldPlayers) ? team.soldPlayers : [];
    team.soldPlayers = team.soldPlayers.filter(function(id) {
      return String(id) !== String(player._id);
    });
    team.purseBalance = (team.purseBalance || 0) + soldPrice;

    await player.save();
    await team.save();

    var updatedPlayer = await Player.findById(player._id)
      .populate('soldToTeamId')
      .populate('bidHistory.teamId');
    var updatedTeam = await Team.findById(team._id).populate('soldPlayers');

    return res.json({
      message: 'Player undo completed successfully.',
      player: updatedPlayer,
      team: updatedTeam
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
