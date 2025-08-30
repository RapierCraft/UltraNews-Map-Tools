'use client';

import { useEffect, useState } from 'react';
import { Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompassControlProps {
  map: maplibregl.Map | null;
  position?: 'topright' | 'topleft' | 'bottomright' | 'bottomleft';
  isDarkTheme?: boolean;
}

export default function CompassControl({ 
  map, 
  position = 'topright' 
}: CompassControlProps) {
  const [bearing, setBearing] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!map) return;

    const updateBearing = () => {
      const currentBearing = map.getBearing();
      setBearing(currentBearing);
      setIsVisible(Math.abs(currentBearing) > 1); // Show compass when map is rotated
    };

    // Update bearing on map rotation
    map.on('rotate', updateBearing);
    map.on('rotateend', updateBearing);
    map.on('load', updateBearing);

    // Initial bearing check
    updateBearing();

    return () => {
      map.off('rotate', updateBearing);
      map.off('rotateend', updateBearing);
      map.off('load', updateBearing);
    };
  }, [map]);

  const resetNorth = () => {
    if (!map) return;
    
    map.easeTo({
      bearing: 0,
      pitch: 0,
      duration: 500
    });
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'topleft':
        return 'top-4 left-4';
      case 'topright':
        return 'top-4 right-4';
      case 'bottomleft':
        return 'bottom-4 left-4';
      case 'bottomright':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`absolute ${getPositionClasses()} z-[1000]`}>
      <Button
        size="icon"
        variant="outline"
        onClick={resetNorth}
        title="Reset bearing to north"
        className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 h-10 w-10 shadow-lg border-2 transition-transform duration-200"
        style={{ 
          transform: `rotate(${-bearing}deg)` 
        }}
      >
        <Navigation className="h-5 w-5 text-red-600 dark:text-red-400" />
      </Button>
    </div>
  );
}