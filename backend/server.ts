import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Enable CORS for express
app.use(cors());

// Initialize Supabase client (using anon key, same as frontend)
const supabaseUrl = process.env.SUPABASE_URL || 'https://fnfamiooskpvtqjasqga.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZmFtaW9vc2twdnRxamFzcWdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNzI1MTIsImV4cCI6MjA4Mjg0ODUxMn0.I1Ygm5v6hD0M0TvHAdt9t8YKIEDg7kAXrTc8P35nzZc';
const supabase = createClient(supabaseUrl, supabaseKey);

// Types and Constants
const ARENA_WIDTH = 2400;
const ARENA_HEIGHT = 1600;
const PLAYER_SIZE = 14;
const MAX_HEALTH = 100;
const MAX_MANA = 100;
const MANA_REGEN_RATE = 20; // per second
const MANA_COST_PER_SHOT = 25;
const PROJECTILE_SPEED = 520;
const FIRE_COOLDOWN = 180; // milliseconds between shots
const RESPAWN_TIME = 60000; // 60 seconds
const BASE_DAMAGE = 10;
const MATCH_DURATION = 600000; // 10 minutes in milliseconds
const MAP_CHANGE_INTERVAL = 120000; // 2 minutes in milliseconds
const POST_MATCH_DELAY = 30000; // 30 seconds before creating new game

// Game ID management
let currentGameId = generateGameId();

function generateGameId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Shop buffs configuration
const BUFFS = {
  speed: { duration: 15000, multiplier: 1.5, price: 50 },
  mana: { duration: 20000, multiplier: 2, price: 75 },
  power: { duration: 15000, multiplier: 2, price: 100 },
  shield: { duration: 10000, value: 25, price: 60 }, // Adds 25% max health
};

const SHOP_RADIUS = 80;
const COIN_DROP_DURATION = 30000; // Coins last 30 seconds

interface Vec2 {
  x: number;
  y: number;
}

interface Player {
  id: string;
  userId?: string; // Supabase user ID
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  mana: number;
  kills: number;
  damage: number;
  color: string;
  isAlive: boolean;
  respawnTimer: number;
  moveForward: boolean;
  moveBackward: boolean;
  moveAngle: number;
  coins: number;
  buffs: { type: string; expiresAt: number }[];
  lastShotAt?: number;
}

interface Buff {
  type: 'speed' | 'mana' | 'power' | 'shield';
  duration: number; // milliseconds
  multiplier?: number;
  value?: number;
}

interface Shop {
  id: string;
  x: number;
  y: number;
  radius: number;
}

interface CoinDrop {
  id: string;
  x: number;
  y: number;
  value: number;
  expiresAt: number;
}

interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  playerId: string;
  damage: number;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GameState {
  players: Map<string, Player>;
  projectiles: Map<string, Projectile>;
  obstacles: Obstacle[];
  shops: Shop[];
  coinDrops: Map<string, CoinDrop>;
  leaderboard: Array<{ id: string; name: string; kills: number; coins: number; health: number; buffs?: { type: string; expiresAt: number }[] }>;
  gameStartTime: number;
  lastMapChangeTime: number;
  matchEnded: boolean;
  postMatchTimeout: NodeJS.Timeout | null;
  projectileCounter: number;
}

// Multiple games management
const games = new Map<string, GameState>();

function createNewGame(gameId: string): GameState {
  const obstacles = generateArenaObstacles();
  const shops = generateShops(obstacles);

  return {
    players: new Map(),
    projectiles: new Map(),
    obstacles,
    shops,
    coinDrops: new Map(),
    leaderboard: [],
    gameStartTime: Date.now(),
    lastMapChangeTime: Date.now(),
    matchEnded: false,
    postMatchTimeout: null,
    projectileCounter: 0,
  };
}

