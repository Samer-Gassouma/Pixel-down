'use client';

import React from 'react';

interface HUDProps {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  kills: number;
  respawnTimer: number;
  isAlive: boolean;
  playerName: string;
}

export const HUD: React.FC<HUDProps> = ({
  health,
  maxHealth,
  mana,
  maxMana,
  kills,
  respawnTimer,
  isAlive,
  playerName,
}) => {
  const healthPercent = (health / maxHealth) * 100;
  const manaPercent = (mana / maxMana) * 100;
  const respawnSeconds = Math.ceil(respawnTimer / 1000);

  const getHealthColor = () => {
    if (healthPercent > 50) return 'bg-green-500';
    if (healthPercent > 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="absolute top-4 left-4 bg-gray-900 border-2 border-gray-700 rounded-lg p-4 text-white font-mono text-sm">
      {/* Player Name */}
      <div className="mb-3 text-lg font-bold text-blue-400">
        {playerName}
      </div>

      {/* Health Bar */}
      <div className="mb-2">
        <div className="flex justify-between mb-1">
          <span>Health</span>
          <span>{Math.round(health)} / {maxHealth}</span>
        </div>
        <div className="w-40 h-4 bg-gray-700 border border-gray-600 rounded overflow-hidden">
          <div
            className={`h-full transition-all ${getHealthColor()}`}
            style={{ width: `${Math.max(0, healthPercent)}%` }}
          />
        </div>
      </div>

      {/* Mana Bar */}
      <div className="mb-2">
        <div className="flex justify-between mb-1">
          <span>Mana</span>
          <span>{Math.round(mana)} / {maxMana}</span>
        </div>
        <div className="w-40 h-4 bg-gray-700 border border-gray-600 rounded overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${(mana / maxMana) * 100}%` }}
          />
        </div>
      </div>

      {/* Kills Counter */}
      <div className="mb-3 pt-2 border-t border-gray-700">
        <div className="flex justify-between">
          <span>Kills:</span>
          <span className="text-yellow-400 font-bold">{kills}</span>
        </div>
      </div>

      {/* Status */}
      {!isAlive && (
        <div className="mt-3 p-2 bg-red-900 border border-red-600 rounded text-red-100">
          <div className="font-bold mb-1">RESPAWNING IN</div>
          <div className="text-2xl font-bold text-center text-red-300">
            {respawnSeconds}s
          </div>
        </div>
      )}

      {isAlive && mana < 25 && (
        <div className="mt-2 text-yellow-400 text-xs">
          ⚠️ Low mana - regenerating
        </div>
      )}
    </div>
  );
};
