import React, { useRef, useEffect, useState } from 'react';

function Spectrum({ targetPosition, showTarget, guessPosition, onGuessChange, phase }) {
  const svgRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Convert 0-100 position to angle (0 to 180 degrees, where 0 is left, 90 is up, 180 is right)
  const positionToAngle = (pos) => pos * 1.8;
  
  const targetAngle = positionToAngle(targetPosition);
  const guessAngle = positionToAngle(guessPosition);

  const handleInteraction = (clientX, clientY) => {
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Convert to SVG coordinates
    const svgX = (x / rect.width) * 200;
    const svgY = (y / rect.height) * 100;
    
    // Calculate angle from bottom center (100, 90)
    const dx = svgX - 100;
    const dy = 90 - svgY;
    
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Constrain to upper semicircle (0 to 180 degrees)
    angle = Math.max(0, Math.min(180, angle));
    
    // Convert angle to position (0-100)
    const position = angle / 1.8;
    onGuessChange(Math.round(position * 100) / 100);
  };

  const handleMouseDown = (e) => {
    if (phase === 'guess') {
      setIsDragging(true);
      handleInteraction(e.clientX, e.clientY);
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && phase === 'guess') {
      handleInteraction(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (phase === 'guess') {
      setIsDragging(true);
      const touch = e.touches[0];
      handleInteraction(touch.clientX, touch.clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (isDragging && phase === 'guess') {
      e.preventDefault();
      const touch = e.touches[0];
      handleInteraction(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, phase]);

  // Calculate positions on the arc
  const getArcPoint = (angle, radius = 80) => {
    const rad = angle * Math.PI / 180;
    return {
      x: 100 + radius * Math.cos(rad),
      y: 90 - radius * Math.sin(rad)
    };
  };

  // Create an arc segment path
  const createArcSegment = (startAngle, endAngle) => {
    // Use radius 88 to stay inside the semicircle border (which has strokeWidth of 2)
    const start = getArcPoint(startAngle, 88);
    const end = getArcPoint(endAngle, 88);
    
    // Determine if this is a large arc (> 180 degrees)
    const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
    
    // Create path: move to center, line to start point, arc to end point, line back to center
    return `M 100 90 L ${start.x} ${start.y} A 88 88 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Semicircle container */}
      <div className="relative aspect-[2/1] w-full">
        <svg 
          ref={svgRef}
          viewBox="0 0 200 100" 
          className="w-full h-full"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          style={{ cursor: phase === 'guess' ? 'pointer' : 'default' }}
        >
          {/* Define clip path for smooth clipping */}
          <defs>
            <clipPath id="semicircle-clip">
              <path d="M 10 90 A 90 90 0 0 1 190 90 L 190 100 L 10 100 Z" />
            </clipPath>
          </defs>

          {/* Base semicircle */}
          <path
            d="M 10 90 A 90 90 0 0 1 190 90"
            fill="rgba(30, 40, 80, 0.4)"
            stroke="rgba(100, 150, 255, 0.3)"
            strokeWidth="2"
          />
          
          {/* Scoring zones - extending to full circle edge */}
          {showTarget && (
            <g clipPath="url(#semicircle-clip)">
              {/* Draw from back to front to ensure no gaps */}
              {/* 2-point zones - orange - slightly extended to eliminate gaps */}
              <path
                d={createArcSegment(targetAngle - 25.5, targetAngle - 14.5)}
                fill="#f59e0b"
                opacity="1"
              />
              <path
                d={createArcSegment(targetAngle + 14.5, targetAngle + 25.5)}
                fill="#f59e0b"
                opacity="1"
              />
              
              {/* 3-point zones - blue - slightly extended to eliminate gaps */}
              <path
                d={createArcSegment(targetAngle - 15.5, targetAngle - 4.5)}
                fill="#3b82f6"
                opacity="1"
              />
              <path
                d={createArcSegment(targetAngle + 4.5, targetAngle + 15.5)}
                fill="#3b82f6"
                opacity="1"
              />
              
              {/* 4-point zone (center) - green - slightly extended to eliminate gaps */}
              <path
                d={createArcSegment(targetAngle - 5.5, targetAngle + 5.5)}
                fill="#10b981"
                opacity="1"
              />
            </g>
          )}
          
          {/* Guess indicator (shown during guess and reveal phases) */}
          {(phase === 'guess' || phase === 'reveal') && (
            <g clipPath="url(#semicircle-clip)">
              {/* Line from edge of bottom circle to arc point - extends to edge minus stroke width */}
              <line
                x1={100 + 12 * Math.cos(guessAngle * Math.PI / 180)}
                y1={90 - 12 * Math.sin(guessAngle * Math.PI / 180)}
                x2={getArcPoint(guessAngle, 88).x}
                y2={getArcPoint(guessAngle, 88).y}
                stroke="#ef4444"
                strokeWidth="3"
                opacity={showTarget ? "1" : "0.8"}
              />
              
              {/* Large circle at bottom */}
              <circle
                cx="100"
                cy="90"
                r="12"
                fill="#ef4444"
                stroke="rgba(255, 200, 200, 0.5)"
                strokeWidth="2"
                style={{ cursor: phase === 'guess' ? 'grab' : 'default' }}
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

export default Spectrum;
