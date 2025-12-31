// Chess client-side logic
const socket = io();

// Piece Themes (SVG URLs)
// Piece Themes (Local Custom PNGs)
function getPieceImage(type, color) {
    // We now have custom images for ALL pieces!
    const fileName = (color === 'w' ? 'w' : 'b') + type.toUpperCase() + '.png';
    return fileName;
}

// Sound Effects System (Web Audio API - No downloads needed!)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'move') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'capture') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
    }
}

// Game state
let currentGame = null;
let playerColor = null;
let selectedSquare = null;
let chessGame = null;
let clockInterval = null;

// DOM Elements
const screens = {
    menu: document.getElementById('menuScreen'),
    createGame: document.getElementById('createGameScreen'),
    joinGame: document.getElementById('joinGameScreen'),
    waiting: document.getElementById('waitingScreen'),
    game: document.getElementById('gameScreen')
};

// Utility Functions
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatGameId(gameId) {
    // Return ID as is (now it's a simple 4-digit code)
    return gameId;
}

// ===== MENU NAVIGATION =====
document.getElementById('createGameBtn').addEventListener('click', () => {
    showScreen('createGame');
});

document.getElementById('joinGameBtn').addEventListener('click', () => {
    showScreen('joinGame');
});

document.getElementById('aboutBtn').addEventListener('click', () => {
    document.getElementById('aboutModal').classList.add('active');
});

document.getElementById('closeAbout').addEventListener('click', () => {
    document.getElementById('aboutModal').classList.remove('active');
});

document.getElementById('backToMenu1').addEventListener('click', () => {
    showScreen('menu');
});

document.getElementById('backToMenu2').addEventListener('click', () => {
    showScreen('menu');
});

document.getElementById('cancelWaiting').addEventListener('click', () => {
    showScreen('menu');
});

// ===== CREATE GAME CONFIG =====
let gameConfig = {
    variant: 'standard',
    timeLimit: 300,
    increment: 0,
    chess960Position: null
};

// Variant selection
document.querySelectorAll('.variant-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        const variant = this.dataset.variant;
        gameConfig.variant = variant;

        const chess960Options = document.querySelector('.chess960-options');
        if (variant === 'chess960') {
            chess960Options.style.display = 'block';
        } else {
            chess960Options.style.display = 'none';
        }
    });
});

// Randomize Chess960 position
document.getElementById('randomizePosition').addEventListener('click', () => {
    const randomPos = Math.floor(Math.random() * 960);
    document.getElementById('chess960Position').value = randomPos;
});

// Time control selection
document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        const time = this.dataset.time;
        const increment = parseInt(this.dataset.increment);

        const customOptions = document.querySelector('.custom-time-options');

        if (time === 'custom') {
            customOptions.style.display = 'block';
            const minutes = parseInt(document.getElementById('customMinutes').value);
            const customIncrement = parseInt(document.getElementById('customIncrement').value);
            gameConfig.timeLimit = minutes * 60;
            gameConfig.increment = customIncrement;
        } else {
            customOptions.style.display = 'none';
            gameConfig.timeLimit = parseInt(time);
            gameConfig.increment = increment;
        }
    });
});

// Custom time inputs
document.getElementById('customMinutes').addEventListener('change', function () {
    gameConfig.timeLimit = parseInt(this.value) * 60;
});

document.getElementById('customIncrement').addEventListener('change', function () {
    gameConfig.increment = parseInt(this.value);
});

// ===== CREATE GAME =====
document.getElementById('confirmCreateGame').addEventListener('click', () => {
    const playerName = document.getElementById('playerNameCreate').value.trim() || 'Player 1';

    // Handle Chess960 position
    if (gameConfig.variant === 'chess960') {
        const posInput = document.getElementById('chess960Position').value;
        if (posInput !== '') {
            gameConfig.chess960Position = parseInt(posInput);
        } else {
            gameConfig.chess960Position = undefined; // Random
        }
    }

    const config = {
        ...gameConfig,
        playerName
    };

    socket.emit('createGame', config, (response) => {
        if (response.success) {
            currentGame = response.gameId;
            playerColor = response.color;

            // Show waiting screen
            showWaitingScreen(response);
        } else {
            alert('Failed to create game: ' + response.error);
        }
    });
});

