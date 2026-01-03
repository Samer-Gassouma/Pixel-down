'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { supabase } from '@/lib/supabase';
import { checkBackendWithRetry } from '@/lib/backendHealth';

export default function Home() {
  const router = useRouter();
  const [gameId, setGameId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    setIsMounted(true);
    
    // Check authentication status
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/auth');
      } else {
        setIsAuthenticated(true);
        setUsername(session.user.user_metadata?.username || 'Player');
      }
    });

    // Check backend health
    const checkBackend = async () => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const isOnline = await checkBackendWithRetry(backendUrl);
      setBackendStatus(isOnline ? 'online' : 'offline');
    };

    checkBackend();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.push('/auth');
      } else {
        setIsAuthenticated(true);
        setUsername(session.user.user_metadata?.username || 'Player');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (!isMounted || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  // Generate a new game ID
  const handleCreateNewGame = () => {
    const newGameId = Math.random().toString(36).substring(2, 11);
    router.push(`/game/${newGameId}`);
  };

  // Start offline mode
  const handleOfflineMode = () => {
    router.push('/game/offline');
  };

  // Redirect to a specific game ID if user has one
  const handleJoinGame = () => {
    if (gameId.trim()) {
      router.push(`/game/${gameId}`);
    }
  };

  // Join a random game that has less than 4 players
  const handleJoinRandomGame = () => {
    setIsLoading(true);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    const socket = io(backendUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      socket.emit('findRandomGame', (response: any) => {
        socket.disconnect();
        setIsLoading(false);
        if (response.gameId) {
          router.push(`/game/${response.gameId}`);
        }
      });
    });

    socket.on('connect_error', () => {
      setIsLoading(false);
      alert('Failed to connect to server. Make sure backend is running on port 3001.');
    });
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-8 flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-bold tracking-tighter mb-2">
              🎮 PIXEL DOWN
            </h1>
            <p className="text-gray-400 text-lg">
              A Real-Time Multiplayer Pixel Shooter Game
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400 mb-2">Welcome,</div>
            <div className="text-xl font-bold text-cyan-400">{username}</div>
            <div className="flex gap-2 mt-2 justify-end">
              <Link
                href="/profile"
                className="text-sm text-blue-400 hover:text-blue-300 underline"
              >
                Profile
              </Link>
              <span className="text-gray-600">•</span>
              <button
                onClick={handleSignOut}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Left Column - Features */}
          <div>
            <h2 className="text-3xl font-bold mb-6 text-blue-400">Features</h2>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <div>
                  <div className="font-semibold">Real-time Multiplayer</div>
                  <div className="text-sm text-gray-500">Socket.IO powered synchronization</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <div>
                  <div className="font-semibold">Procedural Rendering</div>
                  <div className="text-sm text-gray-500">Cubes, obstacles, and effects generated via code</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <div>
                  <div className="font-semibold">Dynamic Gameplay</div>
                  <div className="text-sm text-gray-500">Health, mana, respawning, and damage scaling</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <div>
                  <div className="font-semibold">Live Leaderboard</div>
                  <div className="text-sm text-gray-500">Real-time player rankings and stats</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <div>
                  <div className="font-semibold">Procedural Arena</div>
                  <div className="text-sm text-gray-500">Randomly generated maps with obstacles</div>
                </div>
              </li>
            </ul>
          </div>

          {/* Right Column - CTA */}
          <div className="flex flex-col justify-center">
            {/* Backend Status Alert */}
            {backendStatus === 'offline' && (
              <div className="mb-6 bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 text-yellow-300">
                <div className="font-bold mb-1">Backend Offline</div>
                <p className="text-sm mb-3">The server is currently unavailable. Play in offline mode against bots instead!</p>
              </div>
            )}

            {backendStatus === 'checking' && (
              <div className="mb-6 bg-blue-900/30 border border-blue-600 rounded-lg p-4 text-blue-300">
                <div className="font-bold mb-1">Checking Server...</div>
                <p className="text-sm">Connecting to backend...</p>
              </div>
            )}

            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold mb-2">Ready to Fight?</h3>
                <p className="text-gray-400">
                  {backendStatus === 'online'
                    ? 'Jump into the arena and battle other players. Survive, gain kills, and dominate the leaderboard!'
                    : 'Battle AI bots in offline mode or wait for the server to come back online.'}
                </p>
              </div>

              <div className="space-y-4">
                {backendStatus === 'online' ? (
                  <>
                    <button
                      onClick={handleCreateNewGame}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-3 px-8 rounded-lg text-center transition-all hover:shadow-lg hover:shadow-blue-500/50"
                    >
                      CREATE NEW GAME →
                    </button>

                    <button
                      onClick={handleJoinRandomGame}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg text-center transition-all hover:shadow-lg hover:shadow-green-500/50"
                    >
                      {isLoading ? 'FINDING GAME...' : 'JOIN RANDOM GAME 🎲'}
                    </button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-600"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-gradient-to-br from-gray-800 to-gray-900 text-gray-400">or join with ID</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter Game ID..."
                        value={gameId}
                        onChange={(e) => setGameId(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={handleJoinGame}
                        disabled={!gameId.trim()}
                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition"
                      >
                        JOIN
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleOfflineMode}
                      className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold py-3 px-8 rounded-lg text-center transition-all hover:shadow-lg hover:shadow-red-500/50"
                    >
                      PLAY OFFLINE 
                    </button>
                    <p className="text-center text-gray-400 text-sm">Battle bots in single-player mode</p>
                  </>
                )}

                {backendStatus === 'online' && (
                  <div className="relative pt-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-gradient-to-br from-gray-800 to-gray-900 text-gray-400">or try offline</span>
                    </div>
                  </div>
                )}

                {backendStatus === 'online' && (
                  <button
                    onClick={handleOfflineMode}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-8 rounded-lg text-center transition"
                  >
                    OFFLINE MODE
                  </button>
                )}
              </div>

              <div className="bg-gray-900 border border-gray-700 rounded p-4 text-sm text-gray-300 space-y-2">
                <div>
                  <strong>Controls:</strong>
                </div>
                <div>• <code className="bg-gray-800 px-2 py-1 rounded">WASD</code> or <code className="bg-gray-800 px-2 py-1 rounded">Arrow Keys</code> to move</div>
                <div>• <code className="bg-gray-800 px-2 py-1 rounded">Mouse</code> to aim</div>
                <div>• <code className="bg-gray-800 px-2 py-1 rounded">Click</code> to shoot</div>
                <div>• <code className="bg-gray-800 px-2 py-1 rounded">E</code> to open shop</div>
              </div>
            </div>
          </div>
        </div>

        {/* Gameplay Section */}
        <div className="mt-20 border-t border-gray-800 pt-12">
          <h2 className="text-3xl font-bold mb-8 text-blue-400">How to Play</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <div className="text-yellow-400 text-3xl mb-3">🎯</div>
              <h3 className="font-bold text-lg mb-2">Move & Aim</h3>
              <p className="text-gray-400 text-sm">
                Use WASD or arrow keys to move your colored cube around the arena. Move your mouse to aim where you want to shoot.
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <div className="text-red-400 text-3xl mb-3">💥</div>
              <h3 className="font-bold text-lg mb-2">Fight & Survive</h3>
              <p className="text-gray-400 text-sm">
                Click to shoot at enemies. Each shot costs mana. Damage scales with your kills. Don't let your health reach zero!
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <div className="text-green-400 text-3xl mb-3">🏆</div>
              <h3 className="font-bold text-lg mb-2">Dominate</h3>
              <p className="text-gray-400 text-sm">
                Get more kills than anyone else to climb the leaderboard. Respawn after 60 seconds if you die, and come back stronger!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 mt-20 py-8 text-center text-gray-500 text-sm">
        <p>Pixel Down © 2026 - A Real-Time Multiplayer Game Experience</p>
      </div>
    </div>
  );
}
