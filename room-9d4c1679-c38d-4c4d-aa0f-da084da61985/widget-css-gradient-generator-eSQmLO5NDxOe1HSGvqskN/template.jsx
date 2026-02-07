import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// Generate random hex color
const randomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

// Preset color palettes with 4 colors each
const PRESET_PALETTES = [
  { name: 'Ocean Breeze', colors: ['#667eea', '#764ba2', '#f093fb', '#4facfe'] },
  { name: 'Sunset Glow', colors: ['#fa709a', '#fee140', '#30cfd0', '#330867'] },
  { name: 'Forest Dream', colors: ['#134e5e', '#71b280', '#134e5e', '#71b280'] },
  { name: 'Candy Pop', colors: ['#f857a6', '#ff5858', '#feca57', '#ee5a6f'] },
  { name: 'Northern Lights', colors: ['#00d2ff', '#3a7bd5', '#00d2ff', '#928dab'] },
  { name: 'Peachy Keen', colors: ['#ed4264', '#ffedbc', '#f7971e', '#ffd200'] },
  { name: 'Midnight City', colors: ['#232526', '#414345', '#0f2027', '#2c5364'] },
  { name: 'Berry Fusion', colors: ['#9796f0', '#fbc7d4', '#f38181', '#aa076b'] },
  { name: 'Emerald Wave', colors: ['#348f50', '#56b4d3', '#348f50', '#56b4d3'] },
  { name: 'Lavender Sky', colors: ['#a8edea', '#fed6e3', '#d299c2', '#fef9d7'] },
  { name: 'Citrus Burst', colors: ['#f83600', '#f9d423', '#ff8008', '#ffc837'] },
  { name: 'Deep Purple', colors: ['#673ab7', '#512da8', '#d500f9', '#aa00ff'] },
  { name: 'Coral Reef', colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731'] },
  { name: 'Arctic Frost', colors: ['#e0eafc', '#cfdef3', '#a1c4fd', '#c2e9fb'] },
  { name: 'Crimson Tide', colors: ['#eb3349', '#f45c43', '#fa709a', '#fee140'] }
];

function CssGradientGenerator() {
  const [tailwindLoaded, setTailwindLoaded] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  
  // Gradient state - now using an array of color stops
  const [gradientType, setGradientType] = useState('linear');
  const [colorStops, setColorStops] = useState([
    { id: 1, color: randomColor(), position: 0 },
    { id: 2, color: randomColor(), position: 100 }
  ]);
  const [angle, setAngle] = useState(90);
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeStop, setActiveStop] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const gradientBarRef = useRef(null);
  const draggingIdRef = useRef(null);
  
  // Palette panel state
  const [palettePanelOpen, setPalettePanelOpen] = useState(true);

  useEffect(() => {
    if (!document.getElementById('tailwind-script')) {
      const tailwindScript = document.createElement('script');
      tailwindScript.id = 'tailwind-script';
      tailwindScript.src = 'https://cdn.tailwindcss.com';
      tailwindScript.onload = () => {
        setTimeout(() => setTailwindLoaded(true), 100);
      };
      document.head.appendChild(tailwindScript);
    } else {
      setTailwindLoaded(true);
    }
  }, []);

  // Load Playfair Display font
  useEffect(() => {
    if (!document.getElementById('playfair-font')) {
      const link = document.createElement('link');
      link.id = 'playfair-font';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap';
      link.onload = () => setFontsLoaded(true);
      document.head.appendChild(link);
    } else {
      setFontsLoaded(true);
    }
  }, []);

  // Set dark background
  useEffect(() => {
    document.body.style.background = '#0a0a0a';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
    return () => {
      document.body.style.background = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.overflow = '';
      document.documentElement.style.height = '';
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate inverted color
  const invertColor = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const inverted = `#${(255 - r).toString(16).padStart(2, '0')}${(255 - g).toString(16).padStart(2, '0')}${(255 - b).toString(16).padStart(2, '0')}`;
    return inverted;
  };

  // Generate gradient CSS with overlap handling
  const gradientCSS = useMemo(() => {
    const sortedStops = [...colorStops].sort((a, b) => a.position - b.position);
    
    let processedStops = [];
    
    // Group overlapping stops (within 2% of each other)
    let i = 0;
    while (i < sortedStops.length) {
      const current = sortedStops[i];
      
      // Find all stops that overlap with current (within 2%)
      let groupEnd = i;
      while (groupEnd + 1 < sortedStops.length && 
             sortedStops[groupEnd + 1].position - current.position <= 2) {
        groupEnd++;
      }
      
      if (groupEnd > i) {
        // // Multiple stops overlapping - create hard edges for each color
        // const groupStops = sortedStops.slice(i, groupEnd + 1);
        // const basePos = current.position;
        
        // // Distribute hard-edge stops across a minimal range
        // groupStops.forEach((stop, idx) => {
        //   const offset = idx * 0.5; // Small offset for each stop
        //   if (idx === 0) {
        //     processedStops.push(`${stop.color} ${basePos}%`);
        //   } else {
        //     // Hard edge: end previous color, start new color at same position
        //     processedStops.push(`${stop.color} ${basePos + offset}%`);
        //   }
        // });
        
        // i = groupEnd + 1;
        // Multiple stops overlapping - distribute around basePos so no one collapses
        const groupStops = sortedStops.slice(i, groupEnd + 1);
        const basePos = current.position;
        
        // total width allocated for overlapping group (percent of circle)
        const spread = 1.0; // tweak 0.6–2.0
        const n = groupStops.length;
        
        let start = basePos - spread / 2;
        let end = basePos + spread / 2;
        
        // Shift the whole window so it stays in [0, 100]
        if (start < 0) {
          end -= start;     // move right by -start
          start = 0;
        }
        if (end > 100) {
          start -= (end - 100); // move left by (end-100)
          end = 100;
        }
        start = Math.max(0, start); // safety
        
        const step = n === 1 ? 0 : (end - start) / (n - 1);
        
        groupStops.forEach((stop, idx) => {
          const pos = start + idx * step;
          processedStops.push(`${stop.color} ${pos}%`);
        });
        
        i = groupEnd + 1;
      } else {
        // Single stop, no overlap
        processedStops.push(`${current.color} ${current.position}%`);
        i++;
      }
    }
    
    const stops = processedStops.join(', ');
    
    switch (gradientType) {
      case 'linear':
        return `linear-gradient(${angle}deg, ${stops})`;
      case 'radial':
        return `radial-gradient(circle, ${stops})`;
      case 'conic':
        return `conic-gradient(from ${angle}deg, ${stops})`;
      default:
        return `linear-gradient(${angle}deg, ${stops})`;
    }
  }, [gradientType, colorStops, angle]);

  const fullCSS = `background: ${gradientCSS};`;

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(fullCSS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [fullCSS]);

  const randomizeColors = useCallback(() => {
    if (gradientType === 'conic') {
      // For conic gradients, keep first and last colors the same
      setColorStops(prev => {
        const randomColors = prev.map(() => randomColor());
        // Make sure the last color matches the first
        return prev.map((stop, index) => {
          const sortedStops = [...prev].sort((a, b) => a.position - b.position);
          const firstStopId = sortedStops[0].id;
          const lastStopId = sortedStops[sortedStops.length - 1].id;
          
          if (stop.id === lastStopId) {
            // Last stop gets the same color as first stop
            const firstIndex = prev.findIndex(s => s.id === firstStopId);
            return { ...stop, color: randomColors[firstIndex] };
          }
          return { ...stop, color: randomColors[index] };
        });
      });
    } else {
      setColorStops(prev => prev.map(stop => ({ ...stop, color: randomColor() })));
    }
  }, [gradientType]);

  // Apply a preset palette
  const applyPalette = useCallback((palette) => {
    if (gradientType === 'conic') {
      // For conic gradients, use 4 colors but make first and last the same
      const positions = [0, 33, 67, 100];
      const newStops = palette.colors.map((color, index) => ({
        id: index + 1,
        color: index === 3 ? palette.colors[0] : color, // Last color same as first
        position: positions[index]
      }));
      conicEndpointIdRef.current = 4; // Mark last stop as endpoint
      setColorStops(newStops);
    } else {
      const positions = [0, 33, 67, 100];
      const newStops = palette.colors.map((color, index) => ({
        id: index + 1,
        color: color,
        position: positions[index]
      }));
      setColorStops(newStops);
    }
    setActiveStop(null);
  }, [gradientType]);

  // Get max stops based on gradient type
  const maxStops = gradientType === 'conic' ? 5 : 4;

  // Handle click on gradient bar to add new color stop
  const handleBarClick = useCallback((e) => {
    // Don't add if we just finished dragging or already at max
    if (colorStops.length >= maxStops) return;
    if (isDragging) return;
    
    const rect = gradientBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
    
    const newId = Math.max(...colorStops.map(s => s.id)) + 1;
    const newStop = { id: newId, color: randomColor(), position: Math.round(position) };
    setColorStops(prev => [...prev, newStop]);
    setActiveStop(newId);
  }, [colorStops, isDragging, maxStops]);

  // Handle dragging a color stop
  const handleStopMouseDown = useCallback((stopId, e) => {
    e.preventDefault();
    e.stopPropagation();
    draggingIdRef.current = stopId;
    setIsDragging(true);
    setActiveStop(stopId);
  }, []);

  // Global mouse move/up handlers for dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!draggingIdRef.current || !gradientBarRef.current) return;
      
      const rect = gradientBarRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
      
      setColorStops(prev => prev.map(stop => 
        stop.id === draggingIdRef.current 
          ? { ...stop, position: Math.round(position) }
          : stop
      ));
    };

    const handleMouseUp = () => {
      if (draggingIdRef.current) {
        draggingIdRef.current = null;
        // Small delay before allowing bar clicks again
        setTimeout(() => setIsDragging(false), 50);
      }
    };

    // Always attach listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Delete a color stop
  const deleteStop = useCallback((stopId) => {
    const minStops = gradientType === 'conic' ? 3 : 2;
    if (colorStops.length <= minStops) return;
    
    // If deleting the conic endpoint, reassign it to the stop with the highest position (after deletion)
    if (gradientType === 'conic' && stopId === conicEndpointIdRef.current) {
      const remainingStops = colorStops.filter(s => s.id !== stopId);
      const sortedRemaining = [...remainingStops].sort((a, b) => b.position - a.position);
      conicEndpointIdRef.current = sortedRemaining[0]?.id || null;
    }
    
    setColorStops(prev => prev.filter(stop => stop.id !== stopId));
    setActiveStop(null);
  }, [colorStops, gradientType]);

  // Update active stop color
  const updateStopColor = useCallback((stopId, color) => {
    setColorStops(prev => prev.map(stop => 
      stop.id === stopId ? { ...stop, color } : stop
    ));
  }, []);

  // Track previous gradient type to detect switches
  const prevGradientTypeRef = useRef(gradientType);
  
  // Track which stop ID is the "endpoint" for conic gradients (should sync with first stop's color)
  const conicEndpointIdRef = useRef(null);
  
  // When switching TO conic mode, set up default 3-slider configuration
  // When switching FROM conic TO linear/radial, reset to 2 sliders
  useEffect(() => {
    const prevType = prevGradientTypeRef.current;
    prevGradientTypeRef.current = gradientType;
    
    if (gradientType === 'conic' && prevType !== 'conic') {
      // Switching to conic - set up 3 sliders: ends same color, middle different
      const endColor = randomColor();
      const middleColor = randomColor();
      // Mark id: 3 as the endpoint that will sync with id: 1
      conicEndpointIdRef.current = 3;
      setColorStops([
        { id: 1, color: endColor, position: 0 },
        { id: 2, color: middleColor, position: 50 },
        { id: 3, color: endColor, position: 100 }
      ]);
      setActiveStop(null);
    } else if (gradientType !== 'conic' && prevType === 'conic') {
      // Switching from conic to linear/radial - reset to 2 sliders
      conicEndpointIdRef.current = null;
      setColorStops([
        { id: 1, color: randomColor(), position: 0 },
        { id: 2, color: randomColor(), position: 100 }
      ]);
      setActiveStop(null);
    }
  }, [gradientType]);
  
  // For conic gradients, the endpoint stop (tracked by ID) syncs its color with the first stop (by position)
  useEffect(() => {
    if (gradientType !== 'conic') return;
    if (!conicEndpointIdRef.current) return;
    
    const sortedStops = [...colorStops].sort((a, b) => a.position - b.position);
    const firstStop = sortedStops[0];
    const endpointStop = colorStops.find(s => s.id === conicEndpointIdRef.current);
    
    if (!firstStop || !endpointStop) return;
    
    // Only sync if the endpoint stop's color differs from the first stop's color
    if (endpointStop.color !== firstStop.color) {
      setColorStops(prev => prev.map(stop => 
        stop.id === conicEndpointIdRef.current 
          ? { ...stop, color: firstStop.color } 
          : stop
      ));
    }
  }, [gradientType, colorStops]);

  const gradientTypes = [
    { value: 'linear', label: 'Linear' },
    { value: 'radial', label: 'Radial' },
    { value: 'conic', label: 'Conic' },
  ];

  if (!tailwindLoaded || !fontsLoaded) {
    return (
      <div style={{ 
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a', 
        color: '#c9a962',
        fontFamily: 'serif',
        letterSpacing: '0.2em'
      }}>
        Loading...
      </div>
    );
  }

  // Preview mode - full screen gradient with exit button
  if (previewMode) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: gradientCSS,
        fontFamily: "'Playfair Display', serif",
      }}>
        <button
          onClick={() => setPreviewMode(false)}
          style={{
            position: 'absolute',
            top: '32px',
            right: '32px',
            padding: '16px 32px',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(10px)',
            border: '0.5px solid rgba(201,169,98,0.5)',
            borderRadius: '2px',
            color: '#c9a962',
            fontSize: '11px',
            fontFamily: "'Playfair Display', serif",
            letterSpacing: '0.25em',
            cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(201,169,98,0.9)';
            e.target.style.color = '#0a0a0a';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(0,0,0,0.7)';
            e.target.style.color = '#c9a962';
          }}
        >
          Exit Preview
        </button>

        {/* CSS code overlay at bottom */}
        <div style={{
          position: 'absolute',
          bottom: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '20px 32px',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(10px)',
          border: '0.5px solid rgba(201,169,98,0.3)',
          borderRadius: '2px',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#888',
          maxWidth: '90%',
          textAlign: 'center'
        }}>
          <span style={{ color: '#c9a962' }}>background</span>
          <span style={{ color: '#fafafa' }}>: </span>
          <span style={{ color: '#888' }}>{gradientCSS}</span>
          <span style={{ color: '#fafafa' }}>;</span>
        </div>

        <style>{`
          body { overflow: hidden !important; }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      fontFamily: "'Playfair Display', serif",
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#0a0a0a',
      overflow: 'hidden'
    }}>
      {/* Main gradient area with overlaid controls */}
      <div style={{
        flex: 1,
        position: 'relative',
        background: gradientCSS,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '32px',
        minHeight: 0
      }}>
        {/* Top bar - Palette panel and Preview button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '20px'
        }}>
          {/* Preset Palettes Panel */}
          {palettePanelOpen && (
            <div style={{
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(12px)',
              borderRadius: '2px',
              padding: '24px',
              border: '0.5px solid rgba(201,169,98,0.3)',
              maxWidth: '280px',
              maxHeight: '440px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '11px',
                  fontWeight: 400,
                  color: '#c9a962',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase'
                }}>
                  Palettes
                </h3>
                <button
                  onClick={() => setPalettePanelOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '18px',
                    color: '#666',
                    cursor: 'pointer',
                    padding: '4px',
                    lineHeight: 1,
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#c9a962'}
                  onMouseLeave={(e) => e.target.style.color = '#666'}
                >
                  ×
                </button>
              </div>
              
              {/* Scrollable palette list */}
              <div style={{
                overflowY: 'auto',
                overflowX: 'hidden',
                flex: 1,
                marginRight: '-8px',
                paddingRight: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}>
                  {PRESET_PALETTES.map((palette, index) => (
                    <div
                      key={index}
                      onClick={() => applyPalette(palette)}
                      style={{
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateX(3px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <div style={{
                        fontSize: '10px',
                        fontWeight: 400,
                        color: '#888',
                        marginBottom: '6px',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase'
                      }}>
                        {palette.name}
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '4px',
                        height: '32px',
                        borderRadius: '2px',
                        overflow: 'hidden',
                        border: '0.5px solid rgba(255,255,255,0.1)'
                      }}>
                        {palette.colors.map((color, colorIndex) => (
                          <div
                            key={colorIndex}
                            style={{
                              flex: 1,
                              background: color,
                              transition: 'flex 0.2s ease'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Preview button (and show palettes button when closed) */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginLeft: 'auto'
          }}>
            {!palettePanelOpen && (
              <button
                onClick={() => setPalettePanelOpen(true)}
                style={{
                  padding: '20px 28px',
                  background: 'rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(12px)',
                  border: '0.5px solid rgba(201,169,98,0.3)',
                  borderRadius: '2px',
                  color: '#c9a962',
                  fontSize: '11px',
                  fontFamily: "'Playfair Display', serif",
                  letterSpacing: '0.25em',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(201,169,98,0.9)';
                  e.target.style.color = '#0a0a0a';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(0,0,0,0.65)';
                  e.target.style.color = '#c9a962';
                }}
              >
                Palettes
              </button>
            )}
            <button
              onClick={() => setPreviewMode(true)}
              style={{
                padding: '20px 28px',
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(12px)',
                border: '0.5px solid rgba(201,169,98,0.3)',
                borderRadius: '2px',
                color: '#c9a962',
                fontSize: '11px',
                fontFamily: "'Playfair Display', serif",
                letterSpacing: '0.25em',
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(201,169,98,0.9)';
                e.target.style.color = '#0a0a0a';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(0,0,0,0.65)';
                e.target.style.color = '#c9a962';
              }}
            >
              Preview
            </button>
          </div>
        </div>

        {/* Center controls panel */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap'
        }}>
          {/* Gradient Type Selector */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                padding: '18px 28px',
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(12px)',
                border: '0.5px solid rgba(201,169,98,0.3)',
                borderRadius: '2px',
                color: '#fafafa',
                fontSize: '13px',
                fontFamily: "'Playfair Display', serif",
                letterSpacing: '0.15em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transition: 'all 0.3s ease',
                minWidth: '160px',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(201,169,98,0.7)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = dropdownOpen ? 'rgba(201,169,98,0.7)' : 'rgba(201,169,98,0.3)'}
            >
              <span>{gradientTypes.find(t => t.value === gradientType)?.label}</span>
              <span style={{ color: '#c9a962', fontSize: '8px' }}>{dropdownOpen ? '▲' : '▼'}</span>
            </button>
            
            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '4px',
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(12px)',
                border: '0.5px solid rgba(201,169,98,0.5)',
                borderRadius: '2px',
                zIndex: 100,
                overflow: 'hidden'
              }}>
                {gradientTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => {
                      setGradientType(type.value);
                      setDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      background: gradientType === type.value ? 'rgba(201,169,98,0.15)' : 'transparent',
                      border: 'none',
                      color: gradientType === type.value ? '#c9a962' : '#888',
                      fontSize: '12px',
                      fontFamily: "'Playfair Display', serif",
                      letterSpacing: '0.1em',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (gradientType !== type.value) {
                        e.target.style.background = 'rgba(255,255,255,0.05)';
                        e.target.style.color = '#fafafa';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (gradientType !== type.value) {
                        e.target.style.background = 'transparent';
                        e.target.style.color = '#888';
                      }
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active color stop editor */}
          {activeStop && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 20px',
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(12px)',
              border: '0.5px solid rgba(201,169,98,0.5)',
              borderRadius: '2px'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '2px',
                border: '0.5px solid rgba(255,255,255,0.2)',
                overflow: 'hidden',
                position: 'relative',
                flexShrink: 0
              }}>
                <input
                  type="color"
                  value={colorStops.find(s => s.id === activeStop)?.color}
                  onChange={(e) => updateStopColor(activeStop, e.target.value)}
                  style={{
                    width: '60px',
                    height: '60px',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'absolute',
                    top: '-12px',
                    left: '-12px'
                  }}
                />
              </div>
              <input
                type="text"
                value={colorStops.find(s => s.id === activeStop)?.color.toUpperCase()}
                onChange={(e) => updateStopColor(activeStop, e.target.value)}
                style={{
                  width: '80px',
                  padding: '8px 12px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: '2px',
                  color: '#fafafa',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                  textAlign: 'center'
                }}
              />
              {colorStops.length > 2 && (
                <button
                  onClick={() => deleteStop(activeStop)}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(220,38,38,0.2)',
                    border: '0.5px solid rgba(220,38,38,0.5)',
                    borderRadius: '2px',
                    color: '#ef4444',
                    fontSize: '10px',
                    fontFamily: "'Playfair Display', serif",
                    letterSpacing: '0.1em',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(220,38,38,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(220,38,38,0.2)';
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          )}

          {/* Randomize */}
          <button
            onClick={randomizeColors}
            style={{
              padding: '20px 28px',
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(12px)',
              border: '0.5px solid rgba(201,169,98,0.3)',
              borderRadius: '2px',
              color: '#c9a962',
              fontSize: '11px',
              fontFamily: "'Playfair Display', serif",
              letterSpacing: '0.25em',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(201,169,98,0.9)';
              e.target.style.color = '#0a0a0a';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(0,0,0,0.65)';
              e.target.style.color = '#c9a962';
            }}
          >
            Randomize
          </button>
        </div>

        {/* Bottom controls - Gradient Bar with sliders */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxWidth: '700px',
          margin: '0 auto',
          width: '100%'
        }}>
          {/* Gradient Bar */}
          <div style={{
            padding: '24px 32px',
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(12px)',
            border: '0.5px solid rgba(201,169,98,0.3)',
            borderRadius: '2px'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: '20px',
              fontSize: '10px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase'
            }}>
              <span style={{ color: '#666' }}>Color Stops</span>
              <span style={{ color: '#c9a962' }}>
                {colorStops.length}/{maxStops} {colorStops.length < maxStops ? '· Click to add' : ''}
              </span>
            </div>
            
            {/* Gradient bar container */}
            <div 
              ref={gradientBarRef}
              onClick={handleBarClick}
              style={{
                position: 'relative',
                height: '48px',
                background: `linear-gradient(to right, ${[...colorStops].sort((a, b) => a.position - b.position).map(s => `${s.color} ${s.position}%`).join(', ')})`,
                borderRadius: '6px',
                border: '0.5px solid rgba(255,255,255,0.2)',
                cursor: colorStops.length < maxStops ? 'crosshair' : 'default',
                overflow: 'visible'
              }}
            >
              {/* Color stop markers - rounded rectangular sliders */}
              {colorStops.map((stop) => (
                <div
                  key={stop.id}
                  onMouseDown={(e) => handleStopMouseDown(stop.id, e)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveStop(stop.id);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${stop.position}%`,
                    top: '0',
                    transform: 'translateX(-50%)',
                    width: '14px',
                    height: '48px',
                    borderRadius: '4px',
                    background: stop.color,
                    border: activeStop === stop.id ? '2px solid #c9a962' : '1.5px solid rgba(255,255,255,0.8)',
                    boxShadow: activeStop === stop.id 
                      ? '0 0 0 1px rgba(201,169,98,0.5), 0 2px 8px rgba(0,0,0,0.5)' 
                      : '0 2px 6px rgba(0,0,0,0.4)',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    transition: isDragging ? 'none' : 'box-shadow 0.2s ease, border 0.2s ease',
                    zIndex: activeStop === stop.id ? 10 : 5,
                    userSelect: 'none'
                  }}
                >
                  {/* Inner highlight for depth */}
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: '2px',
                    right: '2px',
                    height: '8px',
                    background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)',
                    borderRadius: '2px',
                    pointerEvents: 'none'
                  }} />
                  
                  {/* Position label */}
                  <div style={{
                    position: 'absolute',
                    bottom: '-24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.9)',
                    padding: '3px 6px',
                    borderRadius: '2px',
                    fontSize: '9px',
                    color: '#c9a962',
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                    opacity: activeStop === stop.id || isDragging && draggingIdRef.current === stop.id ? 1 : 0,
                    transition: 'opacity 0.15s ease',
                    pointerEvents: 'none',
                    border: '0.5px solid rgba(201,169,98,0.3)'
                  }}>
                    {stop.position}%
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Angle slider (for linear and conic) */}
          {(gradientType === 'linear' || gradientType === 'conic') && (
            <div style={{
              padding: '16px 24px',
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(12px)',
              border: '0.5px solid rgba(201,169,98,0.3)',
              borderRadius: '2px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: '12px',
                fontSize: '10px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase'
              }}>
                <span style={{ color: '#666' }}>{gradientType === 'linear' ? 'Angle' : 'Start Angle'}</span>
                <span style={{ color: '#c9a962' }}>{angle}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={angle}
                onChange={(e) => setAngle(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '2px',
                  background: `linear-gradient(to right, #c9a962 0%, #c9a962 ${(angle / 360) * 100}%, rgba(255,255,255,0.2) ${(angle / 360) * 100}%, rgba(255,255,255,0.2) 100%)`,
                  appearance: 'none',
                  cursor: 'pointer',
                  borderRadius: '1px'
                }}
              />
            </div>
          )}

          {/* CSS Output + Copy */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'stretch'
          }}>
            <div style={{
              flex: 1,
              padding: '16px 24px',
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(12px)',
              border: '0.5px solid rgba(201,169,98,0.3)',
              borderRadius: '2px',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#888',
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden'
            }}>
              <div style={{ 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis' 
              }}>
                <span style={{ color: '#c9a962' }}>background</span>
                <span style={{ color: '#fafafa' }}>: </span>
                <span style={{ color: '#888' }}>{gradientCSS}</span>
                <span style={{ color: '#fafafa' }}>;</span>
              </div>
            </div>
            
            <button
              onClick={copyToClipboard}
              style={{
                padding: '20px 28px',
                background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(12px)',
                border: '0.5px solid',
                borderColor: copied ? 'rgba(34,197,94,0.5)' : 'rgba(201,169,98,0.3)',
                borderRadius: '2px',
                color: copied ? '#4ade80' : '#c9a962',
                fontSize: '11px',
                fontFamily: "'Playfair Display', serif",
                letterSpacing: '0.25em',
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.3s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (!copied) {
                  e.target.style.background = 'rgba(201,169,98,0.9)';
                  e.target.style.color = '#0a0a0a';
                }
              }}
              onMouseLeave={(e) => {
                if (!copied) {
                  e.target.style.background = 'rgba(0,0,0,0.65)';
                  e.target.style.color = '#c9a962';
                }
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Custom slider thumb styles */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          background: #0a0a0a;
          border: 2px solid #c9a962;
          border-radius: 50%;
          cursor: pointer;
          margin-top: -6px;
          transition: all 0.2s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          background: #c9a962;
          transform: scale(1.15);
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: #0a0a0a;
          border: 2px solid #c9a962;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        input[type="range"]::-moz-range-thumb:hover {
          background: #c9a962;
          transform: scale(1.15);
        }
        input[type="range"]::-webkit-slider-runnable-track {
          height: 2px;
          border-radius: 1px;
        }
        input[type="range"]::-moz-range-track {
          height: 2px;
          border-radius: 1px;
        }
        input[type="text"]:focus {
          outline: none;
          border-color: rgba(201,169,98,0.5) !important;
        }
      `}</style>
    </div>
  );
}

export default CssGradientGenerator;
