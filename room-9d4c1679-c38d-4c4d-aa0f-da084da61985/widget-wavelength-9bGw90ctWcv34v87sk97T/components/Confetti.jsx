import React, { useEffect, useState } from 'react';

function Confetti() {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate random confetti particles
    const newParticles = [];
    for (let i = 0; i < 50; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100, // Random horizontal position (%)
        delay: Math.random() * 0.3, // Random delay
        duration: 2 + Math.random() * 1, // Duration between 2-3s
        rotation: Math.random() * 360, // Random initial rotation
        color: [
          '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
          '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
        ][Math.floor(Math.random() * 8)],
        size: 8 + Math.random() * 6, // Size between 8-14px
      });
    }
    setParticles(newParticles);
  }, []);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      {particles.map((particle) => (
        <div
          key={particle.id}
          style={{
            position: 'absolute',
            left: `${particle.x}%`,
            top: '-20px',
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            borderRadius: '50%',
            animation: `confettiFall ${particle.duration}s ease-in forwards`,
            animationDelay: `${particle.delay}s`,
            transform: `rotate(${particle.rotation}deg)`,
            boxShadow: `0 0 10px ${particle.color}`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default Confetti;
