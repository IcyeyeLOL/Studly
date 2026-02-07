// =============================================================================
// GAME DATA — Tiles, Enemies, Weapons, Pickups, Levels
// =============================================================================

export const TILE = {
  EMPTY: 0,
  WALL_STONE: 1,
  WALL_BRICK: 2,
  WALL_METAL: 3,
  DOOR: 4,
  SPAWN_PLAYER: 5,
  SPAWN_ENEMY: 6,
  PICKUP_AMMO: 7,
  PICKUP_HEALTH: 8,
  EXIT: 9,
};

// DOOM-inspired wall colors — dark, gritty palette
export const WALL_COLORS = {
  [TILE.WALL_STONE]: { base: '#7a6a52', dark: '#4a3c2a', light: '#8e7e64', accent: '#5c4e38' },  // Brown stone (BROWN1)
  [TILE.WALL_BRICK]: { base: '#8b3a3a', dark: '#5c1a1a', light: '#a04848', accent: '#6b2222' },  // Red/hell brick (SKIN)
  [TILE.WALL_METAL]: { base: '#5a6a70', dark: '#3a4a50', light: '#7a8a90', accent: '#4a5a60' },  // Tech metal (COMPTALL)
  [TILE.DOOR]:       { base: '#6a5a3a', dark: '#3a2e1a', light: '#8a7a5a', accent: '#5a4a2a' },  // Brown door (BIGDOOR)
  [TILE.EXIT]:       { base: '#2a6a3a', dark: '#1a4a2a', light: '#3a8a4a', accent: '#1a5a2a' },  // Green exit
};

export const isSolidTile = (tile) => {
  return tile === TILE.WALL_STONE ||
         tile === TILE.WALL_BRICK ||
         tile === TILE.WALL_METAL ||
         tile === TILE.DOOR;
};

export const isWallTile = (tile) => {
  return tile >= TILE.WALL_STONE && tile <= TILE.DOOR || tile === TILE.EXIT;
};

// =============================================================================
// ENEMY TYPES — DOOM-style demons
// =============================================================================

export const ENEMY_TYPE = {
  GRUNT: 'grunt',       // Zombie/Imp
  SOLDIER: 'soldier',   // Shotgun Guy / Chaingunner
  DEMON: 'demon',       // Pinky Demon / Baron
};

export const ENEMY_STATS = {
  [ENEMY_TYPE.GRUNT]: {
    health: 30, speed: 0.015, damage: 10, points: 100, color: '#8b5e3c',
    sightRange: 6, attackRange: 1.0, attackCooldown: 60, attackType: 'melee',
  },
  [ENEMY_TYPE.SOLDIER]: {
    health: 50, speed: 0.025, damage: 15, points: 200, color: '#6a8a5a',
    sightRange: 10, attackRange: 8, attackCooldown: 90, attackType: 'ranged',
    projectileDelay: 20,
  },
  [ENEMY_TYPE.DEMON]: {
    health: 100, speed: 0.04, damage: 25, points: 500, color: '#a03030',
    sightRange: 8, attackRange: 1.2, attackCooldown: 45, attackType: 'melee',
  },
};

export const ENEMY_STATE = {
  IDLE: 'idle',
  ALERT: 'alert',
  CHASE: 'chase',
  ATTACK: 'attack',
  HURT: 'hurt',
  DEAD: 'dead',
};

// =============================================================================
// WEAPON DEFINITIONS
// =============================================================================

export const WEAPON_TYPE = {
  PISTOL: 'pistol',
  SHOTGUN: 'shotgun',
  MACHINEGUN: 'machinegun',
};

export const WEAPON_STATS = {
  [WEAPON_TYPE.PISTOL]: {
    name: 'Pistol',
    damage: 15, fireRate: 18, spread: 0, range: 12,
    pellets: 1, ammoCost: 1, auto: false,
    color: '#8a8a8a', flashColor: '#ffaa22',
  },
  [WEAPON_TYPE.SHOTGUN]: {
    name: 'Shotgun',
    damage: 8, fireRate: 48, spread: 0.15, range: 6,
    pellets: 6, ammoCost: 1, auto: false,
    color: '#6a5030', flashColor: '#ff6600',
  },
  [WEAPON_TYPE.MACHINEGUN]: {
    name: 'Chaingun',
    damage: 10, fireRate: 6, spread: 0.05, range: 10,
    pellets: 1, ammoCost: 1, auto: true,
    color: '#5a5a5a', flashColor: '#ff4400',
  },
};

