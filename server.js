const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { Chess } = require('chess.js');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files
app.use(express.static('public'));

// Store active games
const games = new Map();

// Chess960 starting position generator
function generateChess960Position(positionNumber) {
    if (positionNumber === undefined) {
        positionNumber = Math.floor(Math.random() * 960);
    }

    // Implementation of Chess960 position generation
    const pieces = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    const back_rank = new Array(8);

    // Place bishops on opposite colors
    const light_square_bishops = [1, 3, 5, 7];
    const dark_square_bishops = [0, 2, 4, 6];

    let n = positionNumber;

    // Bishop on light square
    const b1_index = n % 4;
    back_rank[light_square_bishops[b1_index]] = 'b';
    n = Math.floor(n / 4);

    // Bishop on dark square
    const b2_index = n % 4;
    back_rank[dark_square_bishops[b2_index]] = 'b';
    n = Math.floor(n / 4);

    // Queen
    const empty_squares_1 = back_rank.map((p, i) => p === undefined ? i : -1).filter(i => i >= 0);
    const q_index = n % empty_squares_1.length;
    back_rank[empty_squares_1[q_index]] = 'q';
    n = Math.floor(n / empty_squares_1.length);

    // Knights
    const empty_squares_2 = back_rank.map((p, i) => p === undefined ? i : -1).filter(i => i >= 0);
    const knight_positions = [
        [0, 1], [0, 2], [0, 3], [0, 4],
        [1, 2], [1, 3], [1, 4],
        [2, 3], [2, 4],
        [3, 4]
    ];

    const [n1_idx, n2_idx] = knight_positions[n];
    back_rank[empty_squares_2[n1_idx]] = 'n';
    back_rank[empty_squares_2[n2_idx]] = 'n';

    // Rook, King, Rook in remaining squares
    const empty_squares_3 = back_rank.map((p, i) => p === undefined ? i : -1).filter(i => i >= 0);
    back_rank[empty_squares_3[0]] = 'r';
    back_rank[empty_squares_3[1]] = 'k';
    back_rank[empty_squares_3[2]] = 'r';

    // Create FEN
    const white_back = back_rank.join('').toUpperCase();
    const black_back = back_rank.join('');
    const fen = `${black_back}/pppppppp/8/8/8/8/PPPPPPPP/${white_back} w KQkq - 0 1`;

    return { fen, positionNumber };
}

// Game configuration presets
const TIME_CONTROLS = {
    bullet: { time: 60, increment: 0 },
    blitz: { time: 300, increment: 0 },
    rapid: { time: 600, increment: 0 },
    classical: { time: 1800, increment: 0 },
    custom: null
};

