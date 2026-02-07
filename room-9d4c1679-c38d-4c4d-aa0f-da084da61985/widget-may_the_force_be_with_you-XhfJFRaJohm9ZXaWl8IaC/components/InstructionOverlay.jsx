import React, { useEffect, useState } from 'react';
import { CONTROLS } from '../utils/config';

const InstructionOverlay = ({ onDismiss, autoDismissTime = 30000 }) => {
  const [timeLeft, setTimeLeft] = useState(Math.ceil(autoDismissTime / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const handleSpace = (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleSpace);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleSpace);
    };
  }, [onDismiss, autoDismissTime]);

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
      color: '#f8f8f8'
    }}>
      <div style={{
        maxWidth: '800px',
        backgroundColor: '#1e293b',
        padding: '50px',
        borderRadius: '12px',
        border: '1px solid #334155'
      }}>
        <h1 style={{
          fontSize: '42px',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '40px',
          color: '#f8f8f8'
        }}>
          How to Play
        </h1>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '40px',
          marginBottom: '40px'
        }}>
          {/* Player 1 Controls */}
          <div>
            <h2 style={{
              fontSize: '22px',
              fontWeight: '600',
              marginBottom: '20px',
              color: '#60a5fa'
            }}>
              Player 1
            </h2>
            <div style={{ fontSize: '15px', lineHeight: '2', color: '#cbd5e1' }}>
              <div><strong style={{ color: '#f8f8f8' }}>W</strong> - Jump</div>
              <div><strong style={{ color: '#f8f8f8' }}>A</strong> - Move Left</div>
              <div><strong style={{ color: '#f8f8f8' }}>D</strong> - Move Right</div>
              <div><strong style={{ color: '#f8f8f8' }}>S</strong> - Crouch / Block</div>
              <div><strong style={{ color: '#f8f8f8' }}>F</strong> - Punch (8 dmg)</div>
              <div><strong style={{ color: '#f8f8f8' }}>G</strong> - Kick (12 dmg)</div>
            </div>
          </div>

          {/* Player 2 Controls */}
          <div>
            <h2 style={{
              fontSize: '22px',
              fontWeight: '600',
              marginBottom: '20px',
              color: '#f87171'
            }}>
              Player 2
            </h2>
            <div style={{ fontSize: '15px', lineHeight: '2', color: '#cbd5e1' }}>
              <div><strong style={{ color: '#f8f8f8' }}>{'\u{2191}'}</strong> - Jump</div>
              <div><strong style={{ color: '#f8f8f8' }}>{'\u{2190}'}</strong> - Move Left</div>
              <div><strong style={{ color: '#f8f8f8' }}>{'\u{2192}'}</strong> - Move Right</div>
              <div><strong style={{ color: '#f8f8f8' }}>{'\u{2193}'}</strong> - Crouch / Block</div>
              <div><strong style={{ color: '#f8f8f8' }}>K</strong> - Punch (8 dmg)</div>
              <div><strong style={{ color: '#f8f8f8' }}>L</strong> - Kick (12 dmg)</div>
            </div>
          </div>
        </div>

        {/* Game Rules */}
        <div style={{
          padding: '25px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          marginBottom: '30px',
          border: '1px solid #2a2a2a'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '15px',
            color: '#f8f8f8'
          }}>
            Win Conditions
          </h3>
          <ul style={{
            fontSize: '15px',
            lineHeight: '1.8',
            color: '#cbd5e1',
            paddingLeft: '20px'
          }}>
            <li>Reduce opponent's health to zero to win the round</li>
            <li>Best of 3 rounds - first to win 2 rounds wins the match</li>
            <li>Each round lasts 60 seconds</li>
            <li>If time runs out, higher health wins</li>
            <li>Blocking (crouch) reduces damage by 60%</li>
            <li>Attacks have cooldowns - don't spam!</li>
          </ul>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          style={{
            width: '100%',
            padding: '18px',
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
          Got it! (Space)
        </button>

        <p style={{
          textAlign: 'center',
          marginTop: '15px',
          fontSize: '13px',
          color: '#94a3b8'
        }}>
          Auto-starting in {timeLeft} seconds...
        </p>
      </div>
    </div>
  );
};

export default InstructionOverlay;
