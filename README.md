# Pixel Down

A real-time multiplayer pixel shooter game. Play with up to 4 players in procedurally generated arenas, collect coins, and progress through persistent accounts.

## Overview

Game built with Next.js (frontend) and Node.js/Express (backend) using WebSocket synchronization. All graphics are procedurally generated—no image assets.

## Features

- Real-time multiplayer gameplay with up to 4 players
- Procedurally generated maps with obstacles
- Live leaderboard during matches
- Player authentication with Supabase
- Shop system for in-game upgrades
- Match history and statistics tracking
- Persistent player coins across sessions

## Gameplay

Controls: WASD to move, mouse to aim, click to shoot.

Start with 100 health and 100 mana. Each shot costs 25 mana (regenerates at 20/second). Base damage is 10 per hit, scaling +2 for each kill. Respawn after 60 seconds when defeated.

## Tech Stack

Frontend: Next.js 16, React 19, Tailwind CSS, Canvas API, Socket.IO Client, TypeScript

Backend: Node.js, Express.js, Socket.IO, TypeScript

Database: Supabase PostgreSQL

## Setup

Prerequisites: Node.js 18+

```bash
# Backend (Terminal 1)
cd backend
npm install
npm run dev
# Runs on http://localhost:3001

# Frontend (Terminal 2)
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

## Environment Variables

Frontend (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Backend (`.env`):
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

## Troubleshooting

- Can't connect to backend: Verify `npm run dev` is running in the backend folder
- No other players visible: Check both clients connect successfully
- Shooting not working: Check you have mana and are not defeated

## Project Info

Built as university coursework project. Both frontend and backend run locally on ports 3000 and 3001.

## License

Educational use only.
