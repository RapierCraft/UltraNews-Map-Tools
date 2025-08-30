'use client';

import { useEffect, useState } from 'react';

interface CesiumCompassControlProps {
  viewer: unknown;
  isDarkTheme?: boolean;
}

declare global {
  interface Window {
    Cesium: unknown;
  }
}

export default function CesiumCompassControl({ 
  viewer, 
  isDarkTheme = false 
}: CesiumCompassControlProps) {
  const [heading, setHeading] = useState(0);

  useEffect(() => {
    if (!viewer || !window.Cesium) return;

    const updateHeading = () => {
      const camera = viewer.camera;
      const headingRadians = camera.heading;
      const headingDegrees = window.Cesium.Math.toDegrees(headingRadians);
      setHeading(headingDegrees);
    };

    // Listen for camera changes
    viewer.camera.moveEnd.addEventListener(updateHeading);
    viewer.camera.changed.addEventListener(updateHeading);
    
    // Initial update
    updateHeading();

    return () => {
      viewer.camera.moveEnd.removeEventListener(updateHeading);
      viewer.camera.changed.removeEventListener(updateHeading);
    };
  }, [viewer]);

  const resetToNorth = () => {
    if (!viewer || !window.Cesium) return;

    const camera = viewer.camera;
    const currentPosition = camera.position.clone();
    
    // Reset heading to 0 (north) and pitch to -90 (straight down)
    camera.flyTo({
      destination: currentPosition,
      orientation: {
        heading: 0.0,
        pitch: window.Cesium.Math.toRadians(-90),
        roll: 0.0
      },
      duration: 0.5
    });
  };

  if (!viewer) return null;

  return (
    <div className="absolute bottom-4 right-4 z-[1010] mb-32">
      <div 
        className={`relative w-12 h-12 rounded-full shadow-lg cursor-pointer transition-all duration-200 hover:shadow-xl ${
          isDarkTheme 
            ? 'bg-gray-800 border-2 border-gray-600' 
            : 'bg-white border-2 border-gray-300'
        }`}
        onClick={resetToNorth}
        title="Reset bearing to north"
        style={{ transform: `rotate(${-heading}deg)` }}
      >
        {/* Compass Background Circle */}
        <div className="absolute inset-1 rounded-full border border-gray-300 dark:border-gray-600">
          {/* Cardinal Direction Markers */}
          <div className="absolute inset-0">
            {/* North (Red) */}
            <div 
              className="absolute w-0.5 h-3 bg-red-500"
              style={{ 
                top: '2px', 
                left: '50%', 
                transform: 'translateX(-50%)' 
              }}
            />
            {/* East */}
            <div 
              className="absolute w-3 h-0.5 bg-gray-400"
              style={{ 
                top: '50%', 
                right: '2px', 
                transform: 'translateY(-50%)' 
              }}
            />
            {/* South */}
            <div 
              className="absolute w-0.5 h-3 bg-gray-400"
              style={{ 
                bottom: '2px', 
                left: '50%', 
                transform: 'translateX(-50%)' 
              }}
            />
            {/* West */}
            <div 
              className="absolute w-3 h-0.5 bg-gray-400"
              style={{ 
                top: '50%', 
                left: '2px', 
                transform: 'translateY(-50%)' 
              }}
            />
          </div>
          
          {/* Center Dot */}
          <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-gray-600 dark:bg-gray-300 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
          
          {/* North Arrow */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 16 16" 
              className="text-red-500"
              style={{ transform: 'translateY(-2px)' }}
            >
              <path 
                d="M8 2 L10 6 L8 5 L6 6 Z" 
                fill="currentColor"
                stroke={isDarkTheme ? '#000' : '#fff'}
                strokeWidth="0.5"
              />
            </svg>
          </div>
        </div>
        
        {/* "N" Label */}
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 -translate-y-full">
          <span className={`text-xs font-bold ${isDarkTheme ? 'text-red-400' : 'text-red-600'}`}>
            N
          </span>
        </div>
      </div>
    </div>
  );
}