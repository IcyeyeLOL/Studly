// =============================================================================
// RAYCASTING ENGINE — Multi-hit with height support
// =============================================================================

import { CONFIG, canvasDims } from './config';
import { normalizeAngle } from './mathUtils';
import { TILE, isWallTile, isSolidTile } from './gameData';
import { getTile, getTileHeight, getMapDimensions, isDoorOpenForRay, getDoorOffset } from './levelHelpers';

/**
 * Cast a single ray. Returns a backward-compatible result object.
 * When heightMap is provided, the result also has a `hits` array with
 * multiple height-transition records for the column renderer.
 *
 * Each hit: { distance, wallType, wallX, side, mapX, mapY,
 *             floorH, ceilH, prevFloorH, prevCeilH }
 */
export const castRay = (map, playerX, playerY, rayAngle, heightMap = null) => {
  const angle = normalizeAngle(rayAngle);
  const rayDirX = Math.cos(angle);
  const rayDirY = Math.sin(angle);

  let mapX = Math.floor(playerX);
  let mapY = Math.floor(playerY);

  const deltaDistX = rayDirX === 0 ? Infinity : Math.abs(1 / rayDirX);
  const deltaDistY = rayDirY === 0 ? Infinity : Math.abs(1 / rayDirY);

  const stepX = rayDirX < 0 ? -1 : 1;
  const stepY = rayDirY < 0 ? -1 : 1;

  let sideDistX, sideDistY;

  if (rayDirX < 0) {
    sideDistX = (playerX - mapX) * deltaDistX;
  } else {
    sideDistX = (mapX + 1 - playerX) * deltaDistX;
  }

  if (rayDirY < 0) {
    sideDistY = (playerY - mapY) * deltaDistY;
  } else {
    sideDistY = (mapY + 1 - playerY) * deltaDistY;
  }

  const dims = getMapDimensions(map);
  const maxIterations = Math.ceil(CONFIG.RENDER_DISTANCE * 2);
  const MAX_HITS = 6;

  // Track the height of the space the ray is currently traveling through
  const startH = heightMap ? getTileHeight(map, heightMap, playerX, playerY) : null;
  let prevFloorH = startH ? startH.floorH : 0;
  let prevCeilH = startH ? startH.ceilH : 1;

  // Collect hits
  const hits = [];
  let firstHit = null;
  let iterations = 0;

  // Track vertical occlusion: how much of the column [0..1] is covered
  let occludedBottom = 0; // floor coverage (from bottom up)
  let occludedTop = 1;    // ceiling coverage (from top down)

  while (iterations < maxIterations) {
    let side;
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }

    iterations++;

    if (mapX < 0 || mapX >= dims.width || mapY < 0 || mapY >= dims.height) {
      break;
    }

    const tile = getTile(map, mapX, mapY);

    let perpWallDist;
    if (side === 0) {
      perpWallDist = sideDistX - deltaDistX;
    } else {
      perpWallDist = sideDistY - deltaDistY;
    }
    perpWallDist = Math.max(perpWallDist, 0.001);

    let wallX;
    if (side === 0) {
      wallX = playerY + perpWallDist * rayDirY;
    } else {
      wallX = playerX + perpWallDist * rayDirX;
    }
    wallX -= Math.floor(wallX);

    if (!heightMap) {
      // Classic mode: stop at first wall
      if (isWallTile(tile)) {
        // Doors that are open enough let rays pass through
        if (tile === TILE.DOOR && isDoorOpenForRay(mapX, mapY)) {
          continue;
        }
        firstHit = {
          distance: perpWallDist,
          rawDistance: perpWallDist,
          wallType: tile,
          side,
          wallX,
          mapX,
          mapY,
          hit: true,
          doorOffset: tile === TILE.DOOR ? getDoorOffset(mapX, mapY) : 0,
        };
        break;
      }
      continue;
    }

    // --- Height-aware mode ---
    const tileH = getTileHeight(map, heightMap, mapX, mapY);

    // Record a hit if there's a height discontinuity or it's solid
    const floorChange = tileH.floorH !== prevFloorH;
    const ceilChange = tileH.ceilH !== prevCeilH;
    const isSolid = tileH.solid;

    if (floorChange || ceilChange || isSolid) {
      const hitRecord = {
        distance: perpWallDist,
        rawDistance: perpWallDist,
        wallType: tileH.type || tile,
        side,
        wallX,
        mapX,
        mapY,
        hit: true,
        floorH: tileH.floorH,
        ceilH: tileH.ceilH,
        prevFloorH,
        prevCeilH,
        solid: isSolid,
      };

      hits.push(hitRecord);
      if (!firstHit) firstHit = hitRecord;

      // If this tile is fully solid, it occludes everything — stop
      if (isSolid) break;

      // Update occlusion tracking
      occludedBottom = Math.max(occludedBottom, tileH.floorH);
      occludedTop = Math.min(occludedTop, tileH.ceilH);

      if (occludedBottom >= occludedTop) break;
      if (hits.length >= MAX_HITS) break;
    }

    prevFloorH = tileH.floorH;
    prevCeilH = tileH.ceilH;
  }

  // Build backward-compatible result
  if (firstHit) {
    const result = { ...firstHit, hits };
    return result;
  }

  return {
    distance: CONFIG.RENDER_DISTANCE,
    rawDistance: CONFIG.RENDER_DISTANCE,
    wallType: 0,
    side: 0,
    wallX: 0,
    mapX,
    mapY,
    hit: false,
    hits,
  };
};

export const castAllRays = (map, playerX, playerY, playerAngle, heightMap = null) => {
  const rays = [];
  const halfFov = CONFIG.HALF_FOV;
  const numRays = canvasDims.numRays;

  for (let i = 0; i < numRays; i++) {
    const rayAngle = playerAngle - halfFov + (i / numRays) * CONFIG.FOV_RADIANS;
    const rayResult = castRay(map, playerX, playerY, rayAngle, heightMap);
    rays.push(rayResult);
  }

  return rays;
};
