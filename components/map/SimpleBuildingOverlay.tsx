'use client';

import { TileLayer } from 'react-leaflet';

interface SimpleBuildingOverlayProps {
  enabled: boolean;
  isDarkTheme?: boolean;
  opacity?: number;
}

export default function SimpleBuildingOverlay({ 
  enabled, 
  isDarkTheme = false,
  opacity = 0.5
}: SimpleBuildingOverlayProps) {
  
  if (!enabled) return null;

  return (
    <>
      {/* Building outlines using OpenStreetMap Carto style building layer */}
      <TileLayer
        key={`buildings-${isDarkTheme ? 'dark' : 'light'}`}
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='Buildings &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        opacity={opacity}
        zIndex={580}
        className="simple-buildings-overlay"
      />

      {/* CSS to highlight only buildings */}
      <style jsx global>{`
        .simple-buildings-overlay {
          /* Filter to emphasize buildings */
          filter: ${isDarkTheme 
            ? 'invert(1) hue-rotate(180deg) brightness(0.8) contrast(2.0) saturate(0.3)' 
            : 'contrast(2.5) brightness(0.7) saturate(0.2) sepia(0.1)'};
          
          /* Blend mode to overlay buildings */
          mix-blend-mode: ${isDarkTheme ? 'screen' : 'multiply'};
          
          transition: all 0.4s ease-in-out;
        }
        
        /* Make buildings more prominent */
        .simple-buildings-overlay img {
          image-rendering: crisp-edges;
        }
      `}</style>

      {/* Simple building indicator */}
      <div style={{
        position: 'absolute',
        top: '120px',
        left: '10px',
        zIndex: 1000,
        backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        backdropFilter: 'blur(8px)',
        border: `2px solid ${isDarkTheme ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}`,
        color: isDarkTheme ? 'white' : 'black',
        padding: '6px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 'bold',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <span style={{
          width: '6px',
          height: '6px',
          backgroundColor: '#FF9800',
          borderRadius: '50%'
        }}></span>
        BUILDINGS
      </div>
    </>
  );
}