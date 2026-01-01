'use client';

import React from 'react';

interface LeaderboardEntry {
  id: string;
  name: string;
  kills: number;
  health: number;
}

interface LeaderboardProps {
  leaderboard: LeaderboardEntry[];
  playerId: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ leaderboard, playerId }) => {
  return (
    <div className="absolute top-4 right-4 bg-gray-900 border-2 border-gray-700 rounded-lg p-4 text-white font-mono text-sm max-w-xs">
      <div className="mb-3 text-lg font-bold text-yellow-400">
        🏆 LEADERBOARD
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {leaderboard.length === 0 ? (
          <div className="text-gray-500 text-xs">No players yet...</div>
        ) : (
          leaderboard.map((entry, index) => (
            <div
              key={entry.id}
              className={`flex justify-between items-center p-2 rounded ${
                entry.id === playerId
                  ? 'bg-green-900 border border-green-600'
                  : 'bg-gray-800 border border-gray-700'
              } ${index === 0 ? 'ring-2 ring-yellow-400' : ''}`}
            >
              <div className="flex items-center gap-2 flex-1">
                <span className="text-yellow-400 font-bold w-6">
                  #{index + 1}
                </span>
                <div className="flex-1 truncate">
                  <div className="text-white truncate">{entry.name}</div>
                  <div className="text-xs text-gray-400">HP: {entry.health}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-yellow-400 font-bold">{entry.kills}</div>
                <div className="text-xs text-gray-500">kills</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400 space-y-1">
        <div>⬆️ WASD / Arrows: Move</div>
        <div>🖱️ Mouse: Aim</div>
        <div>🖱️ Click: Shoot</div>
      </div>
    </div>
  );
};
