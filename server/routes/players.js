var express = require('express');
var router = express.Router();
var Player = require('../models/Player');

router.get('/', async function(req, res, next) {
  try {
    var players = await Player.find().sort({ createdAt: 1 });
    res.json(players);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
