'use client';

import { TileLayer } from 'react-leaflet';
import { useEffect, useState } from 'react';

interface BuildingOverlayProps {
  enabled: boolean;
  isDarkTheme?: boolean;
  style?: '2d' | '3d';
  opacity?: number;
}

export default function BuildingOverlay({ 
  enabled, 
  isDarkTheme = false, 
  style = '2d',
  opacity = 0.7 
}: BuildingOverlayProps) {
  const [buildingUrl, setBuildingUrl] = useState<string>('');

  useEffect(() => {
    if (!enabled) {
      setBuildingUrl('');
      return;
    }

    // Choose building data source based on style preference
    if (style === '3d') {
      // Use OSMBuildings for 3D building data (vector tiles)
      setBuildingUrl('https://data.osmbuildings.org/0.2/anonymous/tile/{z}/{x}/{y}.json');
    } else {
      // Use building footprint overlay tiles
      // Using a building-focused tile overlay from various sources
      if (isDarkTheme) {
        setBuildingUrl('https://tiles.osmbuildings.org/tiles/{z}/{x}/{y}.png');
      } else {
        setBuildingUrl('https://tiles.osmbuildings.org/tiles/{z}/{x}/{y}.png');
      }
    }
  }, [enabled, isDarkTheme, style]);

  if (!enabled || !buildingUrl) {
    return null;
  }

  return (
    <>
      {/* Building footprint overlay */}
      <TileLayer
        key={`buildings-${style}-${isDarkTheme ? 'dark' : 'light'}`}
        url={buildingUrl}
        attribution='&copy; <a href="https://osmbuildings.org/">OSM Buildings</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        opacity={opacity}
        zIndex={600}
        className="building-overlay"
      />

      {/* Alternative: Use Overpass API for building data */}
      {/* This would require more complex implementation with GeoJSON */}
      
      {/* Style the building overlay */}
      <style jsx global>{`
        .building-overlay {
          filter: ${isDarkTheme 
            ? 'invert(1) hue-rotate(180deg) brightness(0.8) contrast(1.2)' 
            : 'contrast(1.1) brightness(0.9)'};
          transition: filter 0.3s ease-in-out;
          mix-blend-mode: ${isDarkTheme ? 'screen' : 'multiply'};
        }
        
        /* 3D building styling when available */
        .building-overlay[data-style="3d"] {
          filter: ${isDarkTheme 
            ? 'drop-shadow(2px 2px 4px rgba(255,255,255,0.1))' 
            : 'drop-shadow(2px 2px 4px rgba(0,0,0,0.2))'};
        }
      `}</style>

      {/* Visual indicator when buildings are enabled */}
      {enabled && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          zIndex: 1000,
          backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)',
          color: isDarkTheme ? 'black' : 'white',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 'bold',
          pointerEvents: 'none',
          border: `2px solid ${isDarkTheme ? '#333' : '#ccc'}`
        }}>
          🏢 Buildings Layer Active ({style.toUpperCase()})
        </div>
      )}
    </>
  );
}