# Chess vs AI

A full-stack Chess vs AI application built with Node.js, Express, and EJS.
Features:
- Play Chess against an AI (Stockfish or Random Fallback).
- Server-side move validation and state management.
- AJAX-based board updates with server-side HTML rendering.
- Move history and game status indicators.

## Prerequisites
- Node.js (v14 or higher)
- npm

## Installation
1. Navigate to the project directory:
   ```
   cd c:\My_Projects\JavaScript\chess
   ```
2. Install dependencies:
   ```
   npm install
   ```
   Note: This installs `express`, `ejs`, `chess.js`, `express-session`, `stockfish`.

## Running the Application
1. Start the server:
   ```
   npm start
   ```
   Or directly:
   ```
   node app.js
   ```
2. Open your browser and go to:
   [http://localhost:3000](http://localhost:3000)

## How to Play
- Click on a White piece (bottom) to select it.
- Click on a valid destination square to move.
- The AI (Black) will respond automatically.
- Game status (Check, Checkmate, Draw) is displayed above the board.
- Click "Restart Game" to start over.

## Structure
- `app.js`: Main server entry point.
- `routes/`: Express routes.
- `controllers/`: Request handlers.
- `services/`: Chess logic and AI integration.
- `views/`: EJS templates (server-side rendering).
- `public/`: Static assets (CSS, JS).
