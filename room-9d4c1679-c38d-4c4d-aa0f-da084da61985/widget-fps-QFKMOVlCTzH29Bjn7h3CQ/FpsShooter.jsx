// =============================================================================
// MAIN COMPONENT — FpsShooter
// =============================================================================

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

import { CONFIG, canvasDims, WALL_HEIGHT_CONSTANT } from './config';
import { normalizeAngle } from './mathUtils';
import { ensureAudioCtx, playSound, setAudioMuted } from './audio';
import {
  screenShake, screenFlash, particles, PARTICLE_TYPE,
  fadeTransition, invulnerability, attackWarnings
} from './effects';
import {
  TILE, WALL_COLORS, WEAPON_TYPE, WEAPON_STATS, WEAPON_ORDER,
  PICKUP_TYPE, PICKUP_VALUES, PICKUP_COLLECT_RANGE,
  ENEMY_TYPE, ENEMY_STATE, ENEMY_STATS, LEVELS, SHOOTING_RANGE
} from './gameData';
import { isWalkable, tryToggleDoor, initDoorStates, updateDoorStates, resetDoorStates, getFacingDoorState } from './levelHelpers';
import { hasLineOfSight, updateEnemies, damageEnemy } from './enemyAI';
import { castRay, castAllRays } from './raycasting';
import { render3DView, renderEnemies3D, renderPickups3D, renderWeapon, renderMinimap } from './rendering';
import { initSpriteCache } from './spriteRenderer';
import { initWeaponCache } from './weaponRenderer';

