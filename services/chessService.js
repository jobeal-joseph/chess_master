const { Chess } = require('chess.js');
const stockfish = require('stockfish');

// Helper to interact with Stockfish
// Note: stockfish.js in node is tricky with async.
// Start with simple AI if stockfish fails or is complex.
// We will try to use stockfish if possible, otherwise fallback.

class ChessService {
    constructor() {
        // Stockfish instance or path
    }

    getInitialBoard() {
        const chess = new Chess();
        return chess.fen();
    }

    validateMove(fen, from, to) {
        const chess = new Chess(fen);
        try {
            const move = chess.move({ from, to, promotion: 'q' }); // Auto-promote to queen for simplicity
            if (move) {
                return { valid: true, fen: chess.fen(), status: this.getGameStatus(chess) };
            }
        } catch (e) {
            return { valid: false, error: e.message };
        }
        return { valid: false, error: 'Invalid move' };
    }

    getGameStatus(chess) {
        if (chess.isCheckmate()) return 'Checkmate';
        if (chess.isDraw()) return 'Draw';
        if (chess.isCheck()) return 'Check';
        return 'Active';
    }

    // AI Move
    async getAIMove(fen) {
        const chess = new Chess(fen);

        if (chess.isGameOver()) return null;

        // Try Stockfish
        try {
            return await new Promise((resolve, reject) => {
                const engine = stockfish();
                let bestMove = null;

                // Timeout fallback (e.g. 2 seconds)
                const timeoutId = setTimeout(() => {
                    engine.postMessage('quit');
                    reject(new Error('Stockfish timeout'));
                }, 2000);

                engine.onmessage = (line) => {
                    if (line.startsWith('bestmove')) {
                        clearTimeout(timeoutId);
                        engine.postMessage('quit'); // Clean up engine

                        const parts = line.split(' ');
                        const moveStr = parts[1]; // e.g. "e2e4"

                        if (moveStr && moveStr !== '(none)') {
                            const from = moveStr.substring(0, 2);
                            const to = moveStr.substring(2, 4);
                            const promotion = moveStr.length > 4 ? moveStr.substring(4, 5) : undefined;

                            try {
                                const move = chess.move({ from, to, promotion: promotion || 'q' });
                                if (move) {
                                    resolve({
                                        from: move.from,
                                        to: move.to,
                                        fen: chess.fen(),
                                        status: this.getGameStatus(chess)
                                    });
                                } else {
                                    reject(new Error('Invalid stockfish move'));
                                }
                            } catch (e) {
                                reject(e);
                            }
                        } else {
                            reject(new Error('No move from stockfish'));
                        }
                    }
                };

                engine.postMessage('uci');
                engine.postMessage(`position fen ${fen}`);
                engine.postMessage('go depth 10 moves 1000'); // Limit search to be fast
            });

        } catch (error) {
            console.log("Stockfish failed or timed out, using fallback:", error.message);
            // Fallback: Random/Simple AI
            const moves = chess.moves({ verbose: true });
            if (moves.length === 0) return null;

            // Simple AI: Capture if possible, otherwise at random
            const captureMove = moves.find(m => m.flags.includes('c') || m.flags.includes('e'));
            const move = captureMove || moves[Math.floor(Math.random() * moves.length)];

            chess.move(move);
            return {
                from: move.from,
                to: move.to,
                fen: chess.fen(),
                status: this.getGameStatus(chess)
            };
        }
    }
}

module.exports = new ChessService();
