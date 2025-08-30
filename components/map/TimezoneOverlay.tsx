'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface TimezoneOverlayProps {
  enabled?: boolean;
  isDarkTheme?: boolean;
}

export default function TimezoneOverlay({ enabled = true, isDarkTheme = false }: TimezoneOverlayProps) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;

    // Define subtle timezone line style
    const timezoneStyle = {
      color: isDarkTheme ? '#374151' : '#9ca3af',
      weight: 0.5,
      opacity: 0.3,
      fillOpacity: 0,
      interactive: false,
      dashArray: '2,4'
    };

    // Simplified timezone lines (major meridians every 15 degrees)
    const timezoneLines: L.Polyline[] = [];
    
    // Create vertical lines for major timezone boundaries
    for (let lng = -180; lng <= 180; lng += 15) {
      const line = L.polyline([
        [-85, lng],
        [85, lng]
      ], timezoneStyle);
      
      line.addTo(map);
      timezoneLines.push(line);
    }

    // Add International Date Line (180°) with different style
    const dateLine = L.polyline([
      [-85, 180],
      [85, 180]
    ], {
      ...timezoneStyle,
      color: isDarkTheme ? '#dc2626' : '#ef4444',
      weight: 1,
      opacity: 0.4,
      dashArray: '4,2'
    });
    
    dateLine.addTo(map);
    timezoneLines.push(dateLine);

    // Prime Meridian (0°) with different style
    const primeMeridian = L.polyline([
      [-85, 0],
      [85, 0]
    ], {
      ...timezoneStyle,
      color: isDarkTheme ? '#059669' : '#10b981',
      weight: 1,
      opacity: 0.4,
      dashArray: '4,2'
    });
    
    primeMeridian.addTo(map);
    timezoneLines.push(primeMeridian);

    // Cleanup function
    return () => {
      timezoneLines.forEach(line => {
        if (map.hasLayer(line)) {
          map.removeLayer(line);
        }
      });
    };
  }, [map, enabled, isDarkTheme]);

  return null;
}