import React from 'react';

const PauseModal = ({ onResume, onExit }) => {
  return (
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
      animation: 'fadeIn 0.3s ease-out',
      pointerEvents: 'auto'
    }}>
      <div style={{
        backgroundColor: '#0a0a0a',
        padding: '60px 80px',
        borderRadius: '0',
        textAlign: 'center',
        border: '3px solid #00FFFF',
        boxShadow: '0 0 60px #00FFFF, inset 0 0 30px rgba(0, 0, 0, 0.8)',
        clipPath: 'polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px)',
        position: 'relative',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.05) 2px, rgba(0, 255, 255, 0.05) 4px)'
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
          zIndex: 1,
          animation: 'glitch 3s infinite'
        }} />
        
        <div style={{
          fontSize: '72px',
          fontWeight: '900',
          marginBottom: '40px',
          color: '#00FFFF',
          letterSpacing: '8px',
          textTransform: 'uppercase',
          textShadow: '0 0 40px #00FFFF, 0 0 80px #00FFFF',
          fontFamily: '"Orbitron", sans-serif',
          position: 'relative',
          zIndex: 2
        }}>
          [[ PAUSED ]]
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          position: 'relative',
          zIndex: 2
        }}>
          {/* Resume Button */}
          <button
            onClick={onResume}
            style={{
              padding: '20px 60px',
              fontSize: '20px',
              fontWeight: '900',
              backgroundColor: '#0a0a0a',
              color: '#39FF14',
              border: '3px solid #39FF14',
              borderRadius: '0',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              boxShadow: '0 0 25px #39FF14',
              textShadow: '0 0 10px #39FF14',
              fontFamily: '"Orbitron", sans-serif',
              clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)'
            }}
            onMouseEnter={e => {
              e.target.style.backgroundColor = '#39FF14';
              e.target.style.color = '#0a0a0a';
              e.target.style.boxShadow = '0 0 40px #39FF14';
              e.target.style.textShadow = 'none';
            }}
            onMouseLeave={e => {
              e.target.style.backgroundColor = '#0a0a0a';
              e.target.style.color = '#39FF14';
              e.target.style.boxShadow = '0 0 25px #39FF14';
              e.target.style.textShadow = '0 0 10px #39FF14';
            }}
          >
            [[ RESUME ]]
          </button>

          {/* Exit Button */}
          <button
            onClick={onExit}
            style={{
              padding: '20px 60px',
              fontSize: '20px',
              fontWeight: '900',
              backgroundColor: '#0a0a0a',
              color: '#FF1493',
              border: '3px solid #FF1493',
              borderRadius: '0',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              boxShadow: '0 0 25px #FF1493',
              textShadow: '0 0 10px #FF1493',
              fontFamily: '"Orbitron", sans-serif',
              clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)'
            }}
            onMouseEnter={e => {
              e.target.style.backgroundColor = '#FF1493';
              e.target.style.color = '#0a0a0a';
              e.target.style.boxShadow = '0 0 40px #FF1493';
              e.target.style.textShadow = 'none';
            }}
            onMouseLeave={e => {
              e.target.style.backgroundColor = '#0a0a0a';
              e.target.style.color = '#FF1493';
              e.target.style.boxShadow = '0 0 25px #FF1493';
              e.target.style.textShadow = '0 0 10px #FF1493';
            }}
          >
            [[ EXIT TO MENU ]]
          </button>
        </div>

        {/* Hint text */}
        <div style={{
          marginTop: '30px',
          fontSize: '14px',
          color: '#666',
          letterSpacing: '2px',
          fontWeight: '700',
          textTransform: 'uppercase',
          position: 'relative',
          zIndex: 2
        }}>
          {'>'} PRESS ESC TO RESUME {'<'}
        </div>
      </div>
    </div>
  );
};

export default PauseModal;
