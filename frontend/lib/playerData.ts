import { supabase } from './supabase';

export async function loadPlayerCoins(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('player_stats')
      .select('coins')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Failed to load player coins:', error);
      return 50; // Default starting coins
    }

    return data?.coins || 50;
  } catch (error) {
    console.error('Error loading coins:', error);
    return 50;
  }
}

export async function updatePlayerCoins(userId: string, coins: number): Promise<void> {
  try {
    await supabase
      .from('player_stats')
      .update({ coins, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  } catch (error) {
    console.error('Failed to update coins:', error);
  }
}

export async function saveMatchResult(
  gameId: string,
  winnerId: string | null,
  winnerName: string | null,
  durationSeconds: number,
  matchPlayers: Array<{
    userId: string;
    username: string;
    kills: number;
    coinsEarned: number;
  }>
): Promise<void> {
  try {
    // Insert match record
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .insert([
        {
          game_id: gameId,
          winner_user_id: winnerId,
          winner_name: winnerName,
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
        },
      ])
      .select('id')
      .single();

    if (matchError) {
      console.error('Failed to save match:', matchError);
      return;
    }

    // Insert player results
    if (matchData) {
      const playerResults = matchPlayers.map((player) => ({
        match_id: matchData.id,
        user_id: player.userId,
        username: player.username,
        kills: player.kills,
        coins_earned: player.coinsEarned,
      }));

      const { error: playerError } = await supabase
        .from('match_players')
        .insert(playerResults);

      if (playerError) {
        console.error('Failed to save player results:', playerError);
      }

      // Update player stats
      for (const player of matchPlayers) {
        const { data: stats } = await supabase
          .from('player_stats')
          .select('coins, total_kills, total_matches')
          .eq('user_id', player.userId)
          .single();

        if (stats) {
          await supabase
            .from('player_stats')
            .update({
              coins: stats.coins + player.coinsEarned,
              total_kills: stats.total_kills + player.kills,
              total_matches: stats.total_matches + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', player.userId);
        }
      }
    }
  } catch (error) {
    console.error('Error saving match result:', error);
  }
}
