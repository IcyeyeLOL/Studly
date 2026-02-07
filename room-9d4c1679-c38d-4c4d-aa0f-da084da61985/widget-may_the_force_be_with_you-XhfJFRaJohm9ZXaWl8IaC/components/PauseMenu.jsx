import React from 'react';

const PauseMenu = ({ onResume, onRestart, onCharacterSelect, isMuted, onToggleMute }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(18, 18, 18, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      fontFamily: 'Inter, Helvetica, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        padding: '50px',
        borderRadius: '12px',
        border: '1px solid #334155',
        minWidth: '400px'
      }}>
        <h2 style={{
          fontSize: '36px',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '40px',
          color: '#f8f8f8'
        }}>
          Paused
        </h2>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
          <button
            onClick={onResume}
            style={{
              padding: '15px',
              fontSize: '18px',
              fontWeight: '600',
              backgroundColor: '#60a5fa',
              color: '#121212',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => e.target.style.backgroundColor = '#3b82f6'}
            onMouseLeave={e => e.target.style.backgroundColor = '#60a5fa'}
          >
            Resume (ESC)
          </button>

          <button
            onClick={onToggleMute}
            style={{
              padding: '15px',
              fontSize: '16px',
              fontWeight: '500',
              backgroundColor: '#1a1a1a',
              color: '#f8f8f8',
              border: '1px solid #334155',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.target.style.backgroundColor = '#252525'}
            onMouseLeave={e => e.target.style.backgroundColor = '#1a1a1a'}
          >
            {isMuted ? 'Unmute' : 'Mute'} Audio
          </button>

          <button
            onClick={onRestart}
            style={{
              padding: '15px',
              fontSize: '16px',
              fontWeight: '500',
              backgroundColor: '#1a1a1a',
              color: '#f8f8f8',
              border: '1px solid #334155',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.target.style.backgroundColor = '#252525'}
            onMouseLeave={e => e.target.style.backgroundColor = '#1a1a1a'}
          >
            Restart Match
          </button>

          <button
            onClick={onCharacterSelect}
            style={{
              padding: '15px',
              fontSize: '16px',
              fontWeight: '500',
              backgroundColor: '#1a1a1a',
              color: '#f8f8f8',
              border: '1px solid #334155',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.target.style.backgroundColor = '#252525'}
            onMouseLeave={e => e.target.style.backgroundColor = '#1a1a1a'}
          >
            Character Select
          </button>
        </div>
      </div>
    </div>
  );
};

export default PauseMenu;