// ===== JOIN GAME =====
document.getElementById('confirmJoinGame').addEventListener('click', () => {
    const playerName = document.getElementById('playerNameJoin').value.trim() || 'Player 2';
    const roomCode = document.getElementById('roomCode').value.trim().replace(/-/g, '');

    if (!roomCode) {
        alert('Please enter a room code');
        return;
    }

    socket.emit('joinGame', { gameId: roomCode, playerName }, (response) => {
        if (response.success) {
            currentGame = roomCode;
            playerColor = response.color;

            if (playerColor === 'spectator') {
                // Joined as spectator
                initializeGame(response.gameState);
            } else {
                // Joined as player, game starting
                initializeGame(response.gameState);
            }
        } else {
            alert('Failed to join game: ' + response.error);
        }
    });
});

// ===== WAITING SCREEN =====
function showWaitingScreen(gameData) {
    showScreen('waiting');

    const roomCodeText = formatGameId(currentGame);
    document.getElementById('roomCodeText').textContent = roomCodeText;

    // Display game info
    let variantName = 'Classical Chess';
    if (gameData.config.variant === 'chess960') {
        const posNum = gameData.startPosition.positionNumber;
        variantName = `Chess960 #${posNum}`;
    }

    document.getElementById('waitingVariant').textContent = variantName;
    document.getElementById('waitingTime').textContent =
        `${Math.floor(gameData.config.timeLimit / 60)}+${gameData.config.increment}`;
    document.getElementById('waitingColor').textContent =
        playerColor.charAt(0).toUpperCase() + playerColor.slice(1);
}

// Copy room code
document.getElementById('copyRoomCode').addEventListener('click', () => {
    const roomCode = document.getElementById('roomCodeText').textContent;
    navigator.clipboard.writeText(roomCode.replace(/-/g, '')).then(() => {
        const btn = document.getElementById('copyRoomCode');
        btn.textContent = '✓';
        setTimeout(() => {
            btn.textContent = '📋';
        }, 2000);
    });
});

// ===== GAME INITIALIZATION =====
socket.on('gameStart', (gameState) => {
    initializeGame(gameState);
});

function initializeGame(gameState) {
    showScreen('game');

    // Initialize chess.js with the game FEN
    chessGame = new Chess(gameState.fen);

    // Set up game info
    let variantName = 'Classical Chess';
    if (gameState.config.variant === 'chess960') {
        const posNum = gameState.startPosition.positionNumber;
        variantName = `Chess960 #${posNum}`;
    }

    document.getElementById('gameVariant').textContent = variantName;
    document.getElementById('gameTimeControl').textContent =
        `${Math.floor(gameState.config.timeLimit / 60)}+${gameState.config.increment}`;
    document.getElementById('yourColor').textContent =
        playerColor.charAt(0).toUpperCase() + playerColor.slice(1);

    // Set player names
    document.getElementById('yourName').textContent =
        gameState.players[playerColor]?.name || 'You';

    const opponentColor = playerColor === 'white' ? 'black' : 'white';
    document.getElementById('opponentName').textContent =
        gameState.players[opponentColor]?.name || 'Opponent';

    // Initialize clocks
    updateClocks(gameState.clocks);
    startClockTicking();

    // Render board
    renderBoard();
    updateMoveHistory();
    updateFEN();
    updateGameStatus();
}

// ===== CHESS BOARD RENDERING =====
function renderBoard() {
    const board = document.getElementById('chessboard');
    board.innerHTML = '';

    const position = chessGame.board();
    const isFlipped = playerColor === 'black';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const displayRow = isFlipped ? row : 7 - row;
            const displayCol = isFlipped ? 7 - col : col;

            const square = position[displayRow][displayCol];
            const file = String.fromCharCode(97 + displayCol); // a-h
            const rank = displayRow + 1; // 1-8
            const squareName = file + rank;

            const squareDiv = document.createElement('div');
            squareDiv.className = 'square';
            squareDiv.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
            squareDiv.dataset.square = squareName;

            if (square) {
                const pieceImg = document.createElement('img');
                pieceImg.className = 'piece';
                pieceImg.src = getPieceImage(square.type, square.color);
                pieceImg.draggable = false;
                // Add pop animation
                pieceImg.style.animation = 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                squareDiv.appendChild(pieceImg);
            }

            squareDiv.addEventListener('click', () => handleSquareClick(squareName));
            board.appendChild(squareDiv);
        }
    }
}

function handleSquareClick(square) {
    if (playerColor === 'spectator') return;

    const currentTurn = chessGame.turn();
    const myTurn = (currentTurn === 'w' && playerColor === 'white') ||
        (currentTurn === 'b' && playerColor === 'black');

    if (!myTurn) return;

    if (!selectedSquare) {
        // Select piece
        const piece = chessGame.get(square);
        if (piece && piece.color === currentTurn) {
            selectedSquare = square;
            highlightSquare(square);
            showValidMoves(square);
        }
    } else {
        // Try to move
        if (square === selectedSquare) {
            // Deselect
            clearHighlights();
            selectedSquare = null;
        } else {
            attemptMove(selectedSquare, square);
        }
    }
}

