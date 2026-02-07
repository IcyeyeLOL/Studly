import React from 'react';

const MatchEndOverlay = ({ winner, p1Rounds, p2Rounds, onRematch, onCharacterSelect }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(18, 18, 18, 0.95)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      fontFamily: 'Inter, Helvetica, sans-serif',
      animation: 'fadeIn 0.5s ease-out'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '60px',
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        border: '1px solid #334155',
        minWidth: '500px'
      }}>
        <div style={{
          fontSize: '56px',
          fontWeight: '700',
          color: '#f8f8f8',
          marginBottom: '20px'
        }}>
          {winner} Wins! {'\u{1F3C6}'}
        </div>
        
        <div style={{
          fontSize: '28px',
          color: '#94a3b8',
          marginBottom: '40px'
        }}>
          Final Score: {p1Rounds} - {p2Rounds}
        </div>

        <div style={{
          display: 'flex',
          gap: '20px',
          justifyContent: 'center'
        }}>
          <button
            onClick={onRematch}
            style={{
              padding: '18px 40px',
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
            Rematch
          </button>
          
          <button
            onClick={onCharacterSelect}
            style={{
              padding: '18px 40px',
              fontSize: '18px',
              fontWeight: '600',
              backgroundColor: '#1a1a1a',
              color: '#f8f8f8',
              border: '1px solid #334155',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.target.style.backgroundColor = '#252525';
              e.target.style.borderColor = '#475569';
            }}
            onMouseLeave={e => {
              e.target.style.backgroundColor = '#1a1a1a';
              e.target.style.borderColor = '#334155';
            }}
          >
            Character Select
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchEndOverlay;