export const WEAPON_ORDER = [WEAPON_TYPE.PISTOL, WEAPON_TYPE.SHOTGUN, WEAPON_TYPE.MACHINEGUN];

// =============================================================================
// PICKUP TYPES
// =============================================================================

export const PICKUP_TYPE = {
  AMMO_SMALL: 'ammo_small',
  AMMO_LARGE: 'ammo_large',
  HEALTH_SMALL: 'health_small',
  HEALTH_LARGE: 'health_large',
  WEAPON_SHOTGUN: 'weapon_shotgun',
  WEAPON_MACHINEGUN: 'weapon_machinegun',
};

export const PICKUP_VALUES = {
  [PICKUP_TYPE.AMMO_SMALL]: { amount: 5, color: '#ccaa44', category: 'ammo' },
  [PICKUP_TYPE.AMMO_LARGE]: { amount: 15, color: '#ddbb44', category: 'ammo' },
  [PICKUP_TYPE.HEALTH_SMALL]: { amount: 15, color: '#4488cc', category: 'health' },
  [PICKUP_TYPE.HEALTH_LARGE]: { amount: 40, color: '#4499ee', category: 'health' },
  [PICKUP_TYPE.WEAPON_SHOTGUN]: { weapon: WEAPON_TYPE.SHOTGUN, amount: 5, color: '#6a5030', category: 'weapon' },
  [PICKUP_TYPE.WEAPON_MACHINEGUN]: { weapon: WEAPON_TYPE.MACHINEGUN, amount: 10, color: '#5a5a5a', category: 'weapon' },
};

export const PICKUP_COLLECT_RANGE = 0.5;

// =============================================================================
// LEVEL DEFINITIONS
// =============================================================================

