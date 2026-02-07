import React, { useState } from 'react';
import { CHARACTERS } from '../utils/config';
import { CharacterIcon } from '../utils/characterIcons.jsx';

const CharacterSelect = ({ onContinue, playSound, gameMode }) => {
  const [selectedP1, setSelectedP1] = useState(null);
  const [selectedP2, setSelectedP2] = useState(null);
  const [hoveredP1, setHoveredP1] = useState(null);
  const [hoveredP2, setHoveredP2] = useState(null);

  const isCPUMode = gameMode === 'cpu';
  const canContinue = isCPUMode ? selectedP1 : (selectedP1 && selectedP2);

  const handleP1Select = (charId) => {
    setSelectedP1(charId);
    if (playSound) playSound('select');
    
    // Auto-continue in CPU mode after P1 selection
    if (isCPUMode) {
      setTimeout(() => {
        if (playSound) playSound('select');
        onContinue({
          p1: CHARACTERS.find(c => c.id === charId),
          p2: null // Will be randomly selected in parent component
        });
      }, 300);
    }
  };

  const handleP2Select = (charId) => {
    setSelectedP2(charId);
    if (playSound) playSound('select');
  };

  const handleContinue = () => {
    if (canContinue && !isCPUMode) {
      if (playSound) playSound('select');
      onContinue({
        p1: CHARACTERS.find(c => c.id === selectedP1),
        p2: CHARACTERS.find(c => c.id === selectedP2)
      });
    }
  };

  const CharacterCard = ({ char, isSelected, onSelect, onHover, onLeave }) => {
    return (
      <button
        onClick={() => onSelect(char.id)}
        onMouseEnter={() => onHover(char.id)}
        onMouseLeave={onLeave}
        style={{
          padding: 0,
          backgroundColor: '#0a0a0a',
          border: isSelected 
            ? `3px solid ${char.accentColor}` 
            : '2px solid #1a1a1a',
          borderRadius: '0',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          overflow: 'hidden',
          position: 'relative',
          transform: isSelected ? 'scale(1.05)' : 'scale(1)',
          boxShadow: isSelected 
            ? `0 0 40px ${char.accentColor}, inset 0 0 20px rgba(0, 0, 0, 0.8)`
            : '0 0 10px rgba(0, 0, 0, 0.8)',
          clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))',
          filter: isSelected ? 'brightness(1.2)' : 'brightness(1)'
        }}
      >
        {/* Glitch overlay */}
        {isSelected && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.03) 2px, rgba(255, 255, 255, 0.03) 4px)',
            pointerEvents: 'none',
            zIndex: 10,
            animation: 'glitch 3s infinite'
          }} />
        )}
        
        {/* Character Icon */}
        <div style={{
          height: '200px',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          borderBottom: `2px solid ${char.accentColor}`
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            filter: isSelected ? 'drop-shadow(0 0 20px ' + char.accentColor + ')' : 'none'
          }}>
            <CharacterIcon char={char} size={200} />
          </div>
        </div>

        {/* Info */}
        <div style={{
          padding: '20px',
          backgroundColor: '#0a0a0a',
          borderTop: `1px solid ${isSelected ? char.accentColor : '#1a1a1a'}`
        }}>
          <div style={{
            fontSize: '18px',
            fontWeight: '900',
            color: char.accentColor,
            marginBottom: '6px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            textShadow: `0 0 10px ${char.accentColor}`,
            fontFamily: '"Orbitron", sans-serif'
          }}>
            {char.name}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#666',
            lineHeight: '1.4',
            fontWeight: '700',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>
            {char.description}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#0a0a0a',
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.03) 2px, rgba(0, 255, 255, 0.03) 4px)',
      padding: '80px 60px',
      color: '#00FFFF',
      fontFamily: '"Rajdhani", "Orbitron", sans-serif',
      position: 'absolute',
      top: 0,
      left: 0,
      boxSizing: 'border-box',
      overflowY: 'auto'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Title */}
        <h1 style={{
          fontSize: '64px',
          fontWeight: '900',
          textAlign: 'center',
          marginBottom: '16px',
          color: '#00FFFF',
          letterSpacing: '8px',
          textTransform: 'uppercase',
          textShadow: '0 0 30px #00FFFF, 0 0 60px #00FFFF',
          fontFamily: '"Orbitron", sans-serif'
        }}>
          [[ SELECT WARRIOR ]]
        </h1>
        <p style={{
          fontSize: '16px',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '60px',
          color: '#FF1493',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          textShadow: '0 0 10px #FF1493'
        }}>
          {'>'} CHOOSE YOUR COMBATANT {'<'}
        </p>

        {/* Player Selection Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: '60px',
          marginBottom: '60px',
          alignItems: 'start'
        }}>
          {/* Player 1 */}
          <div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '900',
              marginBottom: '24px',
              color: '#00FFFF',
              textAlign: 'center',
              letterSpacing: '4px',
              textTransform: 'uppercase',
              textShadow: '0 0 20px #00FFFF',
              fontFamily: '"Orbitron", sans-serif'
            }}>
              [[ P1 ]]
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px'
            }}>
              {CHARACTERS.map(char => (
                <CharacterCard
                  key={`p1-${char.id}`}
                  char={char}
                  isSelected={selectedP1 === char.id}
                  onSelect={handleP1Select}
                  onHover={setHoveredP1}
                  onLeave={() => setHoveredP1(null)}
                />
              ))}
            </div>
          </div>

          {/* VS Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: '100px'
          }}>
            <div style={{
              fontSize: '36px',
              fontWeight: '900',
              color: '#FF1493',
              letterSpacing: '6px',
              padding: '20px',
              border: '3px solid #FF1493',
              borderRadius: '0',
              width: '100px',
              height: '100px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0a0a0a',
              boxShadow: '0 0 40px #FF1493, inset 0 0 20px rgba(0, 0, 0, 0.8)',
              textShadow: '0 0 20px #FF1493',
              fontFamily: '"Orbitron", sans-serif',
              clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)',
              textTransform: 'uppercase'
            }}>
              VS
            </div>
          </div>

          {/* Player 2 */}
          <div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '900',
              marginBottom: '24px',
              color: '#39FF14',
              textAlign: 'center',
              letterSpacing: '4px',
              textTransform: 'uppercase',
              textShadow: '0 0 20px #39FF14',
              fontFamily: '"Orbitron", sans-serif'
            }}>
              {isCPUMode ? '[[ CPU ]]' : '[[ P2 ]]'}
            </h2>
            {isCPUMode ? (
              /* CPU Indicator */
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                padding: '60px',
                backgroundColor: '#0a0a0a',
                border: '3px solid #39FF14',
                borderRadius: '0',
                clipPath: 'polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px)',
                boxShadow: '0 0 50px #39FF14, inset 0 0 30px rgba(0, 0, 0, 0.8)',
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(57, 255, 20, 0.05) 2px, rgba(57, 255, 20, 0.05) 4px)',
                position: 'relative',
                animation: 'glitch 3s infinite'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '120px',
                    marginBottom: '30px',
                    filter: 'drop-shadow(0 0 30px #39FF14)'
                  }}>
                    🤖
                  </div>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: '900',
                    color: '#39FF14',
                    letterSpacing: '6px',
                    textTransform: 'uppercase',
                    textShadow: '0 0 20px #39FF14, 0 0 40px #39FF14',
                    fontFamily: '"Orbitron", sans-serif',
                    marginBottom: '20px'
                  }}>
                    CPU OPPONENT
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#00FFFF',
                    letterSpacing: '3px',
                    textTransform: 'uppercase',
                    textShadow: '0 0 10px #00FFFF',
                    opacity: 0.8
                  }}>
                    {'<'} RANDOMLY SELECTED {'>'}
                  </div>
                  <div style={{
                    marginTop: '30px',
                    fontSize: '14px',
                    color: '#FF1493',
                    letterSpacing: '2px',
                    fontWeight: '600',
                    textShadow: '0 0 10px #FF1493',
                    opacity: 0.7
                  }}>
                    AI WILL CHOOSE FIGHTER
                  </div>
                </div>
              </div>
            ) : (
              /* Player 2 Character Grid */
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px'
              }}>
                {CHARACTERS.map(char => (
                  <CharacterCard
                    key={`p2-${char.id}`}
                    char={char}
                    isSelected={selectedP2 === char.id}
                    onSelect={handleP2Select}
                    onHover={setHoveredP2}
                    onLeave={() => setHoveredP2(null)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Continue Button - Only show in 2 Player mode */}
        {!isCPUMode && (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              style={{
                padding: '24px 80px',
                fontSize: '20px',
                fontWeight: '900',
                backgroundColor: '#0a0a0a',
                color: canContinue ? '#00FFFF' : '#333',
                border: canContinue ? '3px solid #00FFFF' : '2px solid #333',
                borderRadius: '0',
                cursor: canContinue ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                letterSpacing: '4px',
                textTransform: 'uppercase',
                boxShadow: canContinue 
                  ? '0 0 30px #00FFFF'
                  : 'none',
                opacity: canContinue ? 1 : 0.3,
                textShadow: canContinue ? '0 0 10px #00FFFF' : 'none',
                fontFamily: '"Orbitron", sans-serif',
                clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)'
              }}
              onMouseEnter={e => {
                if (canContinue) {
                  e.target.style.backgroundColor = '#00FFFF';
                  e.target.style.color = '#0a0a0a';
                  e.target.style.boxShadow = '0 0 50px #00FFFF';
                  e.target.style.textShadow = 'none';
                }
              }}
              onMouseLeave={e => {
                if (canContinue) {
                  e.target.style.backgroundColor = '#0a0a0a';
                  e.target.style.color = '#00FFFF';
                  e.target.style.boxShadow = '0 0 30px #00FFFF';
                  e.target.style.textShadow = '0 0 10px #00FFFF';
                }
              }}
            >
              [[ CONTINUE ]]
            </button>
            {!canContinue && (
              <p style={{
                marginTop: '20px',
                fontSize: '14px',
                color: '#666',
                letterSpacing: '2px',
                fontWeight: '700',
                textTransform: 'uppercase'
              }}>
                {'>'} SELECT BOTH PLAYERS {'<'}
              </p>
            )}
          </div>
        )}
        
        {/* CPU Mode - Just select your character */}
        {isCPUMode && (
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontSize: '18px',
              color: '#00FFFF',
              letterSpacing: '3px',
              fontWeight: '700',
              textTransform: 'uppercase',
              textShadow: '0 0 15px #00FFFF',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              {'>'} SELECT YOUR WARRIOR {'<'}
            </p>
          </div>
        )}
      </div>

      {/* Cyberpunk scanline effect */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '100vh',
        background: 'linear-gradient(transparent 50%, rgba(0, 255, 255, 0.03) 50%)',
        backgroundSize: '100% 4px',
        pointerEvents: 'none',
        zIndex: 1000,
        animation: 'scanline 8s linear infinite'
      }} />
    </div>
  );
};

export default CharacterSelect;
