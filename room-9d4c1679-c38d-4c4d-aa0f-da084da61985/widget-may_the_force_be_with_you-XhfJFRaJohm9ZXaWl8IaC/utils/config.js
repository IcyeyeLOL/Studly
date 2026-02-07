// Game configuration with asset URLs and game parameters

// Asset proxy helper for CORS-free image loading
export const assetUrl = (url, type = 'img') => {
  if (!url) return null;
  const width = type === 'bg' ? 1920 : type === 'portrait' ? 400 : 512;
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${width}&output=webp`;
};

export const GAME_CONFIG = {
  // Timing
  ROUND_TIME: 99,
  HIT_STUN_DURATION: 300,
  ATTACK_COOLDOWN: 350,
  ROUND_END_DELAY: 2000,
  CONTROLS_OVERLAY_DURATION: 12000,
  
  // Physics
  GRAVITY: 0.6,
  MOVE_SPEED: 4,
  JUMP_POWER: 12,
  KNOCKBACK_FORCE: 8,
  GROUND_Y: 420,
  
  // Combat
  PUNCH_DAMAGE: 5,
  KICK_DAMAGE: 8,
  
  // Arena
  CANVAS_WIDTH: 900,
  CANVAS_HEIGHT: 500,
  MIN_X: 50,
  MAX_X: 850,
};

// Character data with Star Wars theme and canvas image URLs - CYBERPUNK NEON
export const CHARACTERS = [
  {
    id: 'vader',
    name: 'VADER',
    color: '#dc2626',
    accentColor: '#FF1493', // Hot Pink neon
    description: 'DARK LORD',
    imageUrl: 'https://miyagi-canvas-sync.eudaimonicincorporated.workers.dev/api/uploads/99a31e6d-e6f2-4b91-8aaa-f59652ebc168'
  },
  {
    id: 'luke',
    name: 'LUKE',
    color: '#1e40af',
    accentColor: '#00FFFF', // Electric Blue neon
    description: 'JEDI KNIGHT',
    imageUrl: 'https://miyagi-canvas-sync.eudaimonicincorporated.workers.dev/api/uploads/a416bae7-77cc-4aee-96b2-4e99da33eae8'
  },
  {
    id: 'obi-wan',
    name: 'OBI-WAN',
    color: '#1e3a8a',
    accentColor: '#00FFFF', // Electric Blue neon
    description: 'JEDI MASTER',
    imageUrl: 'https://miyagi-canvas-sync.eudaimonicincorporated.workers.dev/api/uploads/a9f36d76-f70a-4a10-8286-956ed5d3ed15'
  },
  {
    id: 'yoda',
    name: 'YODA',
    color: '#15803d',
    accentColor: '#39FF14', // Acid Green neon
    description: 'GRAND MASTER',
    imageUrl: 'https://miyagi-canvas-sync.eudaimonicincorporated.workers.dev/api/uploads/02429f62-4a44-4e07-85c5-d645333d6aea'
  },
  {
    id: 'ahsoka',
    name: 'AHSOKA',
    color: '#c2410c',
    accentColor: '#FF6600', // Orange neon
    description: 'ROGUE FORCE',
    imageUrl: 'https://miyagi-canvas-sync.eudaimonicincorporated.workers.dev/api/uploads/5f3ca91d-2aca-47c7-9ee8-e6889e92752e'
  },
  {
    id: 'chewbacca',
    name: 'CHEWIE',
    color: '#78350f',
    accentColor: '#FFAA00', // Gold neon
    description: 'WOOKIEE FURY',
    imageUrl: 'https://miyagi-canvas-sync.eudaimonicincorporated.workers.dev/api/uploads/6f330e62-0cf5-4a3c-9a1d-85f239e41751'
  }
];

// Arena/Stage data with Star Wars locations - CYBERPUNK NEON
export const STAGES = [
  {
    id: 'death-star',
    name: 'DEATH STAR',
    description: 'IMPERIAL CORE',
    gradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
    accentColor: '#00FFFF',
    neonColor: '#00FFFF',
    backgroundImage: 'https://miyagi-canvas-sync.eudaimonicincorporated.workers.dev/api/uploads/c08c775a-e778-4e00-83b1-2bac7e588787'
  },
  {
    id: 'mustafar',
    name: 'MUSTAFAR',
    description: 'LAVA HELL',
    gradient: 'linear-gradient(135deg, #1a0505 0%, #2a0a0a 50%, #1a0505 100%)',
    accentColor: '#FF1493',
    neonColor: '#FF1493',
    backgroundImage: 'https://miyagi-canvas-sync.eudaimonicincorporated.workers.dev/api/uploads/b5429ea2-63d3-46e3-99b0-6f61d005ce87'
  },
  {
    id: 'endor',
    name: 'ENDOR',
    description: 'TOXIC FOREST',
    gradient: 'linear-gradient(135deg, #0a1a0a 0%, #0f2a0f 50%, #0a1a0a 100%)',
    accentColor: '#39FF14',
    neonColor: '#39FF14',
    backgroundImage: 'https://miyagi-canvas-sync.eudaimonicincorporated.workers.dev/api/uploads/c00e6a54-a9f2-46ca-a75a-8d2246cf8278'
  }
];

// Audio configuration - Star Wars Themed
export const AUDIO_CONFIG = {
  bgMusic: {
    volume: 0.15,
    loop: true,
    theme: 'Imperial March / Duel of the Fates'
  },
  sfx: {
    punch: { frequency: 440, duration: 0.08, type: 'sawtooth', name: 'Lightsaber Clash' },
    kick: { frequency: 380, duration: 0.12, type: 'sawtooth', name: 'Force Field' },
    whoosh: { frequency: 220, duration: 0.06, type: 'sine', name: 'Force Repulsion' },
    hit: { frequency: 550, duration: 0.1, type: 'triangle', name: 'Saber Impact' },
    roundStart: { frequency: 523.25, duration: 0.25, type: 'square', name: 'Force Charge' },
    ko: { frequencies: [523.25, 659.25, 783.99], duration: 0.5, type: 'sine', name: 'Force Drain' },
    select: { frequency: 880, duration: 0.04, type: 'sine', name: 'Hologram Select' }
  }
};

export const CONTROLS = {
  player1: {
    up: 'w',
    left: 'a',
    right: 'd',
    down: 's',
    punch: 'f',
    kick: 'g'
  },
  player2: {
    up: 'arrowup',
    left: 'arrowleft',
    right: 'arrowright',
    down: 'arrowdown',
    punch: 'k',
    kick: 'l'
  }
};