export const LEVELS = [
  // Level 1: Hangar (E1M1 inspired)
  {
    name: 'Hangar',
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 2, 2, 2, 0, 0, 2, 2, 2, 0, 0, 0, 1],
      [1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 1],
      [1, 0, 0, 0, 2, 0, 6, 0, 0, 6, 0, 2, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    playerStart: { x: 2.5, y: 2.5, angle: 0 },
    enemies: [
      { type: ENEMY_TYPE.GRUNT, x: 6.5, y: 6.5 },
      { type: ENEMY_TYPE.SOLDIER, x: 9.5, y: 6.5 },
    ],
    pickups: [
      { type: PICKUP_TYPE.AMMO_SMALL, x: 2.5, y: 8.5 },
      { type: PICKUP_TYPE.HEALTH_SMALL, x: 13.5, y: 8.5 },
      { type: PICKUP_TYPE.WEAPON_SHOTGUN, x: 7.5, y: 3.5 },
    ],
  },

  // Level 2: Nuclear Plant
  {
    name: 'Nuclear Plant',
    map: [
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2],
      [2, 0, 5, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 6, 0, 2],
      [2, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 3, 3, 3, 3, 0, 0, 2, 0, 0, 0, 0, 2],
      [2, 2, 2, 4, 2, 2, 0, 0, 3, 0, 0, 3, 0, 0, 2, 2, 4, 2, 2, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 3, 0, 6, 3, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 7, 0, 0, 0, 0, 0, 3, 3, 4, 3, 0, 0, 0, 0, 0, 8, 0, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 2],
      [2, 0, 0, 0, 0, 2, 2, 2, 2, 4, 2, 2, 2, 2, 0, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2],
      [2, 0, 8, 0, 0, 2, 0, 7, 0, 6, 0, 7, 0, 2, 0, 0, 0, 9, 0, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    ],
    playerStart: { x: 2.5, y: 2.5, angle: 0 },
    enemies: [
      { type: ENEMY_TYPE.SOLDIER, x: 17.5, y: 2.5 },
      { type: ENEMY_TYPE.GRUNT, x: 10.5, y: 6.5 },
      { type: ENEMY_TYPE.GRUNT, x: 3.5, y: 9.5 },
      { type: ENEMY_TYPE.SOLDIER, x: 16.5, y: 9.5 },
      { type: ENEMY_TYPE.DEMON, x: 9.5, y: 12.5 },
    ],
    pickups: [
      { type: PICKUP_TYPE.AMMO_SMALL, x: 2.5, y: 7.5 },
      { type: PICKUP_TYPE.HEALTH_SMALL, x: 17.5, y: 7.5 },
      { type: PICKUP_TYPE.AMMO_LARGE, x: 7.5, y: 12.5 },
      { type: PICKUP_TYPE.AMMO_SMALL, x: 11.5, y: 12.5 },
      { type: PICKUP_TYPE.HEALTH_LARGE, x: 2.5, y: 12.5 },
      { type: PICKUP_TYPE.WEAPON_MACHINEGUN, x: 9.5, y: 3.5 },
    ],
  },

  // Level 3: Phobos Lab
  {
    name: 'Phobos Lab',
    map: [
      [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
      [3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3],
      [3, 0, 5, 0, 3, 0, 6, 0, 0, 0, 4, 0, 0, 0, 6, 0, 3, 0, 6, 0, 0, 3],
      [3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 3],
      [3, 4, 3, 3, 3, 3, 3, 4, 3, 3, 3, 3, 3, 4, 3, 3, 3, 3, 3, 4, 3, 3],
      [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
      [3, 0, 7, 0, 0, 2, 2, 2, 0, 8, 0, 2, 2, 2, 0, 0, 7, 0, 0, 0, 0, 3],
      [3, 0, 0, 0, 0, 2, 6, 2, 0, 0, 0, 2, 6, 2, 0, 0, 0, 0, 6, 0, 0, 3],
      [3, 0, 0, 0, 0, 2, 0, 2, 0, 0, 0, 2, 0, 2, 0, 0, 0, 0, 0, 0, 0, 3],
      [3, 3, 3, 4, 3, 2, 4, 2, 3, 4, 3, 2, 4, 2, 3, 4, 3, 3, 3, 4, 3, 3],
      [3, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 3],
      [3, 0, 6, 0, 0, 0, 8, 0, 3, 0, 6, 0, 7, 0, 3, 0, 6, 0, 0, 0, 0, 3],
      [3, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 3],
      [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
      [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
      [3, 0, 7, 0, 6, 0, 0, 6, 0, 0, 0, 0, 0, 0, 6, 0, 0, 6, 0, 8, 0, 3],
      [3, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 9, 1, 1, 0, 0, 0, 0, 0, 0, 0, 3],
      [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    ],
    playerStart: { x: 2.5, y: 2.5, angle: 0 },
    enemies: [
      { type: ENEMY_TYPE.SOLDIER, x: 6.5, y: 2.5 },
      { type: ENEMY_TYPE.GRUNT, x: 14.5, y: 2.5 },
      { type: ENEMY_TYPE.SOLDIER, x: 18.5, y: 2.5 },
      { type: ENEMY_TYPE.DEMON, x: 6.5, y: 7.5 },
      { type: ENEMY_TYPE.DEMON, x: 12.5, y: 7.5 },
      { type: ENEMY_TYPE.SOLDIER, x: 18.5, y: 7.5 },
      { type: ENEMY_TYPE.GRUNT, x: 2.5, y: 11.5 },
      { type: ENEMY_TYPE.GRUNT, x: 10.5, y: 11.5 },
      { type: ENEMY_TYPE.GRUNT, x: 16.5, y: 11.5 },
      { type: ENEMY_TYPE.SOLDIER, x: 4.5, y: 15.5 },
      { type: ENEMY_TYPE.DEMON, x: 7.5, y: 15.5 },
      { type: ENEMY_TYPE.GRUNT, x: 14.5, y: 15.5 },
      { type: ENEMY_TYPE.SOLDIER, x: 17.5, y: 15.5 },
    ],
    pickups: [
      { type: PICKUP_TYPE.AMMO_SMALL, x: 2.5, y: 6.5 },
      { type: PICKUP_TYPE.HEALTH_SMALL, x: 9.5, y: 6.5 },
      { type: PICKUP_TYPE.AMMO_SMALL, x: 16.5, y: 6.5 },
      { type: PICKUP_TYPE.HEALTH_LARGE, x: 6.5, y: 11.5 },
      { type: PICKUP_TYPE.AMMO_LARGE, x: 12.5, y: 11.5 },
      { type: PICKUP_TYPE.AMMO_SMALL, x: 2.5, y: 15.5 },
      { type: PICKUP_TYPE.HEALTH_LARGE, x: 19.5, y: 15.5 },
      { type: PICKUP_TYPE.WEAPON_SHOTGUN, x: 20.5, y: 6.5 },
      { type: PICKUP_TYPE.WEAPON_MACHINEGUN, x: 10.5, y: 15.5 },
    ],
  },

  // Level 4: Toxin Refinery — interconnected rooms with flanking corridors
  {
    name: 'Toxin Refinery',
    map: [
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2],
      [2, 0, 5, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 6, 0, 2],
      [2, 0, 0, 0, 0, 4, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2],
      [2, 0, 0, 7, 0, 2, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 2, 2, 4, 2, 2, 2],
      [2, 2, 4, 2, 2, 2, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 8, 0, 0, 2],
      [2, 0, 6, 0, 0, 0, 0, 0, 1, 1, 4, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 4, 2, 2, 2, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2],
      [2, 2, 2, 4, 2, 2, 0, 0, 3, 3, 3, 3, 3, 0, 0, 0, 4, 0, 6, 0, 7, 0, 0, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 2, 0, 0, 0, 0, 0, 6, 2],
      [2, 0, 7, 0, 0, 2, 0, 0, 3, 0, 6, 0, 3, 0, 6, 0, 2, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 4, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 2, 0, 8, 0, 0, 0, 0, 2],
      [2, 0, 6, 0, 0, 2, 0, 0, 3, 3, 4, 3, 3, 0, 0, 0, 2, 2, 2, 2, 4, 2, 2, 2],
      [2, 0, 0, 8, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 0, 6, 0, 0, 6, 0, 0, 0, 0, 0, 6, 0, 0, 0, 9, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    ],
    playerStart: { x: 2.5, y: 2.5, angle: 0 },
    enemies: [
      { type: ENEMY_TYPE.SOLDIER, x: 21.5, y: 2.5 },
      { type: ENEMY_TYPE.GRUNT, x: 10.5, y: 5.5 },
      { type: ENEMY_TYPE.SOLDIER, x: 16.5, y: 5.5 },
      { type: ENEMY_TYPE.GRUNT, x: 2.5, y: 7.5 },
      { type: ENEMY_TYPE.DEMON, x: 10.5, y: 12.5 },
      { type: ENEMY_TYPE.GRUNT, x: 14.5, y: 12.5 },
      { type: ENEMY_TYPE.SOLDIER, x: 18.5, y: 10.5 },
      { type: ENEMY_TYPE.GRUNT, x: 22.5, y: 11.5 },
      { type: ENEMY_TYPE.GRUNT, x: 2.5, y: 14.5 },
      { type: ENEMY_TYPE.SOLDIER, x: 9.5, y: 16.5 },
      { type: ENEMY_TYPE.DEMON, x: 12.5, y: 16.5 },
      { type: ENEMY_TYPE.SOLDIER, x: 18.5, y: 16.5 },
    ],
    pickups: [
      { type: PICKUP_TYPE.AMMO_SMALL, x: 3.5, y: 4.5 },
      { type: PICKUP_TYPE.HEALTH_SMALL, x: 4.5, y: 8.5 },
      { type: PICKUP_TYPE.WEAPON_SHOTGUN, x: 20.5, y: 6.5 },
      { type: PICKUP_TYPE.AMMO_LARGE, x: 2.5, y: 12.5 },
      { type: PICKUP_TYPE.HEALTH_LARGE, x: 3.5, y: 15.5 },
      { type: PICKUP_TYPE.AMMO_SMALL, x: 14.5, y: 15.5 },
      { type: PICKUP_TYPE.HEALTH_SMALL, x: 18.5, y: 13.5 },
      { type: PICKUP_TYPE.WEAPON_MACHINEGUN, x: 20.5, y: 10.5 },
      { type: PICKUP_TYPE.AMMO_SMALL, x: 7.5, y: 5.5 },
    ],
  },

  // Level 5: Command Center — sprawling tech facility with multiple wings
  {
    name: 'Command Center',
    map: [
      [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
      [3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3],
      [3, 0, 5, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 3],
      [3, 0, 0, 0, 0, 3, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 6, 0, 3],
      [3, 3, 3, 4, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 4, 3, 3, 3],
      [3, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 3],
      [3, 0, 7, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 7, 0, 3],
      [3, 0, 0, 0, 6, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 6, 0, 0, 0, 3],
      [3, 3, 3, 4, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 4, 3, 3, 3],
      [3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3],
      [3, 0, 8, 0, 0, 3, 0, 0, 2, 2, 4, 2, 2, 0, 0, 0, 3, 0, 0, 8, 0, 3],
      [3, 0, 0, 0, 0, 4, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 4, 0, 0, 0, 0, 3],
      [3, 0, 6, 0, 0, 3, 0, 0, 2, 0, 6, 0, 2, 0, 0, 0, 3, 0, 6, 0, 0, 3],
      [3, 0, 0, 0, 0, 3, 0, 0, 2, 0, 0, 0, 2, 0, 6, 0, 3, 0, 0, 0, 0, 3],
      [3, 3, 3, 4, 3, 3, 0, 0, 2, 2, 2, 2, 2, 0, 0, 0, 3, 3, 4, 3, 3, 3],
      [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
      [3, 0, 6, 0, 7, 0, 0, 6, 0, 0, 0, 0, 0, 6, 0, 0, 0, 7, 0, 6, 0, 3],
      [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
      [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 9, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    ],
    playerStart: { x: 2.5, y: 2.5, angle: 0 },
    enemies: [
      { type: ENEMY_TYPE.SOLDIER, x: 19.5, y: 3.5 },
      { type: ENEMY_TYPE.GRUNT, x: 4.5, y: 7.5 },
      { type: ENEMY_TYPE.DEMON, x: 10.5, y: 6.5 },
      { type: ENEMY_TYPE.SOLDIER, x: 17.5, y: 7.5 },
      { type: ENEMY_TYPE.GRUNT, x: 2.5, y: 12.5 },
      { type: ENEMY_TYPE.DEMON, x: 10.5, y: 12.5 },
      { type: ENEMY_TYPE.SOLDIER, x: 14.5, y: 13.5 },
      { type: ENEMY_TYPE.GRUNT, x: 18.5, y: 12.5 },
      { type: ENEMY_TYPE.SOLDIER, x: 2.5, y: 16.5 },
      { type: ENEMY_TYPE.DEMON, x: 7.5, y: 16.5 },
      { type: ENEMY_TYPE.SOLDIER, x: 13.5, y: 16.5 },
      { type: ENEMY_TYPE.GRUNT, x: 19.5, y: 16.5 },
      { type: ENEMY_TYPE.DEMON, x: 10.5, y: 17.5 },
    ],
    pickups: [
      { type: PICKUP_TYPE.AMMO_SMALL, x: 2.5, y: 6.5 },
      { type: PICKUP_TYPE.AMMO_SMALL, x: 19.5, y: 6.5 },
      { type: PICKUP_TYPE.HEALTH_SMALL, x: 2.5, y: 10.5 },
      { type: PICKUP_TYPE.HEALTH_SMALL, x: 19.5, y: 10.5 },
      { type: PICKUP_TYPE.WEAPON_SHOTGUN, x: 10.5, y: 3.5 },
      { type: PICKUP_TYPE.WEAPON_MACHINEGUN, x: 10.5, y: 15.5 },
      { type: PICKUP_TYPE.AMMO_LARGE, x: 4.5, y: 16.5 },
      { type: PICKUP_TYPE.AMMO_LARGE, x: 17.5, y: 16.5 },
      { type: PICKUP_TYPE.HEALTH_LARGE, x: 10.5, y: 9.5 },
    ],
  },

  // Level 6: Hell's Gate — massive arena, the final challenge
  {
    name: "Hell's Gate",
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 5, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 6, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 7, 0, 0, 1, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 1, 0, 0, 8, 0, 1],
      [1, 1, 1, 4, 1, 1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1, 1, 4, 1, 1, 1],
      [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 8, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 7, 0, 0, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 6, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 6, 0, 7, 0, 0, 0, 3, 0, 0, 0, 6, 0, 0, 0, 3, 0, 0, 0, 7, 0, 6, 0, 0, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 2],
      [2, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 6, 0, 0, 6, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 2],
      [1, 1, 1, 4, 1, 1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1, 1, 4, 1, 1, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 7, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 7, 0, 1],
      [1, 0, 0, 0, 0, 4, 0, 0, 0, 6, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 4, 0, 0, 0, 0, 1],
      [1, 0, 8, 0, 0, 1, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 8, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    playerStart: { x: 2.5, y: 2.5, angle: 0 },
    enemies: [
      { type: ENEMY_TYPE.SOLDIER, x: 23.5, y: 2.5 },
      { type: ENEMY_TYPE.GRUNT, x: 11.5, y: 6.5 },
      { type: ENEMY_TYPE.GRUNT, x: 14.5, y: 6.5 },
      { type: ENEMY_TYPE.SOLDIER, x: 2.5, y: 7.5 },
      { type: ENEMY_TYPE.SOLDIER, x: 22.5, y: 7.5 },
      { type: ENEMY_TYPE.DEMON, x: 12.5, y: 10.5 },
      { type: ENEMY_TYPE.DEMON, x: 12.5, y: 12.5 },
      { type: ENEMY_TYPE.GRUNT, x: 2.5, y: 12.5 },
      { type: ENEMY_TYPE.GRUNT, x: 22.5, y: 12.5 },
      { type: ENEMY_TYPE.SOLDIER, x: 2.5, y: 15.5 },
      { type: ENEMY_TYPE.SOLDIER, x: 22.5, y: 15.5 },
      { type: ENEMY_TYPE.GRUNT, x: 11.5, y: 16.5 },
      { type: ENEMY_TYPE.GRUNT, x: 14.5, y: 16.5 },
      { type: ENEMY_TYPE.DEMON, x: 9.5, y: 20.5 },
      { type: ENEMY_TYPE.DEMON, x: 15.5, y: 20.5 },
    ],
    pickups: [
      { type: PICKUP_TYPE.AMMO_SMALL, x: 2.5, y: 4.5 },
      { type: PICKUP_TYPE.HEALTH_SMALL, x: 23.5, y: 4.5 },
      { type: PICKUP_TYPE.HEALTH_LARGE, x: 2.5, y: 9.5 },
      { type: PICKUP_TYPE.AMMO_LARGE, x: 22.5, y: 9.5 },
      { type: PICKUP_TYPE.AMMO_SMALL, x: 4.5, y: 12.5 },
      { type: PICKUP_TYPE.AMMO_SMALL, x: 20.5, y: 12.5 },
      { type: PICKUP_TYPE.HEALTH_LARGE, x: 4.5, y: 16.5 },
      { type: PICKUP_TYPE.HEALTH_LARGE, x: 20.5, y: 16.5 },
      { type: PICKUP_TYPE.AMMO_LARGE, x: 2.5, y: 19.5 },
      { type: PICKUP_TYPE.AMMO_LARGE, x: 23.5, y: 19.5 },
      { type: PICKUP_TYPE.HEALTH_LARGE, x: 2.5, y: 21.5 },
      { type: PICKUP_TYPE.HEALTH_LARGE, x: 23.5, y: 21.5 },
      { type: PICKUP_TYPE.WEAPON_SHOTGUN, x: 12.5, y: 6.5 },
      { type: PICKUP_TYPE.WEAPON_MACHINEGUN, x: 12.5, y: 16.5 },
    ],
  },
];

// =============================================================================
// SHOOTING RANGE — Practice level with target lanes
// =============================================================================

export const SHOOTING_RANGE = {
  name: 'Shooting Range',
  map: [
    [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    [3, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    [3, 0, 5, 0, 0, 0, 3, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 6, 3],
    [3, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    [3, 3, 3, 3, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    [3, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 6, 3],
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    [3, 0, 0, 0, 0, 6, 0, 0, 0, 0, 6, 0, 0, 0, 0, 6, 0, 0, 0, 0, 6, 3],
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 3],
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  ],
  playerStart: { x: 2.5, y: 2.5, angle: 0 },
  enemies: [
    // Lane 1 (top armory) — close and far targets
    { type: ENEMY_TYPE.GRUNT, x: 12.5, y: 2.5 },
    { type: ENEMY_TYPE.GRUNT, x: 20.5, y: 2.5 },
    // Lane 2 — short/mid/long range
    { type: ENEMY_TYPE.GRUNT, x: 8.5, y: 6.5 },
    { type: ENEMY_TYPE.SOLDIER, x: 14.5, y: 6.5 },
    { type: ENEMY_TYPE.SOLDIER, x: 20.5, y: 6.5 },
    // Lane 3 — evenly spaced targets
    { type: ENEMY_TYPE.GRUNT, x: 5.5, y: 10.5 },
    { type: ENEMY_TYPE.SOLDIER, x: 10.5, y: 10.5 },
    { type: ENEMY_TYPE.DEMON, x: 15.5, y: 10.5 },
    { type: ENEMY_TYPE.DEMON, x: 20.5, y: 10.5 },
    // Lane 4 (long range only)
    { type: ENEMY_TYPE.DEMON, x: 20.5, y: 14.5 },
  ],
  pickups: [],
};
