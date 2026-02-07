// =============================================================================
// LEVEL HELPER FUNCTIONS
// =============================================================================

import { TILE, isSolidTile, isWallTile } from './gameData';
import { CONFIG } from './config';

// ---------------------------------------------------------------------------
// Door animation state
// ---------------------------------------------------------------------------
const DOOR_SPEED = 0.035;
const DOOR_STAY_OPEN = 240; // frames (~4 seconds at 60fps)
const DOOR_PASSABLE_AT = 0.7;
const DOOR_RAY_PASS_AT = 0.9;

// Map<string, { offset: number, state: string, autoCloseTimer: number }>
let doorStates = new Map();

const doorKey = (x, y) => `${x},${y}`;

export const initDoorStates = (map) => {
  doorStates = new Map();
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] === TILE.DOOR) {
        doorStates.set(doorKey(x, y), { offset: 0, state: 'closed', autoCloseTimer: 0 });
      }
    }
  }
};

export const resetDoorStates = () => {
  doorStates = new Map();
};

export const getDoorOffset = (x, y) => {
  const ds = doorStates.get(doorKey(x, y));
  return ds ? ds.offset : 0;
};

export const isDoorPassable = (x, y) => {
  const ds = doorStates.get(doorKey(x, y));
  return ds ? ds.offset >= DOOR_PASSABLE_AT : false;
};

export const isDoorOpenForRay = (x, y) => {
  const ds = doorStates.get(doorKey(x, y));
  return ds ? ds.offset >= DOOR_RAY_PASS_AT : false;
};

export const updateDoorStates = (dt, playerX, playerY) => {
  for (const [key, ds] of doorStates) {
    switch (ds.state) {
      case 'opening':
        ds.offset = Math.min(1, ds.offset + DOOR_SPEED * dt);
        if (ds.offset >= 1) {
          ds.offset = 1;
          ds.state = 'open';
          ds.autoCloseTimer = DOOR_STAY_OPEN;
        }
        break;
      case 'open':
        ds.autoCloseTimer -= dt;
        if (ds.autoCloseTimer <= 0) {
          ds.state = 'closing';
        }
        break;
      case 'closing': {
        // Safety: if player is inside this door tile, reopen
        const [kx, ky] = key.split(',').map(Number);
        const px = Math.floor(playerX);
        const py = Math.floor(playerY);
        if (px === kx && py === ky) {
          ds.state = 'opening';
          break;
        }
        ds.offset = Math.max(0, ds.offset - DOOR_SPEED * dt);
        if (ds.offset <= 0) {
          ds.offset = 0;
          ds.state = 'closed';
        }
        break;
      }
    }
  }
};

export const tryToggleDoor = (map, px, py, angle) => {
  for (let dist = 0.5; dist <= 1.5; dist += 0.5) {
    const checkX = Math.floor(px + Math.cos(angle) * dist);
    const checkY = Math.floor(py + Math.sin(angle) * dist);
    const dims = getMapDimensions(map);
    if (checkX >= 0 && checkX < dims.width && checkY >= 0 && checkY < dims.height) {
      if (map[checkY][checkX] === TILE.DOOR) {
        const ds = doorStates.get(doorKey(checkX, checkY));
        if (!ds) continue;
        if (ds.state === 'closed' || ds.state === 'closing') {
          ds.state = 'opening';
          return 'open';
        } else if (ds.state === 'open' || ds.state === 'opening') {
          ds.state = 'closing';
          return 'close';
        }
      }
    }
  }
  return null;
};

export const getFacingDoorState = (map, px, py, angle) => {
  for (let dist = 0.5; dist <= 1.5; dist += 0.5) {
    const checkX = Math.floor(px + Math.cos(angle) * dist);
    const checkY = Math.floor(py + Math.sin(angle) * dist);
    const dims = getMapDimensions(map);
    if (checkX >= 0 && checkX < dims.width && checkY >= 0 && checkY < dims.height) {
      if (map[checkY][checkX] === TILE.DOOR) {
        const ds = doorStates.get(doorKey(checkX, checkY));
        if (!ds) continue;
        return ds.state;
      }
    }
  }
  return null;
};

export const getTile = (map, x, y) => {
  const mapX = Math.floor(x);
  const mapY = Math.floor(y);
  if (mapY < 0 || mapY >= map.length || mapX < 0 || mapX >= map[0].length) {
    return TILE.WALL_STONE;
  }
  return map[mapY][mapX];
};

export const getMapDimensions = (map) => ({
  width: map[0].length,
  height: map.length,
});

export const findTilePositions = (map, tileType) => {
  const positions = [];
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] === tileType) {
        positions.push({ x: x + 0.5, y: y + 0.5 });
      }
    }
  }
  return positions;
};

// ---------------------------------------------------------------------------
// Height system
// ---------------------------------------------------------------------------

/**
 * Get the floor and ceiling height for a tile.
 * heightMap is an optional parallel array: heightMap[y][x] = [floorH, ceilH] or null.
 * Solid wall tiles always return floorH=0, ceilH=1 (full occlusion).
 * Out-of-bounds returns full solid.
 */
export const getTileHeight = (map, heightMap, x, y) => {
  const mapX = Math.floor(x);
  const mapY = Math.floor(y);

  if (mapY < 0 || mapY >= map.length || mapX < 0 || mapX >= map[0].length) {
    return { floorH: 0, ceilH: 1, type: TILE.WALL_STONE, solid: true };
  }

  const type = map[mapY][mapX];

  // Full solid walls are always floor-to-ceiling
  if (isSolidTile(type)) {
    return { floorH: 0, ceilH: 1, type, solid: true };
  }

  // Check heightMap for custom heights
  if (heightMap && heightMap[mapY] && heightMap[mapY][mapX]) {
    const [floorH, ceilH] = heightMap[mapY][mapX];
    return { floorH, ceilH, type, solid: false };
  }

  // Default: open space, floor at 0, ceiling at 1
  return { floorH: 0, ceilH: 1, type, solid: false };
};

/**
 * Height-aware walkability check.
 * currentFloorH = the floor height the entity is currently standing on.
 * Corners check for solid walls only. Height checks use the center position
 * to prevent corner-clipping at height transitions from blocking movement.
 */
export const isWalkable = (map, x, y, radius = 0.2, heightMap = null, currentFloorH = 0) => {
  const corners = [
    { x: x - radius, y: y - radius },
    { x: x + radius, y: y - radius },
    { x: x - radius, y: y + radius },
    { x: x + radius, y: y + radius },
  ];

  for (const corner of corners) {
    const tile = getTile(map, corner.x, corner.y);
    if (isSolidTile(tile)) {
      // Doors that are open enough are passable
      if (tile === TILE.DOOR) {
        const mx = Math.floor(corner.x);
        const my = Math.floor(corner.y);
        if (isDoorPassable(mx, my)) continue;
      }
      return false;
    }
  }

  // Height checks use center position only
  if (heightMap) {
    const h = getTileHeight(map, heightMap, x, y);
    // Step-up check: can't climb walls too high
    if (h.floorH - currentFloorH > CONFIG.MAX_STEP_HEIGHT) {
      return false;
    }
    // Clearance check: need enough headroom
    const standH = Math.max(h.floorH, currentFloorH);
    if (h.ceilH - standH < CONFIG.MIN_CLEARANCE) {
      return false;
    }
  }

  return true;
};

