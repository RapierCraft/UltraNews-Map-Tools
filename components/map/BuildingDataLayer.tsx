'use client';

import { TileLayer } from 'react-leaflet';
import { useEffect, useState } from 'react';

interface BuildingDataLayerProps {
  enabled: boolean;
  isDarkTheme?: boolean;
  renderMode?: 'footprints' | 'heights' | 'combined';
}

export default function BuildingDataLayer({ 
  enabled, 
  isDarkTheme = false, 
  renderMode = 'footprints'
}: BuildingDataLayerProps) {
  
  if (!enabled) return null;

  return (
    <>
      {/* Building Footprints Layer */}
      {(renderMode === 'footprints' || renderMode === 'combined') && (
        <TileLayer
          key="building-footprints"
          url="https://tile.openstreetmap.org/carto/buildings/{z}/{x}/{y}.png"
          attribution='Building data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          opacity={0.6}
          zIndex={550}
          className="building-footprints-layer"
        />
      )}

      {/* Building Heights/3D Layer */}
      {(renderMode === 'heights' || renderMode === 'combined') && (
        <TileLayer
          key="building-heights"
          url="https://wxs.ign.fr/essentiels/geoportail/wmts?layer=BUILDINGS.HEIGHTS&style=normal&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix={z}&TileCol={x}&TileRow={y}"
          attribution='Building heights &copy; IGN France'
          opacity={0.4}
          zIndex={560}
          className="building-heights-layer"
        />
      )}

      {/* Overpass API Building Query Alternative */}
      {/* This could be implemented for real-time building data */}

      {/* CSS Styling for Building Layers */}
      <style jsx global>{`
        .building-footprints-layer {
          filter: ${isDarkTheme 
            ? 'invert(1) hue-rotate(180deg) brightness(0.9) contrast(1.1) saturate(0.8)' 
            : 'contrast(1.2) brightness(0.95) saturate(1.1)'};
          transition: all 0.3s ease-in-out;
          mix-blend-mode: ${isDarkTheme ? 'screen' : 'overlay'};
        }
        
        .building-heights-layer {
          filter: ${isDarkTheme 
            ? 'invert(1) brightness(0.7) contrast(1.3)' 
            : 'brightness(1.1) contrast(1.1)'};
          mix-blend-mode: ${isDarkTheme ? 'lighten' : 'darken'};
        }
        
        /* Hover effects for building layers */
        .building-footprints-layer:hover {
          opacity: 0.8 !important;
        }
        
        .building-heights-layer:hover {
          opacity: 0.6 !important;
        }
      `}</style>

      {/* Building Layer Status Indicator */}
      <div style={{
        position: 'absolute',
        bottom: '60px',
        left: '20px',
        zIndex: 1000,
        backgroundColor: isDarkTheme ? 'rgba(64, 64, 64, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        color: isDarkTheme ? '#e0e0e0' : '#333',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '600',
        pointerEvents: 'none',
        border: `1px solid ${isDarkTheme ? '#555' : '#ddd'}`,
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#4CAF50',
          animation: 'pulse 2s infinite'
        }}></span>
        🏢 Buildings: {renderMode.charAt(0).toUpperCase() + renderMode.slice(1)}
      </div>

      {/* Pulse animation for status indicator */}
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </>
  );
}