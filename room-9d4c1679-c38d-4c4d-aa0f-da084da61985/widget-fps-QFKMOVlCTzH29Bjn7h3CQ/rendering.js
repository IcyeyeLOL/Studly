// =============================================================================
// RENDERING FUNCTIONS — DOOM-style visuals
// =============================================================================

import { CONFIG, canvasDims, WALL_HEIGHT_CONSTANT } from './config';
import { distance, hexToRgb } from './mathUtils';
import { TILE, WALL_COLORS, isWallTile, ENEMY_STATE, ENEMY_STATS, WEAPON_TYPE, WEAPON_STATS, PICKUP_VALUES } from './gameData';
import { getMapDimensions, getTileHeight, getTile, getDoorOffset } from './levelHelpers';
import { SPRITE_PATTERNS, getSpritePixelColor } from './sprites';
import { getSpriteCache, SPRITE_ASPECT } from './spriteRenderer';
import { getWeaponCache } from './weaponRenderer';

// Procedural texture generator - creates DOOM-like wall patterns per column
const getWallTexel = (wallType, wallX, wallY, side) => {
  // wallX: 0-1 horizontal position on wall face
  // wallY: 0-1 vertical position on wall strip
  // Returns brightness modifier (0.0 - 1.0)

  switch (wallType) {
    case TILE.WALL_STONE: {
      // BROWN1-style: horizontal brick rows with mortar lines
      const brickRows = 8;
      const brickCols = 4;
      const rowF = wallY * brickRows;
      const row = Math.floor(rowF);
      const rowFrac = rowF - row;
      const colOffset = (row % 2) * 0.5; // stagger every other row
      const colF = (wallX + colOffset) * brickCols;
      const col = Math.floor(colF);
      const colFrac = colF - col;

      // Mortar lines (dark gaps between bricks)
      const mortarH = 0.06;
      const mortarV = 0.04;
      if (rowFrac < mortarH || colFrac < mortarV) return 0.55;

      // Per-brick variation using hash
      const hash = Math.sin(row * 127.1 + col * 311.7) * 43758.5453;
      const variation = (hash - Math.floor(hash)) * 0.15;
      return 0.85 + variation;
    }

    case TILE.WALL_BRICK: {
      // SKIN/MARBLE-style: organic veiny texture with irregular patches
      const vein1 = Math.sin(wallX * 12 + wallY * 8) * 0.5 + 0.5;
      const vein2 = Math.sin(wallX * 7 - wallY * 15 + 2.1) * 0.5 + 0.5;
      const vein3 = Math.sin(wallX * 20 + wallY * 3 + 5.3) * 0.5 + 0.5;
      const veins = vein1 * 0.4 + vein2 * 0.35 + vein3 * 0.25;

      // Dark cracks
      const crack = Math.sin(wallX * 30 + wallY * 50) * Math.sin(wallY * 20 - wallX * 10);
      const crackFactor = crack > 0.7 ? 0.6 : 1.0;

      return (0.7 + veins * 0.3) * crackFactor;
    }

    case TILE.WALL_METAL: {
      // COMPTALL-style: tech panels with rivets and seams
      const panelRows = 4;
      const panelCols = 2;
      const pr = wallY * panelRows;
      const pc = wallX * panelCols;
      const prFrac = pr - Math.floor(pr);
      const pcFrac = pc - Math.floor(pc);

      // Panel seams (bright lines)
      const seamW = 0.03;
      if (prFrac < seamW || prFrac > 1 - seamW) return 1.2;
      if (pcFrac < seamW || pcFrac > 1 - seamW) return 1.2;

      // Rivet positions (4 corners of each panel)
      const rivetR = 0.04;
      const corners = [[0.1, 0.08], [0.9, 0.08], [0.1, 0.92], [0.9, 0.92]];
      for (const [cx, cy] of corners) {
        const dx = pcFrac - cx;
        const dy = prFrac - cy;
        if (dx * dx + dy * dy < rivetR * rivetR) return 1.3;
      }

      // Subtle panel gradient (darker at edges)
      const edgeDist = Math.min(prFrac, 1 - prFrac, pcFrac, 1 - pcFrac);
      const edgeShade = 0.85 + Math.min(edgeDist * 3, 0.15);

      // Computer screen area (green glow in center of some panels)
      const panelIdx = Math.floor(pr) * panelCols + Math.floor(pc);
      if (panelIdx % 3 === 0 && pcFrac > 0.25 && pcFrac < 0.75 && prFrac > 0.2 && prFrac < 0.8) {
        return -1; // Signal for green screen overlay
      }

      return edgeShade;
    }

    case TILE.DOOR: {
      // BIGDOOR-style: heavy door with metal frame and wooden panels
      const frameW = 0.08;
      // Metal frame
      if (wallX < frameW || wallX > 1 - frameW || wallY < frameW || wallY > 1 - frameW) {
        return 1.15;
      }
      // Vertical center strip (door handle area)
      if (Math.abs(wallX - 0.5) < 0.03) return 1.1;
      // Door panels with wood grain
      const grain = Math.sin(wallY * 40 + Math.sin(wallX * 5) * 2) * 0.08;
      // Handle
      if (wallX > 0.7 && wallX < 0.78 && wallY > 0.42 && wallY < 0.58) return 1.3;
      return 0.9 + grain;
    }

    case TILE.EXIT: {
      // Pulsing green with tech border
      const pulse = Math.sin(Date.now() * 0.005) * 0.15 + 0.85;
      const borderW = 0.06;
      if (wallX < borderW || wallX > 1 - borderW || wallY < borderW || wallY > 1 - borderW) {
        return 1.3;
      }
      return pulse;
    }

    default:
      return 1.0;
  }
};

