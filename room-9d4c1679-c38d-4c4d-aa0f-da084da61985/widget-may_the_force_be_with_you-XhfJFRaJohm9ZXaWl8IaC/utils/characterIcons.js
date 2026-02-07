// SVG character icons - embedded for reliability
import React from 'react';

export const CharacterIcon = ({ char, size = 140 }) => {
  const renderIcon = () => {
    switch (char.id) {
      case 'wraith':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="35" r="15" fill={char.color} opacity="0.3"/>
            <path d="M35 45 L35 75 L40 75 L40 50 L50 50 L50 75 L55 75 L55 50 L60 50 L60 75 L65 75 L65 45 Z" fill={char.color} opacity="0.5"/>
            <path d="M50 35 L45 50 L40 40 M50 35 L55 50 L60 40" stroke={char.accentColor} strokeWidth="2" strokeLinecap="round"/>
            <circle cx="50" cy="35" r="15" stroke={char.accentColor} strokeWidth="2" fill="none"/>
            <path d="M38 50 L30 60 M62 50 L70 60" stroke={char.accentColor} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      case 'nova':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="30" fill={char.color} opacity="0.2"/>
            <circle cx="50" cy="35" r="12" fill={char.color} opacity="0.4"/>
            <rect x="43" y="45" width="14" height="30" fill={char.color} opacity="0.5"/>
            <path d="M50 30 L50 20 M50 30 L42 25 M50 30 L58 25" stroke={char.accentColor} strokeWidth="2" strokeLinecap="round"/>
            <circle cx="50" cy="35" r="12" stroke={char.accentColor} strokeWidth="2" fill="none"/>
            <path d="M35 55 L28 65 M65 55 L72 65" stroke={char.accentColor} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      case 'ronin':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="32" r="13" fill={char.color} opacity="0.4"/>
            <rect x="42" y="43" width="16" height="32" fill={char.color} opacity="0.5"/>
            <path d="M50 32 L65 28 L68 32" stroke={char.accentColor} strokeWidth="2" strokeLinecap="round"/>
            <circle cx="50" cy="32" r="13" stroke={char.accentColor} strokeWidth="2" fill="none"/>
            <line x1="42" y1="50" x2="30" y2="55" stroke={char.accentColor} strokeWidth="2" strokeLinecap="round"/>
            <line x1="58" y1="50" x2="75" y2="40" stroke={char.accentColor} strokeWidth="3" strokeLinecap="round"/>
          </svg>
        );
      case 'viper':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="35" r="14" fill={char.color} opacity="0.3"/>
            <path d="M40 48 Q45 55 50 48 Q55 55 60 48 L58 75 L42 75 Z" fill={char.color} opacity="0.5"/>
            <circle cx="50" cy="35" r="14" stroke={char.accentColor} strokeWidth="2" fill="none"/>
            <path d="M44 33 L46 35 M54 33 L56 35" stroke={char.accentColor} strokeWidth="2" strokeLinecap="round"/>
            <path d="M35 50 L25 58 M65 50 L75 58" stroke={char.accentColor} strokeWidth="2" strokeLinecap="round"/>
            <path d="M48 40 L52 40" stroke={char.color} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      case 'shade':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="34" r="14" fill={char.color} opacity="0.4"/>
            <rect x="41" y="46" width="18" height="29" fill={char.color} opacity="0.5"/>
            <path d="M30 40 L40 45 M70 40 L60 45" stroke={char.accentColor} strokeWidth="2" strokeLinecap="round"/>
            <circle cx="50" cy="34" r="14" stroke={char.accentColor} strokeWidth="2" fill="none"/>
            <path d="M41 55 L32 62 M59 55 L68 62" stroke={char.accentColor} strokeWidth="2" strokeLinecap="round"/>
            <circle cx="45" cy="32" r="2" fill={char.accentColor}/>
            <circle cx="55" cy="32" r="2" fill={char.accentColor}/>
          </svg>
        );
      case 'tempest':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="36" r="15" fill={char.color} opacity="0.3"/>
            <rect x="40" y="49" width="20" height="26" fill={char.color} opacity="0.5"/>
            <path d="M45 25 L50 30 L55 25" stroke={char.accentColor} strokeWidth="2" strokeLinecap="round"/>
            <circle cx="50" cy="36" r="15" stroke={char.accentColor} strokeWidth="2" fill="none"/>
            <path d="M38 52 L28 58 L25 65" stroke={char.accentColor} strokeWidth="2" strokeLinecap="round"/>
            <path d="M62 52 L72 58 L75 65" stroke={char.accentColor} strokeWidth="2" strokeLinecap="round"/>
            <path d="M45 60 L50 55 L55 60" stroke={char.accentColor} strokeWidth="1.5"/>
          </svg>
        );
      default:
        return (
          <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="35" r="15" fill={char.color} opacity="0.3"/>
            <rect x="40" y="48" width="20" height="27" fill={char.color} opacity="0.5"/>
            <circle cx="50" cy="35" r="15" stroke={char.accentColor} strokeWidth="2" fill="none"/>
          </svg>
        );
    }
  };

  return renderIcon();
};
