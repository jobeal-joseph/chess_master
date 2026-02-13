let selectedSquare = null;
let isAIThinking = false;
let possibleMoves = [];

// Audio
const moveSound = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_common/move-self.mp3');
const captureSound = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_common/capture.mp3');
const notifySound = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_common/notify.mp3');

function playSound(type) {
    try {
        if (type === 'move') moveSound.play().catch(() => { });
        if (type === 'capture') captureSound.play().catch(() => { });
        if (type === 'notify') notifySound.play().catch(() => { });
    } catch (e) { }
}

function handleSquareClick(squareId, pieceClass) {
    if (isAIThinking) return;

    if (pieceClass && pieceClass.startsWith('w-')) {
        // Select own piece
        selectSquare(squareId);
    } else if (selectedSquare) {
        // Move to empty or enemy square if selected
        // Check if valid first (client-side hint)
        if (isValidMove(squareId)) {
            makeMove(selectedSquare, squareId);
        } else {
            // Invalid move Attempt
            const board = document.getElementById('board-container');
            board.classList.add('shake');
            setTimeout(() => board.classList.remove('shake'), 400);
            deselectAll();
        }
    }
}

function selectSquare(squareId) {
    // Optimization: If clicking same square, deselect
    if (selectedSquare === squareId) {
        deselectAll();
        return;
    }

    deselectAll();
    selectedSquare = squareId;

    const sq = document.querySelector(`.square[data-id="${squareId}"]`);
    if (sq) {
        sq.classList.add('selected');
        sq.classList.add('pulse');
    }

    // Fetch and show possible moves
    fetchPossibleMoves(squareId);
}

function deselectAll() {
    selectedSquare = null;
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected', 'pulse'));
    clearHighlights();
}

function clearHighlights() {
    document.querySelectorAll('.path-marker, .capture-marker').forEach(el => el.remove());
    possibleMoves = [];
}

async function fetchPossibleMoves(square) {
    try {
        const res = await fetch(`/moves/${square}`);
        const data = await res.json();

        if (data.moves) {
            possibleMoves = data.moves; // Array of {to: 'e4', isCapture: false}
            showPossibleMoves(data.moves);
        }
    } catch (e) {
        console.error("Error fetching moves", e);
    }
}

function showPossibleMoves(moves) {
    moves.forEach(move => {
        const sq = document.querySelector(`.square[data-id="${move.to}"]`);
        if (sq) {
            const marker = document.createElement('div');
            if (move.isCapture) {
                marker.className = 'capture-marker';
            } else {
                marker.className = 'path-marker';
            }
            sq.appendChild(marker);
        }
    });
}

function isValidMove(targetSquare) {
    return possibleMoves.some(m => m.to === targetSquare);
}

function makeMove(from, to) {
    isAIThinking = true;
    updateStatus("Thinking...");
    document.body.style.cursor = 'wait';
    clearHighlights();

    // Remove selection visuals immediately
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));

    fetch('/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateBoard(data.boardHtml);
                updateStatus(data.message);
                playSound('move');

                updateHistory(from, to, data.lastMove?.from, data.lastMove?.to);

                if (data.lastMove) highlightMove(data.lastMove.from, data.lastMove.to);

                if (data.gameOver) {
                    playSound('notify');
                    showGameOverModal(data.message);
                }
            } else {
                updateStatus("Invalid move.");
            }
        })
        .catch(console.error)
        .finally(() => {
            isAIThinking = false;
            selectedSquare = null;
            document.body.style.cursor = 'default';
            possibleMoves = [];
        });
}

function updateBoard(html) {
    const container = document.getElementById('board-container');
    if (html) container.innerHTML = html;
}

function updateStatus(msg) {
    const el = document.getElementById('game-status');
    if (el) el.innerText = msg;
}

function updateHistory(pFrom, pTo, aiFrom, aiTo) {
    const body = document.getElementById('history-body');
    if (!body) return;

    const row = body.insertRow();
    row.insertCell(0).innerText = `${body.rows.length}.`;
    row.insertCell(1).innerText = `${pFrom} \u2192 ${pTo}`;
    if (aiFrom) row.insertCell(2).innerText = `${aiFrom} \u2192 ${aiTo}`;

    const scroll = document.querySelector('.history-scroll');
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
}

function highlightMove(from, to) {
    document.querySelectorAll('.last-move').forEach(el => el.classList.remove('last-move'));
    const f = document.querySelector(`.square[data-id="${from}"]`);
    const t = document.querySelector(`.square[data-id="${to}"]`);
    if (f) f.classList.add('last-move');
    if (t) t.classList.add('last-move');
}

function showGameOverModal(msg) {
    const modal = document.getElementById('game-over-modal');
    const title = document.getElementById('modal-title');
    document.getElementById('modal-message').innerText = msg;

    if (msg.includes("Win")) {
        title.innerText = "Victory!";
        title.style.color = "#4ecca3";
    } else {
        title.innerText = "Defeat";
        title.style.color = "#ff6b6b";
    }
    modal.classList.add('active');
}

function restartGame() {
    fetch('/restart', { method: 'POST' }).then(() => window.location.href = '/');
}
