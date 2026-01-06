---
theme: seriph
background: https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1920
title: Pixel Down - Multiplayer Arena Game
class: text-center
transition: slide-left
mdc: true
---

# Pixel Down

### Real-Time Multiplayer Pixel Arena Game

<div class="pt-12">
  <span class="px-4 py-2 rounded bg-white bg-opacity-10">
    Web Introduction Class - Final Project
  </span>
</div>

<div class="abs-br m-6 text-sm opacity-50">
  pixel-down.vercel.app
</div>

---

# Project Overview

<div class="grid grid-cols-2 gap-12 pt-4">

<div>

### What is Pixel Down?

A browser-based multiplayer arena shooter where players compete in real-time matches. Features both online multiplayer and an offline mode with AI opponents.

**Core Concept:**
- Fast-paced combat gameplay
- Coin-based economy system
- In-game shop with power-ups
- Persistent player statistics

</div>

</div>

---

# Tech Stack

<div class="grid grid-cols-2 gap-12 pt-8">

<div>

### Frontend

| Technology | Purpose |
|------------|---------|
| Next.js 15 | React framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| HTML Canvas | Game rendering |

</div>

<div>

### Backend

| Technology | Purpose |
|------------|---------|
| Node.js | Server runtime |
| Socket.IO | Real-time sync |
| TypeScript | Type safety |

### Architecture

- WebSocket connections for live gameplay
- REST API for authentication
- PostgreSQL for data persistence

</div>

</div>

---
layout: center
---

# System Architecture

```mermaid {scale: 0.65}
flowchart LR
    subgraph Client["Browser Client"]
        UI[React UI]
        Canvas[Game Canvas]
        State[Local State]
    end
    
    subgraph Server["Game Server"]
        Socket[Socket.IO]
        Loop[Game Loop]
        Physics[Collision Detection]
    end
    
    subgraph DB["Supabase"]
        Auth[Authentication]
        PG[(PostgreSQL)]
    end
    
    UI --> Canvas
    Canvas --> State
    State <-->|WebSocket| Socket
    Socket --> Loop
    Loop --> Physics
    UI <-->|REST| Auth
    Auth --> PG
```

---

# Multiplayer Mode

<div class="grid grid-cols-2 gap-8">

<div>

### Features

- Create or join game rooms with unique IDs
- Real-time player position synchronization
- Server-authoritative game state
- Up to 10 players per match
- 10-minute match duration
- Live leaderboard updates

### How It Works

1. Player creates a room or joins with ID
2. Socket.IO establishes WebSocket connection
3. Server runs game loop at 60 FPS
4. Client sends inputs, receives game state
5. Canvas renders interpolated positions

</div>

<div>

<img src="/screenshots/lobby.png" class="rounded-lg shadow-xl" />

</div>

</div>

---

# Offline Mode

<div class="grid grid-cols-2 gap-8">

<div>

### Bot System

When the backend server is unavailable, players can still enjoy the game against bot opponents.

**Bot Behavior:**
- Patrol state: Random movement
- Chase state: Follow player within range
- Attack state: Stop and shoot at player

**Bot Parameters:**
- Chase range: 600 pixels
- Attack range: 250 pixels
- Stop distance: 120 pixels
- Spawn interval: 20 seconds

</div>

<div>

<img src="/screenshots/offline.png" class="rounded-lg shadow-xl mb-4" />

<img src="/screenshots/bots.png" class="rounded-lg shadow-xl" />

</div>

</div>

---

# Combat and Economy

<div class="grid grid-cols-3 gap-6 pt-4">

<div class="p-4 bg-gray-800 rounded-lg">

### Combat System

- Click to shoot projectiles
- Projectiles travel in aim direction
- Each kill awards 50 coins
- 5-second respawn timer
- Health: 100 HP
- Mana: 100 (regenerates)

</div>

<div class="p-4 bg-gray-800 rounded-lg">

### Coin Drops

- Coins drop where enemies die
- Walk over coins to collect
- 30-second expiration timer
- Coins saved to database
- Persist between sessions

</div>

<div class="p-4 bg-gray-800 rounded-lg">

### Shop Buffs

| Buff | Cost | Effect |
|------|------|--------|
| Speed | 50 | +50% movement |
| Mana | 75 | +100% regen |
| Power | 100 | +100% damage |
| Shield | 60 | -25% damage taken |

</div>

</div>

<div class="pt-6">
<img src="/screenshots/shop.png" class="rounded-lg shadow-xl h-40 mx-auto" />
</div>

---

# Authentication