// Create new game
function createGame(config) {
    // Generate a simple 4-digit room code (1000-9999)
    // This is much easier to share than a UUID!
    let gameId = Math.floor(1000 + Math.random() * 9000).toString();

    // Ensure uniqueness (extremely unlikely to collide with low traffic, but good practice)
    while (games.has(gameId)) {
        gameId = Math.floor(1000 + Math.random() * 9000).toString();
    }

    let chess;
    let startPosition = null;

    if (config.variant === 'chess960') {
        const { fen, positionNumber } = generateChess960Position(config.chess960Position);
        chess = new Chess(fen);
        startPosition = { fen, positionNumber, variant: 'chess960' };
    } else if (config.customFen) {
        chess = new Chess(config.customFen);
        startPosition = { fen: config.customFen, variant: 'custom' };
    } else {
        chess = new Chess();
        startPosition = { fen: chess.fen(), variant: 'standard' };
    }

    const game = {
        id: gameId,
        chess,
        players: {},
        spectators: new Set(),
        config: {
            variant: config.variant || 'standard',
            timeControl: config.timeControl || 'blitz',
            timeLimit: config.timeLimit || 300,
            increment: config.increment || 0,
            rated: config.rated || false
        },
        startPosition,
        moveHistory: [],
        clocks: {
            white: config.timeLimit * 1000 || 300000,
            black: config.timeLimit * 1000 || 300000
        },
        lastMoveTime: null,
        gameStarted: false,
        gameOver: false,
        result: null,
        createdAt: Date.now()
    };

    games.set(gameId, game);
    return game;
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Create game room
    socket.on('createGame', (config, callback) => {
        const game = createGame(config);
        socket.join(game.id);
        game.players.white = { id: socket.id, name: config.playerName || 'Player 1' };

        callback({
            success: true,
            gameId: game.id,
            color: 'white',
            config: game.config,
            startPosition: game.startPosition
        });

        console.log(`Game created: ${game.id} by ${socket.id}`);
    });

    // Join existing game
    socket.on('joinGame', (data, callback) => {
        const game = games.get(data.gameId);

        if (!game) {
            callback({ success: false, error: 'Game not found' });
            return;
        }

        if (game.gameStarted) {
            // Join as spectator
            socket.join(data.gameId);
            game.spectators.add(socket.id);
            callback({
                success: true,
                color: 'spectator',
                gameState: getGameState(game)
            });
            return;
        }

        if (!game.players.black) {
            socket.join(data.gameId);
            game.players.black = { id: socket.id, name: data.playerName || 'Player 2' };
            game.gameStarted = true;
            game.lastMoveTime = Date.now();

            callback({
                success: true,
                color: 'black',
                gameState: getGameState(game)
            });

            // Notify white player that game is starting
            io.to(game.players.white.id).emit('gameStart', getGameState(game));

            console.log(`Game started: ${game.id}`);
        } else {
            callback({ success: false, error: 'Game is full' });
        }
    });

    // Make move
    socket.on('makeMove', (data, callback) => {
        const game = games.get(data.gameId);

        if (!game) {
            callback({ success: false, error: 'Game not found' });
            return;
        }

        if (game.gameOver) {
            callback({ success: false, error: 'Game is over' });
            return;
        }

        // Verify it's the player's turn
        const currentTurn = game.chess.turn();
        const playerColor = game.players.white.id === socket.id ? 'white' : 'black';

        if ((currentTurn === 'w' && playerColor !== 'white') ||
            (currentTurn === 'b' && playerColor !== 'black')) {
            callback({ success: false, error: 'Not your turn' });
            return;
        }

        // Update clock
        if (game.lastMoveTime) {
            const elapsed = Date.now() - game.lastMoveTime;
            const currentColor = currentTurn === 'w' ? 'white' : 'black';
            game.clocks[currentColor] -= elapsed;

            if (game.clocks[currentColor] <= 0) {
                game.gameOver = true;
                game.result = {
                    winner: currentColor === 'white' ? 'black' : 'white',
                    reason: 'timeout'
                };
                io.to(game.id).emit('gameOver', game.result);
                callback({ success: false, error: 'Time ran out' });
                return;
            }

            // Add increment
            game.clocks[currentColor] += game.config.increment * 1000;
        }

        // Try to make the move
        try {
            const move = game.chess.move(data.move);

            if (move) {
                game.moveHistory.push({
                    move: move,
                    fen: game.chess.fen(),
                    timestamp: Date.now()
                });

                game.lastMoveTime = Date.now();

                // Check for game over
                if (game.chess.isGameOver()) {
                    game.gameOver = true;

                    if (game.chess.isCheckmate()) {
                        game.result = {
                            winner: game.chess.turn() === 'w' ? 'black' : 'white',
                            reason: 'checkmate'
                        };
                    } else if (game.chess.isDraw()) {
                        game.result = { winner: null, reason: 'draw' };
                    } else if (game.chess.isStalemate()) {
                        game.result = { winner: null, reason: 'stalemate' };
                    } else if (game.chess.isThreefoldRepetition()) {
                        game.result = { winner: null, reason: 'repetition' };
                    } else if (game.chess.isInsufficientMaterial()) {
                        game.result = { winner: null, reason: 'insufficient_material' };
                    }

                    io.to(game.id).emit('gameOver', game.result);
                }

                callback({ success: true, move: move });

                // Broadcast move to other players
                socket.to(game.id).emit('moveMade', {
                    move: move,
                    fen: game.chess.fen(),
                    clocks: game.clocks
                });

            } else {
                callback({ success: false, error: 'Illegal move' });
            }
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // Resign
    socket.on('resign', (data) => {
        const game = games.get(data.gameId);
        if (game && !game.gameOver) {
            const playerColor = game.players.white.id === socket.id ? 'white' : 'black';
            game.gameOver = true;
            game.result = {
                winner: playerColor === 'white' ? 'black' : 'white',
                reason: 'resignation'
            };
            io.to(game.id).emit('gameOver', game.result);
        }
    });

    // Offer draw
    socket.on('offerDraw', (data) => {
        const game = games.get(data.gameId);
        if (game && !game.gameOver) {
            socket.to(game.id).emit('drawOffered');
        }
    });

    // Accept draw
    socket.on('acceptDraw', (data) => {
        const game = games.get(data.gameId);
        if (game && !game.gameOver) {
            game.gameOver = true;
            game.result = { winner: null, reason: 'agreement' };
            io.to(game.id).emit('gameOver', game.result);
        }
    });

    // Get game state
    socket.on('getGameState', (gameId, callback) => {
        const game = games.get(gameId);
        if (game) {
            callback(getGameState(game));
        } else {
            callback(null);
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);

        // Find and handle abandoned games
        games.forEach((game, gameId) => {
            if (game.players.white?.id === socket.id || game.players.black?.id === socket.id) {
                if (!game.gameOver) {
                    const playerColor = game.players.white.id === socket.id ? 'white' : 'black';
                    game.gameOver = true;
                    game.result = {
                        winner: playerColor === 'white' ? 'black' : 'white',
                        reason: 'abandonment'
                    };
                    io.to(gameId).emit('gameOver', game.result);
                }
            }
            game.spectators.delete(socket.id);
        });
    });
});

// Helper function to get game state
function getGameState(game) {
    return {
        id: game.id,
        fen: game.chess.fen(),
        pgn: game.chess.pgn(),
        turn: game.chess.turn(),
        moveHistory: game.moveHistory,
        players: game.players,
        config: game.config,
        startPosition: game.startPosition,
        clocks: game.clocks,
        gameOver: game.gameOver,
        result: game.result,
        inCheck: game.chess.inCheck(),
        isCheckmate: game.chess.isCheckmate(),
        isDraw: game.chess.isDraw(),
        isStalemate: game.chess.isStalemate()
    };
}

// Cleanup old games periodically
setInterval(() => {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    games.forEach((game, gameId) => {
        if (now - game.createdAt > maxAge && game.gameOver) {
            games.delete(gameId);
            console.log(`Cleaned up old game: ${gameId}`);
        }
    });
}, 60 * 60 * 1000); // Run every hour

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Chess server running on port ${PORT}`);
});
