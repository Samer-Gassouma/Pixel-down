// lib/offlineGame.ts - Offline game logic with bot AI

export const CANVAS_WIDTH = 2400;
export const CANVAS_HEIGHT = 1600;
export const VIEWPORT_WIDTH = 1600;
export const VIEWPORT_HEIGHT = 1066;
export const PLAYER_SIZE = 30;
export const MAX_HEALTH = 100;
export const MAX_MANA = 100;
export const MANA_REGEN_RATE = 20; // per second
export const BASE_DAMAGE = 10;
export const PROJECTILE_SPEED = 520;
export const MATCH_DURATION = 10 * 60; // 10 minutes in seconds
export const MAP_CHANGE_INTERVAL = 2 * 60; // 2 minutes
export const BOT_SHOOT_RANGE = 250; // Max range to shoot
export const BOT_CHASE_RANGE = 600; // Range to detect and chase
export const COIN_DROP_VALUE = 50; // Coins per kill

export interface CoinDrop {
  id: string;
  x: number;
  y: number;
  value: number;
  expiresAt: number;
}

export interface OfflinePlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  mana: number;
  isAlive: boolean;
  kills: number;
  coins: number;
  color: string;
  isBot: boolean;
  aimer?: { x: number; y: number };
  respawnTimer: number;
}

export interface OfflineProjectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  playerId: string;
  damage: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

const BOT_COLORS = ['#FF4444', '#FF6666', '#FF3333', '#DD3333'];
const PLAYER_COLOR = '#4488FF';
const COINS_PER_BOT_KILL = 50;

// Generate random obstacles
export function generateMap(): Obstacle[] {
  const obstacles: Obstacle[] = [];
  const numObstacles = 12;

  for (let i = 0; i < numObstacles; i++) {
    obstacles.push({
      x: Math.random() * (CANVAS_WIDTH - 100),
      y: Math.random() * (CANVAS_HEIGHT - 100),
      width: 60 + Math.random() * 80,
      height: 60 + Math.random() * 80,
    });
  }

  return obstacles;
}

// Create initial game state
export function createOfflineGameState() {
  return {
    player: {
      id: 'player',
      name: 'You',
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      vx: 0,
      vy: 0,
      health: MAX_HEALTH,
      mana: MAX_MANA,
      isAlive: true,
      kills: 0,
      coins: 0,
      color: PLAYER_COLOR,
      isBot: false,
      respawnTimer: 0,
    } as OfflinePlayer,
    bots: [] as OfflinePlayer[],
    projectiles: [] as OfflineProjectile[],
    obstacles: generateMap(),
    coinDrops: [] as CoinDrop[],
    gameTime: MATCH_DURATION,
    nextBotSpawn: 20, // spawn bot every 20 seconds
  };
}

// Spawn a new bot
export function spawnBot(gameState: any): OfflinePlayer {
  const angle = Math.random() * Math.PI * 2;
  const distance = 400;
  const x = gameState.player.x + Math.cos(angle) * distance;
  const y = gameState.player.y + Math.sin(angle) * distance;

  return {
    id: `bot-${Math.random()}`,
    name: ['Red Alpha', 'Red Beta', 'Red Gamma', 'Red Delta'][Math.floor(Math.random() * 4)],
    x: Math.max(30, Math.min(CANVAS_WIDTH - 30, x)),
    y: Math.max(30, Math.min(CANVAS_HEIGHT - 30, y)),
    vx: 0,
    vy: 0,
    health: MAX_HEALTH,
    mana: MAX_MANA,
    isAlive: true,
    kills: 0,
    coins: 0,
    color: BOT_COLORS[Math.floor(Math.random() * BOT_COLORS.length)],
    isBot: true,
    respawnTimer: 0,
  };
}