<div class="grid grid-cols-2 gap-8">

<div>

### Supabase Integration

- Email and password authentication
- Email verification required
- Secure session management
- Automatic token refresh

### Database Schema

**player_stats table:**
- user_id (UUID)
- coins (integer)
- total_kills (integer)
- games_played (integer)

**matches table:**
- match_id, created_at, duration
- match_players (join table)

</div>

<div>

<img src="/screenshots/login.png" class="rounded-lg shadow-xl mb-4" />

<img src="/screenshots/profile.png" class="rounded-lg shadow-xl" />

</div>

</div>

---

# Backend Health Detection

<div class="grid grid-cols-2 gap-8">

<div>

### Smart Fallback

The application automatically detects backend availability and adjusts the UI accordingly.

**When Online:**
- Show "Create Game" button
- Show "Join Game" option
- Enable multiplayer features

**When Offline:**
- Display warning banner
- Show "Play Offline" button
- Bot mode available

### Implementation

- Health check on page load
- 2 retry attempts
- 2-second timeout per attempt
- Graceful degradation

</div>

<div>

<img src="/screenshots/online-status.png" class="rounded-lg shadow-xl mb-4" />

<img src="/screenshots/offline-status.png" class="rounded-lg shadow-xl" />

</div>

</div>

---

# Game Canvas

<div class="grid grid-cols-2 gap-8">

<div>

### Rendered Elements

| Element | Description |
|---------|-------------|
| Players | Colored cubes with aim indicator |
| Bots | Red cubes with programmed behavior |
| Projectiles | Small circles traveling |
| Obstacles | Gray rectangular blocks |
| Shops | Glowing circular areas |
| Coins | Yellow collectibles |

### Camera System

- Viewport: 1600 x 1066 pixels
- Arena size: 2400 x 1600 pixels
- Camera follows player center
- Smooth scrolling at edges

</div>

<div>

<img src="/screenshots/gameplay.png" class="rounded-lg shadow-xl" />

</div>

</div>

---

# Challenges and Solutions

<div class="grid grid-cols-2 gap-8 pt-4">

<div>

### Challenges

1. **State synchronization** - Keeping all clients in sync with server state

2. **Next.js hydration** - Canvas component caused SSR mismatch errors

3. **Bot AI tuning** - Bots were either too aggressive or too passive

4. **Input handling** - Keyboard events conflicting with UI elements

5. **Performance** - Canvas redraw causing frame drops

</div>

<div>

### Solutions

1. **Server-authoritative model** - Server is source of truth, clients interpolate

2. **Dynamic imports** - Load game component only on client side

3. **State machine** - Separate patrol/chase/attack behaviors with ranges

4. **Focus management** - Proper event listener cleanup and dependencies

5. **RequestAnimationFrame** - Delta time for consistent updates

</div>

</div>

---

# Live Demo

<div class="text-center pt-8">

### Try it now

<div class="text-4xl font-bold text-blue-400 py-6">
  pixel-down.vercel.app
</div>

<div class="grid grid-cols-3 gap-6 text-left max-w-4xl mx-auto">

<div class="p-4 bg-gray-800 rounded-lg">

**Create Account**

1. Visit the website
2. Click Get Started
3. Enter email and password
4. Verify your email

</div>

<div class="p-4 bg-gray-800 rounded-lg">

**Play Multiplayer**

1. Click Create Game
2. Share the game ID
3. Wait for others to join
4. Start the match

</div>

<div class="p-4 bg-gray-800 rounded-lg">

**Play Offline**

1. Click Offline Mode
2. Fight against bots
3. Collect coins from kills
4. Buy power-ups at shop

</div>

</div>

</div>

---

# Future Vision

<div class="grid grid-cols-2 gap-12 pt-8">

<div class="p-6 bg-gray-800 rounded-lg">

### Crypto Token Integration

If we scale this project, the in-game coins could become a cryptocurrency token deployed on **Solana**.

- Fast transactions, low fees
- Players own their coins
- Trade coins outside the game
- Real value for gameplay rewards

</div>

<div class="p-6 bg-gray-800 rounded-lg">

### Player Avatars

Unique player avatars that can be purchased to stand out from other players.

- Custom skins and colors
- Rare and limited editions
- Marketplace for trading
- Show off your style in matches

</div>

</div>

---
layout: center
class: text-center
---

# Thank You

<div class="pt-8 text-xl">
  Questions?
</div>

<div class="pt-12 text-gray-400">

**GitHub:** github.com/Samer-Gassouma/Pixel-down

**Live:** pixel-down.vercel.app

</div>
