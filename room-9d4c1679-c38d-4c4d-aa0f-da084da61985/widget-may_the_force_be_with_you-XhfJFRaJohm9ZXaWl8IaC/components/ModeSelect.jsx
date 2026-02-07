import React, { useState } from 'react';

const ModeSelect = ({ onSelectMode, playSound }) => {
  const [hoveredMode, setHoveredMode] = useState(null);

  const handleModeSelect = (mode) => {
    if (playSound) playSound('punch');
    onSelectMode(mode);
  };

  return (
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
      left: 0,
      fontFamily: '"Rajdhani", "Orbitron", sans-serif'
    }}>
      {/* Cyberpunk grid overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0, 255, 255, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 255, 255, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        pointerEvents: 'none',
        zIndex: 1,
        opacity: 0.3
      }} />

      <div style={{
        textAlign: 'center',
        position: 'relative',
        zIndex: 2,
        padding: '60px'
      }}>
        {/* Title */}
        <div style={{
          fontSize: '72px',
          fontWeight: '900',
          color: '#FF1493',
          letterSpacing: '12px',
          marginBottom: '20px',
          textTransform: 'uppercase',
          textShadow: '0 0 40px #FF1493, 0 0 80px #FF1493',
          fontFamily: '"Orbitron", sans-serif',
          animation: 'glitch 2s infinite'
        }}>
          SELECT MODE
        </div>

        <div style={{
          fontSize: '20px',
          color: '#39FF14',
          letterSpacing: '4px',
          marginBottom: '80px',
          fontWeight: '700',
          textTransform: 'uppercase',
          textShadow: '0 0 15px #39FF14'
        }}>
          {'<'} CHOOSE YOUR OPPONENT {'>'}
        </div>

        {/* Mode Selection Buttons */}
        <div style={{
          display: 'flex',
          gap: '60px',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {/* 2 Player Mode */}
          <button
            onClick={() => handleModeSelect('2player')}
            onMouseEnter={() => {
              setHoveredMode('2player');
              if (playSound) playSound('whoosh');
            }}
            onMouseLeave={() => setHoveredMode(null)}
            style={{
              padding: '50px 70px',
              fontSize: '32px',
              fontWeight: '900',
              backgroundColor: hoveredMode === '2player' ? '#00FFFF' : '#0a0a0a',
              color: hoveredMode === '2player' ? '#0a0a0a' : '#00FFFF',
              border: '4px solid #00FFFF',
              borderRadius: '0',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              letterSpacing: '4px',
              textTransform: 'uppercase',
              boxShadow: hoveredMode === '2player' 
                ? '0 0 60px #00FFFF, inset 0 0 30px rgba(0, 255, 255, 0.3)' 
                : '0 0 30px #00FFFF, inset 0 0 20px rgba(0, 0, 0, 0.8)',
              clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)',
              position: 'relative',
              transform: hoveredMode === '2player' ? 'scale(1.05) translateY(-5px)' : 'scale(1)',
              textShadow: hoveredMode === '2player' ? 'none' : '0 0 20px #00FFFF',
              fontFamily: '"Orbitron", sans-serif',
              width: '320px',
              height: '200px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '15px'
            }}
          >
            <div style={{ fontSize: '48px', lineHeight: '1' }}>👥</div>
            <div>2 PLAYER</div>
            <div style={{
              fontSize: '14px',
              letterSpacing: '2px',
              opacity: 0.8,
              fontWeight: '600'
            }}>
              LOCAL VS
            </div>
          </button>

          {/* VS Divider */}
          <div style={{
            fontSize: '48px',
            fontWeight: '900',
            color: '#FF1493',
            textShadow: '0 0 30px #FF1493',
            letterSpacing: '8px',
            fontFamily: '"Orbitron", sans-serif'
          }}>
            VS
          </div>

          {/* CPU Mode */}
          <button
            onClick={() => handleModeSelect('cpu')}
            onMouseEnter={() => {
              setHoveredMode('cpu');
              if (playSound) playSound('whoosh');
            }}
            onMouseLeave={() => setHoveredMode(null)}
            style={{
              padding: '50px 70px',
              fontSize: '32px',
              fontWeight: '900',
              backgroundColor: hoveredMode === 'cpu' ? '#39FF14' : '#0a0a0a',
              color: hoveredMode === 'cpu' ? '#0a0a0a' : '#39FF14',
              border: '4px solid #39FF14',
              borderRadius: '0',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              letterSpacing: '4px',
              textTransform: 'uppercase',
              boxShadow: hoveredMode === 'cpu' 
                ? '0 0 60px #39FF14, inset 0 0 30px rgba(57, 255, 20, 0.3)' 
                : '0 0 30px #39FF14, inset 0 0 20px rgba(0, 0, 0, 0.8)',
              clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)',
              position: 'relative',
              transform: hoveredMode === 'cpu' ? 'scale(1.05) translateY(-5px)' : 'scale(1)',
              textShadow: hoveredMode === 'cpu' ? 'none' : '0 0 20px #39FF14',
              fontFamily: '"Orbitron", sans-serif',
              width: '320px',
              height: '200px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '15px'
            }}
          >
            <div style={{ fontSize: '48px', lineHeight: '1' }}>🤖</div>
            <div>CPU</div>
            <div style={{
              fontSize: '14px',
              letterSpacing: '2px',
              opacity: 0.8,
              fontWeight: '600'
            }}>
              AI OPPONENT
            </div>
          </button>
        </div>

        {/* Hint text */}
        <div style={{
          marginTop: '80px',
          fontSize: '14px',
          color: '#00FFFF',
          letterSpacing: '2px',
          fontWeight: '600',
          textShadow: '0 0 10px #00FFFF',
          opacity: 0.7
        }}>
          [[ SELECT YOUR BATTLE MODE ]]
        </div>
      </div>
    </div>
  );
};

export default ModeSelect;