// Game state (deprecated, will be removed)
let gameState: GameState = {
  players: new Map(),
  projectiles: new Map(),
  obstacles: [],
  shops: [],
  coinDrops: new Map(),
  leaderboard: [],
  gameStartTime: Date.now(),
  lastMapChangeTime: Date.now(),
  matchEnded: false,
  postMatchTimeout: null,
  projectileCounter: 0,
};

let projectileCounter = 0;
let gameStartTime = Date.now();
let lastMapChangeTime = Date.now();
let matchEnded = false;
let postMatchTimeout: NodeJS.Timeout | null = null;

// Utility functions
function generateColor(): string {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A",
    "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function generateRandomName(): string {
  const prefixes = ["Swift", "Bold", "Shadow", "Blazing", "Silent", "Thunder"];
  const suffixes = ["Fox", "Wolf", "Eagle", "Dragon", "Tiger", "Bear"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix}${suffix}`;
}

function generateArenaObstacles(): Obstacle[] {
  const obstacles: Obstacle[] = [];
  // Create 12 obstacles with random positions and smaller sizes
  const numObstacles = 12;
  
  for (let i = 0; i < numObstacles; i++) {
    let validPosition = false;
    let obstacle: Obstacle | null = null;
    
    while (!validPosition) {
      const width = 40 + Math.random() * 60;   // 40-100px width (smaller)
      const height = 30 + Math.random() * 50;  // 30-80px height (smaller)
      const margin = 200;
      
      const x = Math.random() * (ARENA_WIDTH - width - margin * 2) + margin;
      const y = Math.random() * (ARENA_HEIGHT - height - margin * 2) + margin;
      
      obstacle = { x, y, width, height };
      
      // Check if too close to other obstacles
      let tooClose = false;
      for (const other of obstacles) {
        const dx = (x + width / 2) - (other.x + other.width / 2);
        const dy = (y + height / 2) - (other.y + other.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 200) {
          tooClose = true;
          break;
        }
      }
      
      if (!tooClose) {
        validPosition = true;
      }
    }
    
    if (obstacle) {
      obstacles.push(obstacle);
    }
  }
  
  return obstacles;
}

function generateShops(obstacles: Obstacle[]): Shop[] {
  const shops: Shop[] = [];
  const NUM_SHOPS = 1;
  const SHOP_SPAWN_MARGIN = 200; // Margin including shop radius
  
  for (let i = 0; i < NUM_SHOPS; i++) {
    let validLocation = false;
    let shopX = 0;
    let shopY = 0;
    
    while (!validLocation) {
      shopX = Math.random() * (ARENA_WIDTH - SHOP_SPAWN_MARGIN * 2) + SHOP_SPAWN_MARGIN;
      shopY = Math.random() * (ARENA_HEIGHT - SHOP_SPAWN_MARGIN * 2) + SHOP_SPAWN_MARGIN;
      
      // Check if far enough from obstacles
      let tooCloseToObstacle = false;
      for (const obstacle of obstacles) {
        const dx = shopX - (obstacle.x + obstacle.width / 2);
        const dy = shopY - (obstacle.y + obstacle.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 250) {
          tooCloseToObstacle = true;
          break;
        }
      }
      
      if (!tooCloseToObstacle) {
        validLocation = true;
      }
    }
    
    shops.push({
      id: `shop${i + 1}`,
      x: shopX,
      y: shopY,
      radius: SHOP_RADIUS,
    });
  }
  
  return shops;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getActiveBuff(player: Player, buffType: string): boolean {
  return player.buffs.some(b => b.type === buffType && b.expiresAt > Date.now());
}

function checkCollision(x: number, y: number, size: number, obstacles: Obstacle[]): boolean {
  // Check arena bounds
  if (x - size / 2 < 0 || x + size / 2 > ARENA_WIDTH ||
    y - size / 2 < 0 || y + size / 2 > ARENA_HEIGHT) {
    return true;
  }
  // Check obstacles
  for (const obstacle of obstacles) {
    if (!(x + size / 2 < obstacle.x || x - size / 2 > obstacle.x + obstacle.width ||
      y + size / 2 < obstacle.y || y - size / 2 > obstacle.y + obstacle.height)) {
      return true;
    }
  }
  return false;
}

function findValidSpawnLocation(obstacles: Obstacle[]): { x: number; y: number } {
  let attempts = 0;
  const maxAttempts = 200;
  const SPAWN_MARGIN = 50; // Keep spawn away from edges and obstacles
  
  while (attempts < maxAttempts) {
    // Spawn within safe margins
    const x = Math.random() * (ARENA_WIDTH - SPAWN_MARGIN * 2) + SPAWN_MARGIN;
    const y = Math.random() * (ARENA_HEIGHT - SPAWN_MARGIN * 2) + SPAWN_MARGIN;
    
    if (!checkCollision(x, y, PLAYER_SIZE, obstacles)) {
      return { x, y };
    }
    attempts++;
  }
  
  // Fallback to center (should rarely be needed)
  return { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 };
}

function updateLeaderboard(): void {
  const leaderboard = Array.from(gameState.players.values())
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 10)
    .map(p => ({
      id: p.id,
      name: p.name,
      kills: p.kills,
      coins: p.coins,
      health: p.health,
    }));
  gameState.leaderboard = leaderboard;
}

// Game loop - handles all active games
let lastUpdateTime = Date.now();
setInterval(() => {
  const now = Date.now();
  const deltaTime = (now - lastUpdateTime) / 1000;
  lastUpdateTime = now;

  // Clean up empty games
  for (const [gameId, game] of games) {
    if (game.players.size === 0) {
      console.log(`🗑️ Deleting empty game: ${gameId}`);
      if (game.postMatchTimeout) clearTimeout(game.postMatchTimeout);
      games.delete(gameId);
    }
  }

  // Update each game
  for (const [gameId, game] of games) {
    // Check if match has ended
    const elapsedTime = now - game.gameStartTime;
    if (elapsedTime > MATCH_DURATION && !game.matchEnded) {
      game.matchEnded = true;
      // Find winner
      const winner = Array.from(game.players.values()).reduce((a, b) => 
        a.kills > b.kills ? a : b
      );
      const nextGameId = generateGameId();
      
      // Prepare match data for database
      const playerResults = Array.from(game.players.values()).map(player => ({
        userId: player.userId || player.id,
        username: player.name,
        kills: player.kills,
        coinsEarned: player.coins - 50, // Coins earned this match (started with 50)
      }));
      
      // Emit ONLY to players in this game
      io.to(`game-${gameId}`).emit("matchEnded", {
        winner: winner ? { name: winner.name, kills: winner.kills } : null,
        nextGameId: nextGameId,
        matchData: {
          winnerId: winner?.userId || winner?.id,
          winnerName: winner?.name,
          durationSeconds: Math.floor(elapsedTime / 1000),
          playerResults: playerResults,
        },
      });
      
      // Schedule new game after 30 seconds
      if (game.postMatchTimeout) clearTimeout(game.postMatchTimeout);
      game.postMatchTimeout = setTimeout(() => {
        console.log(`🎮 Auto-restarting game: ${gameId}`);
        // Remove old game and create new one
        games.delete(gameId);
        const newGame = createNewGame(nextGameId);
        games.set(nextGameId, newGame);
        // Emit ONLY to players in the old game
        io.to(`game-${gameId}`).emit("gameReady", { gameId: nextGameId });
      }, POST_MATCH_DELAY);
    }

    // Check if map needs to change
    if (now - game.lastMapChangeTime > MAP_CHANGE_INTERVAL) {
      console.log(`🗺️ MAP CHANGED in game ${gameId}`);
      game.obstacles = generateArenaObstacles();
      game.shops = generateShops(game.obstacles);
      game.lastMapChangeTime = now;
      io.emit("mapChanged", { obstacles: game.obstacles });
    }

    // Update players in this game
    for (const player of game.players.values()) {
      if (!player.isAlive) {
        player.respawnTimer -= deltaTime * 1000;
        if (player.respawnTimer <= 0) {
          player.isAlive = true;
          player.health = MAX_HEALTH;
          player.mana = MAX_MANA;
          
          // Find a valid spawn location
          const spawnLocation = findValidSpawnLocation(game.obstacles);
          player.x = spawnLocation.x;
          player.y = spawnLocation.y;
          
          io.to(player.id).emit("respawned", { x: player.x, y: player.y });
        }
        continue;
      }

      // Direct, responsive movement (no sliding acceleration)
      let MAX_SPEED = 450; // pixels per second
      if (getActiveBuff(player, 'speed')) {
        MAX_SPEED *= 1.5;
      }

      let targetVx = 0;
      let targetVy = 0;
      if (player.moveForward) {
        targetVx = Math.cos(player.moveAngle) * MAX_SPEED;
        targetVy = Math.sin(player.moveAngle) * MAX_SPEED;
      } else if (player.moveBackward) {
        targetVx = Math.cos(player.moveAngle) * -MAX_SPEED;
        targetVy = Math.sin(player.moveAngle) * -MAX_SPEED;
      }

      player.vx = targetVx;
      player.vy = targetVy;

      if (!player.moveForward && !player.moveBackward) {
        player.vx *= 0.9;
        player.vy *= 0.9;
      }

      const newX = player.x + player.vx * deltaTime;
      const newY = player.y + player.vy * deltaTime;

      if (!checkCollision(newX, newY, PLAYER_SIZE, game.obstacles)) {
        player.x = newX;
        player.y = newY;
      } else {
        player.x = clamp(player.x, PLAYER_SIZE / 2, ARENA_WIDTH - PLAYER_SIZE / 2);
        player.y = clamp(player.y, PLAYER_SIZE / 2, ARENA_HEIGHT - PLAYER_SIZE / 2);
      }

      let manaRegen = MANA_REGEN_RATE;
      if (getActiveBuff(player, 'mana')) {
        manaRegen *= 2;
      }
      if (player.mana < MAX_MANA) {
        player.mana = Math.min(MAX_MANA, player.mana + manaRegen * deltaTime);
      }
    }

    // Update projectiles
    const projectilesToRemove: string[] = [];
    const VISION_RADIUS = 220;
    
    for (const [id, projectile] of game.projectiles) {
      projectile.x += projectile.vx * deltaTime;
      projectile.y += projectile.vy * deltaTime;

      const shooter = game.players.get(projectile.playerId);
      
      if (shooter) {
        const dx = projectile.x - shooter.x;
        const dy = projectile.y - shooter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > VISION_RADIUS) {
          projectilesToRemove.push(id);
          continue;
        }
      }

      if (projectile.x < 0 || projectile.x > ARENA_WIDTH ||
        projectile.y < 0 || projectile.y > ARENA_HEIGHT) {
        projectilesToRemove.push(id);
        continue;
      }

      for (const player of game.players.values()) {
        if (player.id === projectile.playerId || !player.isAlive) continue;

        const dx = projectile.x - player.x;
        const dy = projectile.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < PLAYER_SIZE / 2) {
          let damage = projectile.damage;
          
          if (getActiveBuff(player, 'shield')) {
            damage *= 0.75;
          }
          
          player.health -= damage;

          if (player.health <= 0) {
            player.health = 0;
            player.isAlive = false;
            player.respawnTimer = RESPAWN_TIME;

            const shooter = game.players.get(projectile.playerId);
            if (shooter) {
              shooter.kills += 1;
              const coinReward = 50;
              shooter.coins += coinReward;
            }

            io.emit("playerKilled", {
              killedId: player.id,
              killedName: player.name,
              killerId: projectile.playerId,
            });
          }

          projectilesToRemove.push(id);
          break;
        }
      }
    }

    for (const id of projectilesToRemove) {
      game.projectiles.delete(id);
    }

    // Clean up expired buffs and coin drops
    for (const player of game.players.values()) {
      if (player.isAlive) {
        player.buffs = player.buffs.filter(b => b.expiresAt > now);
        
        for (const [coinId, coin] of game.coinDrops) {
          const dx = player.x - coin.x;
          const dy = player.y - coin.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < PLAYER_SIZE) {
            player.coins += coin.value;
            game.coinDrops.delete(coinId);
          }
        }
      }
    }
    
    for (const [coinId, coin] of game.coinDrops) {
      if (coin.expiresAt < now) {
        game.coinDrops.delete(coinId);
      }
    }

    // Update leaderboard for this game
    const leaderboard = Array.from(game.players.values())
      .map(p => {
        const activeBuff = p.buffs.find(b => b.expiresAt > now);
        return {
          id: p.id,
          name: p.name,
          kills: p.kills,
          coins: p.coins,
          health: p.health,
          buffs: activeBuff ? [activeBuff] : []
        };
      })
      .sort((a, b) => b.kills - a.kills)
      .slice(0, 10);
    game.leaderboard = leaderboard;

    // Calculate times
    const matchElapsedTime = now - game.gameStartTime;
    const timeUntilMapChange = MAP_CHANGE_INTERVAL - (now - game.lastMapChangeTime);
    const timeUntilMatchEnd = MATCH_DURATION - matchElapsedTime;

    // Broadcast game state to this game
    const state = {
      players: Array.from(game.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        x: p.x,
        y: p.y,
        health: p.health,
        mana: p.mana,
        coins: p.coins,
        kills: p.kills,
        color: p.color,
        isAlive: p.isAlive,
        respawnTimer: p.respawnTimer,
        buffs: p.buffs,
      })),
      projectiles: Array.from(game.projectiles.values()),
      coinDrops: Array.from(game.coinDrops.values()),
      shops: game.shops,
      leaderboard: game.leaderboard,
      gameTime: matchElapsedTime,
      timeUntilMapChange: Math.max(0, timeUntilMapChange),
      timeUntilMatchEnd: Math.max(0, timeUntilMatchEnd),
    };

    io.emit("gameState", state);
  }
}, 1000 / 60); // 60 FPS

// Socket.IO event handlers
io.on("connection", (socket: Socket) => {
  console.log(`New player connected: ${socket.id}`);

  socket.on("joinGame", async (data: { gameId?: string; username?: string; userId?: string }, callback) => {
    const requestedGameId = data.gameId;
    const username = data.username || generateRandomName();
    const userId = data.userId;
    
    // Get or create game
    let game = games.get(requestedGameId!);
    
    if (!game) {
      // Game doesn't exist, create it
      game = createNewGame(requestedGameId!);
      games.set(requestedGameId!, game);
      console.log(`🎮 Created new game: ${requestedGameId}`);
    }
    
    // Check if game is full (4 player limit) or match has ended
    if (game.players.size >= 4 || game.matchEnded) {
      callback({ 
        success: false, 
        gameId: requestedGameId,
        reason: game.matchEnded ? "match_ended" : "game_full"
      });
      return;
    }
    
    // Create player
    const player: Player = {
      id: socket.id,
      userId: userId,
      name: username,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      health: MAX_HEALTH,
      mana: MAX_MANA,
      kills: 0,
      damage: 10,
      color: generateColor(),
      isAlive: true,
      respawnTimer: 0,
      moveForward: false,
      moveBackward: false,
      moveAngle: 0,
      coins: 50, // Default, will be updated from DB
      buffs: [],
      lastShotAt: 0,
    };

    // Load coins from database if userId provided
    if (userId) {
      try {
        const { data: statsData, error } = await supabase
          .from('player_stats')
          .select('coins')
          .eq('user_id', userId)
          .single();

        if (!error && statsData) {
          player.coins = statsData.coins;
          console.log(`💰 Loaded ${player.coins} coins for player ${username}`);
        }
      } catch (err) {
        console.error('Error loading coins:', err);
        // Keep default 50 coins if DB query fails
      }
    }

    // Find a valid spawn location
    const spawnLocation = findValidSpawnLocation(game.obstacles);
    player.x = spawnLocation.x;
    player.y = spawnLocation.y;

    game.players.set(socket.id, player);
    
    // Store game reference on socket for later use
    (socket.data as any).gameId = requestedGameId;
    
    // Join socket to a game-specific room
    socket.join(`game-${requestedGameId}`);

    // Send arena data to new player
    socket.emit("arenaData", {
      width: 2400,
      height: 1600,
      obstacles: game.obstacles,
      shops: game.shops,
      playerName: player.name,
      playerColor: player.color,
      gameId: requestedGameId,
      playerCount: game.players.size,
      maxPlayers: 4,
    });

    callback({ 
      success: true, 
      gameId: requestedGameId,
      playerCount: game.players.size,
      maxPlayers: 4,
    });
  });

  socket.on("findRandomGame", (callback) => {
    // Find a game with less than 4 players
    let targetGame: GameState | null = null;
    let targetGameId: string | null = null;
    
    for (const [gameId, game] of games) {
      if (game.players.size < 4 && !game.matchEnded) {
        targetGame = game;
        targetGameId = gameId;
        break;
      }
    }
    
    // If no game found, create new one
    if (!targetGame || !targetGameId) {
      targetGameId = generateGameId();
      targetGame = createNewGame(targetGameId);
      games.set(targetGameId, targetGame);
      console.log(`🎮 Created new random game: ${targetGameId}`);
    }
    
    callback({ gameId: targetGameId, playerCount: targetGame.players.size, maxPlayers: 4 });
  });

  socket.on("move", (data: { forward: boolean; backward: boolean; angle: number }) => {
    const gameId = (socket.data as any).gameId;
    const game = games.get(gameId);
    if (!game) return;
    
    const player = game.players.get(socket.id);
    if (player) {
      player.moveForward = data.forward;
      player.moveBackward = data.backward;
      player.moveAngle = data.angle;
    }
  });

  socket.on("shoot", (data: { x: number; y: number; angle: number }) => {
    const gameId = (socket.data as any).gameId;
    const game = games.get(gameId);
    if (!game) return;
    
    const player = game.players.get(socket.id);
    if (player && player.isAlive && player.mana >= MANA_COST_PER_SHOT) {
      const now = Date.now();
      if (player.lastShotAt && now - player.lastShotAt < FIRE_COOLDOWN) {
        return; // enforce fire rate
      }
      player.lastShotAt = now;

      player.mana -= MANA_COST_PER_SHOT;

      let damage = player.damage;
      if (getActiveBuff(player, 'power')) {
        damage *= 2; // Power buff multiplier
      }

      const projectile: Projectile = {
        id: `${socket.id}-${++game.projectileCounter}`,
        x: data.x,
        y: data.y,
        vx: Math.cos(data.angle) * PROJECTILE_SPEED,
        vy: Math.sin(data.angle) * PROJECTILE_SPEED,
        playerId: socket.id,
        damage: damage,
      };

      game.projectiles.set(projectile.id, projectile);
    }
  });

  socket.on("buyBuff", (buffType: string) => {
    const gameId = (socket.data as any).gameId;
    const game = games.get(gameId);
    if (!game) return;
    
    const player = game.players.get(socket.id);
    if (!player) return;

    const buff = BUFFS[buffType as keyof typeof BUFFS];
    if (!buff || player.coins < buff.price) return;

    player.coins -= buff.price;
    
    const expiresAt = Date.now() + buff.duration;
    player.buffs.push({ type: buffType, expiresAt });

    socket.emit("buffPurchased", { buffType, expiresAt });
  });

  socket.on("disconnect", () => {
    const gameId = (socket.data as any).gameId;
    if (gameId) {
      socket.leave(`game-${gameId}`);
    }
    const game = games.get(gameId);
    if (game) {
      game.players.delete(socket.id);
    }
    console.log(`Player disconnected: ${socket.id}`);
  });

  socket.on("ping", (callback) => {
    callback();
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🎮 Pixel Down server running on http://localhost:${PORT}`);
});

