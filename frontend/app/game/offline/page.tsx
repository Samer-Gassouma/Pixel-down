'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { HUD } from '@/components/HUD';
import { Leaderboard } from '@/components/Leaderboard';
import { supabase } from '@/lib/supabase';
import { updatePlayerCoins, loadPlayerCoins } from '@/lib/playerData';
import {
  createOfflineGameState,
  updateOfflineGame,
  spawnBot,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  VIEWPORT_WIDTH,
  VIEWPORT_HEIGHT,
  MATCH_DURATION,
  MAP_CHANGE_INTERVAL,
  MAX_HEALTH,
  MAX_MANA,
  CoinDrop,
} from '@/lib/offlineGame';

interface Shop {
  id: string;
  x: number;
  y: number;
  radius: number;
}

const BUFF_CONFIG: { [key: string]: { price: number; duration: number; description: string } } = {
  speed: { price: 50, duration: 15, description: '1.5x Movement Speed' },
  mana: { price: 75, duration: 20, description: '2x Mana Regen' },
  power: { price: 100, duration: 15, description: '2x Damage' },
  shield: { price: 60, duration: 10, description: '25% Damage Reduction' },
};

export default function OfflineGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<any>(null);
  const [gameTime, setGameTime] = useState(MATCH_DURATION);
  const [playerStats, setPlayerStats] = useState({
    kills: 0,
    health: 100,
    mana: 100,
    coins: 0,
    isAlive: true,
    respawnTimer: 0,
  });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [gameEnded, setGameEnded] = useState(false);
  const [shopMenuOpen, setShopMenuOpen] = useState<boolean>(false);
  const [nearbyShop, setNearbyShop] = useState<Shop | null>(null);
  const [shops, setShops] = useState<Shop[]>([
    { id: 'shop-1', x: 600, y: 400, radius: 40 },
    { id: 'shop-2', x: 1800, y: 1200, radius: 40 },
  ]);
  const [username, setUsername] = useState<string>('Player');
  const [userId, setUserId] = useState<string>('');
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const mousePos = useRef({ x: 0, y: 0 });
  const animationIdRef = useRef<number | null>(null);
  const router = useRouter();

  // Initialize game
  useEffect(() => {
    // Check authentication and get username
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/auth');
      } else {
        const userUsername = session.user.user_metadata?.username || 'Player';
        setUsername(userUsername);
        setUserId(session.user.id);
        
        // Load coins from database
        loadPlayerCoins(session.user.id).then((coins) => {
          console.log('Loaded coins from DB:', coins);
          // Update game state with loaded coins
          if (gameStateRef.current) {
            gameStateRef.current.player.name = userUsername;
            gameStateRef.current.player.coins = coins;
            console.log('Game state coins set to:', gameStateRef.current.player.coins);
            setPlayerStats((prev) => ({
              ...prev,
              coins: coins,
            }));
          }
        });
      }
    });

    gameStateRef.current = createOfflineGameState();

    // Initial bots
    for (let i = 0; i < 2; i++) {
      gameStateRef.current.bots.push(spawnBot(gameStateRef.current));
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  // Input handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      
      // Open shop with E key
      if (e.key.toLowerCase() === 'e' && nearbyShop && !shopMenuOpen) {
        e.preventDefault();
        setShopMenuOpen(true);
      }
      
      // Close shop with ESC
      if (e.key.toLowerCase() === 'escape' && shopMenuOpen) {
        e.preventDefault();
        setShopMenuOpen(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        mousePos.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      }
    };

    const handleClick = () => {
      if (gameStateRef.current && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const canvasX = (mousePos.current.x / rect.width) * VIEWPORT_WIDTH;
        const canvasY = (mousePos.current.y / rect.height) * VIEWPORT_HEIGHT;

        // Convert screen coords to world coords based on camera position
        const player = gameStateRef.current.player;
        const cameraX = player.x - VIEWPORT_WIDTH / 2;
        const cameraY = player.y - VIEWPORT_HEIGHT / 2;

        const worldX = canvasX + cameraX;
        const worldY = canvasY + cameraY;

        // Queue shoot action
        if (!gameStateRef.current.nextShoot) {
          gameStateRef.current.nextShoot = { x: worldX, y: worldY };
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, [nearbyShop, shopMenuOpen]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = Date.now();

    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = Math.min((now - lastTime) / 1000, 0.016); // Cap at 60fps
      lastTime = now;

      const gameState = gameStateRef.current;

      // Calculate player input
      const playerInput = {
        vx: 0,
        vy: 0,
        shootX: gameState.nextShoot?.x,
        shootY: gameState.nextShoot?.y,
      };

      const speed = 200;
      if (keysPressed.current['w'] || keysPressed.current['arrowup']) playerInput.vy -= speed;
      if (keysPressed.current['s'] || keysPressed.current['arrowdown']) playerInput.vy += speed;
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) playerInput.vx -= speed;
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) playerInput.vx += speed;

      // Update game state
      updateOfflineGame(gameState, deltaTime, playerInput);
      gameState.nextShoot = null;

      // Update stats
      setPlayerStats({
        kills: gameState.player.kills,
        health: Math.max(0, gameState.player.health),
        mana: Math.max(0, gameState.player.mana),
        coins: gameState.player.coins,
        isAlive: gameState.player.isAlive,
        respawnTimer: gameState.player.respawnTimer * 1000,
      });

      // Update leaderboard
      const allPlayers = [gameState.player, ...gameState.bots];
      const leaderboardData = allPlayers
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          kills: p.kills,
          health: Math.max(0, p.health),
        }))
        .sort((a: any, b: any) => b.kills - a.kills);

      setLeaderboard(leaderboardData);
      setGameTime(Math.max(0, gameState.gameTime));

      // Check shop proximity
      let closestShop: Shop | null = null;
      let closestDist = Infinity;
      
      shops.forEach((shop) => {
        const dx = gameState.player.x - shop.x;
        const dy = gameState.player.y - shop.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < shop.radius + 50 && dist < closestDist) {
          closestShop = shop;
          closestDist = dist;
        }
      });
      
      setNearbyShop(closestShop);

      // Check if game ended
      if (gameState.gameTime <= 0) {
        setGameEnded(true);
        
        // Save coins to database
        if (userId && gameState.player.coins > 0) {
          updatePlayerCoins(userId, gameState.player.coins);
        }
      }

      // Draw game
      drawGame(ctx, gameState, canvas.width, canvas.height);

      animationIdRef.current = requestAnimationFrame(gameLoop);
    };

    animationIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  const drawGame = (ctx: CanvasRenderingContext2D, gameState: any, width: number, height: number) => {
    const player = gameState.player;

    // Camera position
    const cameraX = player.x - VIEWPORT_WIDTH / 2;
    const cameraY = player.y - VIEWPORT_HEIGHT / 2;

    // Clear screen
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, width, height);

    // Save context
    ctx.save();
    ctx.translate(-cameraX, -cameraY);

    // Draw grid background
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1;
    const gridSize = 100;
    for (let x = Math.floor(cameraX / gridSize) * gridSize; x < cameraX + VIEWPORT_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, Math.floor(cameraY / gridSize) * gridSize);
      ctx.lineTo(x, Math.ceil((cameraY + VIEWPORT_HEIGHT) / gridSize) * gridSize);
      ctx.stroke();
    }
    for (let y = Math.floor(cameraY / gridSize) * gridSize; y < cameraY + VIEWPORT_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(Math.floor(cameraX / gridSize) * gridSize, y);
      ctx.lineTo(Math.ceil((cameraX + VIEWPORT_WIDTH) / gridSize) * gridSize, y);
      ctx.stroke();
    }

    // Draw obstacles
    gameState.obstacles.forEach((obs: any) => {
      ctx.fillStyle = '#444444';
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    });

    // Draw shops
    shops.forEach((shop) => {
      // Glow effect
      const glowRadius = shop.radius + 20;
      const glow = ctx.createRadialGradient(shop.x, shop.y, shop.radius, shop.x, shop.y, glowRadius);
      glow.addColorStop(0, 'rgba(0, 255, 200, 0.6)');
      glow.addColorStop(1, 'rgba(0, 255, 200, 0)');
      
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(shop.x, shop.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Shop core
      ctx.fillStyle = '#00FF00';
      ctx.beginPath();
      ctx.arc(shop.x, shop.y, shop.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Shop border
      ctx.strokeStyle = '#00FFFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(shop.x, shop.y, shop.radius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Shop symbol ($)
      ctx.fillStyle = '#000';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', shop.x, shop.y);
    });

    // Draw coin drops
    gameState.coinDrops?.forEach((coin: CoinDrop) => {
      // Coin glow
      const glow = ctx.createRadialGradient(coin.x, coin.y, 5, coin.x, coin.y, 15);
      glow.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
      glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
      
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 15, 0, Math.PI * 2);
      ctx.fill();
      
      // Coin body
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#FFA500';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 8, 0, Math.PI * 2);
      ctx.stroke();
      
      // Coin symbol
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🪙', coin.x, coin.y);
    });

    // Draw projectiles
    gameState.projectiles.forEach((proj: any) => {
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFA500';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw player
    if (player.isAlive) {
      // Calculate player rotation based on mouse position
      const rect = canvasRef.current?.getBoundingClientRect();
      let angle = 0;
      if (rect) {
        const dx = mousePos.current.x - (rect.width / 2);
        const dy = mousePos.current.y - (rect.height / 2);
        angle = Math.atan2(dy, dx);
      }
      
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(angle);
      
      // Draw player cube
      const halfSize = 15;
      ctx.fillStyle = player.color;
      ctx.fillRect(-halfSize, -halfSize, 30, 30);
      
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      ctx.strokeRect(-halfSize, -halfSize, 30, 30);
      
      // Direction indicator (golden triangle)
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.moveTo(halfSize, -3);
      ctx.lineTo(halfSize + 6, 0);
      ctx.lineTo(halfSize, 3);
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();

      // Player name above
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(player.name, player.x, player.y - 25);
    }

    // Draw bots
    gameState.bots.forEach((bot: any) => {
      if (bot.isAlive) {
        ctx.fillStyle = bot.color;
        ctx.fillRect(bot.x - 15, bot.y - 15, 30, 30);

        ctx.strokeStyle = bot.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(bot.x - 15, bot.y - 15, 30, 30);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BOT', bot.x, bot.y - 20);
      }
    });

    // Restore context
    ctx.restore();
  };

  const handleReturnHome = () => {
    router.push('/');
  };

  const handleBuyBuff = (buffType: string) => {
    const config = BUFF_CONFIG[buffType];
    const gameState = gameStateRef.current;
    
    if (gameState && gameState.player.coins >= config.price) {
      gameState.player.coins -= config.price;
      const newCoinAmount = gameState.player.coins;
      
      // Update UI immediately
      setPlayerStats((prev) => ({
        ...prev,
        coins: newCoinAmount,
      }));
      
      // Save to database immediately with new total
      if (userId) {
        console.log('Saving coins to DB:', newCoinAmount);
        updatePlayerCoins(userId, newCoinAmount).then(() => {
          console.log('Coins saved successfully');
        }).catch((error) => {
          console.error('Failed to save coins:', error);
        });
      }
      
      setShopMenuOpen(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="w-full h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Game Canvas */}
      <div className="relative flex-1 flex items-center justify-center bg-gray-950 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={VIEWPORT_WIDTH}
          height={VIEWPORT_HEIGHT}
          className="border-2 border-gray-700"
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />

        {/* HUD Overlay */}
        <HUD
          health={playerStats.health}
          maxHealth={MAX_HEALTH}
          mana={playerStats.mana}
          maxMana={MAX_MANA}
          kills={playerStats.kills}
          respawnTimer={playerStats.respawnTimer}
          isAlive={playerStats.isAlive}
          playerName={username}
        />

        {/* Leaderboard Overlay */}
        <Leaderboard leaderboard={leaderboard} playerId="player" />

        {/* Coin Display - Top Left */}
        <div className="absolute top-4 left-4 z-20 pointer-events-none">
          <div className="flex items-center gap-2 bg-gray-950 bg-opacity-70 border border-yellow-700 rounded-lg px-3 py-2">
            <span className="text-xl">🪙</span>
            <span className="text-xl font-bold text-yellow-400">{playerStats.coins}</span>
          </div>
        </div>

        {/* Shop Interaction Prompt */}
        {nearbyShop && !shopMenuOpen && (
          <div className="absolute bottom-8 left-8 bg-cyan-900 bg-opacity-90 border-2 border-cyan-400 rounded px-4 py-2 text-sm text-cyan-300 z-30">
            Press <span className="font-bold text-cyan-200 bg-gray-800 px-2 rounded">E</span> to open shop
          </div>
        )}

        {/* Shop Menu Modal */}
        {shopMenuOpen && nearbyShop && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70 pointer-events-auto">
            <div className="bg-gray-900 border-2 border-cyan-400 rounded-lg p-8 max-w-md w-full shadow-2xl">
              <h2 className="text-2xl font-bold text-cyan-300 mb-6 flex items-center gap-2">
                <span className="text-2xl">🏪</span> SHOP
              </h2>

              <div className="space-y-3 mb-6">
                {Object.entries(BUFF_CONFIG).map(([buffType, config]) => {
                  const canAfford = playerStats.coins >= config.price;
                  return (
                    <div
                      key={buffType}
                      className={`bg-gray-800 border rounded-lg p-4 transition ${
                        canAfford
                          ? 'border-gray-700 hover:border-cyan-400 cursor-pointer'
                          : 'border-red-700 opacity-50 cursor-not-allowed'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canAfford) {
                          handleBuyBuff(buffType);
                        }
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-cyan-300 capitalize">{buffType}</div>
                        <div className="text-yellow-400 font-bold">{config.price} 💰</div>
                      </div>
                      <div className="text-sm text-gray-400 mb-2">{config.description}</div>
                      <div className="text-xs text-gray-500">Duration: {config.duration}s</div>
                      {canAfford ? (
                        <div className="text-xs text-green-400 mt-2">✓ Available</div>
                      ) : (
                        <div className="text-xs text-red-400 mt-2">✗ Not enough coins</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShopMenuOpen(false);
                }}
                className="w-full bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded py-2 text-gray-300 font-mono text-sm transition"
              >
                Close [ESC]
              </button>
            </div>
          </div>
        )}

        {/* Exit Button */}
        <button
          onClick={handleReturnHome}
          className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-bold text-sm z-20"
        >
          ← EXIT GAME
        </button>
      </div>

      {/* Game Over Screen */}
      {gameEnded && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 border-2 border-yellow-600 rounded-lg p-8 text-center max-w-md">
            <h2 className="text-3xl font-bold mb-4 text-yellow-400">GAME OVER!</h2>
            <div className="space-y-2 mb-6 text-lg">
              <div>
                Final Kills: <span className="text-green-400 font-bold">{playerStats.kills}</span>
              </div>
              <div>
                Coins Earned: <span className="text-yellow-400 font-bold">{playerStats.coins}</span>
              </div>
              <div>
                Time: <span className="text-blue-400 font-bold">{formatTime(gameTime)}</span>
              </div>
            </div>
            <button
              onClick={handleReturnHome}
              className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-3 rounded"
            >
              RETURN HOME
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
