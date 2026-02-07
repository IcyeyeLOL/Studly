import React, { useState, useEffect, useRef, useCallback } from 'react';
import StartOverlay from './components/StartOverlay';
import ModeSelect from './components/ModeSelect';
import CharacterSelect from './components/CharacterSelect';
import StageSelect from './components/StageSelect';
import GameHUD from './components/GameHUD';
import AudioControls from './components/AudioControls';
import ControlsDisplay from './components/ControlsDisplay';
import PauseModal from './components/PauseModal';
import { AudioManager } from './utils/audioManager';
import { GAME_CONFIG, AUDIO_CONFIG, CONTROLS, assetUrl, CHARACTERS } from './utils/config';
import { loadCharacterImage } from './utils/vaderImage';

const FightingGame = () => {
  // UI State Machine: CONTROLS_OVERLAY -> MODE_SELECT -> CHAR_SELECT -> STAGE_SELECT -> FIGHT
  const [gameState, setGameState] = useState('CONTROLS_OVERLAY');
  const [gameMode, setGameMode] = useState(null); // '2player' or 'cpu'
  const [selectedCharacters, setSelectedCharacters] = useState(null);
  const [selectedStage, setSelectedStage] = useState(null);
  
  // Game states
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [timeLeft, setTimeLeft] = useState(GAME_CONFIG.ROUND_TIME);
  const [showRoundStart, setShowRoundStart] = useState(false);
  const [screenShake, setScreenShake] = useState({ x: 0, y: 0 });
  const [isPaused, setIsPaused] = useState(false);
  
  // Player states with energy and defense
  const [players, setPlayers] = useState({
    p1: {
      x: 200,
      y: 0,
      vx: 0,
      vy: 0,
      health: 100,
      energy: 0,
      maxEnergy: 100,
      state: 'idle',
      stateEndTime: 0,
      lastHitTime: 0,
      isBlocking: false
    },
    p2: {
      x: 600,
      y: 0,
      vx: 0,
      vy: 0,
      health: 100,
      energy: 0,
      maxEnergy: 100,
      state: 'idle',
      stateEndTime: 0,
      lastHitTime: 0,
      isBlocking: false
    }
  });

  // Audio
  const audioManagerRef = useRef(null);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Refs
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const keysPressed = useRef(new Set());
  const playersRef = useRef(players);
  const timerRef = useRef(null);
  const characterImagesRef = useRef({});
  const stageImageRef = useRef(null);

  // Load character images when characters are selected
  useEffect(() => {
    if (selectedCharacters) {
      const loadImages = async () => {
        const p1Image = await loadCharacterImage(selectedCharacters.p1.imageUrl);
        const p2Image = await loadCharacterImage(selectedCharacters.p2.imageUrl);
        
        characterImagesRef.current = {
          [selectedCharacters.p1.id]: p1Image,
          [selectedCharacters.p2.id]: p2Image
        };
        
        console.log('Character images loaded successfully');
      };
      
      loadImages();
    }
  }, [selectedCharacters]);

  // Load stage background image
  useEffect(() => {
    if (selectedStage && selectedStage.backgroundImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        stageImageRef.current = img;
        console.log('Stage background loaded successfully');
      };
      img.onerror = (e) => {
        console.error('Failed to load stage background:', e);
        stageImageRef.current = null;
      };
      img.src = selectedStage.backgroundImage;
    }
  }, [selectedStage]);

  // Keep playersRef in sync with players state
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Initialize audio on first user interaction
  const initializeAudio = useCallback(async () => {
    if (!audioInitialized) {
      audioManagerRef.current = new AudioManager();
      await audioManagerRef.current.initialize();
      setAudioInitialized(true);
    }
  }, [audioInitialized]);

  // Play sound effect
  const playSound = useCallback((soundName) => {
    if (audioManagerRef.current && audioInitialized && !isMuted) {
      const sfxConfig = AUDIO_CONFIG.sfx[soundName];
      if (sfxConfig) {
        audioManagerRef.current.playSFX(sfxConfig);
      }
    }
  }, [audioInitialized, isMuted]);

  // Apply screen shake
  const triggerScreenShake = useCallback((intensity = 5) => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const shakeAmount = intensity;
    setScreenShake({
      x: (Math.random() - 0.5) * shakeAmount,
      y: (Math.random() - 0.5) * shakeAmount
    });
    setTimeout(() => setScreenShake({ x: 0, y: 0 }), 100);
  }, []);

  // Set cyberpunk dark background to fill entire screen
  useEffect(() => {
    document.body.style.background = '#0a0a0a';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.minHeight = '100vh';
    document.body.style.height = '100%';
    document.documentElement.style.minHeight = '100vh';
    document.documentElement.style.height = '100%';
    document.documentElement.style.background = '#0a0a0a';
    
    return () => {
      document.body.style.background = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.minHeight = '';
      document.body.style.height = '';
      document.documentElement.style.minHeight = '';
      document.documentElement.style.height = '';
      document.documentElement.style.background = '';
    };
  }, []);

  // Handle controls overlay completion
  const handleControlsComplete = useCallback(async () => {
    await initializeAudio();
    setGameState('MODE_SELECT');
  }, [initializeAudio]);

  // Handle mode selection
  const handleModeSelect = useCallback((mode) => {
    setGameMode(mode);
    setGameState('CHAR_SELECT');
  }, []);

  // Handle character selection
  const handleCharacterSelect = useCallback(async (characters) => {
    await initializeAudio();
    
    // If CPU mode, randomly select a character for Player 2
    if (gameMode === 'cpu') {
      const availableCharacters = Object.values(CHARACTERS);
      const randomCPU = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
      
      setSelectedCharacters({
        p1: characters.p1,
        p2: randomCPU
      });
    } else {
      setSelectedCharacters(characters);
    }
    
    setGameState('STAGE_SELECT');
  }, [initializeAudio, gameMode]);

  // Handle stage selection and start match
  const handleStageSelect = useCallback((stage) => {
    setSelectedStage(stage);
    setGameState('FIGHT');
    setShowRoundStart(true);
    setIsPaused(false);
    
    // Start background music
    if (audioManagerRef.current && audioInitialized) {
      audioManagerRef.current.startBackgroundMusic();
    }
    
    // Play round start sound
    playSound('roundStart');

    // Reset game state
    setPlayers({
      p1: {
        x: 200,
        y: 0,
        vx: 0,
        vy: 0,
        health: 100,
        energy: 0,
        maxEnergy: 100,
        state: 'idle',
        stateEndTime: 0,
        lastHitTime: 0,
        isBlocking: false
      },
      p2: {
        x: 600,
        y: 0,
        vx: 0,
        vy: 0,
        health: 100,
        energy: 0,
        maxEnergy: 100,
        state: 'idle',
        stateEndTime: 0,
        lastHitTime: 0,
        isBlocking: false
      }
    });
    setTimeLeft(GAME_CONFIG.ROUND_TIME);
    setGameOver(false);
    setWinner(null);
  }, [audioInitialized, playSound]);

  // Toggle mute
  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (audioManagerRef.current) {
        audioManagerRef.current.setMuted(newMuted);
      }
      return newMuted;
    });
  }, []);

  // Keyboard handling with pause
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ESC key toggles pause
      if (e.key === 'Escape' && gameState === 'FIGHT' && !gameOver) {
        setIsPaused(prev => !prev);
        return;
      }
      
      if (gameState !== 'FIGHT' || gameOver || isPaused) return;
      keysPressed.current.add(e.key.toLowerCase());
    };
    
    const handleKeyUp = (e) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, gameOver, isPaused]);

  // Round timer and energy regeneration
  useEffect(() => {
    if (gameState === 'FIGHT' && !gameOver && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up - determine winner by health
            const p1 = playersRef.current.p1;
            const p2 = playersRef.current.p2;
            if (p1.health > p2.health) {
              setWinner(selectedCharacters.p1.name);
            } else if (p2.health > p1.health) {
              setWinner(selectedCharacters.p2.name);
            } else {
              setWinner('Draw');
            }
            setGameOver(true);
            playSound('ko');
            return 0;
          }
          return prev - 1;
        });
        
        // Regenerate energy every second
        setPlayers(prev => ({
          p1: {
            ...prev.p1,
            energy: Math.min(prev.p1.maxEnergy, prev.p1.energy + 20)
          },
          p2: {
            ...prev.p2,
            energy: Math.min(prev.p2.maxEnergy, prev.p2.energy + 20)
          }
        }));
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [gameState, gameOver, isPaused, selectedCharacters, playSound]);

  // Draw function with character images
  const drawPlayers = useCallback((ctx, p1, p2, GROUND_LINE_Y, p1Char, p2Char) => {
    const drawCharacter = (x, y, state, color, accentColor, charId, isBlocking, facingRight = true) => {
      const dir = facingRight ? 1 : -1;
      
      ctx.save();
      ctx.translate(x, y);
      
      // Flip horizontally if facing left
      if (!facingRight) {
        ctx.scale(-1, 1);
      }
      
      // Draw blocking shield
      if (isBlocking) {
        ctx.beginPath();
        ctx.arc(0, -40, 50, 0, Math.PI * 2);
        ctx.strokeStyle = '#39FF14';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#39FF14';
        ctx.globalAlpha = 0.6;
        ctx.stroke();
        
        // Inner shield glow
        ctx.beginPath();
        ctx.arc(0, -40, 45, 0, Math.PI * 2);
        ctx.strokeStyle = '#39FF14';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }
      
      // Draw character image if loaded
      const charImage = characterImagesRef.current[charId];
      if (charImage) {
        const imgWidth = 60;  // Adjust size to match game scale
        const imgHeight = 90;
        
        // Center the image
        ctx.drawImage(
          charImage,
          -imgWidth / 2,
          -imgHeight,
          imgWidth,
          imgHeight
        );
      } else {
        // Fallback simple shape if image not loaded
        ctx.fillStyle = color;
        ctx.fillRect(-15, -80, 30, 80);
      }
      
      ctx.restore();
      
      // Draw Lightsaber (keeping existing logic)
      ctx.save();
      if (state === 'punching') {
        // Lightsaber slash - forward thrust
        ctx.translate(x + dir * 25, y - 50);
        ctx.rotate(dir * -0.2);
        
        // Lightsaber hilt
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(0, -3, dir * 8, 6);
        
        // Lightsaber blade with glow
        ctx.fillStyle = accentColor;
        ctx.shadowBlur = 20;
        ctx.shadowColor = accentColor;
        ctx.fillRect(dir * 8, -2, dir * 50, 4);
        
        // Blade core (brighter)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(dir * 8, -1, dir * 50, 2);
        ctx.shadowBlur = 0;
      } else if (state === 'kicking') {
        // FORCE FIELD - dramatic energy sphere
        ctx.translate(x, y - 40);
        
        // Outer force field ring
        ctx.beginPath();
        ctx.arc(0, 0, 60, 0, Math.PI * 2);
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 40;
        ctx.shadowColor = '#00FFFF';
        ctx.globalAlpha = 0.7;
        ctx.stroke();
        
        // Middle ring
        ctx.beginPath();
        ctx.arc(0, 0, 45, 0, Math.PI * 2);
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 30;
        ctx.shadowColor = accentColor;
        ctx.stroke();
        
        // Inner energy core
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = 0.3;
        ctx.shadowBlur = 50;
        ctx.shadowColor = accentColor;
        ctx.fill();
        
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      } else {
        // Idle - lightsaber held at ready
        ctx.translate(x + dir * 18, y - 40);
        ctx.rotate(dir * 0.6);
        
        // Lightsaber hilt
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(0, -3, dir * 8, 6);
        
        // Lightsaber blade (shorter)
        ctx.fillStyle = accentColor;
        ctx.shadowBlur = 15;
        ctx.shadowColor = accentColor;
        ctx.fillRect(dir * 8, -2, dir * 30, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(dir * 8, -1, dir * 30, 2);
        ctx.shadowBlur = 0;
      }
      ctx.restore();
      
      // Motion blur trail for attacks
      if (state === 'punching') {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 6;
        ctx.shadowBlur = 25;
        ctx.shadowColor = accentColor;
        
        ctx.beginPath();
        ctx.moveTo(x + dir * 35, y - 50);
        ctx.lineTo(x + dir * 80, y - 50);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }
      
      if (state === 'kicking') {
        // Force field expansion wave
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 10;
        ctx.shadowBlur = 40;
        ctx.shadowColor = '#00FFFF';
        
        ctx.beginPath();
        ctx.arc(x, y - 40, 75, 0, Math.PI * 2);
        ctx.stroke();
        
        // Secondary wave
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(x, y - 40, 90, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }
    };
    
    // Determine facing direction based on positions
    const p1FacingRight = p2.x > p1.x;
    const p2FacingRight = p2.x < p1.x;
    
    // Draw Player 1
    const p1CanvasY = GROUND_LINE_Y - p1.y;
    drawCharacter(p1.x, p1CanvasY, p1.state, p1Char.color, p1Char.accentColor, p1Char.id, p1.isBlocking, p1FacingRight);
    
    // Draw Player 2
    const p2CanvasY = GROUND_LINE_Y - p2.y;
    drawCharacter(p2.x, p2CanvasY, p2.state, p2Char.color, p2Char.accentColor, p2Char.id, p2.isBlocking, p2FacingRight);
  }, []);

  // Reset game
  const resetGame = useCallback(() => {
    // Go back to mode select
    setGameState('MODE_SELECT');
    setGameMode(null);
    setSelectedCharacters(null);
    setSelectedStage(null);
    setIsPaused(false);
    setPlayers({
      p1: {
        x: 200,
        y: 0,
        vx: 0,
        vy: 0,
        health: 100,
        energy: 0,
        maxEnergy: 100,
        state: 'idle',
        stateEndTime: 0,
        lastHitTime: 0,
        isBlocking: false
      },
      p2: {
        x: 600,
        y: 0,
        vx: 0,
        vy: 0,
        health: 100,
        energy: 0,
        maxEnergy: 100,
        state: 'idle',
        stateEndTime: 0,
        lastHitTime: 0,
        isBlocking: false
      }
    });
    setGameOver(false);
    setWinner(null);
    setTimeLeft(GAME_CONFIG.ROUND_TIME);
    keysPressed.current.clear();
    
    // Stop background music
    if (audioManagerRef.current) {
      audioManagerRef.current.stopBackgroundMusic();
    }
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState !== 'FIGHT' || !canvasRef.current || gameOver || isPaused || !selectedCharacters || !selectedStage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const GROUND_LINE_Y = GAME_CONFIG.GROUND_Y;
    const GRAVITY = GAME_CONFIG.GRAVITY;
    const MOVE_SPEED = GAME_CONFIG.MOVE_SPEED;
    const JUMP_POWER = GAME_CONFIG.JUMP_POWER;
    const MIN_X = GAME_CONFIG.MIN_X;
    const MAX_X = GAME_CONFIG.MAX_X;

    const gameLoop = () => {
      const now = Date.now();
      
      // Draw stage background image if loaded
      if (stageImageRef.current) {
        ctx.drawImage(stageImageRef.current, 0, 0, canvas.width, canvas.height);
        
        // Add dark overlay for better contrast with fighters
        ctx.fillStyle = 'rgba(10, 10, 10, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        // Fallback: solid dark background
        ctx.fillStyle = 'rgba(10, 10, 10, 0.95)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw neon ground line with glow
      const neonColor = selectedStage.accentColor || '#00FFFF';
      ctx.strokeStyle = neonColor;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 20;
      ctx.shadowColor = neonColor;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_LINE_Y);
      ctx.lineTo(canvas.width, GROUND_LINE_Y);
      ctx.stroke();
      
      // Add second glitch line
      ctx.strokeStyle = neonColor;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 30;
      ctx.shadowColor = neonColor;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_LINE_Y + 2);
      ctx.lineTo(canvas.width, GROUND_LINE_Y + 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Update game state
      const p1 = { ...playersRef.current.p1 };
      const p2 = { ...playersRef.current.p2 };

      // Auto-reset states when animation time is up
      if (p1.state !== 'idle' && now >= p1.stateEndTime) {
        p1.state = 'idle';
      }
      if (p2.state !== 'idle' && now >= p2.stateEndTime) {
        p2.state = 'idle';
      }

      const isP1OnGround = p1.y <= 0;
      const isP2OnGround = p2.y <= 0;

      // Player 1 controls (WASD + F/G)
      if (keysPressed.current.has(CONTROLS.player1.left) && p1.x > MIN_X) {
        p1.vx = -MOVE_SPEED;
      } else if (keysPressed.current.has(CONTROLS.player1.right) && p1.x < MAX_X) {
        p1.vx = MOVE_SPEED;
      } else {
        p1.vx *= 0.8;
      }

      if (keysPressed.current.has(CONTROLS.player1.up) && isP1OnGround) {
        p1.vy = JUMP_POWER;
      }

      // Player 1 defense (blocking)
      p1.isBlocking = keysPressed.current.has(CONTROLS.player1.down);
      
      // Player 1 attacks - only trigger if state is idle and not blocking
      if (keysPressed.current.has(CONTROLS.player1.punch) && p1.state === 'idle' && !p1.isBlocking) {
        p1.state = 'punching';
        p1.stateEndTime = now + 150;
        playSound('punch');
      }

      // Player 1 force field - requires full energy
      if (keysPressed.current.has(CONTROLS.player1.kick) && p1.state === 'idle' && !p1.isBlocking && p1.energy >= p1.maxEnergy) {
        p1.state = 'kicking';
        p1.stateEndTime = now + 200;
        p1.energy = 0; // Consume all energy
        playSound('whoosh');
      }

      // Player 2 controls - CPU AI or Human
      if (gameMode === 'cpu') {
        // CPU AI Logic
        const distanceToPlayer = p1.x - p2.x;
        const absDistance = Math.abs(distanceToPlayer);
        
        // CPU Movement - Always try to get close to player
        if (absDistance > 80) {
          // Move toward player
          if (distanceToPlayer > 0 && p2.x < MAX_X) {
            p2.vx = MOVE_SPEED * 0.9; // Slightly slower than player for balance
          } else if (distanceToPlayer < 0 && p2.x > MIN_X) {
            p2.vx = -MOVE_SPEED * 0.9;
          }
        } else if (absDistance < 40) {
          // Too close - back away slightly
          if (distanceToPlayer > 0 && p2.x > MIN_X) {
            p2.vx = -MOVE_SPEED * 0.5;
          } else if (distanceToPlayer < 0 && p2.x < MAX_X) {
            p2.vx = MOVE_SPEED * 0.5;
          }
        } else {
          p2.vx *= 0.8;
        }
        
        // CPU Jump - occasionally jump when approaching
        if (isP2OnGround && absDistance > 100 && Math.random() < 0.02) {
          p2.vy = JUMP_POWER;
        }
        
        // CPU Defense - block when player is attacking and close
        const playerAttacking = p1.state === 'punching' || p1.state === 'kicking';
        if (playerAttacking && absDistance < 100 && Math.random() < 0.7) {
          p2.isBlocking = true;
        } else {
          p2.isBlocking = false;
        }
        
        // CPU Attack Logic - only when in range and state is idle
        if (p2.state === 'idle' && !p2.isBlocking && absDistance < 90) {
          // Attack decision - sword or force field
          const attackChance = Math.random();
          
          // Sword attack (more frequent)
          if (attackChance < 0.03) {
            p2.state = 'punching';
            p2.stateEndTime = now + 150;
            playSound('punch');
          }
          // Force field attack (when energy is full)
          else if (p2.energy >= p2.maxEnergy && attackChance < 0.05) {
            p2.state = 'kicking';
            p2.stateEndTime = now + 200;
            p2.energy = 0;
            playSound('whoosh');
          }
        }
      } else {
        // Human Player 2 controls (Arrow keys + K/L)
        if (keysPressed.current.has(CONTROLS.player2.left) && p2.x > MIN_X) {
          p2.vx = -MOVE_SPEED;
        } else if (keysPressed.current.has(CONTROLS.player2.right) && p2.x < MAX_X) {
          p2.vx = MOVE_SPEED;
        } else {
          p2.vx *= 0.8;
        }

        if (keysPressed.current.has(CONTROLS.player2.up) && isP2OnGround) {
          p2.vy = JUMP_POWER;
        }

        // Player 2 defense (blocking)
        p2.isBlocking = keysPressed.current.has(CONTROLS.player2.down);
        
        // Player 2 attacks - only trigger if state is idle and not blocking
        if (keysPressed.current.has(CONTROLS.player2.punch) && p2.state === 'idle' && !p2.isBlocking) {
          p2.state = 'punching';
          p2.stateEndTime = now + 150;
          playSound('punch');
        }

        // Player 2 force field - requires full energy
        if (keysPressed.current.has(CONTROLS.player2.kick) && p2.state === 'idle' && !p2.isBlocking && p2.energy >= p2.maxEnergy) {
          p2.state = 'kicking';
          p2.stateEndTime = now + 200;
          p2.energy = 0; // Consume all energy
          playSound('whoosh');
        }
      }

      // Apply physics
      p1.x += p1.vx;
      p1.y += p1.vy;
      if (!isP1OnGround) p1.vy -= GRAVITY;
      if (p1.y < 0) {
        p1.y = 0;
        p1.vy = 0;
      }
      p1.x = Math.max(MIN_X, Math.min(MAX_X, p1.x));

      p2.x += p2.vx;
      p2.y += p2.vy;
      if (!isP2OnGround) p2.vy -= GRAVITY;
      if (p2.y < 0) {
        p2.y = 0;
        p2.vy = 0;
      }
      p2.x = Math.max(MIN_X, Math.min(MAX_X, p2.x));

      // Collision detection and damage
      const distance = Math.abs(p1.x - p2.x);
      const yDistance = Math.abs(p1.y - p2.y);
      
      if (distance < 80 && yDistance < 60) {
        // Player 1 attacking Player 2
        if ((p1.state === 'punching' || p1.state === 'kicking') && now - p2.lastHitTime > 200) {
          // Check if P2 is blocking
          const isBlocked = p2.isBlocking;
          const damageMultiplier = isBlocked ? 0.3 : 1.0; // Blocking reduces damage by 70%
          
          const damage = p1.state === 'punching' ? GAME_CONFIG.PUNCH_DAMAGE : GAME_CONFIG.KICK_DAMAGE;
          p2.health = Math.max(0, p2.health - damage * 0.4 * damageMultiplier); // Increased from 0.1 to 0.4
          p2.lastHitTime = now;
          
          // Force field pushback effect
          if (p1.state === 'kicking' && !isBlocked) {
            const pushDirection = p2.x > p1.x ? 1 : -1;
            p2.vx = pushDirection * 15; // Strong pushback
            p2.vy = 8; // Slight upward push
          }
          
          playSound('hit');
          triggerScreenShake(p1.state === 'kicking' ? 8 : 4);
        }
        
        // Player 2 attacking Player 1
        if ((p2.state === 'punching' || p2.state === 'kicking') && now - p1.lastHitTime > 200) {
          // Check if P1 is blocking
          const isBlocked = p1.isBlocking;
          const damageMultiplier = isBlocked ? 0.3 : 1.0; // Blocking reduces damage by 70%
          
          const damage = p2.state === 'punching' ? GAME_CONFIG.PUNCH_DAMAGE : GAME_CONFIG.KICK_DAMAGE;
          p1.health = Math.max(0, p1.health - damage * 0.4 * damageMultiplier); // Increased from 0.1 to 0.4
          p1.lastHitTime = now;
          
          // Force field pushback effect
          if (p2.state === 'kicking' && !isBlocked) {
            const pushDirection = p1.x > p2.x ? 1 : -1;
            p1.vx = pushDirection * 15; // Strong pushback
            p1.vy = 8; // Slight upward push
          }
          
          playSound('hit');
          triggerScreenShake(p2.state === 'kicking' ? 8 : 4);
        }
      }

      // Check for game over
      if (p1.health <= 0) {
        setGameOver(true);
        setWinner(selectedCharacters.p2.name);
        playSound('ko');
        return;
      }
      if (p2.health <= 0) {
        setGameOver(true);
        setWinner(selectedCharacters.p1.name);
        playSound('ko');
        return;
      }

      // Draw players with character colors
      drawPlayers(ctx, p1, p2, GROUND_LINE_Y, selectedCharacters.p1, selectedCharacters.p2);

      // Update state
      setPlayers({ p1, p2 });

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, gameOver, isPaused, selectedCharacters, selectedStage, gameMode, drawPlayers, playSound, triggerScreenShake]);

  // Render based on game state
  return (
    <div style={{
      minHeight: '100vh',
      height: '100%',
      width: '100%',
      backgroundColor: '#0a0a0a',
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.03) 2px, rgba(0, 255, 255, 0.03) 4px)',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'auto',
      fontFamily: '"Rajdhani", "Orbitron", "Exo 2", sans-serif',
      fontWeight: '600'
    }}>
      {/* Controls Overlay - Shows at start */}
      {gameState === 'CONTROLS_OVERLAY' && (
        <div style={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.03) 2px, rgba(0, 255, 255, 0.03) 4px)',
          position: 'absolute',
          top: 0,
          left: 0
        }}>
          <StartOverlay onComplete={handleControlsComplete} />
          <div style={{
            textAlign: 'center',
            color: '#00FFFF',
            fontSize: '14px',
            marginTop: '400px',
            fontWeight: '700',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            textShadow: '0 0 10px #00FFFF'
          }}>
            [[ LOADING ]]
          </div>
        </div>
      )}

      {/* Mode Selection Screen */}
      {gameState === 'MODE_SELECT' && (
        <ModeSelect
          onSelectMode={handleModeSelect}
          playSound={playSound}
        />
      )}

      {/* Character Selection Screen */}
      {gameState === 'CHAR_SELECT' && (
        <CharacterSelect
          onContinue={handleCharacterSelect}
          playSound={playSound}
          gameMode={gameMode}
        />
      )}

      {/* Stage Selection Screen */}
      {gameState === 'STAGE_SELECT' && selectedCharacters && (
        <StageSelect
          onSelectStage={handleStageSelect}
          selectedCharacters={selectedCharacters}
          playSound={playSound}
        />
      )}

      {/* Fight Screen */}
      {gameState === 'FIGHT' && selectedCharacters && selectedStage && (
        <div style={{
          minHeight: '100vh',
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          background: selectedStage.gradient,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.02) 2px, rgba(0, 255, 255, 0.02) 4px)',
          padding: '60px'
        }}>
          {/* Cyberpunk grid overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(${selectedStage.neonColor === '#00FFFF' ? '0, 255, 255' : selectedStage.neonColor === '#FF1493' ? '255, 20, 147' : '57, 255, 20'}, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(${selectedStage.neonColor === '#00FFFF' ? '0, 255, 255' : selectedStage.neonColor === '#FF1493' ? '255, 20, 147' : '57, 255, 20'}, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            pointerEvents: 'none',
            zIndex: 1,
            opacity: 0.3
          }} />

          {/* Game HUD */}
          <GameHUD
            p1Character={selectedCharacters.p1}
            p2Character={selectedCharacters.p2}
            p1Health={players.p1.health}
            p2Health={players.p2.health}
            p1Energy={players.p1.energy}
            p2Energy={players.p2.energy}
            p1MaxEnergy={players.p1.maxEnergy}
            p2MaxEnergy={players.p2.maxEnergy}
            p1Blocking={players.p1.isBlocking}
            p2Blocking={players.p2.isBlocking}
            timeLeft={timeLeft}
            showRoundStart={showRoundStart}
          />

          {/* Audio Controls */}
          <AudioControls
            audioManager={audioManagerRef.current}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />

          {/* Pause Button - Below Timer */}
          <button
            onClick={() => setIsPaused(true)}
            style={{
              position: 'fixed',
              top: '145px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              pointerEvents: 'auto',
              width: '50px',
              height: '40px',
              backgroundColor: '#0a0a0a',
              border: '2px solid #FF1493',
              borderRadius: '0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '900',
              color: '#FF1493',
              transition: 'all 0.2s ease',
              boxShadow: '0 0 20px #FF1493, inset 0 0 10px rgba(0, 0, 0, 0.8)',
              clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
              letterSpacing: '1px',
              textShadow: '0 0 8px #FF1493',
              fontFamily: '"Orbitron", sans-serif'
            }}
            onMouseEnter={e => {
              e.target.style.backgroundColor = '#FF1493';
              e.target.style.color = '#0a0a0a';
              e.target.style.boxShadow = '0 0 30px #FF1493, inset 0 0 10px rgba(0, 0, 0, 0.5)';
              e.target.style.textShadow = 'none';
            }}
            onMouseLeave={e => {
              e.target.style.backgroundColor = '#0a0a0a';
              e.target.style.color = '#FF1493';
              e.target.style.boxShadow = '0 0 20px #FF1493, inset 0 0 10px rgba(0, 0, 0, 0.8)';
              e.target.style.textShadow = '0 0 8px #FF1493';
            }}
          >
            || ||
          </button>

          {/* Persistent Controls Display */}
          <ControlsDisplay player="p1" side="left" />
          <ControlsDisplay player="p2" side="right" />

          {/* Canvas Container with screen shake */}
          <div style={{
            transform: `translate(${screenShake.x}px, ${screenShake.y}px)`,
            transition: 'transform 0.1s ease-out',
            position: 'relative',
            zIndex: 2
          }}>
            <canvas
              ref={canvasRef}
              width={GAME_CONFIG.CANVAS_WIDTH}
              height={GAME_CONFIG.CANVAS_HEIGHT}
              style={{
                border: `2px solid ${selectedStage.neonColor}`,
                borderRadius: '0',
                backgroundColor: 'rgba(10, 10, 10, 0.8)',
                boxShadow: `0 0 30px ${selectedStage.neonColor}, inset 0 0 50px rgba(0, 0, 0, 0.8)`,
                clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
                filter: 'contrast(1.1) brightness(1.05)'
              }}
            />
          </div>

          {/* Pause Modal */}
          {isPaused && !gameOver && (
            <PauseModal
              onResume={() => setIsPaused(false)}
              onExit={resetGame}
            />
          )}

          {/* Game Over Overlay - CYBERPUNK */}
          {gameOver && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(10, 10, 10, 0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(12px)',
              animation: 'fadeIn 0.5s ease-out, glitch 2s infinite'
            }}>
              <div style={{
                backgroundColor: '#0a0a0a',
                padding: '80px 100px',
                borderRadius: '0',
                textAlign: 'center',
                border: winner === selectedCharacters.p1.name ? `3px solid ${selectedCharacters.p1.accentColor}` 
                  : winner === selectedCharacters.p2.name ? `3px solid ${selectedCharacters.p2.accentColor}` 
                  : '3px solid #00FFFF',
                boxShadow: winner === selectedCharacters.p1.name ? `0 0 50px ${selectedCharacters.p1.accentColor}` 
                  : winner === selectedCharacters.p2.name ? `0 0 50px ${selectedCharacters.p2.accentColor}` 
                  : '0 0 50px #00FFFF',
                clipPath: 'polygon(0 0, calc(100% - 30px) 0, 100% 30px, 100% 100%, 30px 100%, 0 calc(100% - 30px))',
                position: 'relative'
              }}>
                {/* Glitch effect overlay */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.05) 2px, rgba(0, 255, 255, 0.05) 4px)',
                  pointerEvents: 'none',
                  zIndex: 1
                }} />
                <div style={{
                  fontSize: '96px',
                  fontWeight: '900',
                  marginBottom: '24px',
                  color: winner === selectedCharacters.p1.name ? selectedCharacters.p1.accentColor 
                    : winner === selectedCharacters.p2.name ? selectedCharacters.p2.accentColor 
                    : '#00FFFF',
                  letterSpacing: '8px',
                  textTransform: 'uppercase',
                  textShadow: winner === selectedCharacters.p1.name ? `0 0 40px ${selectedCharacters.p1.accentColor}, 0 0 80px ${selectedCharacters.p1.accentColor}` 
                    : winner === selectedCharacters.p2.name ? `0 0 40px ${selectedCharacters.p2.accentColor}, 0 0 80px ${selectedCharacters.p2.accentColor}` 
                    : '0 0 40px #00FFFF, 0 0 80px #00FFFF',
                  fontFamily: '"Orbitron", "Rajdhani", sans-serif',
                  position: 'relative',
                  zIndex: 2
                }}>
                  {winner === 'Draw' ? '[DRAW]' : `${winner}`}
                </div>
                <div style={{
                  fontSize: '24px',
                  color: '#00FFFF',
                  marginBottom: '50px',
                  letterSpacing: '4px',
                  textTransform: 'uppercase',
                  fontWeight: '700',
                  textShadow: '0 0 20px #00FFFF',
                  position: 'relative',
                  zIndex: 2
                }}>
                  {winner === 'Draw' ? '>> TIMEOUT <<' : '>> VICTORY <<'}
                </div>
                <button
                  onClick={resetGame}
                  style={{
                    padding: '20px 60px',
                    fontSize: '18px',
                    fontWeight: '900',
                    backgroundColor: '#0a0a0a',
                    color: '#FF1493',
                    border: '2px solid #FF1493',
                    borderRadius: '0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    letterSpacing: '3px',
                    textTransform: 'uppercase',
                    boxShadow: '0 0 20px #FF1493',
                    clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
                    position: 'relative',
                    zIndex: 2
                  }}
                  onMouseEnter={e => {
                    e.target.style.backgroundColor = '#FF1493';
                    e.target.style.color = '#0a0a0a';
                    e.target.style.boxShadow = '0 0 40px #FF1493';
                  }}
                  onMouseLeave={e => {
                    e.target.style.backgroundColor = '#0a0a0a';
                    e.target.style.color = '#FF1493';
                    e.target.style.boxShadow = '0 0 20px #FF1493';
                  }}
                >
                  [[ REMATCH ]]
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Global CSS Animations and Reset - CYBERPUNK */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #0a0a0a;
        }
        
        #root {
          width: 100%;
          height: 100%;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes glitch {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
        }
        
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        
        @keyframes pulse {
          0%, 100% { 
            opacity: 1;
            transform: scale(1);
          }
          50% { 
            opacity: 0.7;
            transform: scale(1.02);
          }
        }
      `}</style>
    </div>
  );
};

export default FightingGame;