'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  health: number;
  mana: number;
  color: string;
  isAlive: boolean;
  respawnTimer: number;
  buffs?: { type: string; expiresAt: number }[];
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

interface GameCanvasProps {
  players: Player[];
  projectiles: Projectile[];
  obstacles: Obstacle[];
  shops?: Array<{ id: string; x: number; y: number; radius: number }>;
  playerColor: string;
  playerName: string;
  arenaWidth: number;
  arenaHeight: number;
  mouseX: number;
  mouseY: number;
  playerId: string;
  aimAngle?: number;
  visionRadius?: number;
}

/**
 * Procedural Cube Generator with Rotation
 * Creates a 3D-like cube with a front projectile spawn cube
 */
function drawCube(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  isAlive: boolean = true,
  angle: number = 0
) {
  ctx.save();

  if (!isAlive) {
    ctx.globalAlpha = 0.3;
  }

  ctx.translate(x, y);
  ctx.rotate(angle);

  const halfSize = size / 2;

  // Draw simple filled square
  ctx.fillStyle = color;
  ctx.fillRect(-halfSize, -halfSize, size, size);

  // Draw border
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  ctx.strokeRect(-halfSize, -halfSize, size, size);

  // Draw direction indicator (simple triangle)
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.moveTo(halfSize, -3);
  ctx.lineTo(halfSize + 6, 0);
  ctx.lineTo(halfSize, 3);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draw glowing shop
 */
function drawShop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
) {
  const glowRadius = radius + 20;
  
  // Create glow effect
  const glow = ctx.createRadialGradient(x, y, radius, x, y, glowRadius);
  glow.addColorStop(0, 'rgba(0, 255, 200, 0.6)');
  glow.addColorStop(1, 'rgba(0, 255, 200, 0)');
  
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw shop core
  ctx.fillStyle = '#00FF00';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw shop border (bright)
  ctx.strokeStyle = '#00FFFF';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  
  // Draw shop symbol ($)
  ctx.fillStyle = '#000';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', x, y);
}

/**
 * Draw fog of war effect (optimized for performance)
 * Simple circular vision with minimal overhead
 */
function drawFogOfWar(
  ctx: CanvasRenderingContext2D,
  playerX: number,
  playerY: number,
  visionRadius: number,
  canvasWidth: number,
  canvasHeight: number
) {
  ctx.save();

  // Create radial gradient - bright inside radius, dark outside
  const gradient = ctx.createRadialGradient(
    playerX, playerY, visionRadius * 0.8,
    playerX, playerY, visionRadius * 1.2
  );
  
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.restore();
}

/**
 * Draw projectile with particle effect
 */
function drawProjectile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
) {
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
  
  // Glow effect
  ctx.strokeStyle = '#FFA500';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Draw obstacles
 */
function drawObstacles(
  ctx: CanvasRenderingContext2D,
  obstacles: Obstacle[]
) {
  ctx.fillStyle = '#333';
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  
  for (const obstacle of obstacles) {
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  }
}

/**
 * Draw all shops with glow effect
 */
function drawShops(
  ctx: CanvasRenderingContext2D,
  shops?: Array<{ id: string; x: number; y: number; radius: number }>
) {
  if (!shops || shops.length === 0) return;
  
  for (const shop of shops) {
    drawShop(ctx, shop.x, shop.y, shop.radius);
  }
}

/**
 * Draw health bar above player
 */
function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  health: number,
  maxHealth: number = 100
) {
  const barWidth = 50;
  const barHeight = 5;
  const healthPercent = health / maxHealth;
  
  // Background bar
  ctx.fillStyle = '#333';
  ctx.fillRect(x - barWidth / 2, y - 45, barWidth, barHeight);
  
  // Health bar
  ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FFC107' : '#F44336';
  ctx.fillRect(x - barWidth / 2, y - 45, barWidth * healthPercent, barHeight);
  
  // Border
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - barWidth / 2, y - 45, barWidth, barHeight);
}

/**
 * Draw player name
 */
function drawPlayerName(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  isAlive: boolean = true,
  buffs?: { type: string; expiresAt: number }[]
) {
  const now = Date.now();
  const activeBuff = buffs?.find(b => b.expiresAt > now);
  
  let displayName = name;
  if (activeBuff) {
    const remainingMs = activeBuff.expiresAt - now;
    const remainingSecs = Math.ceil(remainingMs / 1000);
    displayName = `${name} [${activeBuff.type.toUpperCase()} ${remainingSecs}s]`;
  }
  
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = isAlive ? '#fff' : 'rgba(200, 200, 200, 0.5)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText(displayName, x, y - 35);
  ctx.shadowColor = 'transparent';
}

/**
 * Draw grid background
 */
function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.1)';
  ctx.lineWidth = 1;
  const gridSize = 50;
  
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  players,
  projectiles,
  obstacles,
  shops = [],
  playerColor,
  playerName,
  arenaWidth,
  arenaHeight,
  mouseX,
  mouseY,
  playerId,
  aimAngle = 0,
  visionRadius = 300,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ players, projectiles, obstacles, shops, mouseX, mouseY });
  const smoothedMouseRef = useRef<{ x: number; y: number }>({ x: mouseX, y: mouseY });

  // Update ref without triggering re-renders
  useEffect(() => {
    stateRef.current = { players, projectiles, obstacles, shops, mouseX, mouseY };
  }, [players, projectiles, obstacles, shops, mouseX, mouseY]);

  // Single animation frame loop for smooth rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const state = stateRef.current;
      // Aim smoothing to reduce jitter
      const sm = smoothedMouseRef.current;
      sm.x += (state.mouseX - sm.x) * 0.25;
      sm.y += (state.mouseY - sm.y) * 0.25;

      // Clear canvas once
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      drawGrid(ctx, canvas.width, canvas.height);

      // Draw obstacles
      drawObstacles(ctx, state.obstacles);

      // Draw shops
      drawShops(ctx, state.shops);

      // Draw projectiles
      for (const projectile of state.projectiles) {
        drawProjectile(ctx, projectile.x, projectile.y);
      }

      // Draw players
      for (const player of state.players) {
        // Calculate angle for current player based on mouse position
        const playerAngle = playerId === player.id 
          ? Math.atan2(sm.y - player.y, sm.x - player.x)
          : 0;
        
        drawCube(ctx, player.x, player.y, 30, player.color, player.isAlive, playerAngle);
        drawHealthBar(ctx, player.x, player.y, player.health);
        drawPlayerName(ctx, player.x, player.y, player.name, player.isAlive, player.buffs);
      }

      // Draw aiming line
      const currentPlayer = state.players.find(p => p.id === playerId);
      if (currentPlayer && currentPlayer.isAlive) {
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(currentPlayer.x, currentPlayer.y);
        ctx.lineTo(sm.x, sm.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Apply fog of war only for current player
      if (currentPlayer) {
        drawFogOfWar(ctx, currentPlayer.x, currentPlayer.y, visionRadius, canvas.width, canvas.height);
      }

      requestAnimationFrame(render);
    };

    render();
  }, [playerId, visionRadius]);

  return (
    <canvas
      ref={canvasRef}
      width={arenaWidth}
      height={arenaHeight}
      style={{
        display: 'block',
        border: '2px solid #4b5563',
        borderRadius: '0.5rem',
        backgroundColor: '#111827',
        width: '100%',
        height: '100%',
        objectFit: 'contain',
      }}
    />
  );
};
