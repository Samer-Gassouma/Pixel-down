'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameCanvas } from '@/components/GameCanvas';
import { HUD } from '@/components/HUD';
import { Leaderboard } from '@/components/Leaderboard';

interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  health: number;
  mana: number;
  coins: number;
  color: string;
  isAlive: boolean;
  respawnTimer: number;
  buffs: { type: string; expiresAt: number }[];
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

interface LeaderboardEntry {
  id: string;
  name: string;
  kills: number;
  coins: number;
  health: number;
}

export default function GamePage() {
  const socketRef = useRef<Socket | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [shops, setShops] = useState<Array<{ id: string; x: number; y: number; radius: number }>>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerColor, setPlayerColor] = useState<string>('#FFFFFF');
  const [playerName, setPlayerName] = useState<string>('Player');
  const [playerId, setPlayerId] = useState<string>('');
  const [arenaWidth, setArenaWidth] = useState<number>(800);
  const [arenaHeight, setArenaHeight] = useState<number>(600);
  const [mouseX, setMouseX] = useState<number>(400);
  const [mouseY, setMouseY] = useState<number>(300);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [ping, setPing] = useState<number>(0);
  const [shopMenuOpen, setShopMenuOpen] = useState<boolean>(false);
  const [nearbyShop, setNearbyShop] = useState<{ id: string; x: number; y: number; radius: number } | null>(null);
  const [gameTime, setGameTime] = useState<number>(0);
  const [timeUntilMapChange, setTimeUntilMapChange] = useState<number>(0);
  const [timeUntilMatchEnd, setTimeUntilMatchEnd] = useState<number>(0);
  const [matchEnded, setMatchEnded] = useState<boolean>(false);
  const [winner, setWinner] = useState<{ name: string; kills: number } | null>(null);

  // Keyboard state
  const keysRef = useRef<{ [key: string]: boolean }>({});

  /**
   * Initialize Socket.IO connection
   */
  useEffect(() => {
    const socket = io('http://localhost:3001', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to server');
      setIsConnected(true);
      setError('');
      setPlayerId(socket.id || '');
      
      // Track ping
      const pingInterval = setInterval(() => {
        const startTime = Date.now();
        socket.emit('ping', () => {
          const latency = Date.now() - startTime;
          setPing(latency);
        });
      }, 1000);
      
      return () => clearInterval(pingInterval);
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setIsConnected(false);
    });

    socket.on('arenaData', (data) => {
      console.log('📍 Arena data received:', data);
      setArenaWidth(data.width);
      setArenaHeight(data.height);
      setObstacles(data.obstacles);
      setShops(data.shops || []);
      setPlayerName(data.playerName);
      setPlayerColor(data.playerColor);
    });

    socket.on('gameState', (state) => {
      setPlayers(state.players);
      setProjectiles(state.projectiles);
      setLeaderboard(state.leaderboard);
      setGameTime(state.gameTime || 0);
      setTimeUntilMapChange(state.timeUntilMapChange || 0);
      setTimeUntilMatchEnd(state.timeUntilMatchEnd || 0);
    });

    socket.on('playerKilled', (data) => {
      console.log(`⚰️ ${data.killedName} was killed by ${data.killerId}`);
    });

    socket.on('matchEnded', (data) => {
      console.log('🏆 Match ended:', data);
      setMatchEnded(true);
      setWinner(data.winner);
    });

    socket.on('mapChanged', (data) => {
      console.log('🗺️ Map changed!');
      setObstacles(data.obstacles);
    });

    socket.on('respawned', (data) => {
      console.log('🔄 You have respawned!');
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setError('Failed to connect to server. Make sure backend is running on port 3001.');
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  /**
   * Handle keyboard input
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current[key] = true;

      // Check for E key to interact with shop
      if (key === 'e' && nearbyShop && !shopMenuOpen) {
        e.preventDefault();
        setShopMenuOpen(true);
      }

      // Check for ESC key to close shop menu
      if (key === 'escape' && shopMenuOpen) {
        e.preventDefault();
        setShopMenuOpen(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current[key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [nearbyShop, shopMenuOpen]);

  /**
   * Handle mouse position
   */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouseX(e.clientX - rect.left);
    setMouseY(e.clientY - rect.top);
  }, []);

  /**
   * Handle mouse click to shoot
   */
  const handleMouseClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!socketRef.current || !isConnected) return;

      const currentPlayer = players.find((p) => p.id === playerId);
      if (!currentPlayer || !currentPlayer.isAlive) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Calculate angle from player to mouse
      const dx = clickX - currentPlayer.x;
      const dy = clickY - currentPlayer.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check if click is within vision radius
      if (distance > VISION_RADIUS) {
        return; // Can't shoot outside vision radius
      }
      
      const angle = Math.atan2(dy, dx);

      // Emit shoot event
      socketRef.current.emit('shoot', {
        x: currentPlayer.x,
        y: currentPlayer.y,
        angle: angle,
      });
    },
    [players, playerId, isConnected]
  );

  // Get current player and calculate aiming angle early
  const currentPlayer = players.find((p) => p.id === playerId);
  const aimAngle = currentPlayer
    ? Math.atan2(mouseY - currentPlayer.y, mouseX - currentPlayer.x)
    : 0;

  // Check if player is near a shop
  useEffect(() => {
    if (!currentPlayer || !currentPlayer.isAlive) {
      setNearbyShop(null);
      return;
    }

    let closestShop = null;
    let closestDistance = Infinity;

    for (const shop of shops) {
      const dx = currentPlayer.x - shop.x;
      const dy = currentPlayer.y - shop.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < shop.radius + 50 && distance < closestDistance) {
        closestShop = shop;
        closestDistance = distance;
      }
    }

    setNearbyShop(closestShop);
  }, [currentPlayer, shops]);

  // Vision radius for fog of war (configurable)
  const VISION_RADIUS = 220;

  // Buff configuration
  const BUFF_CONFIG: { [key: string]: { price: number; duration: number; description: string } } = {
    speed: { price: 50, duration: 15, description: '1.5x Movement Speed' },
    mana: { price: 75, duration: 20, description: '2x Mana Regen' },
    power: { price: 100, duration: 15, description: '2x Damage' },
    shield: { price: 60, duration: 10, description: '25% Damage Reduction' },
  };

  const handleBuyBuff = (buffType: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('buyBuff', { buffType });
    setShopMenuOpen(false);
  };

  /**
   * Continuously send movement updates
   */
  useEffect(() => {
    const movementInterval = setInterval(() => {
      if (!socketRef.current || !isConnected) return;

      // Check WASD and arrow keys for forward/backward movement
      const moveForward =
        keysRef.current['w'] ||
        keysRef.current['arrowup'] ||
        keysRef.current['W'];
      const moveBackward =
        keysRef.current['s'] ||
        keysRef.current['arrowdown'] ||
        keysRef.current['S'];

      // Send input state to server - let it handle physics
      socketRef.current.emit('move', { 
        forward: moveForward,
        backward: moveBackward,
        angle: aimAngle
      });
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(movementInterval);
  }, [isConnected, aimAngle]);

  return (
    <div className="w-screen h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-950 px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-wider">PIXEL DOWN</h1>
          <p className="text-gray-500 text-sm">PROCEDURAL MULTIPLAYER ARENA</p>
        </div>
        <div className="flex gap-8 text-xs text-gray-400">
          <div>
            <div className="text-gray-500">MATCH TIME</div>
            <div className="text-cyan-400 font-mono">{Math.floor(gameTime / 1000)}s / 600s</div>
          </div>
          <div>
            <div className="text-gray-500">MAP CHANGE IN</div>
            <div className="text-yellow-400 font-mono">{Math.ceil(timeUntilMapChange / 1000)}s</div>
          </div>
          <div>
            <div className="text-gray-500">PING</div>
            <div className="text-green-400 font-mono">{ping}ms</div>
          </div>
        </div>
      </div>

      {/* Main Game Container */}
      <div className="flex flex-1 overflow-hidden gap-4 p-4">
        {/* Left - Game Canvas */}
        <div className="flex-1 flex flex-col">
          {/* Game Area */}
          <div
            className="flex-1 bg-gray-900 rounded-lg overflow-hidden shadow-2xl border border-gray-700 relative"
            style={{
              minWidth: '1000px',
            }}
            onMouseMove={handleMouseMove}
            onClick={handleMouseClick}
          >
            {/* Canvas */}
            <GameCanvas
              players={players}
              projectiles={projectiles}
              obstacles={obstacles}
              shops={shops}
              playerColor={playerColor}
              playerName={playerName}
              arenaWidth={arenaWidth}
              arenaHeight={arenaHeight}
              mouseX={mouseX}
              mouseY={mouseY}
              playerId={playerId}
              aimAngle={aimAngle}
              visionRadius={VISION_RADIUS}
            />

            {/* Coin Display - Top Left */}
            {currentPlayer && (
              <div className="absolute top-4 left-4 z-20 pointer-events-none">
                <div className="flex items-center gap-2 bg-gray-950 bg-opacity-70 border border-yellow-700 rounded-lg px-3 py-2">
                  <span className="text-xl">🪙</span>
                  <span className="text-xl font-bold text-yellow-400">{currentPlayer.coins}</span>
                </div>
              </div>
            )}

            {/* Center indicator */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-4 h-4 border-2 border-green-500 rounded-full opacity-50" />
            </div>

            {/* Dead overlay */}
            {currentPlayer && !currentPlayer.isAlive && !matchEnded && (
              <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40 pointer-events-none">
                <div className="text-center">
                  <div className="text-4xl font-bold text-red-500 mb-4">YOU DIED</div>
                  <div className="text-xl text-gray-300">
                    Respawning in {Math.ceil(currentPlayer.respawnTimer / 1000)}s
                  </div>
                </div>
              </div>
            )}

            {/* Match Ended Overlay */}
            {matchEnded && (
              <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 pointer-events-auto">
                <div className="bg-gray-900 border-2 border-yellow-400 rounded-lg p-12 text-center max-w-md shadow-2xl">
                  <div className="text-5xl mb-4">🏆</div>
                  <h2 className="text-3xl font-bold text-yellow-400 mb-6">MATCH ENDED</h2>
                  {winner ? (
                    <div className="mb-6">
                      <div className="text-xl text-gray-300 mb-2">Winner:</div>
                      <div className="text-3xl font-bold text-yellow-300 mb-4">{winner.name}</div>
                      <div className="text-lg text-cyan-400">
                        {winner.kills} {winner.kills === 1 ? 'Kill' : 'Kills'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400">No winner yet</div>
                  )}
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-6 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-6 rounded transition"
                  >
                    Play Again
                  </button>
                </div>
              </div>
            )}

            {/* Shop Interaction Prompt */}
            {nearbyShop && !shopMenuOpen && (
              <div className="absolute bottom-8 left-8 bg-cyan-900 bg-opacity-90 border-2 border-cyan-400 rounded px-4 py-2 text-sm text-cyan-300 z-30">
                Press <span className="font-bold text-cyan-200 bg-gray-800 px-2 rounded">E</span> to open shop
              </div>
            )}

            {/* Shop Menu Modal */}
            {shopMenuOpen && nearbyShop && (
              <div className="absolute inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70">
                <div className="bg-gray-900 border-2 border-cyan-400 rounded-lg p-8 max-w-md w-full shadow-2xl">
                  <h2 className="text-2xl font-bold text-cyan-300 mb-6 flex items-center gap-2">
                    <span className="text-2xl">🏪</span> SHOP
                  </h2>

                  <div className="space-y-3 mb-6">
                    {Object.entries(BUFF_CONFIG).map(([buffType, config]) => {
                      const canAfford = currentPlayer && currentPlayer.coins >= config.price;
                      return (
                      <div
                        key={buffType}
                        className={`bg-gray-800 border rounded-lg p-4 transition ${
                          canAfford
                            ? 'border-gray-700 hover:border-cyan-400 cursor-pointer'
                            : 'border-red-700 opacity-50 cursor-not-allowed'
                        }`}
                        onClick={() => canAfford && handleBuyBuff(buffType)}
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
                    onClick={() => setShopMenuOpen(false)}
                    className="w-full bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded py-2 text-gray-300 font-mono text-sm transition"
                  >
                    Close [ESC]
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom HUD - Health & Mana */}
          {currentPlayer && (
            <div className="mt-4 bg-gray-900 border border-gray-700 rounded p-3 max-w-sm">
              <div className="space-y-2 font-mono text-sm">
                <div>
                  <div className="flex justify-between mb-1 text-xs text-gray-400">
                    <span>HEALTH</span>
                    <span>{Math.round(currentPlayer.health)} / 100</span>
                  </div>
                  <div className="w-full h-3 bg-gray-700 border border-gray-600 rounded overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${Math.max(0, currentPlayer.health)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-xs text-gray-400">
                    <span>MANA</span>
                    <span>{Math.round(currentPlayer.mana)} / 100</span>
                  </div>
                  <div className="w-full h-3 bg-gray-700 border border-gray-600 rounded overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${(currentPlayer.mana / 100) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Minimal */}
        <div className="w-80 flex flex-col gap-4 overflow-y-auto">
          {/* Leaderboard */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex-shrink-0">
            <div className="mb-4 text-lg font-bold text-yellow-400 flex items-center gap-2">
              🏆 LEADERBOARD
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {leaderboard.length === 0 ? (
                <div className="text-gray-500 text-xs">No players yet...</div>
              ) : (
                leaderboard.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`flex justify-between items-center p-2 rounded text-xs font-mono ${
                      entry.id === playerId
                        ? 'bg-green-900 border border-green-600'
                        : 'bg-gray-800 border border-gray-700'
                    } ${index === 0 ? 'ring-2 ring-yellow-400' : ''}`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-yellow-400 font-bold w-6">#{index + 1}</span>
                      <span className="truncate">{entry.name}</span>
                    </div>
                    <div className="text-right text-yellow-400 font-bold">
                      {entry.kills}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