// Bot AI logic
export function updateBotAI(bot: OfflinePlayer, gameState: any, deltaTime: number) {
  if (!bot.isAlive) return;

  const player = gameState.player;
  const dx = player.x - bot.x;
  const dy = player.y - bot.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < BOT_CHASE_RANGE && player.isAlive) {
    // Chase the player but stop at 120px distance for shooting
    if (distance > 120) {
      const normalizedDx = dx / distance;
      const normalizedDy = dy / distance;
      bot.vx = normalizedDx * 150;
      bot.vy = normalizedDy * 150;
    } else {
      // Stop moving when close enough to shoot
      bot.vx = 0;
      bot.vy = 0;
    }

    // Try to shoot if in range
    if (distance < BOT_SHOOT_RANGE && bot.mana >= 25) {
      const angle = Math.atan2(dy, dx);
      bot.aimer = {
        x: bot.x + Math.cos(angle) * 50,
        y: bot.y + Math.sin(angle) * 50,
      };
      bot.mana -= 25;
      return 'shoot'; // Signal to fire
    }
  } else {
    // Patrol randomly
    if (Math.random() < 0.02) {
      const angle = Math.random() * Math.PI * 2;
      bot.vx = Math.cos(angle) * 100;
      bot.vy = Math.sin(angle) * 100;
    }
  }
}

// Check collision between two circles
function checkCollision(x1: number, y1: number, x2: number, y2: number, r1: number, r2: number): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < r1 + r2;
}

// Check collision with obstacles
export function checkObstacleCollision(x: number, y: number, radius: number, obstacles: Obstacle[]): boolean {
  return obstacles.some((obstacle) => {
    const closestX = Math.max(obstacle.x, Math.min(x, obstacle.x + obstacle.width));
    const closestY = Math.max(obstacle.y, Math.min(y, obstacle.y + obstacle.height));
    const dx = x - closestX;
    const dy = y - closestY;
    return dx * dx + dy * dy < radius * radius;
  });
}

