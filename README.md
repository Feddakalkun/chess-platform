# 🎯 Advanced Chess Platform

A stunning, modern multiplayer chess platform with **Chess960 (Fischer Random)** support, real-time gameplay, and beautiful aesthetics.

![Chess Platform](https://img.shields.io/badge/Chess-960-blue) ![Node.js](https://img.shields.io/badge/Node.js-18+-green) ![Socket.io](https://img.shields.io/badge/Socket.io-4.6-orange)

## ✨ Features

- ♟️ **Multiple Chess Variants**
  - Classical Chess
  - **Chess960 (Fischer Random)** - All 960 starting positions
  - Custom positions (FEN support)

- ⏱️ **Flexible Time Controls**
  - Bullet (1+0)
  - Blitz (5+0)
  - Rapid (10+0)
  - Classical (30+0)
  - Custom time + increment

- 🌐 **Real-time Multiplayer**
  - WebSocket-based instant move synchronization
  - Room-based system with shareable codes
  - Spectator mode support

- 🎨 **Beautiful Modern UI**
  - Glassmorphism design
  - Dark theme with vibrant accents
  - Smooth animations & transitions
  - Multiple board themes (Classic, Modern, Wood, Neon)
  - Responsive design for all devices

- 📊 **Game Features**
  - Full move history
  - PGN export
  - FEN display & copy
  - Draw offers
  - Resignation
  - Automatic checkmate/stalemate/draw detection

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Modern web browser

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Start the server:**
```bash
npm start
```

3. **Open your browser:**
```
http://localhost:3000
```

### For Development
```bash
npm run dev
```
This uses nodemon for auto-restart on file changes.

## 🎮 How to Play

### Create a Game
1. Click **"Create New Game"**
2. Choose your chess variant (Classical or Chess960)
3. Select time control
4. Click **"Create Game & Get Room Code"**
5. Share the room code with your friend!

### Join a Game
1. Click **"Join Game"**
2. Enter the room code shared by your friend
3. Start playing!

### Chess960 (Fischer Random)
Chess960 randomizes the starting position of the pieces on the back rank, following these rules:
- Bishops must be on opposite colors
- King must be between the two rooks
- 960 possible starting positions (numbered 0-959)

You can:
- Use a specific position number (0-959)
- Click "Random" for a random position
- Leave blank for a random position

## 🎨 Board Themes

Choose from 4 beautiful board themes:
- **Classic** - Traditional brown board
- **Modern** - Sleek gray tones
- **Wood** - Warm wooden aesthetic
- **Neon** - Futuristic dark theme

## 🌐 Deployment

### Deploy to Railway.app (FREE)
1. Create account at [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your repo
4. Railway auto-detects and deploys!

### Deploy to Render.com (FREE)
1. Create account at [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your repo
4. Build command: `npm install`
5. Start command: `npm start`
6. Click "Create Web Service"

### Deploy to Fly.io (FREE)
```bash
# Install flyctl
npm install -g flyctl

# Login
flyctl auth login

# Deploy
flyctl launch
flyctl deploy
```

## 🛠️ Technical Stack

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Chess Logic**: Chess.js
- **Real-time**: WebSockets (Socket.io)
- **Styling**: Custom CSS with modern design patterns

## 🎯 Game Rules

### Classical Chess
Standard FIDE chess rules apply.

### Chess960 (Fischer Random)
- Same rules as classical chess
- Randomized starting position
- Castling works differently:
  - King and rook end up on the same squares as in classical chess (king on g/c-file, rook on f/d-file)
  - Possible even if pieces are already on target squares

### Time Controls
- Clock starts when the black player joins
- Each move adds the increment time
- Game ends when time runs out (flag fall)

## 📝 Keyboard Shortcuts

While in game:
- Click piece → Click destination to move
- Click selected piece again to deselect

## 🐛 Troubleshooting

**Port already in use:**
```bash
# Change port in server.js or set environment variable
PORT=3001 npm start
```

**Connection issues:**
- Check firewall settings
- Ensure WebSocket connections are allowed
- Try a different browser

**Game not starting:**
- Ensure both players are connected
- Check browser console for errors
- Refresh and try again

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

MIT License - feel free to use for personal or commercial projects!

## 🎉 Enjoy!

Have fun playing chess with your friends! Whether it's a quick bullet game or a strategic classical match, enjoy the beautiful interface and smooth gameplay!

---

**Made with ❤️ and ♟️**
