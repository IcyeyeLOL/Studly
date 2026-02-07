import React, { useState, useEffect } from 'react';

const GameHUD = ({ 
  p1Character, p2Character, 
  p1Health, p2Health, 
  p1Energy, p2Energy, 
  p1MaxEnergy, p2MaxEnergy,
  p1Blocking, p2Blocking,
  timeLeft, showRoundStart 
}) => {
  const [roundStartVisible, setRoundStartVisible] = useState(showRoundStart);

  useEffect(() => {
    if (showRoundStart) {
      setRoundStartVisible(true);
      const timer = setTimeout(() => {
        setRoundStartVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showRoundStart]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      zIndex: 10,
      fontFamily: '"Rajdhani", "Orbitron", sans-serif'
    }}>
      {/* Top HUD Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '32px 48px',
        gap: '60px'
      }}>
        {/* Player 1 Health and Energy */}
        <div style={{
          flex: 1,
          maxWidth: '450px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px'
          }}>
            <div style={{
              fontSize: '18px',
              fontWeight: '900',
              color: p1Character.accentColor,
              letterSpacing: '3px',
              textTransform: 'uppercase',
              textShadow: `0 0 10px ${p1Character.accentColor}`,
              fontFamily: '"Orbitron", sans-serif'
            }}>
              [[ {p1Character.name} ]]
            </div>
            {p1Blocking && (
              <div style={{
                fontSize: '12px',
                fontWeight: '900',
                color: '#39FF14',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                textShadow: '0 0 10px #39FF14',
                animation: 'pulse 0.5s infinite'
              }}>
                [BLOCKING]
              </div>
            )}
          </div>
          
          {/* Health Bar */}
          <div style={{
            height: '20px',
            backgroundColor: '#0a0a0a',
            border: `2px solid ${p1Character.accentColor}`,
            borderRadius: '0',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: `0 0 15px ${p1Character.accentColor}, inset 0 0 10px rgba(0, 0, 0, 0.8)`,
            clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
            marginBottom: '8px'
          }}>
            <div style={{
              height: '100%',
              width: `${Math.max(0, p1Health)}%`,
              background: `linear-gradient(90deg, ${p1Character.color} 0%, ${p1Character.accentColor} 100%)`,
              transition: 'width 0.3s ease',
              position: 'relative',
              boxShadow: `inset 0 0 20px ${p1Character.accentColor}`,
              borderRight: p1Health > 0 ? `2px solid ${p1Character.accentColor}` : 'none'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255, 255, 255, 0.1) 2px, rgba(255, 255, 255, 0.1) 4px)',
                pointerEvents: 'none'
              }} />
            </div>
            <div style={{
              position: 'absolute',
              top: '50%',
              right: '8px',
              transform: 'translateY(-50%)',
              fontSize: '11px',
              fontWeight: '900',
              color: p1Health > 30 ? p1Character.accentColor : '#FF1493',
              textShadow: p1Health > 30 ? `0 0 8px ${p1Character.accentColor}` : '0 0 8px #FF1493',
              letterSpacing: '1px'
            }}>
              {Math.round(Math.max(0, p1Health))}%
            </div>
          </div>
          
          {/* Energy Bar */}
          <div style={{
            height: '12px',
            backgroundColor: '#0a0a0a',
            border: `2px solid #00FFFF`,
            borderRadius: '0',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: `0 0 10px #00FFFF, inset 0 0 8px rgba(0, 0, 0, 0.8)`,
            clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)'
          }}>
            <div style={{
              height: '100%',
              width: `${Math.max(0, (p1Energy / p1MaxEnergy) * 100)}%`,
              background: p1Energy >= p1MaxEnergy 
                ? 'linear-gradient(90deg, #00FFFF 0%, #39FF14 100%)'
                : 'linear-gradient(90deg, #004444 0%, #00FFFF 100%)',
              transition: 'width 0.3s ease',
              position: 'relative',
              boxShadow: p1Energy >= p1MaxEnergy ? `inset 0 0 15px #00FFFF` : 'none',
              borderRight: p1Energy > 0 ? `1px solid #00FFFF` : 'none',
              animation: p1Energy >= p1MaxEnergy ? 'pulse 1s infinite' : 'none'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255, 255, 255, 0.15) 1px, rgba(255, 255, 255, 0.15) 2px)',
                pointerEvents: 'none'
              }} />
            </div>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '8px',
              transform: 'translateY(-50%)',
              fontSize: '9px',
              fontWeight: '900',
              color: '#00FFFF',
              textShadow: '0 0 6px #00FFFF',
              letterSpacing: '0.5px'
            }}>
              {p1Energy >= p1MaxEnergy ? '[FORCE READY]' : 'CHARGING...'}
            </div>
          </div>
        </div>

        {/* Timer - CYBERPUNK */}
        <div style={{
          textAlign: 'center',
          minWidth: '120px',
          position: 'relative'
        }}>
          <div style={{
            fontSize: '64px',
            fontWeight: '900',
            color: timeLeft <= 10 ? '#FF1493' : '#00FFFF',
            letterSpacing: '4px',
            fontVariantNumeric: 'tabular-nums',
            textShadow: timeLeft <= 10 
              ? '0 0 30px #FF1493, 0 0 60px #FF1493'
              : '0 0 20px #00FFFF, 0 0 40px #00FFFF',
            animation: timeLeft <= 10 ? 'pulse 0.5s ease-in-out infinite, glitch 1s infinite' : 'none',
            fontFamily: '"Orbitron", sans-serif',
            position: 'relative',
            zIndex: 2
          }}>
            {String(timeLeft).padStart(2, '0')}
          </div>
          {/* Timer frame */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100px',
            height: '100px',
            border: `2px solid ${timeLeft <= 10 ? '#FF1493' : '#00FFFF'}`,
            clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)',
            boxShadow: timeLeft <= 10 ? '0 0 30px #FF1493' : '0 0 20px #00FFFF',
            zIndex: 1
          }} />
        </div>

        {/* Player 2 Health and Energy */}
        <div style={{
          flex: 1,
          maxWidth: '450px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
            justifyContent: 'flex-end'
          }}>
            {p2Blocking && (
              <div style={{
                fontSize: '12px',
                fontWeight: '900',
                color: '#39FF14',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                textShadow: '0 0 10px #39FF14',
                animation: 'pulse 0.5s infinite'
              }}>
                [BLOCKING]
              </div>
            )}
            <div style={{
              fontSize: '18px',
              fontWeight: '900',
              color: p2Character.accentColor,
              letterSpacing: '3px',
              textTransform: 'uppercase',
              textShadow: `0 0 10px ${p2Character.accentColor}`,
              fontFamily: '"Orbitron", sans-serif'
            }}>
              [[ {p2Character.name} ]]
            </div>
          </div>
          
          {/* Health Bar */}
          <div style={{
            height: '20px',
            backgroundColor: '#0a0a0a',
            border: `2px solid ${p2Character.accentColor}`,
            borderRadius: '0',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            justifyContent: 'flex-end',
            boxShadow: `0 0 15px ${p2Character.accentColor}, inset 0 0 10px rgba(0, 0, 0, 0.8)`,
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
            marginBottom: '8px'
          }}>
            <div style={{
              height: '100%',
              width: `${Math.max(0, p2Health)}%`,
              background: `linear-gradient(90deg, ${p2Character.accentColor} 0%, ${p2Character.color} 100%)`,
              transition: 'width 0.3s ease',
              position: 'relative',
              boxShadow: `inset 0 0 20px ${p2Character.accentColor}`,
              borderLeft: p2Health > 0 ? `2px solid ${p2Character.accentColor}` : 'none'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255, 255, 255, 0.1) 2px, rgba(255, 255, 255, 0.1) 4px)',
                pointerEvents: 'none'
              }} />
            </div>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '8px',
              transform: 'translateY(-50%)',
              fontSize: '11px',
              fontWeight: '900',
              color: p2Health > 30 ? p2Character.accentColor : '#FF1493',
              textShadow: p2Health > 30 ? `0 0 8px ${p2Character.accentColor}` : '0 0 8px #FF1493',
              letterSpacing: '1px'
            }}>
              {Math.round(Math.max(0, p2Health))}%
            </div>
          </div>
          
          {/* Energy Bar */}
          <div style={{
            height: '12px',
            backgroundColor: '#0a0a0a',
            border: `2px solid #00FFFF`,
            borderRadius: '0',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            justifyContent: 'flex-end',
            boxShadow: `0 0 10px #00FFFF, inset 0 0 8px rgba(0, 0, 0, 0.8)`,
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
          }}>
            <div style={{
              height: '100%',
              width: `${Math.max(0, (p2Energy / p2MaxEnergy) * 100)}%`,
              background: p2Energy >= p2MaxEnergy 
                ? 'linear-gradient(90deg, #39FF14 0%, #00FFFF 100%)'
                : 'linear-gradient(90deg, #00FFFF 0%, #004444 100%)',
              transition: 'width 0.3s ease',
              position: 'relative',
              boxShadow: p2Energy >= p2MaxEnergy ? `inset 0 0 15px #00FFFF` : 'none',
              borderLeft: p2Energy > 0 ? `1px solid #00FFFF` : 'none',
              animation: p2Energy >= p2MaxEnergy ? 'pulse 1s infinite' : 'none'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255, 255, 255, 0.15) 1px, rgba(255, 255, 255, 0.15) 2px)',
                pointerEvents: 'none'
              }} />
            </div>
            <div style={{
              position: 'absolute',
              top: '50%',
              right: '8px',
              transform: 'translateY(-50%)',
              fontSize: '9px',
              fontWeight: '900',
              color: '#00FFFF',
              textShadow: '0 0 6px #00FFFF',
              letterSpacing: '0.5px'
            }}>
              {p2Energy >= p2MaxEnergy ? '[FORCE READY]' : 'CHARGING...'}
            </div>
          </div>
        </div>
      </div>



      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes scaleIn {
          0% { 
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default GameHUD;