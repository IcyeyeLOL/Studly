import React from 'react';

const ControlsReminder = () => {
  return (
    <div style={{
      position: 'fixed',
      top: '120px',
      right: '20px',
      backgroundColor: '#1e293b',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '11px',
      color: '#cbd5e1',
      border: '1px solid #334155',
      zIndex: 50,
      fontFamily: 'Inter, Helvetica, sans-serif',
      minWidth: '160px'
    }}>
      <div style={{
        fontWeight: '600',
        marginBottom: '6px',
        color: '#f8f8f8',
        fontSize: '12px'
      }}>
        Controls
      </div>
      <div style={{ lineHeight: '1.5' }}>
        <div style={{ marginBottom: '4px' }}>
          <span style={{ color: '#60a5fa' }}>P1:</span> WASD + FG
        </div>
        <div>
          <span style={{ color: '#f87171' }}>P2:</span> Arrows + KL
        </div>
      </div>
      <div style={{
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: '1px solid #334155',
        fontSize: '10px',
        color: '#94a3b8'
      }}>
        ESC to pause
      </div>
    </div>
  );
};

export default ControlsReminder;
