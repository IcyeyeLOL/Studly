import React, { useEffect, useState } from 'react';
import { CONTROLS } from '../utils/config';

const StartOverlay = ({ onComplete }) => {
  const [opacity, setOpacity] = useState(1);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Start fade out after 5 seconds (reduced from 10)
    const fadeTimer = setTimeout(() => {
      setOpacity(0);
    }, 5000);

    // Remove component after fade completes (reduced from 12 to 6)
    const removeTimer = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, 6000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [onComplete]);

  if (!visible) return null;

  const KeyPill = ({ children }) => (
    <span style={{
      display: 'inline-block',
      padding: '8px 14px',
      backgroundColor: '#0a0a0a',
      border: '2px solid #00FFFF',
      borderRadius: '0',
      fontSize: '14px',
      fontWeight: '900',
      color: '#00FFFF',
      margin: '0 4px',
      minWidth: '40px',
      textAlign: 'center',
      boxShadow: '0 0 15px #00FFFF, inset 0 0 10px rgba(0, 0, 0, 0.8)',
      textShadow: '0 0 8px #00FFFF',
      fontFamily: '"Orbitron", sans-serif',
      clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)'
    }}>
      {children}
    </span>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      padding: '32px',
      backgroundColor: 'rgba(10, 10, 10, 0.98)',
      borderBottom: '3px solid #FF1493',
      boxShadow: '0 0 30px #FF1493',
      zIndex: 100,
      pointerEvents: 'none',
      opacity: opacity,
      transition: 'opacity 2s ease-out',
      backdropFilter: 'blur(8px)',
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 20, 147, 0.05) 2px, rgba(255, 20, 147, 0.05) 4px)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: '80px',
        alignItems: 'start',
        fontFamily: '"Rajdhani", "Orbitron", sans-serif'
      }}>
        {/* Player 1 Controls */}
        <div style={{
          textAlign: 'left'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '900',
            color: '#00FFFF',
            marginBottom: '16px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            textShadow: '0 0 15px #00FFFF',
            fontFamily: '"Orbitron", sans-serif'
          }}>
            [[ P1 CONTROLS ]]
          </h3>
          <div style={{
            fontSize: '14px',
            color: '#00FFFF',
            lineHeight: '2.2',
            fontWeight: '700',
            letterSpacing: '1px'
          }}>
            <div style={{ marginBottom: '10px' }}>
              <KeyPill>W</KeyPill> {'>'} JUMP
            </div>
            <div style={{ marginBottom: '10px' }}>
              <KeyPill>A</KeyPill> <KeyPill>D</KeyPill> {'>'} MOVE
            </div>
            <div style={{ marginBottom: '10px' }}>
              <KeyPill>S</KeyPill> {'>'} BLOCK
            </div>
            <div style={{ marginBottom: '10px' }}>
              <KeyPill>F</KeyPill> ATTACK
            </div>
            <div style={{ marginBottom: '10px' }}>
              <KeyPill>G</KeyPill> <span style={{ color: '#39FF14', textShadow: '0 0 8px #39FF14' }}>FORCE FIELD</span>
            </div>
          </div>
        </div>

        {/* Center Title */}
        <div style={{
          textAlign: 'center',
          padding: '0 20px'
        }}>
          <div style={{
            fontSize: '28px',
            fontWeight: '900',
            color: '#FF1493',
            letterSpacing: '5px',
            marginBottom: '8px',
            textTransform: 'uppercase',
            textShadow: '0 0 25px #FF1493, 0 0 50px #FF1493',
            fontFamily: '"Orbitron", sans-serif'
          }}>
            STAR WARS
          </div>
          <div style={{
            fontSize: '14px',
            color: '#39FF14',
            letterSpacing: '3px',
            fontWeight: '700',
            textTransform: 'uppercase',
            textShadow: '0 0 10px #39FF14'
          }}>
            {'<'} CYBER DUEL {'>'}
          </div>
        </div>

        {/* Player 2 Controls */}
        <div style={{
          textAlign: 'right'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '900',
            color: '#39FF14',
            marginBottom: '16px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            textShadow: '0 0 15px #39FF14',
            fontFamily: '"Orbitron", sans-serif'
          }}>
            [[ P2 CONTROLS ]]
          </h3>
          <div style={{
            fontSize: '14px',
            color: '#39FF14',
            lineHeight: '2.2',
            fontWeight: '700',
            letterSpacing: '1px'
          }}>
            <div style={{ marginBottom: '10px' }}>
              JUMP {'<'} <KeyPill>↑</KeyPill>
            </div>
            <div style={{ marginBottom: '10px' }}>
              MOVE {'<'} <KeyPill>←</KeyPill> <KeyPill>→</KeyPill>
            </div>
            <div style={{ marginBottom: '10px' }}>
              BLOCK {'<'} <KeyPill>↓</KeyPill>
            </div>
            <div style={{ marginBottom: '10px' }}>
              ATTACK {'<'} <KeyPill>K</KeyPill>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <span style={{ color: '#00FFFF', textShadow: '0 0 8px #00FFFF' }}>FORCE FIELD</span> {'<'} <KeyPill>L</KeyPill>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartOverlay;