function FpsShooter() {
  const [tailwindLoaded, setTailwindLoaded] = useState(false);

  // Game state
  const [gameState, setGameState] = useState('menu');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(CONFIG.STARTING_HEALTH);
  const [ammo, setAmmo] = useState(CONFIG.STARTING_AMMO);
  const [difficulty, setDifficulty] = useState('normal');
  const difficultyRef = useRef('normal');
  const [enemiesKilled, setEnemiesKilled] = useState(0);
  const levelStartTimeRef = useRef(Date.now());
  const [levelTime, setLevelTime] = useState(0);

  const [canvasSize, setCanvasSize] = useState({
    width: canvasDims.width,
    height: canvasDims.height
  });

  const canvasRef = useRef(null);

  // Cheat code state — type "cantbeatme" during gameplay to toggle god mode
  const cheatBufferRef = useRef('');
  const godModeRef = useRef(false);
  const [godMode, setGodMode] = useState(false);

  // Shooting range state
  const isShootingRangeRef = useRef(false);
  const rangeStatsRef = useRef({ shotsFired: 0, shotsHit: 0, targetsKilled: 0 });
  const rangeEnemyOriginsRef = useRef([]);

  const levelData = useMemo(() => isShootingRangeRef.current ? SHOOTING_RANGE : LEVELS[currentLevel], [currentLevel, gameState]);
  const [minimapVisible, setMinimapVisible] = useState(true);
  const [currentWeapon, setCurrentWeapon] = useState(WEAPON_TYPE.PISTOL);
  const [unlockedWeapons, setUnlockedWeapons] = useState(new Set([WEAPON_TYPE.PISTOL]));
  const [pickupMessage, setPickupMessage] = useState('');
  const [muted, setMuted] = useState(false);
  const pickupMessageTimerRef = useRef(null);
  const [damageFlash, setDamageFlash] = useState(0);
  const [doorPrompt, setDoorPrompt] = useState(null); // 'open' | 'close' | null

  useEffect(() => { setAudioMuted(muted); }, [muted]);

  const showPickupMessage = useCallback((msg) => {
    setPickupMessage(msg);
    playSound('pickup', 0.4);
    if (pickupMessageTimerRef.current) clearTimeout(pickupMessageTimerRef.current);
    pickupMessageTimerRef.current = setTimeout(() => setPickupMessage(''), 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (pickupMessageTimerRef.current) {
        clearTimeout(pickupMessageTimerRef.current);
      }
    };
  }, []);

  const [pointerLocked, setPointerLocked] = useState(false);

  const playerRef = useRef({
    x: 2.5, y: 2.5, angle: 0, pitch: 0,
    weapon: WEAPON_TYPE.PISTOL,
    isShooting: false, shootCooldown: 0,
    muzzleFlash: 0, recoilOffset: 0, shotFired: false,
  });

  const keysRef = useRef(new Set());
  const enemiesRef = useRef([]);
  const pickupsRef = useRef([]);
  const animationFrameRef = useRef(null);
  const frameTickRef = useRef(0);

  // Load Tailwind CSS
  useEffect(() => {
    if (!document.getElementById('tailwind-script')) {
      const tailwindScript = document.createElement('script');
      tailwindScript.id = 'tailwind-script';
      tailwindScript.src = 'https://cdn.tailwindcss.com';
      tailwindScript.onload = () => {
        setTimeout(() => setTailwindLoaded(true), 100);
      };
      document.head.appendChild(tailwindScript);
    } else {
      setTailwindLoaded(true);
    }
  }, []);

  // Body styling and resize handler
  useEffect(() => {
    document.body.style.background = '#000000';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.minHeight = '100%';
    document.documentElement.style.overflow = 'hidden';

    const handleResize = () => {
      canvasDims.update();
      setCanvasSize({ width: canvasDims.width, height: canvasDims.height });
      // Re-init weapon cache for new canvas dimensions
      initWeaponCache(canvasDims.width, canvasDims.height);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      document.body.style.background = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.overflow = '';
      document.documentElement.style.minHeight = '';
      document.documentElement.style.overflow = '';
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Initialize level
  const initializeLevel = useCallback((levelIndex, shootingRange = false) => {
    const level = shootingRange ? SHOOTING_RANGE : LEVELS[levelIndex];
    if (!level) return;

    // Initialize pre-rendered sprite and weapon caches
    initSpriteCache();
    initWeaponCache(canvasDims.width, canvasDims.height);

    screenShake.reset();
    screenFlash.reset();
    particles.clear();
    invulnerability.reset();
    attackWarnings.clear();
    fadeTransition.reset();
    fadeTransition.startFadeIn();
    resetDoorStates();
    initDoorStates(level.map);

    playerRef.current = {
      x: level.playerStart.x, y: level.playerStart.y,
      angle: level.playerStart.angle, pitch: 0,
      weapon: WEAPON_TYPE.PISTOL,
      isShooting: false, shootCooldown: 0,
      muzzleFlash: 0, recoilOffset: 0, shotFired: false,
    };
    setCurrentWeapon(WEAPON_TYPE.PISTOL);

    enemiesRef.current = level.enemies.map((enemy, index) => ({
      id: `enemy-${index}`,
      type: enemy.type, x: enemy.x, y: enemy.y, angle: 0,
      health: ENEMY_STATS[enemy.type].health,
      alive: true, state: ENEMY_STATE.IDLE,
      thinkTimer: Math.floor(Math.random() * 30),
      attackTimer: 0, hurtTimer: 0, alertTimer: 0,
      projectileTimer: 0, deathTimer: 0,
      animFrame: 0, animTimer: 0,
    }));

    pickupsRef.current = level.pickups.map((pickup, index) => ({
      id: `pickup-${index}`,
      type: pickup.type, x: pickup.x, y: pickup.y,
      collected: false,
    }));

    // Store enemy origins for shooting range respawning
    if (shootingRange) {
      rangeEnemyOriginsRef.current = level.enemies.map((enemy) => ({
        type: enemy.type, x: enemy.x, y: enemy.y,
      }));
    }
  }, []);

  // Start game
  const handleStartGame = useCallback((level = 0) => {
    isShootingRangeRef.current = false;
    setCurrentLevel(level);
    initializeLevel(level);
    setGameState('playing');
    setScore(0);
    setHealth(CONFIG.STARTING_HEALTH);
    setAmmo(difficulty === 'easy' ? 30 : CONFIG.STARTING_AMMO);
    setUnlockedWeapons(new Set([WEAPON_TYPE.PISTOL]));
    setCurrentWeapon(WEAPON_TYPE.PISTOL);
    setPickupMessage('');
    setEnemiesKilled(0);
    godModeRef.current = false;
    setGodMode(false);
    levelStartTimeRef.current = Date.now();
    setLevelTime(0);
    difficultyRef.current = difficulty;
  }, [initializeLevel, difficulty]);

  // Start shooting range
  const handleStartShootingRange = useCallback(() => {
    isShootingRangeRef.current = true;
    rangeStatsRef.current = { shotsFired: 0, shotsHit: 0, targetsKilled: 0 };
    setCurrentLevel(0);
    initializeLevel(0, true);
    setGameState('playing');
    setScore(0);
    setHealth(CONFIG.STARTING_HEALTH);
    setAmmo(CONFIG.MAX_AMMO);
    setUnlockedWeapons(new Set([WEAPON_TYPE.PISTOL, WEAPON_TYPE.SHOTGUN, WEAPON_TYPE.MACHINEGUN]));
    setCurrentWeapon(WEAPON_TYPE.PISTOL);
    setPickupMessage('');
    setEnemiesKilled(0);
    levelStartTimeRef.current = Date.now();
    setLevelTime(0);
    difficultyRef.current = 'normal';
  }, [initializeLevel]);

  // Level complete (not used for shooting range)
  const handleLevelComplete = useCallback(() => {
    setLevelTime(Math.floor((Date.now() - levelStartTimeRef.current) / 1000));
    screenFlash.trigger('#b45309', 0.3);

    fadeTransition.fadeOut(() => {
      if (currentLevel >= LEVELS.length - 1) {
        setGameState('victory');
      } else {
        setGameState('levelcomplete');
      }
    });
  }, [currentLevel]);

  // Next level
  const handleNextLevel = useCallback(() => {
    const nextLevel = currentLevel + 1;
    setCurrentLevel(nextLevel);
    initializeLevel(nextLevel);
    setHealth(prev => Math.min(prev + 20, CONFIG.STARTING_HEALTH));
    setAmmo(prev => Math.min(prev + 10, CONFIG.MAX_AMMO));
    setGameState('playing');
    levelStartTimeRef.current = Date.now();
  }, [currentLevel, initializeLevel]);

  // Keyboard input
  useEffect(() => {
    const preventDefaultKeys = new Set([
      'KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'KeyE', 'KeyM', 'KeyQ',
    ]);

    const handleKeyDown = (e) => {
      if (preventDefaultKeys.has(e.code)) {
        e.preventDefault();
      }
      // Resume from pause with Q
      if (gameState === 'paused') {
        if (e.code === 'KeyQ') {
          setGameState('playing');
        }
        return;
      }
      if (gameState !== 'playing') return;
      keysRef.current.add(e.code);

      // Cheat code detection — type "cantbeatme" to toggle god mode
      let cheatActivated = false;
      if (e.code.startsWith('Key')) {
        const ch = e.code.slice(3).toLowerCase();
        cheatBufferRef.current = (cheatBufferRef.current + ch).slice(-6);
        if (cheatBufferRef.current === 'lololo') {
          cheatBufferRef.current = '';
          cheatActivated = true;
          const next = !godModeRef.current;
          godModeRef.current = next;
          setGodMode(next);
          if (next) {
            setHealth(CONFIG.STARTING_HEALTH);
            setAmmo(CONFIG.MAX_AMMO);
            setUnlockedWeapons(new Set([WEAPON_TYPE.PISTOL, WEAPON_TYPE.SHOTGUN, WEAPON_TYPE.MACHINEGUN]));
          }
          playSound(next ? 'pickup' : 'emptyClick', 0.5);
        }
      }

      switch (e.code) {
        case 'Escape':
          if (document.pointerLockElement) {
            try { document.exitPointerLock(); } catch { /* ignore */ }
          }
          break;
        case 'KeyQ':
          if (!cheatActivated) {
            if (document.pointerLockElement) {
              try { document.exitPointerLock(); } catch { /* ignore */ }
            }
            setGameState('paused');
          }
          break;
        case 'Tab':
        case 'KeyM':
          setMinimapVisible(v => !v);
          break;
        case 'Digit1':
          if (unlockedWeapons.has(WEAPON_TYPE.PISTOL)) {
            playerRef.current.weapon = WEAPON_TYPE.PISTOL;
            setCurrentWeapon(WEAPON_TYPE.PISTOL);
          }
          break;
        case 'Digit2':
          if (unlockedWeapons.has(WEAPON_TYPE.SHOTGUN)) {
            playerRef.current.weapon = WEAPON_TYPE.SHOTGUN;
            setCurrentWeapon(WEAPON_TYPE.SHOTGUN);
          }
          break;
        case 'Digit3':
          if (unlockedWeapons.has(WEAPON_TYPE.MACHINEGUN)) {
            playerRef.current.weapon = WEAPON_TYPE.MACHINEGUN;
            setCurrentWeapon(WEAPON_TYPE.MACHINEGUN);
          }
          break;
      }
    };

    const handleKeyUp = (e) => {
      keysRef.current.delete(e.code);
    };

    const handleWheel = (e) => {
      if (gameState !== 'playing') return;
      const available = WEAPON_ORDER.filter(w => unlockedWeapons.has(w));
      if (available.length <= 1) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      const curIdx = available.indexOf(playerRef.current.weapon);
      const nextIdx = (curIdx + dir + available.length) % available.length;
      playerRef.current.weapon = available[nextIdx];
      setCurrentWeapon(available[nextIdx]);
    };

    const handleBlur = () => {
      keysRef.current.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('blur', handleBlur);
    };
  }, [gameState, unlockedWeapons]);

  // Mouse look + click-to-shoot
  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let pointerLockSupported = true;
    let usingFallback = false;
    let lastMouseX = null;
    let lastMouseY = null;
    let mouseActive = false;

    const tryPointerLock = () => {
      if (!pointerLockSupported || usingFallback) return;
      try {
        const result = canvas.requestPointerLock();
        if (result && typeof result.catch === 'function') {
          result.catch(() => {
            pointerLockSupported = false;
            enableFallback();
          });
        }
      } catch {
        pointerLockSupported = false;
        enableFallback();
      }
    };

    const enableFallback = () => {
      usingFallback = true;
      if (mouseActive) {
        setPointerLocked(true);
      }
    };

    tryPointerLock();

    const handleMouseDown = (e) => {
      if (e.button !== 0) return;
      if (!mouseActive) {
        mouseActive = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
      if (!usingFallback && pointerLockSupported && !document.pointerLockElement) {
        tryPointerLock();
      }
      ensureAudioCtx();
      keysRef.current.add('MouseLeft');
      if (usingFallback) {
        setPointerLocked(true);
      }
    };

    const handleMouseUp = (e) => {
      if (e.button === 0) {
        keysRef.current.delete('MouseLeft');
      }
    };

    const handleMouseMove = (e) => {
      const player = playerRef.current;
      if (document.pointerLockElement === canvas) {
        player.angle = normalizeAngle(player.angle + e.movementX * CONFIG.MOUSE_SENSITIVITY);
        const maxPitch = CONFIG.MAX_PITCH;
        player.pitch = Math.max(-maxPitch, Math.min(maxPitch,
          player.pitch - e.movementY * CONFIG.MOUSE_SENSITIVITY * 40
        ));
      } else if (usingFallback && mouseActive) {
        if (lastMouseX !== null) {
          const dx = e.clientX - lastMouseX;
          const dy = e.clientY - lastMouseY;
          player.angle = normalizeAngle(player.angle + dx * CONFIG.MOUSE_SENSITIVITY);
          const maxPitch = CONFIG.MAX_PITCH;
          player.pitch = Math.max(-maxPitch, Math.min(maxPitch,
            player.pitch - dy * CONFIG.MOUSE_SENSITIVITY * 40
          ));
        }
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    };

    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === canvas;
      setPointerLocked(locked || (usingFallback && mouseActive));
      if (!locked && !usingFallback) {
        keysRef.current.delete('MouseLeft');
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      if (document.pointerLockElement === canvas) {
        try { document.exitPointerLock(); } catch { /* ignore */ }
      }
    };
  }, [gameState]);

  // Main game loop
  useEffect(() => {
    if (gameState !== 'playing' || !levelData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let doorInteractHandled = false;
    let footstepCounter = 0;
    let lastFrameTime = performance.now();
    const TARGET_FRAME_MS = 1000 / 60;

    const gameLoop = (now) => {
      const rawDt = now - lastFrameTime;
      lastFrameTime = now;
      const dt = Math.min(rawDt / TARGET_FRAME_MS, 3);

      const player = playerRef.current;
      const keys = keysRef.current;
      const map = levelData.map;

      // Rotation
      if (keys.has('ArrowLeft')) {
        player.angle = normalizeAngle(player.angle - CONFIG.ROTATION_SPEED * dt);
      }
      if (keys.has('ArrowRight')) {
        player.angle = normalizeAngle(player.angle + CONFIG.ROTATION_SPEED * dt);
      }

      // Movement
      let moveX = 0;
      let moveY = 0;
      const moveSpeed = CONFIG.MOVE_SPEED * dt;

      if (keys.has('KeyW') || keys.has('ArrowUp')) {
        moveX += Math.cos(player.angle) * moveSpeed;
        moveY += Math.sin(player.angle) * moveSpeed;
      }
      if (keys.has('KeyS') || keys.has('ArrowDown')) {
        moveX -= Math.cos(player.angle) * moveSpeed;
        moveY -= Math.sin(player.angle) * moveSpeed;
      }
      if (keys.has('KeyA')) {
        moveX += Math.cos(player.angle - Math.PI / 2) * moveSpeed;
        moveY += Math.sin(player.angle - Math.PI / 2) * moveSpeed;
      }
      if (keys.has('KeyD')) {
        moveX += Math.cos(player.angle + Math.PI / 2) * moveSpeed;
        moveY += Math.sin(player.angle + Math.PI / 2) * moveSpeed;
      }

      if (moveX !== 0 && moveY !== 0) {
        const len = Math.sqrt(moveX * moveX + moveY * moveY);
        if (len > moveSpeed) {
          const scale = moveSpeed / len;
          moveX *= scale;
          moveY *= scale;
        }
      }

      // Collision detection
      const COLLISION_BUFFER = 0.2;
      if (moveX !== 0) {
        const testX = player.x + moveX;
        if (isWalkable(map, testX, player.y, COLLISION_BUFFER)) {
          player.x = testX;
        }
      }
      if (moveY !== 0) {
        const testY = player.y + moveY;
        if (isWalkable(map, player.x, testY, COLLISION_BUFFER)) {
          player.y = testY;
        }
      }

      // Footstep sounds
      if (moveX !== 0 || moveY !== 0) {
        footstepCounter += dt;
        if (footstepCounter >= 12) {
          playSound('footstep', 0.15);
          footstepCounter = 0;
        }
      } else {
        footstepCounter = 0;
      }

      // Update door animations
      updateDoorStates(dt, player.x, player.y);

      // Door interaction
      if (keys.has('KeyE')) {
        if (!doorInteractHandled) {
          const doorAction = tryToggleDoor(map, player.x, player.y, player.angle);
          if (doorAction) playSound('doorOpen', 0.5);
          doorInteractHandled = true;
        }
      } else {
        doorInteractHandled = false;
      }

      // Door prompt — check if facing a door
      const facingDoor = getFacingDoorState(map, player.x, player.y, player.angle);
      if (facingDoor === 'closed' || facingDoor === 'closing') {
        setDoorPrompt('open');
      } else if (facingDoor === 'open' || facingDoor === 'opening') {
        setDoorPrompt('close');
      } else {
        setDoorPrompt(null);
      }

      // Shooting range: refill ammo each frame
      if (isShootingRangeRef.current) {
        setAmmo(CONFIG.MAX_AMMO);
      }

      // God mode: keep health and ammo maxed
      if (godModeRef.current) {
        setHealth(CONFIG.STARTING_HEALTH);
        setAmmo(CONFIG.MAX_AMMO);
      }

      // Exit tile detection (skip in shooting range)
      const playerTileX = Math.floor(player.x);
      const playerTileY = Math.floor(player.y);
      if (!isShootingRangeRef.current && map[playerTileY] && map[playerTileY][playerTileX] === TILE.EXIT && !fadeTransition.active) {
        handleLevelComplete();
      }

      // Pickup collection
      for (const pickup of pickupsRef.current) {
        if (pickup.collected) continue;
        const dx = pickup.x - player.x;
        const dy = pickup.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > PICKUP_COLLECT_RANGE) continue;

        const pData = PICKUP_VALUES[pickup.type];
        if (!pData) continue;

        if (pData.category === 'health') {
          setHealth(prev => {
            if (prev >= CONFIG.STARTING_HEALTH) return prev;
            pickup.collected = true;
            const next = Math.min(CONFIG.STARTING_HEALTH, prev + pData.amount);
            showPickupMessage(`+${pData.amount} Health`);
            return next;
          });
        } else if (pData.category === 'ammo') {
          setAmmo(prev => {
            if (prev >= CONFIG.MAX_AMMO) return prev;
            pickup.collected = true;
            const next = Math.min(CONFIG.MAX_AMMO, prev + pData.amount);
            showPickupMessage(`+${pData.amount} Ammo`);
            return next;
          });
        } else if (pData.category === 'weapon') {
          pickup.collected = true;
          const wpn = pData.weapon;
          setUnlockedWeapons(prev => {
            const next = new Set(prev);
            next.add(wpn);
            return next;
          });
          playerRef.current.weapon = wpn;
          setCurrentWeapon(wpn);
          setAmmo(prev => Math.min(CONFIG.MAX_AMMO, prev + pData.amount));
          showPickupMessage(`${WEAPON_STATS[wpn]?.name || 'Weapon'} acquired!`);
        }
      }

      // Shooting
      const wantShoot = keys.has('Space') || keys.has('MouseLeft');
      const wStats = WEAPON_STATS[player.weapon];

      let canFire = false;
      if (wStats.auto) {
        canFire = wantShoot;
      } else {
        if (wantShoot && !player.shotFired) {
          canFire = true;
          player.shotFired = true;
        }
        if (!wantShoot) {
          player.shotFired = false;
        }
      }

      if (canFire && player.shootCooldown <= 0) {
        setAmmo(prevAmmo => {
          if (prevAmmo < wStats.ammoCost) {
            player.shootCooldown = 12;
            playSound('emptyClick', 0.3);
            return prevAmmo;
          }

          player.shootCooldown = wStats.fireRate;
          player.isShooting = true;
          player.muzzleFlash = 5;
          player.recoilOffset = wStats === WEAPON_STATS[WEAPON_TYPE.SHOTGUN] ? 20 : 10;

          if (isShootingRangeRef.current) {
            rangeStatsRef.current.shotsFired++;
          }

          if (player.weapon === WEAPON_TYPE.SHOTGUN) {
            playSound('shotgun', 0.5);
          } else if (player.weapon === WEAPON_TYPE.MACHINEGUN) {
            playSound('machinegun', 0.35);
          } else {
            playSound('gunshot', 0.4);
          }

          const muzzleX = canvasDims.width / 2;
          const muzzleY = canvasDims.height - 120;
          const muzzleCount = player.weapon === WEAPON_TYPE.SHOTGUN ? 3 : 1;
          particles.spawn(PARTICLE_TYPE.MUZZLE_FLASH, muzzleX, muzzleY, muzzleCount);

          for (let p = 0; p < wStats.pellets; p++) {
            const spread = wStats.spread > 0
              ? (Math.random() - 0.5) * 2 * wStats.spread
              : 0;
            const shotAngle = player.angle + spread;

            const hitRay = castRay(map, player.x, player.y, shotAngle);
            const maxDist = Math.min(
              wStats.range,
              hitRay.hit ? hitRay.distance : wStats.range
            );

            let closestHit = null;
            let closestDist = maxDist;
            let hitWall = hitRay.hit && hitRay.distance <= wStats.range;

            for (const enemy of enemiesRef.current) {
              if (enemy.state === ENEMY_STATE.DEAD) continue;

              const dx = enemy.x - player.x;
              const dy = enemy.y - player.y;
              const eDist = Math.sqrt(dx * dx + dy * dy);
              if (eDist > closestDist) continue;

              const angleToE = Math.atan2(dy, dx);
              let angleDiff = angleToE - shotAngle;
              while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
              while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

              const hitCone = Math.atan2(0.4, eDist);
              if (Math.abs(angleDiff) <= hitCone) {
                if (hasLineOfSight(map, player.x, player.y, enemy.x, enemy.y)) {
                  closestHit = enemy;
                  closestDist = eDist;
                  hitWall = false;
                }
              }
            }

            if (closestHit) {
              if (isShootingRangeRef.current) {
                rangeStatsRef.current.shotsHit++;
              }
              const angleToEnemy = Math.atan2(closestHit.y - player.y, closestHit.x - player.x);
              let relativeAngle = angleToEnemy - player.angle;
              while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
              while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;
              const enemyScreenX = (relativeAngle / CONFIG.FOV_RADIANS + 0.5) * canvasDims.width;
              const enemyScreenY = canvasDims.halfHeight;
              particles.spawn(PARTICLE_TYPE.BLOOD, enemyScreenX, enemyScreenY, 5);

              damageEnemy(closestHit, wStats.damage, (killedEnemy) => {
                const eStats = ENEMY_STATS[killedEnemy.type];
                setScore(prev => prev + (eStats?.points || 100));
                setEnemiesKilled(prev => prev + 1);
                if (isShootingRangeRef.current) {
                  rangeStatsRef.current.targetsKilled++;
                }
              });
            } else if (hitWall && hitRay.distance < wStats.range) {
              let wallRelAngle = shotAngle - player.angle;
              while (wallRelAngle > Math.PI) wallRelAngle -= 2 * Math.PI;
              while (wallRelAngle < -Math.PI) wallRelAngle += 2 * Math.PI;

              if (Math.abs(wallRelAngle) < CONFIG.HALF_FOV) {
                const wallScreenX = (wallRelAngle / CONFIG.FOV_RADIANS + 0.5) * canvasDims.width;
                const pitchOffset = (player.pitch / 90) * canvasDims.height * 0.5;
                const projectedHeight = (WALL_HEIGHT_CONSTANT * canvasDims.wallHeightConstant * canvasDims.height) / hitRay.distance;
                const wallScreenY = canvasDims.halfHeight + pitchOffset;

                const wallColors = WALL_COLORS[hitRay.wallType];
                const dustColor = wallColors?.base || '#9ca3af';

                particles.spawn(PARTICLE_TYPE.WALL_DUST, wallScreenX, wallScreenY, 4, { color: dustColor });
                particles.spawn(PARTICLE_TYPE.BULLET_SPARK, wallScreenX, wallScreenY, 3);
              }
            }
          }

          return prevAmmo - wStats.ammoCost;
        });
      }

      // Cooldown & animation decay
      if (player.shootCooldown > 0) player.shootCooldown -= dt;
      if (player.muzzleFlash > 0) player.muzzleFlash -= dt;
      if (player.recoilOffset > 0) player.recoilOffset = Math.max(0, player.recoilOffset - 3 * dt);
      if (player.shootCooldown <= 0) player.isShooting = false;

      // Shooting range: respawn dead enemies after their death timer expires
      if (isShootingRangeRef.current) {
        const origins = rangeEnemyOriginsRef.current;
        for (let i = 0; i < enemiesRef.current.length; i++) {
          const enemy = enemiesRef.current[i];
          if (enemy.state === ENEMY_STATE.DEAD && enemy.deathTimer <= 0) {
            const origin = origins[i];
            if (origin) {
              enemy.type = origin.type;
              enemy.x = origin.x;
              enemy.y = origin.y;
              enemy.angle = 0;
              enemy.health = ENEMY_STATS[origin.type].health;
              enemy.alive = true;
              enemy.state = ENEMY_STATE.IDLE;
              enemy.thinkTimer = 60;
              enemy.attackTimer = 0;
              enemy.hurtTimer = 0;
              enemy.alertTimer = 0;
              enemy.projectileTimer = 0;
              enemy.deathTimer = 0;
              enemy.animFrame = 0;
              enemy.animTimer = 0;
            }
          }
        }
      }

      // Enemy AI update
      updateEnemies(
        enemiesRef.current, map, player.x, player.y,
        (dmg) => {
          if (isShootingRangeRef.current) return; // No damage in shooting range
          if (godModeRef.current) return; // God mode blocks damage
          if (invulnerability.active || fadeTransition.active) return;
          const diff = difficultyRef.current;
          const scaledDmg = Math.round(dmg * (diff === 'easy' ? 0.5 : diff === 'hard' ? 1.5 : 1));
          setHealth(prev => {
            const next = Math.max(0, prev - scaledDmg);
            if (next <= 0) {
              screenShake.trigger(1.0);
              screenFlash.trigger('#000000', 0.8);
              fadeTransition.fadeOut(() => {
                setGameState('gameover');
              });
            }
            return next;
          });
          setDamageFlash(Math.min(1, scaledDmg / 30));
          screenShake.trigger(scaledDmg / 40);
          screenFlash.trigger('#ef4444', scaledDmg / 50);
          invulnerability.trigger();
          playSound('playerHurt', 0.5);
        },
        (enemy) => {
          const stats = ENEMY_STATS[enemy.type];
          setScore(prev => prev + (stats?.points || 100));
          setEnemiesKilled(prev => prev + 1);
          attackWarnings.remove(enemy.id);

          const angleToEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
          let relativeAngle = angleToEnemy - player.angle;
          while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
          while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;
          const screenX = (relativeAngle / CONFIG.FOV_RADIANS + 0.5) * canvasDims.width;
          const screenY = canvasDims.halfHeight;
          particles.spawn(PARTICLE_TYPE.DEATH_EXPLOSION, screenX, screenY, 12, { color: stats?.color });
        },
        dt,
        player.angle
      );

      // Damage flash decay
      setDamageFlash(prev => (prev > 0 ? Math.max(0, prev - 0.04 * dt) : 0));

      // Animation & timers
      frameTickRef.current += dt;
      const frameTick = frameTickRef.current;

      for (const enemy of enemiesRef.current) {
        if (enemy.state === ENEMY_STATE.DEAD && enemy.deathTimer > 0) {
          enemy.deathTimer -= dt;
        }
        if (enemy.state !== ENEMY_STATE.DEAD) {
          enemy.animTimer += dt;
          const animSpeed =
            enemy.state === ENEMY_STATE.ATTACK ? 10 :
            enemy.state === ENEMY_STATE.CHASE ? 12 :
            enemy.state === ENEMY_STATE.HURT ? 8 : 30;
          if (enemy.animTimer >= animSpeed) {
            enemy.animTimer = 0;
            enemy.animFrame++;
          }
        }
      }

      // Update visual effects
      screenShake.update();
      screenFlash.update();
      particles.update(1/60);
      invulnerability.update();
      attackWarnings.update();
      fadeTransition.update();

      // Rendering
      const shakeOffset = screenShake.offsetX !== 0 || screenShake.offsetY !== 0
        ? { x: screenShake.offsetX, y: screenShake.offsetY }
        : { x: 0, y: 0 };

      ctx.save();
      if (shakeOffset.x !== 0 || shakeOffset.y !== 0) {
        ctx.translate(shakeOffset.x, shakeOffset.y);
      }

      const rays = castAllRays(map, player.x, player.y, player.angle);
      render3DView(ctx, rays, player.angle, player.pitch);

      renderPickups3D(ctx, pickupsRef.current, rays, player.x, player.y, player.angle, frameTick, player.pitch);
      renderEnemies3D(ctx, enemiesRef.current, rays, player.x, player.y, player.angle, player.pitch);
      renderWeapon(ctx, player);

      ctx.restore();

      particles.render(ctx);
      attackWarnings.render(ctx);

      if (minimapVisible) {
        renderMinimap(ctx, map, player.x, player.y, player.angle,
          enemiesRef.current.filter(e => e.alive),
          pickupsRef.current.filter(p => !p.collected)
        );
      }

      // Shooting range stats overlay
      if (isShootingRangeRef.current) {
        const rs = rangeStatsRef.current;
        const accuracy = rs.shotsFired > 0 ? Math.round((rs.shotsHit / rs.shotsFired) * 100) : 0;
        const panelX = 8;
        const panelY = canvasDims.height - 100;
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(panelX, panelY, 170, 52);
        ctx.strokeStyle = '#5c4a00';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, panelY, 170, 52);
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#cc8800';
        ctx.fillText('SHOOTING RANGE', panelX + 6, panelY + 12);
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#888';
        ctx.fillText(`SHOTS: ${rs.shotsFired}`, panelX + 6, panelY + 26);
        ctx.fillStyle = rs.shotsHit > 0 ? '#44aa44' : '#888';
        ctx.fillText(`HITS: ${rs.shotsHit}`, panelX + 90, panelY + 26);
        ctx.fillStyle = accuracy >= 70 ? '#44aa44' : accuracy >= 40 ? '#cc8800' : '#cc0000';
        ctx.fillText(`ACC: ${accuracy}%`, panelX + 6, panelY + 40);
        ctx.fillStyle = '#cc0000';
        ctx.fillText(`KILLS: ${rs.targetsKilled}`, panelX + 90, panelY + 40);
        ctx.restore();
      }

      screenFlash.render(ctx, canvasDims.width, canvasDims.height);

      if (invulnerability.active) {
        const flashAlpha = invulnerability.getFlashAlpha();
        if (flashAlpha > 0) {
          ctx.save();
          ctx.globalAlpha = flashAlpha;
          ctx.fillStyle = '#ff4444';
          ctx.fillRect(0, 0, canvasDims.width, canvasDims.height);
          ctx.restore();
        }
      }

      fadeTransition.render(ctx, canvasDims.width, canvasDims.height);
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    lastFrameTime = performance.now();
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, levelData, minimapVisible]);

  // Loading state
  if (!tailwindLoaded) {
    return (
      <div style={{
        padding: '40px', textAlign: 'center',
        fontFamily: 'monospace',
        color: '#b91c1c', background: '#000', minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.1em'
      }}>
        LOADING...
      </div>
    );
  }

  // Game over screen — DOOM style
  if (gameState === 'gameover') {
    const survivalTime = Math.floor((Date.now() - levelStartTimeRef.current) / 1000);
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: '100vh', fontFamily: 'monospace', background: '#000000', padding: '40px' }}>
        <div className="text-center" style={{ background: '#1a0a0a', padding: '48px 64px', border: '2px solid #5c0000', boxShadow: '0 0 40px rgba(139, 0, 0, 0.4), inset 0 0 60px rgba(0,0,0,0.5)' }}>
          <h1 style={{ fontSize: '52px', fontWeight: '900', color: '#cc0000', marginBottom: '8px', letterSpacing: '0.15em', textShadow: '0 0 20px rgba(200,0,0,0.6), 2px 2px 0 #4a0000', textTransform: 'uppercase' }}>YOU DIED</h1>
          <p style={{ fontSize: '14px', color: '#8b4513', marginBottom: '6px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Defeated on Level {currentLevel + 1}: {levelData?.name}</p>
          <p style={{ fontSize: '12px', color: '#665544', marginBottom: '24px', letterSpacing: '0.08em' }}>Difficulty: {difficultyRef.current.toUpperCase()}</p>
          <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', marginBottom: '32px', padding: '16px 24px', background: '#0d0505', border: '1px solid #3a1111' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#665544', fontWeight: '700', letterSpacing: '0.12em' }}>SCORE</div>
              <div style={{ fontSize: '32px', fontWeight: '900', color: '#cc0000', fontFamily: 'monospace' }}>{score}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#665544', fontWeight: '700', letterSpacing: '0.12em' }}>KILLS</div>
              <div style={{ fontSize: '32px', fontWeight: '900', color: '#cc0000', fontFamily: 'monospace' }}>{enemiesKilled}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#665544', fontWeight: '700', letterSpacing: '0.12em' }}>SURVIVED</div>
              <div style={{ fontSize: '32px', fontWeight: '900', color: '#cc0000', fontFamily: 'monospace' }}>{Math.floor(survivalTime / 60)}:{String(survivalTime % 60).padStart(2, '0')}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => handleStartGame(currentLevel)} style={{ background: '#8b0000', color: '#ffcccc', fontSize: '16px', fontWeight: '900', padding: '16px 32px', border: '2px solid #cc0000', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'monospace', textShadow: '0 0 8px rgba(200,0,0,0.5)' }} onMouseOver={(e) => { e.target.style.background = '#aa0000'; e.target.style.boxShadow = '0 0 15px rgba(200,0,0,0.5)'; }} onMouseOut={(e) => { e.target.style.background = '#8b0000'; e.target.style.boxShadow = 'none'; }}>Try Again</button>
            <button onClick={() => setGameState('menu')} style={{ background: 'transparent', color: '#8b6914', fontSize: '16px', fontWeight: '700', padding: '16px 32px', border: '2px solid #5c4a00', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'monospace' }} onMouseOver={(e) => { e.target.style.borderColor = '#8b6914'; e.target.style.color = '#ccaa44'; }} onMouseOut={(e) => { e.target.style.borderColor = '#5c4a00'; e.target.style.color = '#8b6914'; }}>Main Menu</button>
          </div>
        </div>
      </div>
    );
  }

  // Level complete screen — DOOM intermission style
  if (gameState === 'levelcomplete') {
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: '100vh', fontFamily: 'monospace', background: '#000000', padding: '40px' }}>
        <div className="text-center" style={{ background: '#0d0d00', padding: '48px 64px', border: '2px solid #5c4a00', boxShadow: '0 0 40px rgba(139, 105, 20, 0.3), inset 0 0 60px rgba(0,0,0,0.5)' }}>
          <h1 style={{ fontSize: '42px', fontWeight: '900', color: '#cc8800', marginBottom: '8px', letterSpacing: '0.15em', textShadow: '0 0 20px rgba(200,130,0,0.5), 2px 2px 0 #3a2800', textTransform: 'uppercase' }}>Level Complete</h1>
          <p style={{ fontSize: '14px', color: '#8b6914', marginBottom: '24px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Level {currentLevel + 1}: {levelData?.name}</p>
          <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', marginBottom: '32px', padding: '16px 24px', background: '#080800', border: '1px solid #3a3400' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#665544', fontWeight: '700', letterSpacing: '0.12em' }}>SCORE</div>
              <div style={{ fontSize: '32px', fontWeight: '900', color: '#cc8800', fontFamily: 'monospace' }}>{score}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#665544', fontWeight: '700', letterSpacing: '0.12em' }}>KILLS</div>
              <div style={{ fontSize: '32px', fontWeight: '900', color: '#cc0000', fontFamily: 'monospace' }}>{enemiesKilled}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#665544', fontWeight: '700', letterSpacing: '0.12em' }}>TIME</div>
              <div style={{ fontSize: '32px', fontWeight: '900', color: '#888888', fontFamily: 'monospace' }}>{Math.floor(levelTime / 60)}:{String(levelTime % 60).padStart(2, '0')}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#665544', fontWeight: '700', letterSpacing: '0.12em' }}>HEALTH</div>
              <div style={{ fontSize: '32px', fontWeight: '900', color: health > 60 ? '#44aa44' : health > 30 ? '#ccaa00' : '#cc0000', fontFamily: 'monospace' }}>{health}%</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={handleNextLevel} style={{ background: '#5c4a00', color: '#ffdd88', fontSize: '16px', fontWeight: '900', padding: '16px 32px', border: '2px solid #cc8800', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'monospace', textShadow: '0 0 8px rgba(200,130,0,0.5)' }} onMouseOver={(e) => { e.target.style.background = '#8b6914'; e.target.style.boxShadow = '0 0 15px rgba(200,130,0,0.5)'; }} onMouseOut={(e) => { e.target.style.background = '#5c4a00'; e.target.style.boxShadow = 'none'; }}>Next Level</button>
            <button onClick={() => setGameState('menu')} style={{ background: 'transparent', color: '#8b6914', fontSize: '16px', fontWeight: '700', padding: '16px 32px', border: '2px solid #5c4a00', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'monospace' }} onMouseOver={(e) => { e.target.style.borderColor = '#8b6914'; e.target.style.color = '#ccaa44'; }} onMouseOut={(e) => { e.target.style.borderColor = '#5c4a00'; e.target.style.color = '#8b6914'; }}>Main Menu</button>
          </div>
        </div>
      </div>
    );
  }

  // Victory screen — DOOM style
  if (gameState === 'victory') {
    const totalTime = Math.floor((Date.now() - levelStartTimeRef.current) / 1000);
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: '100vh', fontFamily: 'monospace', background: '#000000', padding: '40px' }}>
        <div className="text-center" style={{ background: '#0a0a00', padding: '48px 64px', border: '2px solid #8b6914', boxShadow: '0 0 60px rgba(200,130,0,0.3), inset 0 0 60px rgba(0,0,0,0.5)' }}>
          <h1 style={{ fontSize: '52px', fontWeight: '900', color: '#cc8800', marginBottom: '8px', letterSpacing: '0.2em', textShadow: '0 0 30px rgba(200,130,0,0.6), 3px 3px 0 #3a2800', textTransform: 'uppercase' }}>VICTORY</h1>
          <p style={{ fontSize: '14px', color: '#8b6914', marginBottom: '6px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>All {LEVELS.length} levels completed!</p>
          <p style={{ fontSize: '12px', color: '#665544', marginBottom: '24px', letterSpacing: '0.08em' }}>Difficulty: {difficultyRef.current.toUpperCase()}</p>
          <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', marginBottom: '32px', padding: '16px 24px', background: '#080800', border: '1px solid #3a3400' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#665544', fontWeight: '700', letterSpacing: '0.12em' }}>FINAL SCORE</div>
              <div style={{ fontSize: '36px', fontWeight: '900', color: '#cc8800', fontFamily: 'monospace' }}>{score}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#665544', fontWeight: '700', letterSpacing: '0.12em' }}>TOTAL KILLS</div>
              <div style={{ fontSize: '36px', fontWeight: '900', color: '#cc0000', fontFamily: 'monospace' }}>{enemiesKilled}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#665544', fontWeight: '700', letterSpacing: '0.12em' }}>TIME</div>
              <div style={{ fontSize: '36px', fontWeight: '900', color: '#888888', fontFamily: 'monospace' }}>{Math.floor(totalTime / 60)}:{String(totalTime % 60).padStart(2, '0')}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#665544', fontWeight: '700', letterSpacing: '0.12em' }}>HEALTH</div>
              <div style={{ fontSize: '36px', fontWeight: '900', color: health > 60 ? '#44aa44' : health > 30 ? '#ccaa00' : '#cc0000', fontFamily: 'monospace' }}>{health}%</div>
            </div>
          </div>
          <button onClick={() => setGameState('menu')} style={{ background: '#5c4a00', color: '#ffdd88', fontSize: '18px', fontWeight: '900', padding: '16px 48px', border: '2px solid #cc8800', cursor: 'pointer', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'monospace', textShadow: '0 0 10px rgba(200,130,0,0.5)' }} onMouseOver={(e) => { e.target.style.background = '#8b6914'; e.target.style.boxShadow = '0 0 20px rgba(200,130,0,0.5)'; }} onMouseOut={(e) => { e.target.style.background = '#5c4a00'; e.target.style.boxShadow = 'none'; }}>Play Again</button>
          <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #3a3400' }}>
            <p style={{ fontSize: '12px', color: '#8b6914', letterSpacing: '0.08em', marginBottom: '2px' }}>Made by <span style={{ color: '#cc8800', fontWeight: '700' }}>Islam Assanov</span></p>
            <p style={{ fontSize: '10px', color: '#665544', letterSpacing: '0.06em' }}>islam@uni.minerva.edu</p>
          </div>
        </div>
      </div>
    );
  }

  // Paused screen — DOOM style
  if (gameState === 'paused') {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', fontFamily: 'monospace', overflow: 'hidden' }}>
        <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', filter: 'brightness(0.2)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(10, 5, 0, 0.85)', padding: '48px 64px', border: '2px solid #5c4a00', textAlign: 'center', boxShadow: '0 0 40px rgba(0,0,0,0.8)', minWidth: '320px' }}>
            <h1 style={{ fontSize: '42px', fontWeight: '900', color: '#cc8800', marginBottom: '8px', letterSpacing: '0.15em', textShadow: '0 0 15px rgba(200,130,0,0.5), 2px 2px 0 #3a2800', textTransform: 'uppercase' }}>Paused</h1>
            <p style={{ fontSize: '14px', color: '#8b6914', marginBottom: '32px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{isShootingRangeRef.current ? 'Shooting Range' : `Level ${currentLevel + 1}: ${levelData?.name}`}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
              <button onClick={() => setGameState('playing')} style={{ background: '#5c4a00', color: '#ffdd88', fontSize: '16px', fontWeight: '900', padding: '14px 32px', border: '2px solid #cc8800', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'monospace', textShadow: '0 0 8px rgba(200,130,0,0.5)', width: '100%' }} onMouseOver={(e) => { e.target.style.background = '#8b6914'; e.target.style.boxShadow = '0 0 15px rgba(200,130,0,0.5)'; }} onMouseOut={(e) => { e.target.style.background = '#5c4a00'; e.target.style.boxShadow = 'none'; }}>Resume</button>

              {/* Change Level */}
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: '10px', color: '#665544', fontWeight: '700', letterSpacing: '0.12em', marginBottom: '6px', marginTop: '8px' }}>CHANGE LEVEL</div>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {LEVELS.map((level, index) => (
                    <button key={index} onClick={() => { handleStartGame(index); }} style={{ background: index === currentLevel ? '#3a2800' : 'transparent', color: index === currentLevel ? '#cc8800' : '#665544', fontSize: '11px', fontWeight: '700', padding: '6px 12px', border: `1px solid ${index === currentLevel ? '#cc8800' : '#3a2800'}`, cursor: 'pointer', letterSpacing: '0.06em', fontFamily: 'monospace', textTransform: 'uppercase' }} onMouseOver={(e) => { e.target.style.borderColor = '#8b6914'; e.target.style.color = '#cc8800'; }} onMouseOut={(e) => { e.target.style.borderColor = index === currentLevel ? '#cc8800' : '#3a2800'; e.target.style.color = index === currentLevel ? '#cc8800' : '#665544'; }}>
                      E{index + 1}: {level.name}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => setGameState('menu')} style={{ background: 'transparent', color: '#8b6914', fontSize: '16px', fontWeight: '700', padding: '14px 32px', border: '2px solid #5c4a00', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'monospace', width: '100%', marginTop: '8px' }} onMouseOver={(e) => { e.target.style.borderColor = '#8b6914'; e.target.style.color = '#ccaa44'; }} onMouseOut={(e) => { e.target.style.borderColor = '#5c4a00'; e.target.style.color = '#8b6914'; }}>Main Menu</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Menu screen — DOOM style
  if (gameState === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: '100vh', fontFamily: 'monospace', background: '#000000', padding: '40px' }}>
        <div className="text-center" style={{ background: '#0d0800', padding: '48px 64px', border: '2px solid #5c3a00', boxShadow: '0 0 80px rgba(139, 0, 0, 0.2), inset 0 0 80px rgba(0,0,0,0.6)', maxWidth: '560px', width: '100%' }}>
          <h1 style={{ fontSize: '56px', fontWeight: '900', color: '#cc0000', marginBottom: '4px', letterSpacing: '0.2em', textShadow: '0 0 30px rgba(200,0,0,0.5), 3px 3px 0 #4a0000, -1px -1px 0 #8b0000', textTransform: 'uppercase' }}>DEEP SPACE</h1>
          <p style={{ fontSize: '12px', color: '#8b4513', marginBottom: '32px', fontWeight: '700', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Raycasting FPS</p>

          {/* Difficulty */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '10px', color: '#665544', fontWeight: '700', letterSpacing: '0.15em', marginBottom: '10px' }}>CHOOSE YOUR FATE</div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {[
                { id: 'easy', label: 'EASY', color: '#44aa44', borderColor: '#226622' },
                { id: 'normal', label: 'NORMAL', color: '#cc8800', borderColor: '#5c4a00' },
                { id: 'hard', label: 'HARD', color: '#cc0000', borderColor: '#5c0000' },
              ].map((d) => (
                <button key={d.id} onClick={() => setDifficulty(d.id)} style={{ background: difficulty === d.id ? d.borderColor : 'transparent', color: difficulty === d.id ? d.color : '#665544', fontSize: '13px', fontWeight: '900', padding: '8px 18px', border: `2px solid ${difficulty === d.id ? d.color : '#3a2800'}`, cursor: 'pointer', letterSpacing: '0.1em', fontFamily: 'monospace', textShadow: difficulty === d.id ? `0 0 8px ${d.color}` : 'none' }}>
                  {d.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '11px', color: '#665544', marginTop: '8px', letterSpacing: '0.05em' }}>
              {difficulty === 'easy' ? 'Half enemy damage, start with 30 ammo' :
               difficulty === 'hard' ? '1.5x enemy damage, start with 20 ammo' :
               'Standard difficulty — balanced experience'}
            </div>
          </div>

          <button onClick={() => { ensureAudioCtx(); handleStartGame(0); }} style={{ background: '#8b0000', color: '#ffcccc', fontSize: '18px', fontWeight: '900', padding: '16px 48px', border: '2px solid #cc0000', cursor: 'pointer', width: '100%', maxWidth: '280px', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'monospace', textShadow: '0 0 10px rgba(200,0,0,0.5)' }} onMouseOver={(e) => { e.target.style.background = '#aa0000'; e.target.style.boxShadow = '0 0 25px rgba(200,0,0,0.5)'; }} onMouseOut={(e) => { e.target.style.background = '#8b0000'; e.target.style.boxShadow = 'none'; }}>
            NEW GAME
          </button>

          {/* Shooting Range */}
          <button onClick={() => { ensureAudioCtx(); handleStartShootingRange(); }} style={{ marginTop: '12px', background: 'transparent', color: '#4488cc', fontSize: '14px', fontWeight: '900', padding: '12px 32px', border: '2px solid #2a5a8a', cursor: 'pointer', width: '100%', maxWidth: '280px', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace', textShadow: '0 0 8px rgba(68,136,204,0.3)' }} onMouseOver={(e) => { e.target.style.background = '#1a3a5a'; e.target.style.boxShadow = '0 0 20px rgba(68,136,204,0.4)'; e.target.style.borderColor = '#4488cc'; }} onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.boxShadow = 'none'; e.target.style.borderColor = '#2a5a8a'; }}>
            SHOOTING RANGE
          </button>
          <div style={{ fontSize: '11px', color: '#4a6a8a', marginTop: '4px', letterSpacing: '0.05em' }}>
            Practice mode — all weapons, infinite ammo, no damage
          </div>

          {/* Level Selection */}
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {LEVELS.map((level, index) => (
              <button key={index} onClick={() => { ensureAudioCtx(); handleStartGame(index); }} style={{ background: 'transparent', color: '#665544', fontSize: '11px', fontWeight: '700', padding: '8px 14px', border: '1px solid #3a2800', cursor: 'pointer', letterSpacing: '0.08em', fontFamily: 'monospace', textTransform: 'uppercase' }} onMouseOver={(e) => { e.target.style.borderColor = '#8b4513'; e.target.style.color = '#cc8800'; }} onMouseOut={(e) => { e.target.style.borderColor = '#3a2800'; e.target.style.color = '#665544'; }}>
                E{index + 1}M1: {level.name}
              </button>
            ))}
          </div>

          {/* Controls Reference */}
          <div style={{ marginTop: '32px', padding: '20px', background: '#080500', border: '1px solid #3a2800', textAlign: 'left' }}>
            <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#8b4513', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Controls</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
              {[
                ['W/A/S/D', 'Move & strafe'],
                ['Mouse', 'Look around'],
                ['Click', 'Shoot'],
                ['1/2/3', 'Switch weapon'],
                ['E', 'Open door'],
                ['Tab', 'Toggle automap'],
                ['Scroll', 'Cycle weapon'],
                ['Q', 'Menu / Pause'],
              ].map(([key, action]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#1a1000', border: '1px solid #3a2800', padding: '2px 8px', fontSize: '11px', fontWeight: '700', color: '#8b6914', fontFamily: 'monospace' }}>{key}</span>
                  <span style={{ fontSize: '11px', color: '#665544' }}>{action}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '20px', fontSize: '10px', color: '#3a2800', letterSpacing: '0.1em' }}>
            {canvasSize.width}x{canvasSize.height} | FOV {CONFIG.FIELD_OF_VIEW}°
          </div>
        </div>
      </div>
    );
  }

  // Game playing screen — DOOM-style HUD
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', fontFamily: 'monospace', overflow: 'hidden' }}>
      <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} tabIndex={0} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', outline: 'none', cursor: 'crosshair' }} onClick={(e) => { e.target.focus(); }} />

      {/* Damage Flash Vignette — red blood border */}
      {damageFlash > 0 && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', boxShadow: `inset 0 0 ${80 + damageFlash * 100}px ${30 + damageFlash * 50}px rgba(139, 0, 0, ${damageFlash * 0.7})`, zIndex: 10 }} />
      )}

      {/* DOOM Status Bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '48px', background: 'linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 3px, #1a1a1a 100%)', borderTop: '2px solid #4a4a4a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 20, boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.05)' }}>
        {/* Ammo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
          <span style={{ fontSize: '10px', color: '#666', fontWeight: '700', letterSpacing: '0.1em' }}>AMMO</span>
          <span style={{ fontSize: '28px', fontWeight: '900', color: ammo > 10 ? '#cc0000' : ammo > 0 ? '#cc4400' : '#660000', textShadow: ammo > 0 ? '0 0 8px rgba(200,0,0,0.4)' : 'none', fontFamily: 'monospace', minWidth: '60px' }}>{ammo}</span>
        </div>

        {/* Health */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#666', fontWeight: '700', letterSpacing: '0.1em' }}>HEALTH</span>
          <span style={{ fontSize: '32px', fontWeight: '900', color: health > 60 ? '#cc0000' : health > 30 ? '#cc4400' : '#880000', textShadow: '0 0 10px rgba(200,0,0,0.4)', fontFamily: 'monospace' }}>{health}%</span>
        </div>

        {/* Arms/Weapon indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[WEAPON_TYPE.PISTOL, WEAPON_TYPE.SHOTGUN, WEAPON_TYPE.MACHINEGUN].map((w, i) => (
            <div key={w} style={{ fontSize: '14px', fontWeight: '900', color: currentWeapon === w ? '#cc8800' : unlockedWeapons.has(w) ? '#666' : '#333', textShadow: currentWeapon === w ? '0 0 6px rgba(200,130,0,0.5)' : 'none', padding: '0 4px', fontFamily: 'monospace' }}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* Menu hint */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ background: '#1a1000', border: '1px solid #3a2800', padding: '1px 6px', fontSize: '11px', fontWeight: '900', color: '#8b6914', fontFamily: 'monospace' }}>Q</span>
          <span style={{ fontSize: '10px', color: '#666', fontWeight: '700', letterSpacing: '0.06em' }}>MENU</span>
        </div>

        {/* Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '10px', color: '#666', fontWeight: '700', letterSpacing: '0.1em' }}>SCORE</span>
          <span style={{ fontSize: '28px', fontWeight: '900', color: '#cc8800', textShadow: '0 0 8px rgba(200,130,0,0.3)', fontFamily: 'monospace' }}>{score}</span>
        </div>
      </div>

      {/* Level name — top left, minimal */}
      <div style={{ position: 'absolute', top: '8px', left: '12px', padding: '4px 10px', background: 'rgba(0,0,0,0.6)', border: `1px solid ${isShootingRangeRef.current ? '#2a5a8a' : '#3a2800'}`, zIndex: 15 }}>
        <span style={{ fontSize: '10px', color: isShootingRangeRef.current ? '#4488cc' : '#8b6914', fontWeight: '700', letterSpacing: '0.1em' }}>{isShootingRangeRef.current ? 'SHOOTING RANGE' : `E${currentLevel + 1}M1: ${levelData?.name}`}</span>
      </div>

      {/* God mode indicator */}
      {godMode && (
        <div style={{ position: 'absolute', top: '28px', left: '12px', padding: '2px 8px', background: 'rgba(0,0,0,0.6)', border: '1px solid #cc0000', zIndex: 15 }}>
          <span style={{ fontSize: '9px', color: '#cc0000', fontWeight: '900', letterSpacing: '0.12em' }}>GOD MODE</span>
        </div>
      )}

      {/* Weapon name */}
      <div style={{ position: 'absolute', bottom: '56px', left: '50%', transform: 'translateX(-50%)', padding: '2px 12px', background: 'rgba(0,0,0,0.5)', zIndex: 15 }}>
        <span style={{ fontSize: '11px', color: '#8b6914', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{WEAPON_STATS[currentWeapon]?.name || 'Pistol'}</span>
      </div>

      {/* Crosshair — simple DOOM dot */}
      {pointerLocked && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 15 }}>
          <div style={{ width: '4px', height: '4px', background: '#cc8800', boxShadow: '0 0 4px rgba(200,130,0,0.6)' }} />
        </div>
      )}

      {/* Door interaction prompt */}
      {doorPrompt && pointerLocked && (
        <div style={{ position: 'absolute', top: '56%', left: '50%', transform: 'translateX(-50%)', padding: '4px 14px', background: 'rgba(0, 0, 0, 0.6)', border: '1px solid #5c4a00', pointerEvents: 'none', zIndex: 15 }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#cc8800', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
            Press <span style={{ color: '#ffdd88', textShadow: '0 0 6px rgba(200,130,0,0.5)' }}>E</span> to {doorPrompt === 'open' ? 'open' : 'close'}
          </span>
        </div>
      )}

      {/* Click to Play */}
      {!pointerLocked && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', padding: '14px 28px', background: 'rgba(0, 0, 0, 0.8)', border: '2px solid #5c4a00', fontSize: '16px', fontWeight: '900', color: '#cc8800', pointerEvents: 'none', textAlign: 'center', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'monospace', textShadow: '0 0 10px rgba(200,130,0,0.4)', zIndex: 15 }}>
          Click to Play
        </div>
      )}

      {/* Pickup Notification */}
      {pickupMessage && (
        <div style={{ position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', padding: '6px 16px', background: 'rgba(0, 0, 0, 0.7)', border: '1px solid #5c4a00', fontSize: '14px', fontWeight: '900', color: '#cc8800', pointerEvents: 'none', whiteSpace: 'nowrap', textShadow: '0 0 8px rgba(200,130,0,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'monospace', zIndex: 15 }}>
          {pickupMessage}
        </div>
      )}

      {/* Mute Toggle */}
      <button onClick={() => { ensureAudioCtx(); setMuted(m => !m); }} style={{ position: 'absolute', top: '8px', right: '12px', background: 'rgba(0, 0, 0, 0.6)', border: '1px solid #3a2800', padding: '4px 10px', color: muted ? '#cc0000' : '#665544', fontSize: '10px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.1em', fontFamily: 'monospace', textTransform: 'uppercase', zIndex: 15 }}>
        {muted ? 'MUTED' : 'SND'}
      </button>
    </div>
  );
}

export default FpsShooter;