function highlightSquare(square) {
    document.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('selected', 'valid-move', 'valid-capture');
    });

    const squareDiv = document.querySelector(`[data-square="${square}"]`);
    if (squareDiv) {
        squareDiv.classList.add('selected');
    }
}

function showValidMoves(square) {
    const moves = chessGame.moves({ square, verbose: true });

    moves.forEach(move => {
        const targetSquare = document.querySelector(`[data-square="${move.to}"]`);
        if (targetSquare) {
            if (move.captured) {
                targetSquare.classList.add('valid-capture');
            } else {
                targetSquare.classList.add('valid-move');
            }
        }
    });
}

function clearHighlights() {
    document.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('selected', 'valid-move', 'valid-capture');
    });
}

function attemptMove(from, to) {
    // Check if it's a pawn promotion
    const piece = chessGame.get(from);
    let promotion = undefined;

    if (piece && piece.type === 'p') {
        const toRank = to[1];
        if ((piece.color === 'w' && toRank === '8') ||
            (piece.color === 'b' && toRank === '1')) {
            promotion = 'q'; // Auto-promote to queen for now
        }
    }

    const move = { from, to, promotion };

    socket.emit('makeMove', { gameId: currentGame, move }, (response) => {
        if (response.success) {
            // Move accepted
            const isCapture = chessGame.get(move.to) !== null;
            playSound(isCapture ? 'capture' : 'move');

            chessGame.move(move);
            renderBoard();
            updateMoveHistory();
            updateFEN();
            updateGameStatus();
        } else {
            alert('Invalid move: ' + response.error);
        }

        clearHighlights();
        selectedSquare = null;
    });
}

// ===== MOVE HANDLING =====
socket.on('moveMade', (data) => {
    // Check for capture before moving for sound
    const isCapture = chessGame.get(data.move.to) !== null || (data.move.flags && data.move.flags.includes('e')); // 'e' is en passant
    playSound(isCapture ? 'capture' : 'move');

    chessGame.move(data.move);
    renderBoard();
    updateMoveHistory();
    updateFEN();
    updateGameStatus();
    updateClocks(data.clocks);
});

function updateMoveHistory() {
    const movesList = document.getElementById('movesList');
    const history = chessGame.history({ verbose: true });

    movesList.innerHTML = '';

    for (let i = 0; i < history.length; i += 2) {
        const moveRow = document.createElement('div');
        moveRow.className = 'move-row';

        const moveNum = document.createElement('span');
        moveNum.className = 'move-number';
        moveNum.textContent = `${Math.floor(i / 2) + 1}.`;

        const whiteMove = document.createElement('span');
        whiteMove.textContent = history[i].san;

        const blackMove = document.createElement('span');
        if (history[i + 1]) {
            blackMove.textContent = history[i + 1].san;
        }

        moveRow.appendChild(moveNum);
        moveRow.appendChild(whiteMove);
        moveRow.appendChild(blackMove);
        movesList.appendChild(moveRow);
    }

    // Scroll to bottom
    movesList.scrollTop = movesList.scrollHeight;
}

function updateFEN() {
    document.getElementById('fenDisplay').value = chessGame.fen();
}

function updateGameStatus() {
    const statusBox = document.getElementById('gameStatus');
    const currentTurn = chessGame.turn();
    const myTurn = (currentTurn === 'w' && playerColor === 'white') ||
        (currentTurn === 'b' && playerColor === 'black');

    // Update player info highlighting
    document.querySelectorAll('.player-info').forEach(info => {
        info.classList.remove('active');
    });

    if (myTurn) {
        document.querySelector('.your-info').classList.add('active');
        statusBox.innerHTML = '<div class="status-indicator"></div><span>Your turn</span>';
    } else {
        document.querySelector('.opponent-info').classList.add('active');
        statusBox.innerHTML = '<div class="status-indicator"></div><span>Opponent\'s turn</span>';
    }

    if (chessGame.inCheck()) {
        statusBox.innerHTML += ' <span style="color: var(--danger);">- CHECK!</span>';
    }
}

// ===== CLOCK MANAGEMENT =====
let gameClocks = { white: 300000, black: 300000 };
let lastUpdateTime = Date.now();

