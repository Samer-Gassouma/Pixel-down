'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface PlayerStats {
  username: string;
  coins: number;
  total_kills: number;
  total_matches: number;
}

interface MatchResult {
  id: string;
  game_id: string;
  winner_name: string;
  duration_seconds: number;
  started_at: string;
  kills: number;
  coins_earned: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.push('/auth');
          return;
        }

        setUserId(session.user.id);
        const username = session.user.user_metadata?.username || 'Player';

        // Fetch player stats
        const { data: statsData, error: statsError } = await supabase
          .from('player_stats')
          .select('username, coins, total_kills, total_matches')
          .eq('user_id', session.user.id)
          .single();

        if (statsError && statsError.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is OK (user not in DB yet)
          console.error('Error fetching stats:', statsError);
          setError('Failed to load player stats');
          return;
        }

        // If no stats found, create default stats
        if (!statsData) {
          setStats({
            username: username,
            coins: 50,
            total_kills: 0,
            total_matches: 0,
          });
        } else {
          setStats(statsData);
        }

        // Fetch match history (it's OK if there are none)
        const { data: matchesData, error: matchesError } = await supabase
          .from('match_players')
          .select(`
            id,
            kills,
            coins_earned,
            created_at,
            match_id,
            matches (
              game_id,
              winner_name,
              duration_seconds,
              started_at
            )
          `)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (matchesError) {
          console.error('Error fetching matches:', matchesError);
          // Don't set error - just leave matches empty
        }

        // Transform data
        const formattedMatches = matchesData?.map((match: any) => ({
          id: match.id,
          game_id: match.matches?.game_id || 'unknown',
          winner_name: match.matches?.winner_name || 'Unknown',
          duration_seconds: match.matches?.duration_seconds || 0,
          started_at: match.matches?.started_at || new Date().toISOString(),
          kills: match.kills,
          coins_earned: match.coins_earned,
        })) || [];

        setMatches(formattedMatches);
      } catch (err) {
        console.error('Error:', err);
        // Don't fail completely - show what we have
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (loading) {
    return (
      <div className="w-screen h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold mb-4">🎮 PIXEL DOWN</div>
          <div className="text-xl text-gray-400">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="w-screen h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-4 text-yellow-400">Profile Not Found</div>
          <div className="text-gray-400 mb-4">Your profile will be created when you play your first game.</div>
          <Link href="/" className="text-cyan-400 hover:text-cyan-300 underline">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-950 px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-wider">PIXEL DOWN</h1>
          <p className="text-gray-500 text-sm">PLAYER PROFILE</p>
        </div>
        <div className="flex gap-4">
          <Link 
            href="/"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded text-sm font-mono transition"
          >
            Home
          </Link>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-mono transition"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {/* Player Info Card */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 mb-8">
          <div className="grid grid-cols-4 gap-8">
            {/* Username */}
            <div>
              <div className="text-gray-400 text-sm mb-2">PLAYER NAME</div>
              <div className="text-2xl font-bold text-yellow-400">{stats.username}</div>
            </div>

            {/* Coins */}
            <div>
              <div className="text-gray-400 text-sm mb-2">CURRENT COINS</div>
              <div className="text-3xl font-bold text-yellow-300 flex items-center gap-2">
                🪙 {stats.coins.toLocaleString()}
              </div>
            </div>

            {/* Total Kills */}
            <div>
              <div className="text-gray-400 text-sm mb-2">TOTAL KILLS</div>
              <div className="text-2xl font-bold text-red-400">{stats.total_kills}</div>
            </div>

            {/* Total Matches */}
            <div>
              <div className="text-gray-400 text-sm mb-2">MATCHES PLAYED</div>
              <div className="text-2xl font-bold text-cyan-400">{stats.total_matches}</div>
            </div>
          </div>
        </div>

        {/* Match History */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-cyan-300 mb-6 flex items-center gap-2">
            📋 MATCH HISTORY
          </h2>

          {matches.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-4">No matches played yet</div>
              <Link 
                href="/"
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                Play your first game
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700 text-left text-sm text-gray-400 font-mono">
                    <th className="pb-3 px-4">DATE</th>
                    <th className="pb-3 px-4">DURATION</th>
                    <th className="pb-3 px-4">KILLS</th>
                    <th className="pb-3 px-4">COINS EARNED</th>
                    <th className="pb-3 px-4">WINNER</th>
                    <th className="pb-3 px-4">GAME ID</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match, index) => (
                    <tr
                      key={match.id}
                      className={`border-b border-gray-800 text-sm ${
                        index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-950'
                      } hover:bg-gray-800 transition`}
                    >
                      <td className="py-3 px-4">
                        {new Date(match.started_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {Math.floor(match.duration_seconds / 60)}m {match.duration_seconds % 60}s
                      </td>
                      <td className="py-3 px-4">
                        <span className={match.kills > 0 ? 'text-red-400 font-bold' : 'text-gray-400'}>
                          {match.kills}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={match.coins_earned > 0 ? 'text-yellow-400 font-bold' : 'text-gray-400'}>
                          +{match.coins_earned} 🪙
                        </span>
                      </td>
                      <td className="py-3 px-4 text-cyan-300">
                        {match.winner_name}
                      </td>
                      <td className="py-3 px-4 text-gray-500 font-mono text-xs">
                        {match.game_id.substring(0, 8)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
