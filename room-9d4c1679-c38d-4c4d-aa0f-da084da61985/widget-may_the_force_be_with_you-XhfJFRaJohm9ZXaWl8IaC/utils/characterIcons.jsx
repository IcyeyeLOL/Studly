// Character icons - displays uploaded character images
import React from 'react';

export const CharacterIcon = ({ char, size = 140 }) => {
  if (!char.imageUrl) {
    // Fallback if no image
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="35" r="15" fill={char.color} opacity="0.3"/>
        <rect x="40" y="48" width="20" height="27" fill={char.color} opacity="0.5"/>
        <circle cx="50" cy="35" r="15" stroke={char.accentColor} strokeWidth="2" fill="none"/>
      </svg>
    );
  }

  return (
    <img 
      src={char.imageUrl}
      alt={char.name}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        objectPosition: 'center'
      }}
      crossOrigin="anonymous"
    />
  );
};