function updateClocks(clocks) {
    gameClocks = clocks;
    lastUpdateTime = Date.now();
    displayClocks();
}

function displayClocks() {
    const yourClockEl = document.getElementById('yourClock');
    const opponentClockEl = document.getElementById('opponentClock');

    yourClockEl.textContent = formatTime(gameClocks[playerColor]);
    const opponentColor = playerColor === 'white' ? 'black' : 'white';
    opponentClockEl.textContent = formatTime(gameClocks[opponentColor]);

    // Add low time warning
    if (gameClocks[playerColor] < 30000) {
        yourClockEl.classList.add('low-time');
    } else {
        yourClockEl.classList.remove('low-time');
    }

    if (gameClocks[opponentColor] < 30000) {
        opponentClockEl.classList.add('low-time');
    } else {
        opponentClockEl.classList.remove('low-time');
    }
}

function startClockTicking() {
    if (clockInterval) {
        clearInterval(clockInterval);
    }

    clockInterval = setInterval(() => {
        if (!chessGame || chessGame.isGameOver()) {
            clearInterval(clockInterval);
            return;
        }

        const currentTurn = chessGame.turn();
        const currentColor = currentTurn === 'w' ? 'white' : 'black';

        const elapsed = Date.now() - lastUpdateTime;
        gameClocks[currentColor] -= elapsed;
        lastUpdateTime = Date.now();

        displayClocks();

        if (gameClocks[currentColor] <= 0) {
            // Time ran out
            clearInterval(clockInterval);
        }
    }, 100);
}

// ===== BOARD THEMES =====
document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        const theme = this.dataset.theme;
        document.getElementById('chessboard').dataset.theme = theme;
    });
});

// ===== GAME ACTIONS =====
document.getElementById('offerDrawBtn').addEventListener('click', () => {
    if (confirm('Offer a draw to your opponent?')) {
        socket.emit('offerDraw', { gameId: currentGame });
    }
});

socket.on('drawOffered', () => {
    if (confirm('Your opponent offers a draw. Accept?')) {
        socket.emit('acceptDraw', { gameId: currentGame });
    }
});

document.getElementById('resignBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to resign?')) {
        socket.emit('resign', { gameId: currentGame });
    }
});

document.getElementById('exportPGNBtn').addEventListener('click', () => {
    const pgn = chessGame.pgn();
    const blob = new Blob([pgn], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess-game-${currentGame}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('copyFEN').addEventListener('click', () => {
    const fen = chessGame.fen();
    navigator.clipboard.writeText(fen).then(() => {
        const btn = document.getElementById('copyFEN');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
});

// ===== GAME OVER =====
socket.on('gameOver', (result) => {
    if (clockInterval) {
        clearInterval(clockInterval);
    }

    const modal = document.getElementById('gameOverModal');
    const title = document.getElementById('gameOverTitle');
    const icon = document.getElementById('gameOverIcon');
    const message = document.getElementById('gameOverMessage');
    const details = document.getElementById('gameOverDetails');

    if (result.winner === playerColor) {
        title.textContent = 'Victory!';
        icon.textContent = '👑';
        message.textContent = 'You won!';
    } else if (result.winner === null) {
        title.textContent = 'Draw';
        icon.textContent = '🤝';
        message.textContent = 'Game drawn';
    } else {
        title.textContent = 'Defeat';
        icon.textContent = '😔';
        message.textContent = 'You lost';
    }

    const reasonText = {
        'checkmate': 'by checkmate',
        'timeout': 'on time',
        'resignation': 'by resignation',
        'abandonment': 'by abandonment',
        'agreement': 'by agreement',
        'stalemate': 'by stalemate',
        'repetition': 'by threefold repetition',
        'insufficient_material': 'by insufficient material',
        'draw': 'by draw'
    };

    details.textContent = reasonText[result.reason] || '';

    modal.classList.add('active');
});

document.getElementById('newGameBtn').addEventListener('click', () => {
    document.getElementById('gameOverModal').classList.remove('active');
    showScreen('createGame');
});

document.getElementById('backToMenuBtn').addEventListener('click', () => {
    document.getElementById('gameOverModal').classList.remove('active');
    showScreen('menu');
});

// ===== CONNECTION STATUS =====
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    // Show disconnected status in the UI instead of blocking alert
    const statusBox = document.getElementById('gameStatus');
    if (statusBox) {
        statusBox.innerHTML = '<div class="status-indicator" style="background: var(--danger)"></div><span>Connection Lost... Reconnecting</span>';
    }
});

socket.on('connect_error', (err) => {
    console.log('Connection error:', err);
});