// Project a world height h (0=floor, 1=ceiling) at distance d to screen Y
const projectY = (h, dist, halfHeight, whConst, screenH) => {
  const projH = (whConst * screenH) / dist;
  return halfHeight - (h - 0.5) * projH;
};

// Draw a textured wall strip between two screen Y coordinates
const drawWallStrip = (ctx, stripX, stripW, yTop, yBot, ray, totalShade, rgb) => {
  const wallHeight = yBot - yTop;
  if (wallHeight <= 0) return;

  const texelSteps = Math.min(Math.ceil(wallHeight / 4), 60);
  const texelHeight = wallHeight / texelSteps;

  for (let t = 0; t < texelSteps; t++) {
    const wallY = t / texelSteps;
    const texel = getWallTexel(ray.wallType, ray.wallX, wallY, ray.side);

    let r, g, b;
    if (texel === -1) {
      const screenPulse = 0.6 + Math.sin(Date.now() * 0.003 + ray.mapX * 2 + ray.mapY) * 0.2;
      const scanline = (Math.floor(wallY * 30) % 2 === 0) ? 0.85 : 1.0;
      r = Math.floor(20 * totalShade * screenPulse);
      g = Math.floor(180 * totalShade * screenPulse * scanline);
      b = Math.floor(40 * totalShade * screenPulse);
    } else {
      const shade = totalShade * texel;
      r = Math.floor(Math.min(255, rgb.r * shade));
      g = Math.floor(Math.min(255, rgb.g * shade));
      b = Math.floor(Math.min(255, rgb.b * shade));
    }

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(stripX, yTop + t * texelHeight, stripW + 1, Math.ceil(texelHeight) + 1);
  }
};


 
export const render3DView = (ctx, rays, playerAngle = 0, playerPitch = 0, playerEyeH = 0.5) => {
  const width = canvasDims.width;
  const height = canvasDims.height;
  const pitchOffset = (playerPitch / 90) * height * 0.5;
  const halfHeight = canvasDims.halfHeight + pitchOffset;
  const numRays = canvasDims.numRays;
  const whConst = WALL_HEIGHT_CONSTANT * canvasDims.wallHeightConstant;

  // DOOM-style dark ceiling — cold, oppressive steel
  const skyTop = Math.min(0, halfHeight - height);
  const skyBottom = Math.max(halfHeight, 0);
  const ceilGradient = ctx.createLinearGradient(0, skyTop, 0, skyBottom);
  ceilGradient.addColorStop(0, '#0a0a0e');
  ceilGradient.addColorStop(0.4, '#10121a');
  ceilGradient.addColorStop(0.7, '#181c24');
  ceilGradient.addColorStop(1, '#20252e');
  ctx.fillStyle = ceilGradient;
  ctx.fillRect(0, skyTop, width, skyBottom - skyTop);

  // Sand floor — gradient with subtle scanline detail
  const floorTop = Math.max(0, halfHeight);
  const floorBottom = Math.max(height, halfHeight + height);
  const floorGradient = ctx.createLinearGradient(0, floorTop, 0, floorBottom);
  floorGradient.addColorStop(0, '#80664c');
  floorGradient.addColorStop(0.2, '#6a5638');
  floorGradient.addColorStop(0.45, '#4a3c28');
  floorGradient.addColorStop(0.75, '#332a1a');
  floorGradient.addColorStop(1, '#1a1410');
  ctx.fillStyle = floorGradient;
  ctx.fillRect(0, floorTop, width, floorBottom - floorTop);

  // Sparse horizontal detail lines for sand feel (very cheap)
  const floorRange = Math.min(height, floorBottom) - floorTop;
  if (floorRange > 0) {
    for (let i = 0; i < 6; i++) {
      const t = (i + 0.5) / 6;
      const ly = Math.floor(floorTop + t * floorRange);
      const alpha = (1 - t) * 0.06;
      ctx.fillStyle = `rgba(160,140,100,${alpha})`;
      ctx.fillRect(0, ly, width, 1);
    }
  }



  const stripWidth = Math.ceil(width / numRays);
  const playerFloor = playerEyeH - CONFIG.EYE_HEIGHT;

  for (let i = 0; i < rays.length; i++) {
    const ray = rays[i];
    if (!ray.hit) continue;

    const stripX = i * stripWidth;

    // Check if this ray has multi-hit height data
    if (ray.hits && ray.hits.length > 0) {
      // --- Multi-hit height-aware rendering ---
      // Track drawable vertical range (pixels)
      let drawTop = 0;
      let drawBot = height;

      for (let h = 0; h < ray.hits.length; h++) {
        const hit = ray.hits[h];
        if (drawTop >= drawBot) break;

        const dist = hit.distance;
        const sideShade = hit.side === 0 ? 1.0 : 0.65;
        const fogFactor = Math.max(0.15, 1 - (dist / CONFIG.RENDER_DISTANCE) * 0.85);
        const totalShade = sideShade * fogFactor;

        const colors = WALL_COLORS[hit.wallType] || WALL_COLORS[TILE.WALL_STONE];
        const baseColor = hit.side === 0 ? colors.light : colors.base;
        const rgb = hexToRgb(baseColor);

        // Project height positions to screen Y
        // Heights are relative to player eye: eyeH maps to horizon
        const projCeilY = projectY(hit.ceilH - playerEyeH + 0.5, dist, halfHeight, whConst, height);
        const projFloorY = projectY(hit.floorH - playerEyeH + 0.5, dist, halfHeight, whConst, height);
        const projPrevCeilY = projectY(hit.prevCeilH - playerEyeH + 0.5, dist, halfHeight, whConst, height);
        const projPrevFloorY = projectY(hit.prevFloorH - playerEyeH + 0.5, dist, halfHeight, whConst, height);

        if (hit.solid) {
          // Full solid wall: draw from drawTop to drawBot, clipped to projection
          const wallTopY = Math.max(drawTop, projCeilY);
          const wallBotY = Math.min(drawBot, projFloorY);

          // Wall face
          if (wallTopY < wallBotY) {
            drawWallStrip(ctx, stripX, stripWidth, wallTopY, wallBotY, hit, totalShade, rgb);

            // Edge darkening
            if (dist < 3 && stripWidth > 1 && (hit.wallX < 0.02 || hit.wallX > 0.98)) {
              ctx.fillStyle = `rgba(0, 0, 0, ${0.2 * fogFactor})`;
              ctx.fillRect(stripX, wallTopY, stripWidth + 1, wallBotY - wallTopY);
            }
          }

          drawTop = drawBot; // column fully drawn
          break;
        }

        // --- Non-solid: partial height wall (step-up, step-down, half-wall) ---

        // Upper wall face: ceiling dropped (hit.ceilH < hit.prevCeilH)
        // projPrevCeilY is ABOVE projCeilY on screen (smaller Y), so Top=prevCeil, Bot=ceil
        if (hit.ceilH < hit.prevCeilH) {
          const upperWallTop = Math.max(drawTop, projPrevCeilY);
          const upperWallBot = Math.min(drawBot, projCeilY);

          if (upperWallTop < upperWallBot) {
            drawWallStrip(ctx, stripX, stripWidth, upperWallTop, upperWallBot, hit, totalShade, rgb);
            drawTop = Math.max(drawTop, upperWallBot);
          }
        }

        // Lower wall face: floor raised (hit.floorH > hit.prevFloorH)
        // projFloorY is ABOVE projPrevFloorY on screen (smaller Y), so Top=floor, Bot=prevFloor
        if (hit.floorH > hit.prevFloorH) {
          const lowerWallTop = Math.max(drawTop, projFloorY);
          const lowerWallBot = Math.min(drawBot, projPrevFloorY);

          if (lowerWallTop < lowerWallBot) {
            drawWallStrip(ctx, stripX, stripWidth, lowerWallTop, lowerWallBot, hit, totalShade, rgb);
            drawBot = Math.min(drawBot, lowerWallTop);
          }
        }

        // Floor dropped (step down): hit.floorH < hit.prevFloorH
        // projPrevFloorY is ABOVE projFloorY on screen (smaller Y), so Top=prevFloor, Bot=floor
        if (hit.floorH < hit.prevFloorH) {
          const stepWallTop = Math.max(drawTop, projPrevFloorY);
          const stepWallBot = Math.min(drawBot, projFloorY);
          if (stepWallTop < stepWallBot) {
            drawWallStrip(ctx, stripX, stripWidth, stepWallTop, stepWallBot, hit, totalShade * 0.7, rgb);
          }
        }

        // Ceiling raised (opening up): hit.ceilH > hit.prevCeilH
        // projCeilY is ABOVE projPrevCeilY on screen (smaller Y), so Top=ceil, Bot=prevCeil
        if (hit.ceilH > hit.prevCeilH) {
          const stepWallTop = Math.max(drawTop, projCeilY);
          const stepWallBot = Math.min(drawBot, projPrevCeilY);
          if (stepWallTop < stepWallBot) {
            drawWallStrip(ctx, stripX, stripWidth, stepWallTop, stepWallBot, hit, totalShade * 0.7, rgb);
          }
        }

        // Floor tinting: color floors at different heights from player
        if (!hit.solid) {
          const heightDiff = hit.floorH - playerFloor;
          if (Math.abs(heightDiff) > 0.01) {
            const projRefFloor = halfHeight + 0.5 * (whConst * height) / dist;
            const floorFog = Math.max(0.15, 1 - (dist / CONFIG.RENDER_DISTANCE) * 0.7);
            const tAmt = Math.min(Math.abs(heightDiff) / 0.5, 1);
            let fr, fg, fb;
            if (heightDiff > 0) {
              // Raised: warm light concrete
              fr = Math.floor((85 + tAmt * 55) * floorFog);
              fg = Math.floor((78 + tAmt * 35) * floorFog);
              fb = Math.floor((55 + tAmt * 20) * floorFog);
            } else {
              // Sunken: dark cool stone
              fr = Math.floor((30 + tAmt * 8) * floorFog);
              fg = Math.floor((42 + tAmt * 5) * floorFog);
              fb = Math.floor((30 + tAmt * 12) * floorFog);
            }
            ctx.fillStyle = `rgb(${fr},${fg},${fb})`;
            let tintTop, tintBot;
            if (heightDiff > 0) {
              tintTop = Math.max(drawTop, projFloorY);
              tintBot = Math.min(drawBot, projRefFloor);
            } else {
              tintTop = Math.max(drawTop, projRefFloor);
              tintBot = Math.min(drawBot, projFloorY);
            }
            if (tintBot > tintTop) {
              ctx.fillRect(stripX, tintTop, stripWidth + 1, tintBot - tintTop);
            }
          }
        }
      }
    } else {
      // --- Classic single-hit rendering (no heightMap) ---
      const projectedHeight = (whConst * height) / ray.distance;
      const fullWallHeight = Math.min(height * 2, projectedHeight);
      const fullWallTop = halfHeight - fullWallHeight / 2;

      // Door animation: shrink visible portion as door slides up
      const doorOffset = (ray.wallType === TILE.DOOR && ray.doorOffset != null) ? ray.doorOffset : 0;
      const visibleFrac = 1 - doorOffset;
      const wallHeight = fullWallHeight * visibleFrac;
      const wallTop = fullWallTop; // door top stays at ceiling

      const colors = WALL_COLORS[ray.wallType] || WALL_COLORS[TILE.WALL_STONE];
      const sideShade = ray.side === 0 ? 1.0 : 0.65;
      const fogFactor = Math.max(0.15, 1 - (ray.distance / CONFIG.RENDER_DISTANCE) * 0.85);
      const totalShade = sideShade * fogFactor;
      const baseColor = ray.side === 0 ? colors.light : colors.base;
      const rgb = hexToRgb(baseColor);

      if (wallHeight > 0.5) {
        const texelSteps = Math.min(Math.ceil(wallHeight / 4), 60);
        const texelHeight = wallHeight / texelSteps;

        for (let t = 0; t < texelSteps; t++) {
          // Map texture so door appears to slide up: texture coords go from 0 to visibleFrac
          const wallY = (t / texelSteps) * visibleFrac;
          const texel = getWallTexel(ray.wallType, ray.wallX, wallY, ray.side);

          let r, g, b;
          if (texel === -1) {
            const screenPulse = 0.6 + Math.sin(Date.now() * 0.003 + ray.mapX * 2 + ray.mapY) * 0.2;
            const scanline = (Math.floor(wallY * 30) % 2 === 0) ? 0.85 : 1.0;
            r = Math.floor(20 * totalShade * screenPulse);
            g = Math.floor(180 * totalShade * screenPulse * scanline);
            b = Math.floor(40 * totalShade * screenPulse);
          } else {
            const shade = totalShade * texel;
            r = Math.floor(Math.min(255, rgb.r * shade));
            g = Math.floor(Math.min(255, rgb.g * shade));
            b = Math.floor(Math.min(255, rgb.b * shade));
          }

          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(stripX, wallTop + t * texelHeight, stripWidth + 1, Math.ceil(texelHeight) + 1);
        }
      }

      if (ray.distance < 3 && stripWidth > 1) {
        if (ray.wallX < 0.02 || ray.wallX > 0.98) {
          ctx.fillStyle = `rgba(0, 0, 0, ${0.2 * fogFactor})`;
          ctx.fillRect(stripX, wallTop, stripWidth + 1, wallHeight);
        }
      }
    }
  }


};

