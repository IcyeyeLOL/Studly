import React, { useState } from 'react';

const AudioControls = ({ audioManager, isMuted, onToggleMute }) => {
  const [showControls, setShowControls] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.15);
  const [sfxVolume, setSfxVolume] = useState(0.3);

  const handleMusicVolumeChange = (e) => {
    const volume = parseFloat(e.target.value);
    setMusicVolume(volume);
    if (audioManager) {
      audioManager.setMusicVolume(volume);
    }
  };

  const handleSfxVolumeChange = (e) => {
    const volume = parseFloat(e.target.value);
    setSfxVolume(volume);
    if (audioManager) {
      audioManager.setSFXVolume(volume);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '32px',
      right: '32px',
      zIndex: 1000,
      pointerEvents: 'auto'
    }}>
      {/* Main Toggle Button - CYBERPUNK */}
      <button
        onClick={() => setShowControls(!showControls)}
        style={{
          width: '50px',
          height: '50px',
          backgroundColor: '#0a0a0a',
          border: '2px solid #FF1493',
          borderRadius: '0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          transition: 'all 0.2s ease',
          boxShadow: '0 0 20px #FF1493, inset 0 0 10px rgba(0, 0, 0, 0.8)',
          marginLeft: 'auto',
          marginBottom: showControls ? '12px' : '0',
          clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
          filter: 'brightness(1.1)'
        }}
        onMouseEnter={e => {
          e.target.style.backgroundColor = '#FF1493';
          e.target.style.boxShadow = '0 0 30px #FF1493, inset 0 0 10px rgba(0, 0, 0, 0.5)';
          e.target.style.filter = 'brightness(1.3)';
        }}
        onMouseLeave={e => {
          e.target.style.backgroundColor = '#0a0a0a';
          e.target.style.boxShadow = '0 0 20px #FF1493, inset 0 0 10px rgba(0, 0, 0, 0.8)';
          e.target.style.filter = 'brightness(1.1)';
        }}
      >
        {'\u{1F3B5}'}
      </button>

      {/* Expanded Controls Panel - CYBERPUNK */}
      {showControls && (
        <div style={{
          backgroundColor: '#0a0a0a',
          border: '2px solid #00FFFF',
          borderRadius: '0',
          padding: '24px',
          minWidth: '240px',
          boxShadow: '0 0 40px #00FFFF, inset 0 0 20px rgba(0, 0, 0, 0.8)',
          fontFamily: '"Rajdhani", "Orbitron", sans-serif',
          clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.05) 2px, rgba(0, 255, 255, 0.05) 4px)'
        }}>
          {/* Mute Toggle */}
          <div style={{
            marginBottom: '24px',
            paddingBottom: '24px',
            borderBottom: '2px solid #1a1a1a'
          }}>
            <button
              onClick={onToggleMute}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#0a0a0a',
                border: isMuted ? '2px solid #FF1493' : '2px solid #39FF14',
                borderRadius: '0',
                color: isMuted ? '#FF1493' : '#39FF14',
                fontSize: '16px',
                fontWeight: '900',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: isMuted ? '0 0 20px #FF1493' : '0 0 20px #39FF14',
                textShadow: isMuted ? '0 0 10px #FF1493' : '0 0 10px #39FF14',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                fontFamily: '"Orbitron", sans-serif',
                clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)'
              }}
              onMouseEnter={e => {
                if (isMuted) {
                  e.target.style.backgroundColor = '#FF1493';
                  e.target.style.color = '#0a0a0a';
                  e.target.style.boxShadow = '0 0 30px #FF1493';
                } else {
                  e.target.style.backgroundColor = '#39FF14';
                  e.target.style.color = '#0a0a0a';
                  e.target.style.boxShadow = '0 0 30px #39FF14';
                }
                e.target.style.textShadow = 'none';
              }}
              onMouseLeave={e => {
                e.target.style.backgroundColor = '#0a0a0a';
                e.target.style.color = isMuted ? '#FF1493' : '#39FF14';
                e.target.style.boxShadow = isMuted ? '0 0 20px #FF1493' : '0 0 20px #39FF14';
                e.target.style.textShadow = isMuted ? '0 0 10px #FF1493' : '0 0 10px #39FF14';
              }}
            >
              <span style={{ fontSize: '20px' }}>
                {isMuted ? '\u{1F507}' : '\u{1F50A}'}
              </span>
              {isMuted ? '[MUTED]' : '[AUDIO ON]'}
            </button>
          </div>

          {/* Music Volume */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '900',
              color: '#00FFFF',
              marginBottom: '12px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              textShadow: '0 0 8px #00FFFF'
            }}>
              MUSIC: {Math.round(musicVolume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.05"
              value={musicVolume}
              onChange={handleMusicVolumeChange}
              disabled={isMuted}
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #00FFFF',
                borderRadius: '0',
                outline: 'none',
                opacity: isMuted ? 0.3 : 1,
                cursor: isMuted ? 'not-allowed' : 'pointer',
                boxShadow: '0 0 10px #00FFFF'
              }}
            />
          </div>

          {/* SFX Volume */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '900',
              color: '#FF1493',
              marginBottom: '12px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              textShadow: '0 0 8px #FF1493'
            }}>
              SFX: {Math.round(sfxVolume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={sfxVolume}
              onChange={handleSfxVolumeChange}
              disabled={isMuted}
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #FF1493',
                borderRadius: '0',
                outline: 'none',
                opacity: isMuted ? 0.3 : 1,
                cursor: isMuted ? 'not-allowed' : 'pointer',
                boxShadow: '0 0 10px #FF1493'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioControls;