// Update game state
export function updateOfflineGame(gameState: any, deltaTime: number, playerInput: { vx: number; vy: number; shootX?: number; shootY?: number }) {
  // Update timers
  gameState.gameTime -= deltaTime;
  gameState.nextBotSpawn -= deltaTime;

  // Spawn new bots
  if (gameState.nextBotSpawn <= 0 && gameState.bots.length < 5) {
    gameState.bots.push(spawnBot(gameState));
    gameState.nextBotSpawn = 20;
  }

  const player = gameState.player;

  // Update player movement
  if (player.isAlive) {
    player.vx = playerInput.vx;
    player.vy = playerInput.vy;

    // Update position
    let newX = player.x + player.vx * deltaTime;
    let newY = player.y + player.vy * deltaTime;

    // Boundary checks
    newX = Math.max(PLAYER_SIZE, Math.min(CANVAS_WIDTH - PLAYER_SIZE, newX));
    newY = Math.max(PLAYER_SIZE, Math.min(CANVAS_HEIGHT - PLAYER_SIZE, newY));

    // Obstacle collision
    if (!checkObstacleCollision(newX, newY, PLAYER_SIZE, gameState.obstacles)) {
      player.x = newX;
      player.y = newY;
    }

    // Mana regeneration
    player.mana = Math.min(MAX_MANA, player.mana + MANA_REGEN_RATE * deltaTime);

    // Handle shooting
    if (playerInput.shootX !== undefined && playerInput.shootY !== undefined && player.mana >= 25) {
      const dx = playerInput.shootX - player.x;
      const dy = playerInput.shootY - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        const angle = Math.atan2(dy, dx);
        gameState.projectiles.push({
          id: `proj-${Math.random()}`,
          x: player.x + Math.cos(angle) * 20,
          y: player.y + Math.sin(angle) * 20,
          vx: Math.cos(angle) * PROJECTILE_SPEED,
          vy: Math.sin(angle) * PROJECTILE_SPEED,
          playerId: player.id,
          damage: BASE_DAMAGE + Math.min(player.kills * 2, 30),
        });
        player.mana -= 25;
      }
    }
  } else if (player.respawnTimer > 0) {
    player.respawnTimer -= deltaTime;
  } else if (player.respawnTimer <= 0 && !player.isAlive) {
    // Respawn player
    player.x = CANVAS_WIDTH / 2;
    player.y = CANVAS_HEIGHT / 2;
    player.health = MAX_HEALTH;
    player.mana = MAX_MANA;
    player.isAlive = true;
    player.respawnTimer = 0;
  }

  // Update bots
  gameState.bots.forEach((bot: OfflinePlayer) => {
    if (bot.isAlive) {
      updateBotAI(bot, gameState, deltaTime);

      // Update bot position
      let newX = bot.x + bot.vx * deltaTime;
      let newY = bot.y + bot.vy * deltaTime;

      newX = Math.max(PLAYER_SIZE, Math.min(CANVAS_WIDTH - PLAYER_SIZE, newX));
      newY = Math.max(PLAYER_SIZE, Math.min(CANVAS_HEIGHT - PLAYER_SIZE, newY));

      if (!checkObstacleCollision(newX, newY, PLAYER_SIZE, gameState.obstacles)) {
        bot.x = newX;
        bot.y = newY;
      }

      // Mana regeneration
      bot.mana = Math.min(MAX_MANA, bot.mana + MANA_REGEN_RATE * deltaTime);

      // Bot shooting only within range
      const dx = player.x - bot.x;
      const dy = player.y - bot.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < BOT_SHOOT_RANGE && player.isAlive && bot.mana >= 25 && Math.random() < 0.8) {
        const angle = Math.atan2(dy, dx);
        gameState.projectiles.push({
          id: `proj-${Math.random()}`,
          x: bot.x + Math.cos(angle) * 20,
          y: bot.y + Math.sin(angle) * 20,
          vx: Math.cos(angle) * PROJECTILE_SPEED,
          vy: Math.sin(angle) * PROJECTILE_SPEED,
          playerId: bot.id,
          damage: BASE_DAMAGE + Math.min(bot.kills * 2, 30),
        });
        bot.mana -= 25;
      }
    } else if (bot.respawnTimer > 0) {
      bot.respawnTimer -= deltaTime;
    } else if (bot.respawnTimer <= 0 && !bot.isAlive) {
      // Respawn bot at random location away from player
      const angle = Math.random() * Math.PI * 2;
      const distance = 400;
      bot.x = Math.max(30, Math.min(CANVAS_WIDTH - 30, player.x + Math.cos(angle) * distance));
      bot.y = Math.max(30, Math.min(CANVAS_HEIGHT - 30, player.y + Math.sin(angle) * distance));
      bot.health = MAX_HEALTH;
      bot.mana = MAX_MANA;
      bot.isAlive = true;
      bot.respawnTimer = 0;
    }
  });

  // Update projectiles and check collisions
  gameState.projectiles = gameState.projectiles.filter((proj: OfflineProjectile) => {
    let newX = proj.x + proj.vx * deltaTime;
    let newY = proj.y + proj.vy * deltaTime;

    // Out of bounds check
    if (newX < 0 || newX > CANVAS_WIDTH || newY < 0 || newY > CANVAS_HEIGHT) {
      return false;
    }

    // Obstacle collision
    if (checkObstacleCollision(newX, newY, 5, gameState.obstacles)) {
      return false;
    }

    // Player collision
    if (proj.playerId !== player.id && checkCollision(newX, newY, player.x, player.y, 5, PLAYER_SIZE)) {
      if (player.isAlive) {
        player.health -= proj.damage;
        if (player.health <= 0) {
          player.health = 0;
          player.isAlive = false;
          player.respawnTimer = 5; // 5 seconds respawn

          // Find killer and give kill credit
          const killer = gameState.bots.find((b: OfflinePlayer) => b.id === proj.playerId);
          if (killer) killer.kills++;
        }
      }
      return false;
    }

    // Bot collision
    for (const bot of gameState.bots) {
      if (proj.playerId !== bot.id && bot.isAlive && checkCollision(newX, newY, bot.x, bot.y, 5, PLAYER_SIZE)) {
        bot.health -= proj.damage;
        if (bot.health <= 0) {
          bot.health = 0;
          bot.isAlive = false;
          bot.respawnTimer = 5;

          // Give kill credit and spawn coin drop
          if (proj.playerId === player.id) {
            player.kills++;
            
            // Spawn coin drop at bot location
            gameState.coinDrops.push({
              id: `coin-${Math.random()}`,
              x: bot.x,
              y: bot.y,
              value: COIN_DROP_VALUE,
              expiresAt: Date.now() + 30000, // 30 seconds
            });
          }
        }
        return false;
      }
    }

    proj.x = newX;
    proj.y = newY;
    return true;
  });

  // Check coin collection
  gameState.coinDrops = gameState.coinDrops.filter((coin: CoinDrop) => {
    // Check expiration
    if (Date.now() > coin.expiresAt) {
      return false;
    }

    // Check if player collects coin
    if (player.isAlive) {
      const dx = player.x - coin.x;
      const dy = player.y - coin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 30) {
        player.coins += coin.value;
        return false; // Remove coin
      }
    }

    return true; // Keep coin
  });
}
