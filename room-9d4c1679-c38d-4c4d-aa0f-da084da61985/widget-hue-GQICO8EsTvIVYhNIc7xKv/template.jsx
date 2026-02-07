import React, { useState, useEffect, useCallback, useRef } from 'react';

// Calculate color difference using Delta E (simplified CIEDE2000-inspired)
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToLab(rgb) {
  let r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
  return { L: (116 * y) - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

function deltaE(hex1, hex2) {
  const lab1 = rgbToLab(hexToRgb(hex1));
  const lab2 = rgbToLab(hexToRgb(hex2));
  const dL = lab1.L - lab2.L;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

function generateRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  const sat = 50 + Math.floor(Math.random() * 40);
  const light = 40 + Math.floor(Math.random() * 30);
  return hslToHex(hue, sat, light);
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function calculateScore(difference) {
  // Max difference ~100, perfect match = 0
  const score = Math.max(0, Math.round(100 - difference));
  return score;
}

function getFeedback(score) {
  if (score >= 95) return { text: "Perfect eye!", emoji: "" };
  if (score >= 85) return { text: "What a boss!", emoji: "" };
  if (score >= 70) return { text: "Sharp vision!", emoji: "" };
  if (score >= 55) return { text: "Getting there!", emoji: "" };
  if (score >= 40) return { text: "Room to grow", emoji: "" };
  if (score >= 25) return { text: "Keep practicing!", emoji: "" };
  return { text: "Get your eyes checked!", emoji: "" };
}


// Color orb with liquid effect
function ColorOrb({ color, label, showHex = false }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div 
          className="w-28 h-28 rounded-full transition-all duration-700 ease-out"
          style={{ 
            background: `radial-gradient(circle at 35% 35%, ${color}, ${color}cc)`,
            boxShadow: `
              0 0 60px ${color}44,
              inset 0 0 30px rgba(255,255,255,0.1),
              inset -10px -10px 20px rgba(0,0,0,0.2)
            `
          }}
        />
        {/* Glass reflection */}
        <div 
          className="absolute top-3 left-4 w-12 h-6 rounded-full opacity-30"
          style={{ background: 'linear-gradient(180deg, white, transparent)' }}
        />
      </div>
      <span className="text-xs font-mono text-white/50 tracking-wider">{label}</span>
      <span className={`text-sm font-mono text-white/70 transition-opacity duration-500 h-5 ${
        showHex ? 'opacity-100' : 'opacity-0'
      }`}>
        {color.toUpperCase()}
      </span>
    </div>
  );
}

// Glass placeholder orb that animates to filled
function GeneratedOrb({ color, isGenerating, isFilled, showHex }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-28 h-28">
        {/* Glass empty state */}
        <div 
          className={`absolute inset-0 rounded-full transition-opacity duration-500 ${
            isFilled ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ 
            background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
            boxShadow: `
              inset 0 0 30px rgba(255,255,255,0.05),
              inset -10px -10px 20px rgba(0,0,0,0.1),
              0 0 30px rgba(255,255,255,0.03)
            `,
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        />
        
        {/* Generating animation */}
        {isGenerating && (
          <>
            <div 
              className="absolute inset-0 rounded-full"
              style={{ 
                background: `conic-gradient(from 0deg, transparent, ${color}44, transparent)`,
                animation: 'spin 2s linear infinite'
              }}
            />
            <div 
              className="absolute inset-2 rounded-full"
              style={{ 
                background: `radial-gradient(circle at 50% 50%, ${color}22, transparent)`,
                animation: 'pulse 1.5s ease-in-out infinite'
              }}
            />
          </>
        )}
        
        {/* Filled state */}
        <div 
          className={`absolute inset-0 rounded-full transition-all duration-700 ease-out ${
            isFilled ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={{ 
            background: `radial-gradient(circle at 35% 35%, ${color}, ${color}cc)`,
            boxShadow: `
              0 0 60px ${color}44,
              inset 0 0 30px rgba(255,255,255,0.1),
              inset -10px -10px 20px rgba(0,0,0,0.2)
            `
          }}
        />
        
        {/* Glass reflection - always visible */}
        <div 
          className="absolute top-3 left-4 w-12 h-6 rounded-full opacity-30"
          style={{ background: 'linear-gradient(180deg, white, transparent)' }}
        />
        
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(0.95); }
            50% { opacity: 0.6; transform: scale(1); }
          }
        `}</style>
      </div>
      <span className="text-xs font-mono text-white/50 tracking-wider">GENERATED</span>
      <span className={`text-sm font-mono text-white/70 transition-opacity duration-500 h-5 ${
        showHex && isFilled ? 'opacity-100' : 'opacity-0'
      }`}>
        {(color || '#000000').toUpperCase()}
      </span>
    </div>
  );
}

// Score reveal animation
function ScoreReveal({ score, feedback, isVisible }) {
  return (
    <div className={`text-center transition-all duration-500 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
    }`}>
      <div 
        className="text-6xl font-light text-white mb-2 tracking-tight"
        style={{ 
          textShadow: score >= 70 ? '0 0 40px rgba(74, 222, 128, 0.5)' : '0 0 40px rgba(255, 255, 255, 0.2)'
        }}
      >
        {score ?? 0}
      </div>
      <div className="text-white/60 text-lg">{feedback?.text ?? '\u00A0'}</div>
    </div>
  );
}

function Hue() {
  const [tailwindLoaded, setTailwindLoaded] = useState(false);
  const [gameState, setGameState] = useState('idle'); // idle, prompting, generating, comparing, result
  const [targetColor, setTargetColor] = useState('#6366f1');
  const [guessColor, setGuessColor] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [score, setScore] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [rounds, setRounds] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!document.getElementById('tailwind-script')) {
      const tailwindScript = document.createElement('script');
      tailwindScript.id = 'tailwind-script';
      tailwindScript.src = 'https://cdn.tailwindcss.com';
      tailwindScript.onload = () => setTimeout(() => setTailwindLoaded(true), 100);
      document.head.appendChild(tailwindScript);
    } else {
      setTailwindLoaded(true);
    }
  }, []);

  useEffect(() => {
    document.body.style.background = '#0a0a0f';
    document.documentElement.style.minHeight = '100%';
    return () => { 
      document.body.style.background = ''; 
      document.documentElement.style.minHeight = ''; 
    };
  }, []);

  const startNewRound = useCallback(() => {
    setTargetColor(generateRandomColor());
    setGuessColor(null);
    setPrompt('');
    setScore(null);
    setFeedback(null);
    setGameState('prompting');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || gameState !== 'prompting') return;
    
    setGameState('generating');
    
    try {
      const response = await miyagiAPI.post('/generate-text', {
        prompt: `You are a color expert. The user will describe a color they want. Output ONLY a single hex color code (like #FF5733) that best matches their description. No other text, just the hex code.

User's description: "${prompt}"

Output the hex code:`,
        model: 'gpt-4o-mini',
        max_tokens: 20,
        temperature: 0.3
      });
      
      if (response.success && response.data.text) {
        const hexMatch = response.data.text.match(/#[0-9A-Fa-f]{6}/);
        const generatedColor = hexMatch ? hexMatch[0] : '#808080';
        
        setGuessColor(generatedColor);
        setGameState('comparing');
        
        // Delay score reveal for visual effect
        setTimeout(() => {
          const diff = deltaE(targetColor, generatedColor);
          const roundScore = calculateScore(diff);
          setScore(roundScore);
          setFeedback(getFeedback(roundScore));
          setTotalScore(prev => prev + roundScore);
          setRounds(prev => prev + 1);
          setGameState('result');
        }, 1500);
      } else {
        setGameState('prompting');
      }
    } catch (err) {
      console.error('Error generating color:', err);
      setGameState('prompting');
    }
  }, [prompt, targetColor, gameState]);

  if (!tailwindLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-white/50">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-8 relative overflow-hidden">
      {/* Subtle ambient glow */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${targetColor}22 0%, transparent 50%)`
        }}
      />
      
      {/* Header - always rendered, fades in after first round */}
      <div className="h-12 flex items-center justify-center w-full">
        <div className={`flex items-center gap-8 text-white/40 text-sm font-mono transition-opacity duration-500 ${
          rounds > 0 ? 'opacity-100' : 'opacity-0'
        }`}>
          <span>Round {rounds || 1}</span>
          <span className="w-px h-4 bg-white/20" />
          <span>Avg: {rounds > 0 ? Math.round(totalScore / rounds) : 0}</span>
        </div>
      </div>

      {/* Main game area - fixed top position */}
      <div className="w-full max-w-lg mt-16">
        {gameState === 'idle' && (
          <div className="text-center mt-24">
            {/* Glass text title with layered glow */}
            <div className="relative inline-block mb-4">
              {/* Outer glow layer */}
              <h1 
                className="text-6xl font-extralight tracking-widest select-none absolute inset-0 blur-xl opacity-50"
                style={{ color: '#a78bfa' }}
                aria-hidden="true"
              >
                Hue
              </h1>
              {/* Mid glow layer */}
              <h1 
                className="text-6xl font-extralight tracking-widest select-none absolute inset-0 blur-md opacity-40"
                style={{ color: '#c4b5fd' }}
                aria-hidden="true"
              >
                Hue
              </h1>
              {/* Main text with glass effect */}
              <h1 
                className="text-6xl font-extralight tracking-widest relative"
                style={{ 
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 50%, rgba(200,200,255,0.8) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: '0 0 80px rgba(167, 139, 250, 0.4)',
                  filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.3))'
                }}
              >
                Hue
              </h1>
            </div>
            
            {/* Subtitle with subtle glow */}
            <p 
              className="mb-10 text-sm tracking-wide"
              style={{
                background: 'linear-gradient(90deg, rgba(255,255,255,0.3), rgba(255,255,255,0.5), rgba(255,255,255,0.3))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Describe colors. Match perfectly.
            </p>
            
            <button
              onClick={startNewRound}
              className="relative text-white/60 hover:text-white transition-all duration-500 
                         text-lg tracking-widest font-light group"
            >
              <span className="relative z-10">Begin</span>
              {/* Pulsing glow behind text */}
              <span 
                className="absolute inset-0 -inset-x-4 -inset-y-2 rounded-full opacity-0 
                           group-hover:opacity-100 transition-opacity duration-500"
                style={{ 
                  background: 'radial-gradient(circle, rgba(167,139,250,0.5) 0%, transparent 70%)',
                  filter: 'blur(12px)'
                }}
              />
              <span 
                className="absolute inset-0 -inset-x-6 -inset-y-3 rounded-full"
                style={{ 
                  background: 'radial-gradient(circle, rgba(167,139,250,0.25) 0%, transparent 70%)',
                  filter: 'blur(8px)',
                  animation: 'gentlePulse 3s ease-in-out infinite'
                }}
              />
              <style>{`
                @keyframes gentlePulse {
                  0%, 100% { opacity: 0.3; transform: scale(1); }
                  50% { opacity: 0.5; transform: scale(1.1); }
                }
              `}</style>
            </button>
          </div>
        )}

        {gameState !== 'idle' && (
          <div className="flex flex-col items-center">
            {/* Color orbs row - both always visible, nothing moves */}
            <div className="flex items-start justify-center gap-8">
              <ColorOrb 
                color={targetColor} 
                label="TARGET" 
                showHex={gameState === 'result'} 
              />
              
              {/* Gradient bridge between orbs - positioned at vertical center of orbs (h-28 = 7rem, center = 3.5rem) */}
              <div className="w-12 flex items-center" style={{ height: '7rem' }}>
                <div 
                  className="w-full h-1 rounded-full transition-all duration-1000"
                  style={{ 
                    background: (gameState === 'comparing' || gameState === 'result')
                      ? `linear-gradient(90deg, ${targetColor}, ${guessColor || targetColor})`
                      : 'rgba(255,255,255,0.08)'
                  }}
                />
              </div>
              
              {/* Generated orb - starts as glass, fills when ready */}
              <GeneratedOrb 
                color={guessColor || targetColor}
                isGenerating={gameState === 'generating'}
                isFilled={gameState === 'comparing' || gameState === 'result'}
                showHex={gameState === 'result'}
              />
            </div>

            {/* Bottom area - fixed height, content fades in/out */}
            <div className="h-48 flex flex-col items-center justify-center w-full mt-10 relative">
              {/* Input section - fades out when not prompting */}
              <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${
                gameState === 'prompting' ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}>
                <div className="space-y-6 w-full">
                  <div className="relative group">
                    <div 
                      className="absolute -inset-1 rounded-2xl opacity-50 group-focus-within:opacity-75 transition-opacity duration-500 blur-xl"
                      style={{ background: `linear-gradient(135deg, ${targetColor}33, transparent 50%, rgba(255,255,255,0.1))` }}
                    />
                    <input
                      ref={inputRef}
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      placeholder="Describe this color..."
                      className="relative w-full bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] 
                                 rounded-2xl px-6 py-4 text-white placeholder-white/25 
                                 focus:outline-none focus:border-white/20 focus:bg-white/[0.05]
                                 transition-all duration-500"
                      style={{
                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 0 40px rgba(0,0,0,0.2)'
                      }}
                    />
                  </div>
                  
                  <div className="flex justify-center">
                    <button
                      onClick={handleSubmit}
                      disabled={!prompt.trim()}
                      className="relative text-white/60 hover:text-white disabled:text-white/20
                                 transition-all duration-500 text-base tracking-widest font-light group
                                 disabled:cursor-not-allowed"
                    >
                      <span className="relative z-10">Generate</span>
                      <span 
                        className="absolute inset-0 -inset-x-5 -inset-y-2 rounded-full opacity-0 
                                   group-hover:opacity-100 group-disabled:group-hover:opacity-0 
                                   transition-opacity duration-500"
                        style={{ 
                          background: `radial-gradient(circle, ${targetColor}66 0%, transparent 70%)`,
                          filter: 'blur(12px)'
                        }}
                      />
                      <span 
                        className="absolute inset-0 -inset-x-6 -inset-y-3 rounded-full group-disabled:opacity-0"
                        style={{ 
                          background: `radial-gradient(circle, ${targetColor}22 0%, transparent 70%)`,
                          filter: 'blur(8px)',
                          animation: 'gentlePulse 3s ease-in-out infinite'
                        }}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Generating status text */}
              <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
                gameState === 'generating' ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}>
                <p className="text-white/30 text-sm tracking-wide animate-pulse">AI is seeing colors...</p>
              </div>

              {/* Score section - fades in when comparing/result */}
              <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${
                (gameState === 'comparing' || gameState === 'result') ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}>
                <ScoreReveal 
                  score={score} 
                  feedback={feedback} 
                  isVisible={gameState === 'result'} 
                />
                
                <div className={`mt-6 transition-opacity duration-500 ${
                  gameState === 'result' ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}>
                  <button
                    onClick={startNewRound}
                    className="relative text-white/50 hover:text-white transition-all duration-500 
                               text-sm tracking-widest font-light group"
                  >
                    <span className="relative z-10">Next Color</span>
                    <span 
                      className="absolute inset-0 -inset-x-4 -inset-y-2 rounded-full opacity-0 
                                 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ 
                        background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
                        filter: 'blur(10px)'
                      }}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hint text - always rendered, fades with opacity */}
      {gameState !== 'idle' && (
        <p className={`mt-6 text-white/20 text-xs text-center max-w-sm transition-opacity duration-500 ${
          gameState === 'prompting' ? 'opacity-100' : 'opacity-0'
        }`}>
          Tip: Be specific. "Warm sunset orange with coral undertones" beats "orange"
        </p>
      )}
    </div>
  );
}

export default Hue;