export const renderEnemies3D = (ctx, enemies, rays, playerX, playerY, playerAngle, playerPitch = 0, map = null, heightMap = null, playerEyeH = 0.5) => {
  const width = canvasDims.width;
  const height = canvasDims.height;
  const pitchOffset = (playerPitch / 90) * height * 0.5;
  const halfHeight = canvasDims.halfHeight + pitchOffset;
  const numRays = canvasDims.numRays;
  const stripWidth = Math.ceil(width / numRays);

  const sorted = [];
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.state === ENEMY_STATE.DEAD && e.deathTimer <= 0) continue;
    sorted.push({ idx: i, dist: distance(playerX, playerY, e.x, e.y) });
  }
  sorted.sort((a, b) => b.dist - a.dist);

  const cache = getSpriteCache();

  for (const entry of sorted) {
    const enemy = enemies[entry.idx];
    const dist = entry.dist;

    const angleToEnemy = Math.atan2(enemy.y - playerY, enemy.x - playerX);
    let relativeAngle = angleToEnemy - playerAngle;
    while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
    while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

    if (Math.abs(relativeAngle) > CONFIG.HALF_FOV + 0.15) continue;

    const screenX = (relativeAngle / CONFIG.FOV_RADIANS + 0.5) * width;
    const aspect = SPRITE_ASPECT[enemy.type] || 0.6;
    const projectedSize = (WALL_HEIGHT_CONSTANT * canvasDims.wallHeightConstant * height * 0.7) / dist;
    const spriteHeight = Math.min(height, projectedSize);
    const spriteWidth = spriteHeight * aspect;

    // Height-aware vertical positioning: offset sprite based on enemy floor height
    let enemyFloorH = 0;
    if (map && heightMap) {
      enemyFloorH = getTileHeight(map, heightMap, enemy.x, enemy.y).floorH;
    }
    const projFullWallH = (WALL_HEIGHT_CONSTANT * canvasDims.wallHeightConstant * height) / dist;
    const heightOffset = (enemyFloorH - playerEyeH + CONFIG.EYE_HEIGHT) * projFullWallH;
    const spriteTop = halfHeight - spriteHeight / 2 - heightOffset;
    const spriteLeft = screenX - spriteWidth / 2;

    // Fog and shade calculations
    const fogFactor = Math.max(0.15, 1 - (dist / CONFIG.RENDER_DISTANCE) * 0.85);
    const isHurt = enemy.state === ENEMY_STATE.HURT;
    const isDead = enemy.state === ENEMY_STATE.DEAD;
    let deathAlpha = 1;
    if (isDead) deathAlpha = Math.max(0, enemy.deathTimer / 60);

    // Try drawImage path with pre-rendered sprites
    const typeCache = cache?.[enemy.type];
    const stateFrames = typeCache?.[enemy.state] || typeCache?.[ENEMY_STATE.IDLE];

    if (stateFrames && stateFrames.length > 0) {
      const frameIdx = enemy.animFrame % stateFrames.length;
      const spriteCanvas = stateFrames[frameIdx];

      // Find contiguous visible column spans (not occluded by walls)
      const startRay = Math.max(0, Math.floor(spriteLeft / stripWidth));
      const endRay = Math.min(numRays - 1, Math.ceil((spriteLeft + spriteWidth) / stripWidth));

      // Collect visible spans — use solid wall distance for occlusion (not height transitions)
      const spans = [];
      let spanStart = -1;
      for (let r = startRay; r <= endRay; r++) {
        let wallDist = Infinity;
        if (rays[r] && rays[r].hit) {
          if (rays[r].hits && rays[r].hits.length > 0) {
            for (let hi = 0; hi < rays[r].hits.length; hi++) {
              if (rays[r].hits[hi].solid) { wallDist = rays[r].hits[hi].distance; break; }
            }
          } else {
            wallDist = rays[r].distance;
          }
        }
        const occluded = wallDist < dist;
        if (!occluded) {
          if (spanStart < 0) spanStart = r;
        } else {
          if (spanStart >= 0) {
            spans.push([spanStart, r - 1]);
            spanStart = -1;
          }
        }
      }
      if (spanStart >= 0) spans.push([spanStart, endRay]);

      if (spans.length === 0) continue;

      // Draw each visible span
      for (const [sStart, sEnd] of spans) {
        const clipLeft = sStart * stripWidth;
        const clipRight = (sEnd + 1) * stripWidth;
        const clipW = clipRight - clipLeft;

        ctx.save();

        // Clip to visible columns
        ctx.beginPath();
        ctx.rect(clipLeft, 0, clipW, height);
        ctx.clip();

        // Bake fog + death fade into globalAlpha (no separate fillRect overlay)
        ctx.globalAlpha = fogFactor * deathAlpha;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(spriteCanvas, spriteLeft, spriteTop, spriteWidth, spriteHeight);

        // Hurt tint — redraw sprite with red blend, respects sprite transparency
        if (isHurt) {
          ctx.globalCompositeOperation = 'source-atop';
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = '#ff2200';
          ctx.fillRect(spriteLeft, spriteTop, spriteWidth, spriteHeight);
        }

        ctx.restore();
      }
    } else {
      // Fallback: old per-pixel path using SPRITE_PATTERNS
      const patterns = SPRITE_PATTERNS[enemy.type];
      const fallbackFrames = patterns?.[enemy.state] || patterns?.[ENEMY_STATE.IDLE];
      if (!fallbackFrames) continue;
      const frameIdx = enemy.animFrame % fallbackFrames.length;
      const pattern = fallbackFrames[frameIdx];
      const COLS = pattern[0].length;
      const ROWS = pattern.length;

      const stats = ENEMY_STATS[enemy.type];
      const rgb = hexToRgb(stats?.color || '#8b5e3c');
      let shade = fogFactor;
      if (isHurt) shade = Math.min(1.0, fogFactor * 1.5);
      if (isDead) shade *= deathAlpha;

      const pixH = spriteHeight / ROWS;
      const startRay = Math.max(0, Math.floor(spriteLeft / stripWidth));
      const endRay = Math.min(numRays - 1, Math.ceil((spriteLeft + spriteWidth) / stripWidth));

      for (let r = startRay; r <= endRay; r++) {
        let wd = Infinity;
        if (rays[r] && rays[r].hit) {
          if (rays[r].hits && rays[r].hits.length > 0) {
            for (let hi = 0; hi < rays[r].hits.length; hi++) {
              if (rays[r].hits[hi].solid) { wd = rays[r].hits[hi].distance; break; }
            }
          } else { wd = rays[r].distance; }
        }
        if (wd < dist) continue;
        const colScreenX = r * stripWidth;
        const patCol = Math.floor(((colScreenX - spriteLeft) / spriteWidth) * COLS);
        if (patCol < 0 || patCol >= COLS) continue;
        for (let row = 0; row < ROWS; row++) {
          const val = pattern[row][patCol];
          if (val === 0) continue;
          const color = getSpritePixelColor(val, rgb, shade, isHurt);
          if (!color) continue;
          ctx.fillStyle = color;
          const py = spriteTop + row * pixH;
          ctx.fillRect(colScreenX, py, stripWidth, Math.ceil(pixH));
        }
      }
    }
  }
};

