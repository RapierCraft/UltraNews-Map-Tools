'use client';

import { useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';

interface ZoomControlProps {
  position?: L.ControlPosition;
}

export default function ZoomControl({ position = 'topright' }: ZoomControlProps) {
  const map = useMap();

  useEffect(() => {
    // Create and add zoom control
    const zoomControl = L.control.zoom({
      position: position
    });
    
    zoomControl.addTo(map);

    // Cleanup on unmount
    return () => {
      map.removeControl(zoomControl);
    };
  }, [map, position]);

  return null;
}