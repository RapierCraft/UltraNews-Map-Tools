'use client';

import { TileLayer } from 'react-leaflet';
import { useEffect, useState } from 'react';

interface VectorBuildingOverlayProps {
  enabled: boolean;
  isDarkTheme?: boolean;
  showHeights?: boolean;
}

export default function VectorBuildingOverlay({ 
  enabled, 
  isDarkTheme = false,
  showHeights = false
}: VectorBuildingOverlayProps) {
  
  if (!enabled) return null;

  return (
    <>
      {/* Building footprints with enhanced styling */}
      <TileLayer
        key={`vector-buildings-${isDarkTheme ? 'dark' : 'light'}-${showHeights ? 'heights' : 'flat'}`}
        url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
        attribution='Buildings &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/">Humanitarian OpenStreetMap Team</a>'
        opacity={0.4}
        zIndex={570}
        className="vector-buildings"
      />

      {/* Enhanced building visualization styles */}
      <style jsx global>{`
        .vector-buildings {
          /* Create building-like appearance */
          filter: ${isDarkTheme 
            ? `invert(1) 
               hue-rotate(180deg) 
               brightness(0.7) 
               contrast(3.0) 
               saturate(0.1)
               ${showHeights ? 'drop-shadow(2px 2px 4px rgba(255,255,255,0.2))' : ''}` 
            : `brightness(0.6) 
               contrast(2.8) 
               saturate(0.15) 
               sepia(0.1)
               ${showHeights ? 'drop-shadow(2px 2px 6px rgba(0,0,0,0.4))' : ''}`};
          
          mix-blend-mode: ${isDarkTheme ? 'screen' : 'multiply'};
          transition: all 0.5s ease-in-out;
        }
        
        /* Add building-specific visual enhancements */
        .vector-buildings img {
          image-rendering: optimizeQuality;
          ${showHeights ? `
            transform: perspective(1000px) rotateX(1deg);
            transform-origin: bottom center;
          ` : ''}
        }
        
        /* Hover effects */
        .leaflet-layer:hover .vector-buildings {
          opacity: 0.6 !important;
          filter: ${isDarkTheme 
            ? 'invert(1) hue-rotate(180deg) brightness(0.8) contrast(2.5) saturate(0.2)' 
            : 'brightness(0.5) contrast(3.2) saturate(0.2)'};
        }
      `}</style>

      {/* Advanced building layer indicator */}
      <div style={{
        position: 'absolute',
        bottom: '100px',
        left: '20px',
        zIndex: 1000,
        background: `linear-gradient(135deg, 
          ${isDarkTheme ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)'} 0%, 
          ${isDarkTheme ? 'rgba(50,50,50,0.85)' : 'rgba(240,240,240,0.85)'} 100%)`,
        color: isDarkTheme ? '#f0f0f0' : '#333',
        padding: '10px 14px',
        borderRadius: '10px',
        fontSize: '12px',
        fontWeight: '600',
        pointerEvents: 'none',
        border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
        backdropFilter: 'blur(8px)',
        boxShadow: `0 4px 12px ${isDarkTheme ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'}`,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '12px',
          height: '12px',
          background: `linear-gradient(45deg, #FF6B35, #F7931E)`,
          borderRadius: '3px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}></div>
        <span>
          🏗️ Buildings {showHeights ? '(3D Heights)' : '(2D Footprints)'}
        </span>
        <div style={{
          width: '6px',
          height: '6px',
          backgroundColor: '#4CAF50',
          borderRadius: '50%',
          animation: 'buildingPulse 2s infinite'
        }}></div>
      </div>

      {/* Pulse animation for building indicator */}
      <style jsx>{`
        @keyframes buildingPulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
          }
          50% { 
            opacity: 0.6; 
            transform: scale(1.2);
          }
        }
      `}</style>
    </>
  );
}