export const renderPickups3D = (ctx, pickups, rays, playerX, playerY, playerAngle, frameTick, playerPitch = 0) => {
  const width = canvasDims.width;
  const height = canvasDims.height;
  const pitchOffset = (playerPitch / 90) * height * 0.5;
  const halfHeight = canvasDims.halfHeight + pitchOffset;
  const numRays = canvasDims.numRays;
  const stripWidth = Math.ceil(width / numRays);

  const sorted = pickups
    .filter(p => !p.collected)
    .map(p => ({ ...p, dist: distance(playerX, playerY, p.x, p.y) }))
    .sort((a, b) => b.dist - a.dist);

  for (const pickup of sorted) {
    const angleToPickup = Math.atan2(pickup.y - playerY, pickup.x - playerX);
    let relativeAngle = angleToPickup - playerAngle;
    while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
    while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

    if (Math.abs(relativeAngle) > CONFIG.HALF_FOV + 0.1) continue;

    const screenX = (relativeAngle / CONFIG.FOV_RADIANS + 0.5) * width;
    const projectedSize = (WALL_HEIGHT_CONSTANT * canvasDims.wallHeightConstant * height * 0.35) / pickup.dist;
    const spriteSize = Math.min(height * 0.3, projectedSize);

    const bob = Math.sin(frameTick * 0.05 + pickup.x * 3 + pickup.y * 7) * spriteSize * 0.1;
    const spriteTop = halfHeight - spriteSize / 2 + spriteSize * 0.25 + bob;
    const spriteLeft = screenX - spriteSize / 2;

    const pickupData = PICKUP_VALUES[pickup.type];
    const color = pickupData?.color || '#ccaa44';
    const rgb = hexToRgb(color);
    const fogFactor = Math.max(0.2, 1 - (pickup.dist / CONFIG.RENDER_DISTANCE) * 0.8);

    const pCategory = pickupData?.category || 'ammo';
    let pattern;
    if (pCategory === 'health') {
      pattern = [
        [0,1,1,0],
        [1,1,1,1],
        [1,1,1,1],
        [0,1,1,0],
      ];
    } else if (pCategory === 'weapon') {
      pattern = [
        [0,1,1,3],
        [1,1,1,1],
        [0,3,1,0],
        [0,0,1,0],
      ];
    } else {
      pattern = [
        [0,1,1,0],
        [1,3,3,1],
        [1,3,3,1],
        [0,1,1,0],
      ];
    }
    const PCOLS = 4, PROWS = 4;
    const ppH = spriteSize / PROWS;

    const startRay = Math.max(0, Math.floor(spriteLeft / stripWidth));
    const endRay = Math.min(numRays - 1, Math.ceil((spriteLeft + spriteSize) / stripWidth));

    for (let r = startRay; r <= endRay; r++) {
      if (rays[r] && rays[r].hit && rays[r].distance < pickup.dist) continue;

      const colScreenX = r * stripWidth;
      const patCol = Math.floor(((colScreenX - spriteLeft) / spriteSize) * PCOLS);
      if (patCol < 0 || patCol >= PCOLS) continue;

      for (let row = 0; row < PROWS; row++) {
        const val = pattern[row][patCol];
        if (val === 0) continue;

        const brightMul = val === 3 ? 1.3 : 1.0;
        const pulse = 0.85 + Math.sin(frameTick * 0.08 + pickup.x * 5) * 0.15;
        const s = fogFactor * brightMul * pulse;

        ctx.fillStyle = `rgb(${Math.min(255, Math.floor(rgb.r * s))}, ${Math.min(255, Math.floor(rgb.g * s))}, ${Math.min(255, Math.floor(rgb.b * s))})`;
        const py = spriteTop + row * ppH;
        ctx.fillRect(colScreenX, py, stripWidth, Math.ceil(ppH));
      }
    }
  }
};

