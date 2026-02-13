const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

// Serve the home page
router.get('/', gameController.home);

// Serve the game page (handles difficulty query param)
router.get('/game', gameController.getGame);

// Handle move submission via POST or AJAX
router.post('/move', gameController.makeMove);

// Get possible moves for a square
router.get('/moves/:square', gameController.getPossibleMoves);

// Restart the game
router.post('/restart', gameController.restartGame);

module.exports = router;
