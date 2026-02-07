import React from 'react';

const RoundEndOverlay = ({ winner, isDraw }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(18, 18, 18, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 500,
      fontFamily: 'Inter, Helvetica, sans-serif',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '50px',
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        border: '1px solid #334155'
      }}>
        <div style={{
          fontSize: '48px',
          fontWeight: '700',
          color: '#f8f8f8',
          marginBottom: '15px'
        }}>
          {isDraw ? 'Draw!' : `${winner} Wins!`}
        </div>
        <div style={{
          fontSize: '18px',
          color: '#94a3b8'
        }}>
          Next round starting...
        </div>
      </div>
    </div>
  );
};

export default RoundEndOverlay;