export const renderWeapon = (ctx, player) => {
  const width = canvasDims.width;
  const height = canvasDims.height;
  const weaponStats = WEAPON_STATS[player.weapon];
  if (!weaponStats) return;

  const centerX = width / 2;
  const recoil = player.recoilOffset || 0;
  const bob = player.isShooting ? 0 : Math.sin(Date.now() * 0.004) * 3;
  const sway = Math.sin(Date.now() * 0.006) * 2;

  ctx.save();

  const baseY = height - 5 + bob;

  // Try pre-rendered weapon cache
  const wCache = getWeaponCache();
  const cached = wCache?.[player.weapon];

  if (cached) {
    const { canvas: weaponCanvas, w: ww, h: wh } = cached;
    // Scale weapon to roughly match the old procedural sizes
    const scale = player.weapon === WEAPON_TYPE.SHOTGUN ? 1.1
      : player.weapon === WEAPON_TYPE.MACHINEGUN ? 1.15 : 1.0;
    const drawW = ww * scale;
    const drawH = wh * scale;
    const drawX = centerX - drawW / 2 + sway;
    const drawY = baseY - drawH + 10 - recoil;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(weaponCanvas, drawX, drawY, drawW, drawH);
  } else {
    // Fallback: old procedural drawing
    if (player.weapon === WEAPON_TYPE.PISTOL) {
      ctx.fillStyle = '#6a6a6a';
      ctx.fillRect(centerX - 10 + sway, baseY - 120 - recoil, 20, 60);
      ctx.fillStyle = '#555555';
      ctx.fillRect(centerX - 14 + sway, baseY - 65 - recoil, 28, 25);
      ctx.fillStyle = '#484848';
      ctx.fillRect(centerX - 14 + sway, baseY - 60 - recoil, 28, 2);
      ctx.fillRect(centerX - 14 + sway, baseY - 52 - recoil, 28, 2);
      ctx.fillStyle = '#4a3a2a';
      ctx.fillRect(centerX - 12 + sway, baseY - 40 - recoil, 24, 50);
      ctx.fillStyle = '#3a2a1a';
      for (let g = 0; g < 5; g++) {
        ctx.fillRect(centerX - 10 + sway, baseY - 36 - recoil + g * 8, 20, 1);
      }
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX + sway, baseY - 35 - recoil, 8, 0, Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(centerX + sway, baseY - 122 - recoil, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (player.weapon === WEAPON_TYPE.SHOTGUN) {
      ctx.fillStyle = '#5a5a5a';
      ctx.fillRect(centerX - 16 + sway, baseY - 160 - recoil, 12, 90);
      ctx.fillRect(centerX + 4 + sway, baseY - 160 - recoil, 12, 90);
      ctx.fillStyle = '#707070';
      ctx.fillRect(centerX - 18 + sway, baseY - 162 - recoil, 16, 4);
      ctx.fillRect(centerX + 2 + sway, baseY - 162 - recoil, 16, 4);
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.arc(centerX - 10 + sway, baseY - 164 - recoil, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(centerX + 10 + sway, baseY - 164 - recoil, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(centerX - 20 + sway, baseY - 70 - recoil, 40, 30);
      ctx.fillStyle = '#5a4a30';
      ctx.fillRect(centerX - 22 + sway, baseY - 100 - recoil, 44, 10);
      ctx.fillStyle = '#6a5030';
      ctx.fillRect(centerX - 14 + sway, baseY - 40 - recoil, 28, 55);
      ctx.fillStyle = '#5a4020';
      for (let g = 0; g < 5; g++) {
        ctx.fillRect(centerX - 12 + sway, baseY - 35 - recoil + g * 10, 24, 1);
      }
    } else if (player.weapon === WEAPON_TYPE.MACHINEGUN) {
      ctx.fillStyle = '#555555';
      ctx.fillRect(centerX - 8 + sway, baseY - 170 - recoil, 16, 100);
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(centerX - 4 + sway, baseY - 172 - recoil, 2, 100);
      ctx.fillRect(centerX + 2 + sway, baseY - 172 - recoil, 2, 100);
      ctx.fillStyle = '#606060';
      ctx.fillRect(centerX - 12 + sway, baseY - 145 - recoil, 24, 6);
      ctx.fillRect(centerX - 12 + sway, baseY - 125 - recoil, 24, 6);
      ctx.fillRect(centerX - 12 + sway, baseY - 105 - recoil, 24, 6);
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.arc(centerX - 3 + sway, baseY - 174 - recoil, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(centerX + 3 + sway, baseY - 174 - recoil, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#484848';
      ctx.fillRect(centerX - 18 + sway, baseY - 70 - recoil, 36, 30);
      ctx.fillStyle = '#6a6030';
      ctx.fillRect(centerX + 10 + sway, baseY - 60 - recoil, 14, 35);
      ctx.fillStyle = '#8a8040';
      for (let l = 0; l < 4; l++) {
        ctx.fillRect(centerX + 12 + sway, baseY - 56 - recoil + l * 8, 10, 3);
      }
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(centerX - 12 + sway, baseY - 40 - recoil, 24, 55);
      ctx.fillStyle = '#4a3a2a';
      ctx.fillRect(centerX - 10 + sway, baseY - 38 - recoil, 20, 48);
    }
  }

  // DOOM-style muzzle flash — procedural (works with both paths)
  if (player.muzzleFlash > 0) {
    const flashIntensity = player.muzzleFlash / 5;
    const flashRgb = hexToRgb(weaponStats.flashColor);
    const flashSize = player.weapon === WEAPON_TYPE.SHOTGUN ? 50 : player.weapon === WEAPON_TYPE.MACHINEGUN ? 35 : 28;

    const flashY = player.weapon === WEAPON_TYPE.MACHINEGUN
      ? baseY - 178 - recoil
      : player.weapon === WEAPON_TYPE.SHOTGUN
        ? baseY - 168 - recoil
        : baseY - 126 - recoil;

    ctx.globalAlpha = flashIntensity * 0.95;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX + sway, flashY, flashSize * 0.35 * flashIntensity, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = flashIntensity * 0.7;
    const flashGrad = ctx.createRadialGradient(centerX + sway, flashY, 0, centerX + sway, flashY, flashSize * flashIntensity);
    flashGrad.addColorStop(0, `rgba(${flashRgb.r}, ${flashRgb.g}, ${flashRgb.b}, 0.9)`);
    flashGrad.addColorStop(0.5, `rgba(${flashRgb.r}, ${Math.floor(flashRgb.g * 0.6)}, 0, 0.5)`);
    flashGrad.addColorStop(1, 'rgba(255, 80, 0, 0)');
    ctx.fillStyle = flashGrad;
    ctx.fillRect(centerX + sway - flashSize, flashY - flashSize, flashSize * 2, flashSize * 2);

    ctx.globalAlpha = flashIntensity * 0.5;
    ctx.strokeStyle = `rgba(255, 200, 50, ${flashIntensity * 0.7})`;
    ctx.lineWidth = 2;
    const spikes = player.weapon === WEAPON_TYPE.SHOTGUN ? 10 : 5;
    for (let s = 0; s < spikes; s++) {
      const spikeAngle = (s / spikes) * Math.PI * 2 + Date.now() * 0.015;
      const spikeLen = flashSize * 1.5 * flashIntensity;
      ctx.beginPath();
      ctx.moveTo(centerX + sway, flashY);
      ctx.lineTo(
        centerX + sway + Math.cos(spikeAngle) * spikeLen,
        flashY + Math.sin(spikeAngle) * spikeLen
      );
      ctx.stroke();
    }

    ctx.globalAlpha = flashIntensity * 0.15;
    ctx.fillStyle = `rgb(${flashRgb.r}, ${Math.floor(flashRgb.g * 0.7)}, ${Math.floor(flashRgb.b * 0.3)})`;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 1;
  }

  ctx.restore();
};

export const renderMinimap = (ctx, map, playerX, playerY, playerAngle, enemies = [], pickups = []) => {
  const minimapSize = Math.min(180, Math.max(120, canvasDims.width * 0.15));
  const minimapX = canvasDims.width - minimapSize - 16;
  const minimapY = 16;
  const dims = getMapDimensions(map);
  const cellSize = minimapSize / Math.max(dims.width, dims.height);

  // DOOM-style dark minimap background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(minimapX - 4, minimapY - 4, minimapSize + 8, minimapSize + 8);

  // Border
  ctx.strokeStyle = '#4a4a3a';
  ctx.lineWidth = 2;
  ctx.strokeRect(minimapX - 4, minimapY - 4, minimapSize + 8, minimapSize + 8);

  // Draw map cells
  for (let y = 0; y < dims.height; y++) {
    for (let x = 0; x < dims.width; x++) {
      const tile = map[y][x];
      const cellX = minimapX + x * cellSize;
      const cellY = minimapY + y * cellSize;

      if (isWallTile(tile)) {
        if (tile === TILE.DOOR) {
          const doff = getDoorOffset(x, y);
          if (doff >= 0.7) {
            // Open door — lighter color
            ctx.fillStyle = '#8a7a5a';
            ctx.fillRect(cellX, cellY, cellSize, cellSize);
          } else {
            const colors = WALL_COLORS[tile];
            ctx.fillStyle = colors.dark;
            ctx.fillRect(cellX, cellY, cellSize, cellSize);
          }
        } else {
          const colors = WALL_COLORS[tile] || WALL_COLORS[TILE.WALL_STONE];
          ctx.fillStyle = colors.dark;
          ctx.fillRect(cellX, cellY, cellSize, cellSize);
        }
      } else if (tile === TILE.EXIT) {
        ctx.fillStyle = '#2a6a3a';
        ctx.fillRect(cellX, cellY, cellSize, cellSize);
      } else {
        ctx.fillStyle = '#1a1a18';
        ctx.fillRect(cellX, cellY, cellSize, cellSize);
      }
    }
  }

  // Draw pickups
  pickups.forEach(pickup => {
    const px = minimapX + pickup.x * cellSize;
    const py = minimapY + pickup.y * cellSize;
    const pickupData = PICKUP_VALUES[pickup.type];
    ctx.fillStyle = pickupData?.color || '#ccaa44';
    ctx.beginPath();
    ctx.arc(px, py, cellSize / 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw enemies
  enemies.forEach(enemy => {
    const ex = minimapX + enemy.x * cellSize;
    const ey = minimapY + enemy.y * cellSize;
    const stats = ENEMY_STATS[enemy.type];
    ctx.fillStyle = stats?.color || '#8b5e3c';
    ctx.beginPath();
    ctx.arc(ex, ey, cellSize / 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Player — green arrow (DOOM automap style)
  const playerMapX = minimapX + playerX * cellSize;
  const playerMapY = minimapY + playerY * cellSize;

  ctx.save();
  ctx.translate(playerMapX, playerMapY);
  ctx.rotate(playerAngle);

  ctx.fillStyle = '#44ff44';
  ctx.beginPath();
  ctx.moveTo(cellSize * 0.8, 0);
  ctx.lineTo(-cellSize * 0.4, -cellSize * 0.4);
  ctx.lineTo(-cellSize * 0.4, cellSize * 0.4);
  ctx.closePath();
  ctx.fill();

  // FOV cone
  ctx.fillStyle = 'rgba(68, 255, 68, 0.1)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, cellSize * 4, -CONFIG.HALF_FOV, CONFIG.HALF_FOV);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
};
