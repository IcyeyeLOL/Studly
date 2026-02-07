import React, { useState } from 'react';
import { STAGES } from '../utils/config';

const StageSelect = ({ onSelectStage, selectedCharacters, playSound }) => {
  const [selectedStage, setSelectedStage] = useState(null);
  const [hoveredStage, setHoveredStage] = useState(null);

  const handleStageClick = (stage) => {
    setSelectedStage(stage.id);
    if (playSound) playSound('select');
  };

  const handleStart = () => {
    if (selectedStage) {
      const stage = STAGES.find(s => s.id === selectedStage);
      if (playSound) playSound('roundStart');
      onSelectStage(stage);
    }
  };

  // Stage icon patterns - CYBERPUNK
  const getStageIcon = (stageId) => {
    const icons = {
      'death-star': '\u{2B50}',      // Death Star
      'mustafar': '\u{1F525}',       // Mustafar (fire)
      'endor': '\u{1F333}'          // Endor (tree)
    };
    return icons[stageId] || '\u{2B50}';
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#0a0a0a',
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 20, 147, 0.03) 2px, rgba(255, 20, 147, 0.03) 4px)',
      padding: '80px 60px',
      color: '#FF1493',
      fontFamily: '"Rajdhani", "Orbitron", sans-serif',
      position: 'absolute',
      top: 0,
      left: 0,
      boxSizing: 'border-box',
      overflowY: 'auto'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Title */}
        <div style={{
          textAlign: 'center',
          marginBottom: '50px'
        }}>
          <h1 style={{
            fontSize: '64px',
            fontWeight: '900',
            marginBottom: '16px',
            color: '#FF1493',
            letterSpacing: '8px',
            textTransform: 'uppercase',
            textShadow: '0 0 30px #FF1493, 0 0 60px #FF1493',
            fontFamily: '"Orbitron", sans-serif'
          }}>
            [[ BATTLEGROUND ]]
          </h1>
          <div style={{
            fontSize: '18px',
            color: '#00FFFF',
            letterSpacing: '3px',
            fontWeight: '700',
            textTransform: 'uppercase',
            textShadow: '0 0 10px #00FFFF'
          }}>
            {'>'} {selectedCharacters.p1.name} VS {selectedCharacters.p2.name} {'<'}
          </div>
        </div>

        {/* Stage Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
          marginBottom: '50px'
        }}>
          {STAGES.map(stage => {
            const isSelected = selectedStage === stage.id;
            const isHovered = hoveredStage === stage.id;

            return (
              <button
                key={stage.id}
                onClick={() => handleStageClick(stage)}
                onMouseEnter={() => setHoveredStage(stage.id)}
                onMouseLeave={() => setHoveredStage(null)}
                style={{
                  padding: 0,
                  backgroundColor: '#0a0a0a',
                  border: isSelected 
                    ? `3px solid ${stage.neonColor}` 
                    : '2px solid #1a1a1a',
                  borderRadius: '0',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: isSelected 
                    ? `0 0 40px ${stage.neonColor}, inset 0 0 20px rgba(0, 0, 0, 0.8)`
                    : isHovered
                    ? `0 0 20px ${stage.neonColor}40`
                    : '0 0 10px rgba(0, 0, 0, 0.8)',
                  position: 'relative',
                  clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
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
                
                {/* Background Preview */}
                <div style={{
                  height: '200px',
                  background: stage.gradient,
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                  borderBottom: `2px solid ${stage.neonColor}`
                }}>
                  {/* Stage Icon with neon glow */}
                  <div style={{
                    fontSize: '80px',
                    filter: `drop-shadow(0 0 30px ${stage.neonColor})`,
                    textShadow: `0 0 40px ${stage.neonColor}`,
                    position: 'relative',
                    zIndex: 1
                  }}>
                    {getStageIcon(stage.id)}
                  </div>
                </div>

                {/* Info */}
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  backgroundColor: '#0a0a0a',
                  borderTop: `1px solid ${isSelected ? stage.neonColor : '#1a1a1a'}`
                }}>
                  <div style={{
                    fontSize: '22px',
                    fontWeight: '900',
                    color: stage.neonColor,
                    marginBottom: '8px',
                    letterSpacing: '3px',
                    textTransform: 'uppercase',
                    textShadow: `0 0 15px ${stage.neonColor}`,
                    fontFamily: '"Orbitron", sans-serif'
                  }}>
                    {stage.name}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#666',
                    lineHeight: '1.5',
                    fontWeight: '700',
                    letterSpacing: '1px',
                    textTransform: 'uppercase'
                  }}>
                    {stage.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Start Button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleStart}
            disabled={!selectedStage}
            style={{
              padding: '24px 80px',
              fontSize: '22px',
              fontWeight: '900',
              backgroundColor: '#0a0a0a',
              color: selectedStage ? '#39FF14' : '#333',
              border: selectedStage ? '3px solid #39FF14' : '2px solid #333',
              borderRadius: '0',
              cursor: selectedStage ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              letterSpacing: '5px',
              textTransform: 'uppercase',
              boxShadow: selectedStage 
                ? '0 0 40px #39FF14'
                : 'none',
              opacity: selectedStage ? 1 : 0.3,
              textShadow: selectedStage ? '0 0 15px #39FF14' : 'none',
              fontFamily: '"Orbitron", sans-serif',
              clipPath: 'polygon(25px 0, 100% 0, 100% calc(100% - 25px), calc(100% - 25px) 100%, 0 100%, 0 25px)'
            }}
            onMouseEnter={e => {
              if (selectedStage) {
                e.target.style.backgroundColor = '#39FF14';
                e.target.style.color = '#0a0a0a';
                e.target.style.boxShadow = '0 0 60px #39FF14';
                e.target.style.textShadow = 'none';
              }
            }}
            onMouseLeave={e => {
              if (selectedStage) {
                e.target.style.backgroundColor = '#0a0a0a';
                e.target.style.color = '#39FF14';
                e.target.style.boxShadow = '0 0 40px #39FF14';
                e.target.style.textShadow = '0 0 15px #39FF14';
              }
            }}
          >
            [[ START DUEL ]]
          </button>
          {!selectedStage && (
            <p style={{
              marginTop: '20px',
              fontSize: '14px',
              color: '#666',
              letterSpacing: '2px',
              fontWeight: '700',
              textTransform: 'uppercase'
            }}>
              {'>'} SELECT ARENA {'<'}
            </p>
          )}
        </div>
      </div>
      
      {/* Cyberpunk scanline effect */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '100vh',
        background: 'linear-gradient(transparent 50%, rgba(255, 20, 147, 0.03) 50%)',
        backgroundSize: '100% 4px',
        pointerEvents: 'none',
        zIndex: 1000,
        animation: 'scanline 8s linear infinite'
      }} />
    </div>
  );
};

export default StageSelect;
