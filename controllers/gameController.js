const chessService = require('../services/chessService');
const { Chess } = require('chess.js');

exports.home = (req, res) => {
    res.render('home');
};

exports.getGame = (req, res) => {
    // If difficulty is passed in query, set it in session
    if (req.query.difficulty) {
        req.session.difficulty = req.query.difficulty;
    } else if (!req.session.difficulty) {
        req.session.difficulty = 'easy'; // default
    }

    if (!req.session.fen) {
        const chess = new Chess();
        req.session.fen = chess.fen();
        req.session.gameOver = false;
        req.session.message = `VS AI (${req.session.difficulty.toUpperCase()})`;
        req.session.history = [];
    }

    const chess = new Chess(req.session.fen);
    const board = chess.board();

    res.render('index', {
        fen: req.session.fen,
        board: board,
        message: req.session.message,
        gameOver: req.session.gameOver,
        history: req.session.history || [],
        difficulty: req.session.difficulty
    });
};

exports.getPossibleMoves = (req, res) => {
    const square = req.params.square;
    const fen = req.session.fen;
    if (!fen) return res.json({ moves: [] });

    const chess = new Chess(fen);
    const moves = chess.moves({ square: square, verbose: true });

    // Return just destination squares and flags (c=capture, n=non-capture, etc.)
    const destinations = moves.map(m => ({
        to: m.to,
        isCapture: m.flags.includes('c') || m.flags.includes('e')
    }));

    res.json({ moves: destinations });
};

exports.makeMove = async (req, res) => {
    const { from, to } = req.body;
    let fen = req.session.fen;
    let chess = new Chess(fen);
    const difficulty = req.session.difficulty || 'easy';

    // Player Move
    try {
        const move = chess.move({ from, to, promotion: 'q' });
        if (!move) {
            return res.json({ success: false, message: 'Invalid move' });
        }
    } catch (e) {
        return res.json({ success: false, message: 'Invalid move' });
    }

    req.session.fen = chess.fen();
    req.session.history.push(`${from}-${to}`);

    if (chess.isGameOver()) {
        req.session.gameOver = true;
        let result = getGameResult(chess);

        req.session.message = result;
        return renderAndReply(res, chess, result, true);
    }

    // AI Move
    // Adjust depth/time based on difficulty if using Stockfish in future
    // For now with random/capture logic:
    // Easy: Random valid move
    // Medium: Prioritize capture, avoid immediate capture? (Simple heuristic)
    // Hard: Stockfish or deeper search

    setTimeout(async () => {
        let aiMove = null;
        try {
            if (difficulty === 'hard') {
                // Use Stockfish via service (async)
                const result = await chessService.getAIMove(chess.fen()); // Assuming this uses Stockfish now
                if (result) {
                    chess = new Chess(result.fen);
                    aiMove = { from: result.from, to: result.to };
                }
            } else {
                // Simple Heuristics for Easy/Medium
                const moves = chess.moves({ verbose: true });
                if (moves.length > 0) {
                    if (difficulty === 'medium') {
                        // Capture oriented
                        const captureMove = moves.find(m => m.flags.includes('c') || m.flags.includes('e'));
                        aiMove = captureMove || moves[Math.floor(Math.random() * moves.length)];
                    } else {
                        // Easy: Random
                        aiMove = moves[Math.floor(Math.random() * moves.length)];
                    }
                    chess.move(aiMove);
                }
            }

            if (aiMove) {
                req.session.fen = chess.fen();
                req.session.history.push(`${aiMove.from}-${aiMove.to}`);

                let status = `VS AI (${difficulty.toUpperCase()})`;
                if (chess.isCheck()) status = 'Check!';

                let gameOver = false;
                if (chess.isGameOver()) {
                    gameOver = true;
                    req.session.gameOver = true;
                    status = getGameResult(chess);
                }

                req.session.message = status;

                renderAndReply(res, chess, status, gameOver, aiMove);
            } else {
                // Stalemate/No moves
                req.session.gameOver = true;
                req.session.message = 'Stalemate / No moves possible';
                renderAndReply(res, chess, req.session.message, true);
            }

        } catch (err) {
            console.error(err);
            res.json({ success: false });
        }
    }, 500);
};

exports.restartGame = (req, res) => {
    req.session.fen = null;
    req.session.history = [];
    req.session.gameOver = false;
    req.session.message = null;
    // Keep difficulty setting? Yes usually.
    res.redirect('/game');
};

function getGameResult(chess) {
    if (chess.isCheckmate()) return chess.turn() === 'w' ? 'Checkmate! AI Wins' : 'Checkmate! You Win!';
    if (chess.isDraw()) return 'Draw!';
    return 'Game Over';
}

function renderAndReply(res, chess, message, gameOver = false, lastMove = null) {
    res.render('board', { board: chess.board() }, (err, html) => {
        if (err) {
            console.error('Render error:', err);
            return res.status(500).json({ success: false });
        }
        res.json({
            success: true,
            fen: chess.fen(),
            boardHtml: html,
            gameOver: gameOver,
            message: message,
            lastMove: lastMove
        });
    });
}
