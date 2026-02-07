import React, { useState, useEffect, useMemo } from 'react';
import Spectrum from './components/Spectrum.jsx';
import Starfield from './components/Starfield.jsx';
import Confetti from './components/Confetti.jsx';
import { prompts } from './utils/prompts.js';

function Wavelength() {
  const [tailwindLoaded, setTailwindLoaded] = useState(false);
  
  // Game state stored in global storage (multiplayer)
  const [gameState, setGameState] = useStorage('wavelength.game', {
    phase: 'clue', // 'clue', 'guess', 'reveal'
    currentPrompt: null,
    targetPosition: 50,
    clue: '',
    guessPosition: 50,
    score: 0,
    round: 1,
    roundScores: [], // Track individual round scores
  });

  // Custom packs storage (user-scoped - private to each user)
  const [customPacks, setCustomPacks] = useStorage('wavelength.customPacks', {}, { scope: 'user' });
  const [selectedPackId, setSelectedPackId] = useStorage('wavelength.selectedPack', 'default', { scope: 'user' });
  
  // Personal leaderboard (user-scoped)
  const [leaderboard, setLeaderboard] = useStorage('wavelength.leaderboard', [], { scope: 'user' });
  
  // UI state
  const [showMenu, setShowMenu] = useState(false);
  const [showPackManager, setShowPackManager] = useState(false);
  const [showPackSelector, setShowPackSelector] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [editingPackId, setEditingPackId] = useState(null);
  const [packForm, setPackForm] = useState({ name: '', prompts: [] });
  const [newPrompt, setNewPrompt] = useState({ left: '', right: '' });
  const [showConfetti, setShowConfetti] = useState(false);
  const [autoRefreshWords, setAutoRefreshWords] = useStorage('wavelength.autoRefresh', false);
  const [hasSeenTutorial, setHasSeenTutorial] = useStorage('wavelength.hasSeenTutorial', false, { scope: 'user' });

  // Label editing state
  const [editingLabels, setEditingLabels] = useState(false);
  const [leftLabel, setLeftLabel] = useState('');
  const [rightLabel, setRightLabel] = useState('');
  const [expandedScoreIndex, setExpandedScoreIndex] = useState(null);

  // Get current pack prompts
  const currentPackPrompts = useMemo(() => {
    if (selectedPackId === 'default') {
      return prompts;
    }
    return customPacks[selectedPackId]?.prompts || prompts;
  }, [selectedPackId, customPacks]);

  useEffect(() => {
    // Load Lexend font
    if (!document.getElementById('lexend-font')) {
      const link = document.createElement('link');
      link.id = 'lexend-font';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap';
      document.head.appendChild(link);
    }

    // Load Tailwind CSS
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

  useEffect(() => {
    // Galaxy background gradient
    document.body.style.background = 'linear-gradient(to bottom, #0a0e27 0%, #1a1b3c 50%, #0d1428 100%)';
    document.documentElement.style.minHeight = '100%';
    return () => {
      document.body.style.background = '';
      document.documentElement.style.minHeight = '';
    };
  }, []);

  // Initialize game on first load
  useEffect(() => {
    if (!gameState.currentPrompt) {
      startNewRound();
    }
    // Show tutorial on first visit
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

  const startNewRound = () => {
    const packToUse = currentPackPrompts.length > 0 ? currentPackPrompts : prompts;
    const randomPrompt = packToUse[Math.floor(Math.random() * packToUse.length)];
    const randomTarget = Math.floor(Math.random() * 101); // 0-100
    
    setGameState(prev => ({
      ...prev,
      phase: 'clue',
      currentPrompt: randomPrompt,
      targetPosition: randomTarget,
      clue: '',
      guessPosition: 50,
    }));
  };

  const handleClueSubmit = () => {
    if (!gameState.clue.trim()) return;
    
    setGameState(prev => ({
      ...prev,
      phase: 'guess',
    }));
  };

  const handleGuessSubmit = () => {
    const distance = Math.abs(gameState.targetPosition - gameState.guessPosition);
    let points = 0;
    
    // Convert position distance to angle distance (0-100 position = 0-180 degrees)
    const angleDist = distance * 1.8;
    
    if (angleDist <= 5) points = 4;  // Green center (±5 degrees)
    else if (angleDist <= 15) points = 3;  // Blue zones (5-15 degrees)
    else if (angleDist <= 25) points = 2;  // Orange zones (15-25 degrees)
    else points = 0;  // Miss - outside all zones
    
    // Trigger confetti for perfect score!
    if (points === 4) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000); // Hide after 3 seconds
    }
    
    setGameState(prev => ({
      ...prev,
      phase: 'reveal',
      score: prev.score + points,
      roundScores: [...(prev.roundScores || []), { 
        round: prev.round, 
        points,
        clue: prev.clue,
        spectrum: {
          left: prev.currentPrompt?.left || '',
          right: prev.currentPrompt?.right || ''
        }
      }],
    }));
  };

  const handleNextRound = () => {
    const randomTarget = Math.floor(Math.random() * 101);
    const packToUse = currentPackPrompts.length > 0 ? currentPackPrompts : prompts;
    const randomPrompt = autoRefreshWords 
      ? packToUse[Math.floor(Math.random() * packToUse.length)]
      : null;
    
    setGameState(prev => ({
      ...prev,
      round: prev.round + 1,
      phase: 'clue',
      targetPosition: randomTarget,
      clue: '',
      guessPosition: 50,
      // Auto-refresh words if enabled, otherwise keep current prompt
      ...(randomPrompt && { currentPrompt: randomPrompt }),
    }));
  };

  const handleRefreshSlider = () => {
    // Only refresh the target position, keep the words/prompt
    const randomTarget = Math.floor(Math.random() * 101);
    setGameState(prev => ({
      ...prev,
      targetPosition: randomTarget,
      clue: '',
      guessPosition: 50,
    }));
  };

  const handleRefreshWords = () => {
    // Only refresh the words/prompt, keep the target position and score
    const packToUse = currentPackPrompts.length > 0 ? currentPackPrompts : prompts;
    const randomPrompt = packToUse[Math.floor(Math.random() * packToUse.length)];
    setGameState(prev => ({
      ...prev,
      currentPrompt: randomPrompt,
      clue: '',
      guessPosition: 50,
    }));
  };

  const handleRestart = () => {
    setGameState({
      phase: 'clue',
      currentPrompt: null,
      targetPosition: 50,
      clue: '',
      guessPosition: 50,
      score: 0,
      round: 1,
      roundScores: [],
    });
    startNewRound();
    setShowMenu(false);
  };

  const handleSaveScore = () => {
    const completedRounds = gameState.roundScores || [];
    
    // Don't save if no rounds have been completed
    if (completedRounds.length === 0) {
      alert('Complete at least one round before saving!');
      return;
    }
    
    const newEntry = {
      score: gameState.score,
      rounds: completedRounds.length, // Use actual completed rounds, not gameState.round
      date: new Date().toISOString(),
      roundScores: completedRounds,
    };
    
    setLeaderboard(prev => {
      const updated = [...prev, newEntry];
      // Sort by score (descending), then by rounds (ascending for tie-breaker)
      updated.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.rounds - b.rounds;
      });
      // Keep top 20 scores
      return updated.slice(0, 20);
    });
    
    setShowMenu(false);
    alert('Score saved!');
  };

  // Pack management functions
  const handleCreatePack = () => {
    setEditingPackId('new');
    setPackForm({ name: '', prompts: [] });
    setNewPrompt({ left: '', right: '' });
    setShowPackManager(true);
  };

  const handleEditPack = (packId) => {
    const pack = customPacks[packId];
    setEditingPackId(packId);
    setPackForm({ name: pack.name, prompts: [...pack.prompts] });
    setNewPrompt({ left: '', right: '' });
  };

  const handleSavePack = () => {
    if (!packForm.name.trim() || packForm.prompts.length === 0) return;
    
    const packId = editingPackId === 'new' 
      ? `pack-${Date.now()}`
      : editingPackId;
    
    setCustomPacks(prev => ({
      ...prev,
      [packId]: {
        name: packForm.name.trim(),
        prompts: packForm.prompts
      }
    }));
    
    setEditingPackId(null);
    setPackForm({ name: '', prompts: [] });
    setShowPackManager(false);
  };

  const handleDeletePack = (packId) => {
    if (!confirm('Delete this pack?')) return;
    
    setCustomPacks(prev => {
      const updated = { ...prev };
      delete updated[packId];
      return updated;
    });
    
    if (selectedPackId === packId) {
      setSelectedPackId('default');
    }
    
    if (editingPackId === packId) {
      setEditingPackId(null);
    }
  };

  const handleAddPromptToPack = () => {
    if (!newPrompt.left.trim() || !newPrompt.right.trim()) return;
    
    setPackForm(prev => ({
      ...prev,
      prompts: [...prev.prompts, { 
        left: newPrompt.left.trim(), 
        right: newPrompt.right.trim() 
      }]
    }));
    
    setNewPrompt({ left: '', right: '' });
  };

  const handleRemovePromptFromPack = (index) => {
    setPackForm(prev => ({
      ...prev,
      prompts: prev.prompts.filter((_, i) => i !== index)
    }));
  };

  const calculateScore = () => {
    const distance = Math.abs(gameState.targetPosition - gameState.guessPosition);
    // Convert position distance to angle distance (0-100 position = 0-180 degrees)
    const angleDist = distance * 1.8;
    
    if (angleDist <= 5) return 4;  // Green center
    if (angleDist <= 15) return 3;  // Blue zones
    if (angleDist <= 25) return 2;  // Orange zones
    return 0;  // Miss
  };

  if (!tailwindLoaded) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!gameState.currentPrompt) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Initializing...</div>;
  }

  return (
    <>
      {/* Starfield Background */}
      <Starfield />

      {/* Confetti for Perfect Score */}
      {showConfetti && <Confetti />}

      {/* Dark Overlay */}
      {(showMenu || showPackManager || showLeaderboard || showPackSelector || showTutorial) && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 z-40 transition-opacity duration-300"
          onClick={() => {
            setShowMenu(false);
            setShowPackManager(false);
            setShowLeaderboard(false);
            setShowPackSelector(false);
            setShowTutorial(false);
            setEditingPackId(null);
          }}
        />
      )}

      {/* Slide-out Panel for Menu */}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-md shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          showMenu ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: 'rgba(15, 20, 45, 0.95)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(100, 150, 255, 0.2)',
        }}
      >
        <div className="p-8" style={{ fontFamily: 'Lexend, sans-serif' }}>
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-light" style={{ color: '#ffffff' }}>
              Menu
            </h3>
            <button
              onClick={() => setShowMenu(false)}
              className="transition-colors text-2xl"
              style={{ color: 'rgba(150, 180, 255, 0.6)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 150, 150, 0.9)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(150, 180, 255, 0.6)'}
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                setShowMenu(false);
                setShowPackSelector(true);
              }}
              className="w-full p-4 rounded-lg text-left transition-all"
              style={{
                background: 'rgba(30, 40, 80, 0.6)',
                border: '1px solid rgba(100, 150, 255, 0.3)',
                color: 'rgba(200, 220, 255, 0.9)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(50, 70, 120, 0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(30, 40, 80, 0.6)'}
            >
              <div className="font-medium text-lg">Select Pack</div>
              <div className="text-sm" style={{ color: 'rgba(150, 180, 255, 0.6)' }}>
                Choose a word pack to play with
              </div>
            </button>

            <button
              onClick={() => {
                setShowMenu(false);
                setShowLeaderboard(true);
              }}
              className="w-full p-4 rounded-lg text-left transition-all"
              style={{
                background: 'rgba(30, 40, 80, 0.6)',
                border: '1px solid rgba(100, 150, 255, 0.3)',
                color: 'rgba(200, 220, 255, 0.9)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(50, 70, 120, 0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(30, 40, 80, 0.6)'}
            >
              <div className="font-medium text-lg">View Leaderboard</div>
              <div className="text-sm" style={{ color: 'rgba(150, 180, 255, 0.6)' }}>
                See your best scores
              </div>
            </button>

            <button
              onClick={() => {
                setShowMenu(false);
                handleSaveScore();
              }}
              className="w-full p-4 rounded-lg text-left transition-all"
              style={{
                background: 'rgba(30, 40, 80, 0.6)',
                border: '1px solid rgba(100, 150, 255, 0.3)',
                color: 'rgba(200, 220, 255, 0.9)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(50, 70, 120, 0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(30, 40, 80, 0.6)'}
            >
              <div className="font-medium text-lg">Save Score</div>
              <div className="text-sm" style={{ color: 'rgba(150, 180, 255, 0.6)' }}>
                Save current game to leaderboard
              </div>
            </button>

            <button
              onClick={() => {
                setShowMenu(false);
                setShowPackManager(true);
              }}
              className="w-full p-4 rounded-lg text-left transition-all"
              style={{
                background: 'rgba(30, 40, 80, 0.6)',
                border: '1px solid rgba(100, 150, 255, 0.3)',
                color: 'rgba(200, 220, 255, 0.9)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(50, 70, 120, 0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(30, 40, 80, 0.6)'}
            >
              <div className="font-medium text-lg">Manage Packs</div>
              <div className="text-sm" style={{ color: 'rgba(150, 180, 255, 0.6)' }}>
                Create and edit custom word packs
              </div>
            </button>

            <button
              onClick={() => {
                setShowMenu(false);
                setShowTutorial(true);
              }}
              className="w-full p-4 rounded-lg text-left transition-all"
              style={{
                background: 'rgba(30, 40, 80, 0.6)',
                border: '1px solid rgba(100, 150, 255, 0.3)',
                color: 'rgba(200, 220, 255, 0.9)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(50, 70, 120, 0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(30, 40, 80, 0.6)'}
            >
              <div className="font-medium text-lg">How to Play</div>
              <div className="text-sm" style={{ color: 'rgba(150, 180, 255, 0.6)' }}>
                Learn the rules and scoring
              </div>
            </button>

            <div style={{ borderTop: '1px solid rgba(100, 150, 255, 0.2)', margin: '16px 0' }}></div>

            <button
              onClick={() => {
                setShowMenu(false);
                handleRestart();
              }}
              className="w-full p-4 rounded-lg text-left transition-all"
              style={{
                background: 'rgba(60, 30, 40, 0.6)',
                border: '1px solid rgba(255, 100, 100, 0.3)',
                color: 'rgba(255, 150, 150, 0.9)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(80, 40, 50, 0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(60, 30, 40, 0.6)'}
            >
              <div className="font-medium text-lg">Restart Game</div>
              <div className="text-sm" style={{ color: 'rgba(255, 150, 150, 0.6)' }}>
                Reset score and start over
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Slide-out Panel for Tutorial */}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-md shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          showTutorial ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: 'rgba(15, 20, 45, 0.95)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(100, 150, 255, 0.2)',
        }}
      >
        <div className="p-8" style={{ fontFamily: 'Lexend, sans-serif' }}>
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => {
                setShowTutorial(false);
                setShowMenu(true);
              }}
              className="transition-colors text-2xl"
              style={{ color: 'rgba(150, 180, 255, 0.6)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(100, 200, 255, 0.9)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(150, 180, 255, 0.6)'}
            >
              ←
            </button>
            <h3 className="text-2xl font-light flex-1" style={{ color: '#ffffff' }}>
              How to Play
            </h3>
          </div>

          <div className="space-y-6">
            {/* Game Overview */}
            <div>
              <h4 className="text-lg font-medium mb-2" style={{ color: 'rgba(200, 220, 255, 0.9)' }}>
                🎯 The Goal
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(150, 180, 255, 0.7)' }}>
                Wavelength is a social guessing game where one player (the Clue Giver) provides a hint to help others guess a hidden target on the spectrum between two opposite concepts.
              </p>
            </div>

            {/* How to Play */}
            <div>
              <h4 className="text-lg font-medium mb-3" style={{ color: 'rgba(200, 220, 255, 0.9)' }}>
                🎮 How to Play
              </h4>
              <div className="space-y-3 text-sm" style={{ color: 'rgba(150, 180, 255, 0.7)' }}>
                <div className="flex gap-3">
                  <span className="font-medium" style={{ color: 'rgba(100, 200, 255, 0.9)' }}>1.</span>
                  <div>
                    <strong style={{ color: 'rgba(200, 220, 255, 0.9)' }}>Clue Phase:</strong> The Clue Giver sees a hidden target position and must give a clue that hints at where on the spectrum the target is.
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="font-medium" style={{ color: 'rgba(100, 200, 255, 0.9)' }}>2.</span>
                  <div>
                    <strong style={{ color: 'rgba(200, 220, 255, 0.9)' }}>Guess Phase:</strong> Based on the clue, drag the blue circle to guess where the target is located on the spectrum.
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="font-medium" style={{ color: 'rgba(100, 200, 255, 0.9)' }}>3.</span>
                  <div>
                    <strong style={{ color: 'rgba(200, 220, 255, 0.9)' }}>Reveal Phase:</strong> See how close you were and earn points based on your accuracy!
                  </div>
                </div>
              </div>
            </div>

            {/* Scoring System */}
            <div>
              <h4 className="text-lg font-medium mb-3" style={{ color: 'rgba(200, 220, 255, 0.9)' }}>
                🏆 Scoring
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <div className="w-4 h-4 rounded-full" style={{ background: '#10b981' }}></div>
                  <div className="flex-1">
                    <div className="font-medium text-sm" style={{ color: 'rgba(200, 220, 255, 0.9)' }}>Perfect! (4 points)</div>
                    <div className="text-xs" style={{ color: 'rgba(150, 180, 255, 0.6)' }}>Within ±5 degrees of target</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  <div className="w-4 h-4 rounded-full" style={{ background: '#3b82f6' }}></div>
                  <div className="flex-1">
                    <div className="font-medium text-sm" style={{ color: 'rgba(200, 220, 255, 0.9)' }}>Great! (3 points)</div>
                    <div className="text-xs" style={{ color: 'rgba(150, 180, 255, 0.6)' }}>Within 5-15 degrees</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  <div className="w-4 h-4 rounded-full" style={{ background: '#f59e0b' }}></div>
                  <div className="flex-1">
                    <div className="font-medium text-sm" style={{ color: 'rgba(200, 220, 255, 0.9)' }}>Close! (2 points)</div>
                    <div className="text-xs" style={{ color: 'rgba(150, 180, 255, 0.6)' }}>Within 15-25 degrees</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(100, 100, 100, 0.2)', border: '1px solid rgba(150, 150, 150, 0.3)' }}>
                  <div className="w-4 h-4 rounded-full" style={{ background: '#666' }}></div>
                  <div className="flex-1">
                    <div className="font-medium text-sm" style={{ color: 'rgba(200, 220, 255, 0.9)' }}>Miss (0 points)</div>
                    <div className="text-xs" style={{ color: 'rgba(150, 180, 255, 0.6)' }}>More than 25 degrees away</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <h4 className="text-lg font-medium mb-3" style={{ color: 'rgba(200, 220, 255, 0.9)' }}>
                ✨ Features
              </h4>
              <div className="space-y-2 text-sm" style={{ color: 'rgba(150, 180, 255, 0.7)' }}>
                <div className="flex gap-2">
                  <span>•</span>
                  <span><strong style={{ color: 'rgba(200, 220, 255, 0.9)' }}>Refresh Slider:</strong> Get a new target position with the same words</span>
                </div>
                <div className="flex gap-2">
                  <span>•</span>
                  <span><strong style={{ color: 'rgba(200, 220, 255, 0.9)' }}>Refresh Words:</strong> Get a new word pair from the current pack</span>
                </div>
                <div className="flex gap-2">
                  <span>•</span>
                  <span><strong style={{ color: 'rgba(200, 220, 255, 0.9)' }}>Auto-Refresh:</strong> Automatically get new words after each round (toggle button)</span>
                </div>
                <div className="flex gap-2">
                  <span>•</span>
                  <span><strong style={{ color: 'rgba(200, 220, 255, 0.9)' }}>Custom Packs:</strong> Create your own word pairs to customize the game</span>
                </div>
                <div className="flex gap-2">
                  <span>•</span>
                  <span><strong style={{ color: 'rgba(200, 220, 255, 0.9)' }}>Leaderboard:</strong> Track your best scores over time</span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div>
              <h4 className="text-lg font-medium mb-3" style={{ color: 'rgba(200, 220, 255, 0.9)' }}>
                💡 Tips
              </h4>
              <div className="space-y-2 text-sm" style={{ color: 'rgba(150, 180, 255, 0.7)' }}>
                <div className="flex gap-2">
                  <span>•</span>
                  <span>Give specific clues that indicate position, not just the concept</span>
                </div>
                <div className="flex gap-2">
                  <span>•</span>
                  <span>Think about the entire spectrum, not just the endpoints</span>
                </div>
                <div className="flex gap-2">
                  <span>•</span>
                  <span>Click on the word labels to edit them mid-game if needed</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowTutorial(false);
                setHasSeenTutorial(true);
              }}
              className="w-full px-8 py-4 rounded-xl font-medium transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(100, 150, 255, 0.8) 0%, rgba(150, 100, 255, 0.8) 100%)',
                border: '1px solid rgba(100, 150, 255, 0.5)',
                color: '#ffffff',
                boxShadow: '0 0 20px rgba(100, 150, 255, 0.4)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(100, 150, 255, 0.6)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 20px rgba(100, 150, 255, 0.4)'}
            >
              Got It!
            </button>
          </div>
        </div>
      </div>

      {/* Slide-out Panel for Pack Manager */}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-md shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          showPackManager ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: 'rgba(15, 20, 45, 0.95)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(100, 150, 255, 0.2)',
        }}
      >
        <div className="p-8" style={{ fontFamily: 'Lexend, sans-serif' }}>
          {editingPackId ? (
            // Pack Editor
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setEditingPackId(null);
                    setPackForm({ name: '', prompts: [] });
                  }}
                  className="transition-colors text-2xl"
                  style={{ color: 'rgba(150, 180, 255, 0.6)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(100, 200, 255, 0.9)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(150, 180, 255, 0.6)'}
                >
                  ←
                </button>
                <h3 className="text-2xl font-light flex-1" style={{ color: 'rgba(200, 220, 255, 0.9)' }}>
                  {editingPackId === 'new' ? 'Create New Pack' : 'Edit Pack'}
                </h3>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(150, 180, 255, 0.7)' }}>
                  Pack Name
                </label>
                <input
                  type="text"
                  value={packForm.name}
                  onChange={(e) => setPackForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Custom Pack"
                  className="w-full px-4 py-3 rounded-lg text-sm font-light focus:outline-none transition-all"
                  style={{
                    background: 'rgba(30, 40, 80, 0.6)',
                    border: '1px solid rgba(100, 150, 255, 0.3)',
                    color: 'rgba(200, 220, 255, 0.9)',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(100, 200, 255, 0.6)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(100, 150, 255, 0.3)'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-3" style={{ color: 'rgba(150, 180, 255, 0.7)' }}>
                  Prompts ({packForm.prompts.length})
                </label>
                
                {/* Add new prompt form */}
                <div className="mb-4 p-4 rounded-lg space-y-3" style={{ background: 'rgba(20, 30, 60, 0.5)' }}>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newPrompt.left}
                      onChange={(e) => setNewPrompt(prev => ({ ...prev, left: e.target.value }))}
                      placeholder="Left label (e.g., Hot)"
                      className="px-4 py-2 rounded-lg text-sm font-light focus:outline-none transition-all"
                      style={{
                        background: 'rgba(30, 40, 80, 0.8)',
                        border: '1px solid rgba(100, 150, 255, 0.3)',
                        color: 'rgba(200, 220, 255, 0.9)',
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(100, 200, 255, 0.6)'}
                      onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(100, 150, 255, 0.3)'}
                    />
                    <input
                      type="text"
                      value={newPrompt.right}
                      onChange={(e) => setNewPrompt(prev => ({ ...prev, right: e.target.value }))}
                      placeholder="Right label (e.g., Cold)"
                      className="px-4 py-2 rounded-lg text-sm font-light focus:outline-none transition-all"
                      style={{
                        background: 'rgba(30, 40, 80, 0.8)',
                        border: '1px solid rgba(100, 150, 255, 0.3)',
                        color: 'rgba(200, 220, 255, 0.9)',
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(100, 200, 255, 0.6)'}
                      onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(100, 150, 255, 0.3)'}
                    />
                  </div>
                  <button
                    onClick={handleAddPromptToPack}
                    disabled={!newPrompt.left.trim() || !newPrompt.right.trim()}
                    className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: (newPrompt.left.trim() && newPrompt.right.trim())
                        ? 'linear-gradient(135deg, rgba(100, 150, 255, 0.6) 0%, rgba(150, 100, 255, 0.6) 100%)'
                        : 'rgba(50, 60, 100, 0.4)',
                      border: '1px solid rgba(100, 150, 255, 0.5)',
                      color: '#ffffff',
                      cursor: (newPrompt.left.trim() && newPrompt.right.trim()) ? 'pointer' : 'not-allowed',
                      opacity: (newPrompt.left.trim() && newPrompt.right.trim()) ? 1 : 0.4,
                    }}
                  >
                    Add Prompt
                  </button>
                </div>

                {/* Prompt list */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {packForm.prompts.length === 0 ? (
                    <div className="text-center py-8 text-sm" style={{ color: 'rgba(150, 180, 255, 0.5)' }}>
                      No prompts yet. Add your first prompt above.
                    </div>
                  ) : (
                    packForm.prompts.map((prompt, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{
                          background: 'rgba(30, 40, 80, 0.6)',
                          border: '1px solid rgba(100, 150, 255, 0.2)',
                        }}
                      >
                        <div className="flex-1 flex items-center gap-3 text-sm font-light" style={{ color: 'rgba(200, 220, 255, 0.9)' }}>
                          <span>{prompt.left}</span>
                          <span style={{ color: 'rgba(150, 180, 255, 0.5)' }}>↔</span>
                          <span>{prompt.right}</span>
                        </div>
                        <button
                          onClick={() => handleRemovePromptFromPack(index)}
                          className="transition-colors"
                          style={{ color: 'rgba(150, 180, 255, 0.6)' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 100, 100, 0.9)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(150, 180, 255, 0.6)'}
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditingPackId(null);
                    setPackForm({ name: '', prompts: [] });
                    setShowPackManager(false);
                  }}
                  className="flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: 'rgba(30, 40, 80, 0.6)',
                    border: '1px solid rgba(100, 150, 255, 0.3)',
                    color: 'rgba(200, 220, 255, 0.9)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(50, 60, 100, 0.8)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(30, 40, 80, 0.6)'}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePack}
                  disabled={!packForm.name.trim() || packForm.prompts.length === 0}
                  className="flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: (packForm.name.trim() && packForm.prompts.length > 0)
                      ? 'linear-gradient(135deg, rgba(100, 150, 255, 0.8) 0%, rgba(150, 100, 255, 0.8) 100%)'
                      : 'rgba(50, 60, 100, 0.4)',
                    border: '1px solid rgba(100, 150, 255, 0.5)',
                    color: '#ffffff',
                    cursor: (packForm.name.trim() && packForm.prompts.length > 0) ? 'pointer' : 'not-allowed',
                    opacity: (packForm.name.trim() && packForm.prompts.length > 0) ? 1 : 0.4,
                  }}
                >
                  Save Pack
                </button>
              </div>
            </div>
          ) : (
            // Pack List
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setShowPackManager(false);
                    setShowMenu(true);
                  }}
                  className="transition-colors text-2xl"
                  style={{ color: 'rgba(150, 180, 255, 0.6)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(100, 200, 255, 0.9)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(150, 180, 255, 0.6)'}
                >
                  ←
                </button>
                <h3 className="text-2xl font-light flex-1" style={{ color: 'rgba(200, 220, 255, 0.9)' }}>
                  Manage Packs
                </h3>
              </div>

              <button
                onClick={handleCreatePack}
                className="w-full px-5 py-3 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(100, 150, 255, 0.8) 0%, rgba(150, 100, 255, 0.8) 100%)',
                  border: '1px solid rgba(100, 150, 255, 0.5)',
                  color: '#ffffff',
                  boxShadow: '0 0 20px rgba(100, 150, 255, 0.4)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(100, 150, 255, 0.6)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 20px rgba(100, 150, 255, 0.4)'}
              >
                Create New Pack
              </button>

              {Object.keys(customPacks).length === 0 ? (
                <div className="text-center py-12 text-sm" style={{ color: 'rgba(150, 180, 255, 0.5)' }}>
                  No custom packs yet. Create your first pack to get started!
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(customPacks).map(([id, pack]) => (
                    <div
                      key={id}
                      className="flex items-center gap-4 p-4 rounded-lg transition-all"
                      style={{
                        background: 'rgba(30, 40, 80, 0.6)',
                        border: '1px solid rgba(100, 150, 255, 0.2)',
                      }}
                    >
                      <div className="flex-1">
                        <div className="font-medium" style={{ color: 'rgba(200, 220, 255, 0.9)' }}>{pack.name}</div>
                        <div className="text-sm" style={{ color: 'rgba(150, 180, 255, 0.6)' }}>
                          {pack.prompts.length} prompt{pack.prompts.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => handleEditPack(id)}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        style={{
                          background: 'rgba(50, 70, 100, 0.6)',
                          border: '1px solid rgba(100, 150, 255, 0.3)',
                          color: 'rgba(200, 220, 255, 0.9)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(70, 90, 120, 0.8)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(50, 70, 100, 0.6)'}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePack(id)}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        style={{
                          background: 'rgba(80, 40, 50, 0.6)',
                          border: '1px solid rgba(255, 100, 100, 0.3)',
                          color: 'rgba(255, 150, 150, 0.9)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 50, 60, 0.8)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(80, 40, 50, 0.6)'}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Panel for Leaderboard */}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-md shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          showLeaderboard ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: 'rgba(15, 20, 45, 0.95)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(100, 150, 255, 0.2)',
        }}
      >
        <div className="p-8" style={{ fontFamily: 'Lexend, sans-serif' }}>
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => {
                setShowLeaderboard(false);
                setShowMenu(true);
              }}
              className="transition-colors text-2xl"
              style={{ color: 'rgba(150, 180, 255, 0.6)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(100, 200, 255, 0.9)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(150, 180, 255, 0.6)'}
            >
              ←
            </button>
            <h3 className="text-2xl font-light flex-1" style={{ color: '#ffffff' }}>
              Your Best Scores
            </h3>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-center py-12 text-sm" style={{ color: 'rgba(150, 180, 255, 0.5)' }}>
              No scores saved yet. Play a game and click "Save Score" from the menu!
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div key={index}>
                  <div
                    className="flex items-center justify-between p-4 rounded-lg transition-all cursor-pointer"
                    style={{
                      background: 'rgba(30, 40, 80, 0.6)',
                      border: '1px solid rgba(100, 150, 255, 0.2)',
                    }}
                    onClick={() => setExpandedScoreIndex(expandedScoreIndex === index ? null : index)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-xl font-light w-8" style={{ color: 'rgba(150, 180, 255, 0.6)' }}>
                        {index + 1}.
                      </div>
                      <div>
                        <div className="text-lg font-medium" style={{ color: 'rgba(200, 220, 255, 0.9)' }}>
                          {entry.score} points
                        </div>
                        <div className="text-sm" style={{ color: 'rgba(150, 180, 255, 0.6)' }}>
                          {entry.rounds} round{entry.rounds !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-xs" style={{ color: 'rgba(150, 180, 255, 0.5)' }}>
                        {new Date(entry.date).toLocaleDateString()}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setLeaderboard(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="transition-colors p-1"
                        style={{ color: 'rgba(150, 180, 255, 0.6)' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 100, 100, 0.9)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(150, 180, 255, 0.6)'}
                        title="Delete this score"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  
                  {/* Expanded Round Breakdown */}
                  {expandedScoreIndex === index && entry.roundScores && entry.roundScores.length > 0 && (
                    <div className="mt-2 p-4 rounded-lg space-y-3" style={{ background: 'rgba(20, 30, 60, 0.5)', border: '1px solid rgba(100, 150, 255, 0.2)' }}>
                      <div className="text-xs font-medium mb-2" style={{ color: 'rgba(150, 180, 255, 0.7)' }}>
                        Round Breakdown:
                      </div>
                      <div className="space-y-2">
                        {entry.roundScores.map((roundData, rIndex) => (
                          <div key={rIndex} className="p-3 rounded-lg" style={{ background: 'rgba(30, 40, 80, 0.6)', border: '1px solid rgba(100, 150, 255, 0.2)' }}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium" style={{ color: 'rgba(150, 180, 255, 0.7)' }}>Round {roundData.round}</span>
                              <span className="text-sm font-bold px-2 py-1 rounded" style={{ 
                                background: roundData.points === 4 ? 'rgba(16, 185, 129, 0.2)' : 
                                           roundData.points === 3 ? 'rgba(59, 130, 246, 0.2)' : 
                                           roundData.points === 2 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(100, 100, 100, 0.2)',
                                color: roundData.points === 4 ? '#10b981' : 
                                       roundData.points === 3 ? '#3b82f6' : 
                                       roundData.points === 2 ? '#f59e0b' : 'rgba(150, 150, 150, 0.8)'
                              }}>
                                {roundData.points} pts
                              </span>
                            </div>
                            {roundData.spectrum && (
                              <div className="text-xs mb-1" style={{ color: 'rgba(150, 180, 255, 0.6)' }}>
                                <span style={{ color: 'rgba(200, 220, 255, 0.8)' }}>{roundData.spectrum.left}</span>
                                {' ↔ '}
                                <span style={{ color: 'rgba(200, 220, 255, 0.8)' }}>{roundData.spectrum.right}</span>
                              </div>
                            )}
                            {roundData.clue && (
                              <div className="text-xs" style={{ color: 'rgba(150, 180, 255, 0.7)' }}>
                                Clue: <span style={{ color: 'rgba(200, 220, 255, 0.9)', fontStyle: 'italic' }}>"{roundData.clue}"</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {leaderboard.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear all saved scores?')) {
                  setLeaderboard([]);
                }
              }}
              className="mt-6 w-full px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: 'rgba(80, 40, 50, 0.6)',
                border: '1px solid rgba(255, 100, 100, 0.3)',
                color: 'rgba(255, 150, 150, 0.9)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 50, 60, 0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(80, 40, 50, 0.6)'}
            >
              Clear History
            </button>
          )}
        </div>
      </div>

      {/* Slide-out Panel for Pack Selector */}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-md shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          showPackSelector ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: 'rgba(15, 20, 45, 0.95)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(100, 150, 255, 0.2)',
        }}
      >
        <div className="p-8" style={{ fontFamily: 'Lexend, sans-serif' }}>
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => {
                setShowPackSelector(false);
                setShowMenu(true);
              }}
              className="transition-colors text-2xl"
              style={{ color: 'rgba(150, 180, 255, 0.6)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(100, 200, 255, 0.9)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(150, 180, 255, 0.6)'}
            >
              ←
            </button>
            <h3 className="text-2xl font-light flex-1" style={{ color: '#ffffff' }}>
              Select Pack
            </h3>
          </div>

          <div className="space-y-3">
            {/* Default Pack */}
            <button
              onClick={() => {
                setSelectedPackId('default');
                const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
                setGameState(prev => ({
                  ...prev,
                  currentPrompt: randomPrompt,
                  clue: '',
                  guessPosition: 50,
                }));
                setShowPackSelector(false);
              }}
              className="w-full p-4 rounded-lg text-left transition-all"
              style={selectedPackId === 'default' 
                ? {
                    background: 'linear-gradient(135deg, rgba(100, 150, 255, 0.6) 0%, rgba(150, 100, 255, 0.6) 100%)',
                    border: '1px solid rgba(100, 150, 255, 0.5)',
                    boxShadow: '0 0 15px rgba(100, 150, 255, 0.3)',
                  }
                : {
                    background: 'rgba(30, 40, 80, 0.4)',
                    border: '1px solid rgba(100, 150, 255, 0.2)',
                  }
              }
              onMouseEnter={(e) => {
                if (selectedPackId !== 'default') {
                  e.currentTarget.style.background = 'rgba(40, 50, 90, 0.6)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedPackId !== 'default') {
                  e.currentTarget.style.background = 'rgba(30, 40, 80, 0.4)';
                }
              }}
            >
              <div className="font-medium" style={{ color: '#ffffff' }}>Default Pack</div>
              <div className="text-sm" style={{ color: 'rgba(150, 180, 255, 0.7)' }}>
                {prompts.length} prompts
              </div>
            </button>

            {/* Custom Packs */}
            {Object.entries(customPacks).map(([id, pack]) => (
              <button
                key={id}
                onClick={() => {
                  setSelectedPackId(id);
                  const packPrompts = pack.prompts;
                  const randomPrompt = packPrompts[Math.floor(Math.random() * packPrompts.length)];
                  setGameState(prev => ({
                    ...prev,
                    currentPrompt: randomPrompt,
                    clue: '',
                    guessPosition: 50,
                  }));
                  setShowPackSelector(false);
                }}
                className="w-full p-4 rounded-lg text-left transition-all"
                style={selectedPackId === id 
                  ? {
                      background: 'linear-gradient(135deg, rgba(100, 150, 255, 0.6) 0%, rgba(150, 100, 255, 0.6) 100%)',
                      border: '1px solid rgba(100, 150, 255, 0.5)',
                      boxShadow: '0 0 15px rgba(100, 150, 255, 0.3)',
                    }
                  : {
                      background: 'rgba(30, 40, 80, 0.4)',
                      border: '1px solid rgba(100, 150, 255, 0.2)',
                    }
                }
                onMouseEnter={(e) => {
                  if (selectedPackId !== id) {
                    e.currentTarget.style.background = 'rgba(40, 50, 90, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedPackId !== id) {
                    e.currentTarget.style.background = 'rgba(30, 40, 80, 0.4)';
                  }
                }}
              >
                <div className="font-medium" style={{ color: '#ffffff' }}>{pack.name}</div>
                <div className="text-sm" style={{ color: 'rgba(150, 180, 255, 0.7)' }}>
                  {pack.prompts.length} prompts
                </div>
              </button>
            ))}

            {Object.keys(customPacks).length === 0 && (
              <div className="text-center py-12 text-sm" style={{ color: 'rgba(150, 180, 255, 0.5)' }}>
                No custom packs yet. Use "Manage Packs" to create one!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-screen p-8 pb-40 relative z-10" style={{ fontFamily: 'Lexend, sans-serif' }}>
        <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="relative flex justify-between items-center mb-12">
          <div className="text-sm font-medium" style={{ fontFamily: 'Lexend, sans-serif', color: 'rgba(150, 180, 255, 0.8)' }}>
            Round {gameState.round}
          </div>
          
          {/* Centered Title with glow */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div 
              className="text-4xl font-light tracking-wider whitespace-nowrap" 
              style={{ 
                fontFamily: 'Lexend, sans-serif', 
                letterSpacing: '0.1em',
                color: '#ffffff',
                textShadow: '0 0 20px rgba(100, 150, 255, 0.8), 0 0 40px rgba(100, 150, 255, 0.4)',
              }}
            >
              WAVELENGTH
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm font-medium" style={{ fontFamily: 'Lexend, sans-serif', color: '#ffffff' }}>
              Score: {gameState.score}
            </div>
            <button
              onClick={() => setShowMenu(true)}
              className="px-4 py-2 rounded-lg text-xl font-light transition-all"
              style={{ 
                fontFamily: 'Lexend, sans-serif',
                background: 'rgba(30, 40, 80, 0.6)',
                border: '1px solid rgba(100, 150, 255, 0.3)',
                color: 'rgba(150, 180, 255, 0.9)',
                backdropFilter: 'blur(10px)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(50, 60, 100, 0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(30, 40, 80, 0.6)'}
            >
              ☰
            </button>
          </div>
        </div>

        {/* Current Pack Indicator */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setShowPackSelector(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all cursor-pointer"
            style={{
              background: 'rgba(30, 40, 80, 0.6)',
              border: '1px solid rgba(100, 150, 255, 0.3)',
              backdropFilter: 'blur(10px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(50, 60, 100, 0.8)';
              e.currentTarget.style.borderColor = 'rgba(100, 200, 255, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(30, 40, 80, 0.6)';
              e.currentTarget.style.borderColor = 'rgba(100, 150, 255, 0.3)';
            }}
          >
            <span style={{ color: 'rgba(150, 180, 255, 0.7)' }}>Playing:</span>
            <span style={{ color: 'rgba(200, 220, 255, 0.9)', fontWeight: 500 }}>
              {selectedPackId === 'default' ? 'Default Pack' : customPacks[selectedPackId]?.name || 'Default Pack'}
            </span>
            <span style={{ color: 'rgba(150, 180, 255, 0.5)', fontSize: '10px' }}>▼</span>
          </button>
        </div>

        {/* Phase Title */}
        <div className="text-center mb-8">
          <h2 
            className="text-2xl font-light tracking-wide"
            style={{
              color: '#ffffff',
              textShadow: '0 0 15px rgba(100, 150, 255, 0.6)',
            }}
          >
            {gameState.phase === 'clue' && 'TYPE A CLUE'}
            {gameState.phase === 'guess' && 'MAKE YOUR GUESS'}
            {gameState.phase === 'reveal' && `${calculateScore()} POINTS!`}
          </h2>
        </div>

        {/* Spectrum */}
        <div className="mb-12">
          <Spectrum
            targetPosition={gameState.targetPosition}
            showTarget={gameState.phase === 'clue' || gameState.phase === 'reveal'}
            guessPosition={gameState.guessPosition}
            onGuessChange={(pos) => setGameState(prev => ({ ...prev, guessPosition: pos }))}
            phase={gameState.phase}
          />
        </div>

        {/* Spectrum Labels */}
        <div className="mb-12 px-4">
          {!editingLabels ? (
            <div className="flex justify-between items-center">
              <div 
                className="text-lg font-light cursor-pointer transition-colors"
                style={{ color: 'rgba(200, 220, 255, 0.9)' }}
                onClick={() => {
                  setLeftLabel(gameState.currentPrompt?.left || '');
                  setRightLabel(gameState.currentPrompt?.right || '');
                  setEditingLabels(true);
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(100, 200, 255, 1)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(200, 220, 255, 0.9)'}
              >
                {gameState.currentPrompt?.left || 'Left'}
              </div>
              <div 
                className="text-lg font-light cursor-pointer transition-colors"
                style={{ color: 'rgba(200, 220, 255, 0.9)' }}
                onClick={() => {
                  setLeftLabel(gameState.currentPrompt?.left || '');
                  setRightLabel(gameState.currentPrompt?.right || '');
                  setEditingLabels(true);
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(100, 200, 255, 1)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(200, 220, 255, 0.9)'}
              >
                {gameState.currentPrompt?.right || 'Right'}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={leftLabel}
                  onChange={(e) => setLeftLabel(e.target.value)}
                  placeholder="Left label"
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-light focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  value={rightLabel}
                  onChange={(e) => setRightLabel(e.target.value)}
                  placeholder="Right label"
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-light focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingLabels(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (leftLabel.trim() && rightLabel.trim()) {
                      setGameState(prev => ({
                        ...prev,
                        currentPrompt: {
                          left: leftLabel.trim(),
                          right: rightLabel.trim()
                        }
                      }));
                      setEditingLabels(false);
                    }
                  }}
                  disabled={!leftLabel.trim() || !rightLabel.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Phase-specific content */}
        {gameState.phase === 'clue' && (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <div className="text-sm font-medium text-gray-500 mb-2">
                {gameState.clue ? `Clue: "${gameState.clue}"` : 'Enter your clue for the guesser'}
              </div>
            </div>
            
            <input
              type="text"
              value={gameState.clue}
              onChange={(e) => setGameState(prev => ({ ...prev, clue: e.target.value }))}
              placeholder="YOUR CLUE"
              className="w-full px-6 py-4 rounded-xl text-center text-lg font-light focus:outline-none transition-all"
              style={{
                background: 'rgba(30, 40, 80, 0.6)',
                border: '1px solid rgba(100, 150, 255, 0.3)',
                color: '#ffffff',
                backdropFilter: 'blur(10px)',
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleClueSubmit()}
              onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(100, 200, 255, 0.6)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(100, 150, 255, 0.3)'}
            />
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={handleRefreshSlider}
                  className="flex-1 px-6 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: 'rgba(30, 40, 80, 0.6)',
                    border: '1px solid rgba(100, 150, 255, 0.3)',
                    color: 'rgba(200, 220, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(50, 60, 100, 0.8)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(30, 40, 80, 0.6)'}
                >
                  Refresh Slider
                </button>
                <button
                  onClick={handleRefreshWords}
                  className="flex-1 px-6 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: 'rgba(30, 40, 80, 0.6)',
                    border: '1px solid rgba(100, 150, 255, 0.3)',
                    color: 'rgba(200, 220, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(50, 60, 100, 0.8)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(30, 40, 80, 0.6)'}
                >
                  Refresh Words
                </button>
                <button
                  onClick={() => setAutoRefreshWords(!autoRefreshWords)}
                  className="px-4 py-3 rounded-xl text-sm font-medium transition-all"
                  title={autoRefreshWords ? "Auto-refresh enabled" : "Auto-refresh disabled"}
                  style={{
                    background: autoRefreshWords 
                      ? 'linear-gradient(135deg, rgba(100, 150, 255, 0.8) 0%, rgba(150, 100, 255, 0.8) 100%)'
                      : 'rgba(30, 40, 80, 0.6)',
                    border: '1px solid rgba(100, 150, 255, 0.3)',
                    color: '#ffffff',
                    backdropFilter: 'blur(10px)',
                    boxShadow: autoRefreshWords ? '0 0 15px rgba(100, 150, 255, 0.3)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!autoRefreshWords) {
                      e.currentTarget.style.background = 'rgba(50, 60, 100, 0.8)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!autoRefreshWords) {
                      e.currentTarget.style.background = 'rgba(30, 40, 80, 0.6)';
                    }
                  }}
                >
                  {autoRefreshWords ? '🔄' : '⏸'}
                </button>
              </div>
              <button
                onClick={handleClueSubmit}
                disabled={!gameState.clue.trim()}
                className="w-full px-8 py-4 rounded-xl font-medium transition-all"
                style={{
                  background: gameState.clue.trim() 
                    ? 'linear-gradient(135deg, rgba(100, 150, 255, 0.8) 0%, rgba(150, 100, 255, 0.8) 100%)'
                    : 'rgba(50, 60, 100, 0.4)',
                  border: '1px solid rgba(100, 150, 255, 0.5)',
                  color: '#ffffff',
                  boxShadow: gameState.clue.trim() ? '0 0 20px rgba(100, 150, 255, 0.4)' : 'none',
                  cursor: gameState.clue.trim() ? 'pointer' : 'not-allowed',
                  opacity: gameState.clue.trim() ? 1 : 0.4,
                }}
                onMouseEnter={(e) => {
                  if (gameState.clue.trim()) {
                    e.currentTarget.style.boxShadow = '0 0 30px rgba(100, 150, 255, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (gameState.clue.trim()) {
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(100, 150, 255, 0.4)';
                  }
                }}
              >
                Submit Clue
              </button>
            </div>
          </div>
        )}

        {gameState.phase === 'guess' && (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <div className="text-lg font-medium mb-2" style={{ color: '#ffffff' }}>
                Clue: "{gameState.clue}"
              </div>
              <div className="text-sm" style={{ color: 'rgba(150, 180, 255, 0.7)' }}>
                Drag the blue circle at the bottom to place your guess
              </div>
            </div>
            
            <button
              onClick={handleGuessSubmit}
              className="w-full px-8 py-4 rounded-xl font-medium transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(100, 150, 255, 0.8) 0%, rgba(150, 100, 255, 0.8) 100%)',
                border: '1px solid rgba(100, 150, 255, 0.5)',
                color: '#ffffff',
                boxShadow: '0 0 20px rgba(100, 150, 255, 0.4)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(100, 150, 255, 0.6)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 20px rgba(100, 150, 255, 0.4)'}
            >
              Submit Guess
            </button>
          </div>
        )}

        {gameState.phase === 'reveal' && (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <div className="text-lg font-medium mb-2" style={{ color: '#ffffff' }}>
                Clue: "{gameState.clue}"
              </div>
              <div className="text-sm" style={{ color: 'rgba(150, 180, 255, 0.7)' }}>
                {calculateScore() === 4 && 'Perfect! Right in the center!'}
                {calculateScore() === 3 && 'Great guess! Very close!'}
                {calculateScore() === 2 && 'Nice try! On the edge!'}
                {calculateScore() === 0 && 'Missed! Better luck next round!'}
              </div>
            </div>
            
            <button
              onClick={handleNextRound}
              className="w-full px-8 py-4 rounded-xl font-medium transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(100, 150, 255, 0.8) 0%, rgba(150, 100, 255, 0.8) 100%)',
                border: '1px solid rgba(100, 150, 255, 0.5)',
                color: '#ffffff',
                boxShadow: '0 0 20px rgba(100, 150, 255, 0.4)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(100, 150, 255, 0.6)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 20px rgba(100, 150, 255, 0.4)'}
            >
              Next Round
            </button>
          </div>
        )}
        
        {/* Extra spacing for comfortable scrolling */}
        <div className="h-64"></div>
      </div>
    </div>
    </>
  );
}

export default Wavelength;
