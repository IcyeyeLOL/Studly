/**
 * DEEP SPACE - Raycasting FPS Game Widget
 *
 * Entry point. All game logic is organized across the following modules:
 *
 * - config.js        — Game constants, canvas dimensions
 * - mathUtils.js     — Math helpers (degToRad, distance, normalizeAngle, etc.)
 * - audio.js         — Web Audio API procedural sound generation
 * - effects.js       — Visual effects (screen shake, particles, flash, fade)
 * - gameData.js      — Tiles, enemies, weapons, pickups, level definitions
 * - levelHelpers.js  — Map utilities (getTile, isWalkable, tryOpenDoor)
 * - enemyAI.js       — Enemy AI state machine, damage handling
 * - raycasting.js    — DDA raycasting engine
 * - sprites.js       — Pixel-art sprite patterns for enemies
 * - rendering.js     — 3D rendering (walls, enemies, pickups, weapon, minimap)
 * - FpsShooter.jsx   — Main React component (state, input, game loop, UI)
 */

import React from 'react';
import FpsShooter from './FpsShooter';

export default FpsShooter;
