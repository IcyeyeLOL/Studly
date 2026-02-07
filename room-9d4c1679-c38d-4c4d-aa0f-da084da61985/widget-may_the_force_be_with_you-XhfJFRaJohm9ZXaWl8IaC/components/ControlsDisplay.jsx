import React from 'react';

const ControlsDisplay = ({ player, side }) => {
  const isP1 = player === 'p1';
  
  const KeyButton = ({ children, color }) => (
    <div style={{
      display: 'inline-block',
      padding: '6px 10px',
      backgroundColor: '#0a0a0a',
      border: `2px solid ${color}`,
      borderRadius: '0',
      fontSize: '12px',
      fontWeight: '900',
      color: color,
      margin: '2px',
      minWidth: '32px',
      textAlign: 'center',
      boxShadow: `0 0 10px ${color}`,
      textShadow: `0 0 5px ${color}`,
      fontFamily: '"Orbitron", sans-serif',
      clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)'
    }}>
      {children}
    </div>
  );

  const controls = isP1 ? {
    move: ['W', 'A', 'D'],
    block: 'S',
    attack: 'F',
    force: 'G',
    color: '#00FFFF'
  } : {
    move: ['↑', '←', '→'],
    block: '↓',
    attack: 'K',
    force: 'L',
    color: '#39FF14'
  };

  return (
    <div style={{
      position: 'fixed',
      [side]: '20px',
      bottom: '20px',
      backgroundColor: 'rgba(10, 10, 10, 0.95)',
      border: `2px solid ${controls.color}`,
      borderRadius: '0',
      padding: '16px',
      minWidth: '180px',
      boxShadow: `0 0 30px ${controls.color}, inset 0 0 20px rgba(0, 0, 0, 0.8)`,
      fontFamily: '"Rajdhani", sans-serif',
      clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.02) 2px, rgba(255, 255, 255, 0.02) 4px)',
      zIndex: 5,
      pointerEvents: 'none'
    }}>
      {/* Header */}
      <div style={{
        fontSize: '14px',
        fontWeight: '900',
        color: controls.color,
        marginBottom: '12px',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        textShadow: `0 0 10px ${controls.color}`,
        fontFamily: '"Orbitron", sans-serif',
        textAlign: side === 'left' ? 'left' : 'right'
      }}>
        {isP1 ? '[[ P1 ]]' : '[[ P2 ]]'}
      </div>

      {/* Controls */}
      <div style={{
        fontSize: '11px',
        color: controls.color,
        lineHeight: '1.8',
        fontWeight: '700'
      }}>
        <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: side === 'left' ? 'flex-start' : 'flex-end', gap: '6px' }}>
          {controls.move.map((key, idx) => <KeyButton key={idx} color={controls.color}>{key}</KeyButton>)}
          <span style={{ marginLeft: '4px' }}>MOVE</span>
        </div>
        <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: side === 'left' ? 'flex-start' : 'flex-end', gap: '6px' }}>
          <KeyButton color={controls.color}>{controls.block}</KeyButton>
          <span style={{ marginLeft: '4px' }}>BLOCK</span>
        </div>
        <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: side === 'left' ? 'flex-start' : 'flex-end', gap: '6px' }}>
          <KeyButton color={controls.color}>{controls.attack}</KeyButton>
          <span style={{ marginLeft: '4px' }}>ATTACK</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: side === 'left' ? 'flex-start' : 'flex-end', gap: '6px' }}>
          <KeyButton color='#FF1493'>{controls.force}</KeyButton>
          <span style={{ marginLeft: '4px', color: '#FF1493', textShadow: '0 0 8px #FF1493' }}>FORCE</span>
        </div>
      </div>
    </div>
  );
};

export default ControlsDisplay;
