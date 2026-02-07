import React from 'react';

const LoadingScreen = ({ progress, total }) => {
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#121212',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, Helvetica, sans-serif',
      color: '#f8f8f8'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: '700',
          marginBottom: '30px',
          color: '#f8f8f8'
        }}>
          Fighter Arena
        </h1>
        
        <div style={{
          width: '300px',
          height: '8px',
          backgroundColor: '#1a1a1a',
          borderRadius: '4px',
          overflow: 'hidden',
          margin: '0 auto 20px',
          border: '1px solid #2a2a2a'
        }}>
          <div style={{
            height: '100%',
            width: `${percentage}%`,
            backgroundColor: '#60a5fa',
            transition: 'width 0.3s'
          }} />
        </div>
        
        <div style={{
          fontSize: '16px',
          color: '#94a3b8'
        }}>
          Loading assets... {percentage}%
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
