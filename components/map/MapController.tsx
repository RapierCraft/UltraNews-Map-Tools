'use client';

import { useMap } from 'react-leaflet';
import { useEffect } from 'react';

interface MapControllerProps {
  center: [number, number];
  zoom: number;
}

export default function MapController({ center, zoom }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    // Ensure zoom is within bounds
    const minZoom = map.getMinZoom() || 2;
    const maxZoom = map.getMaxZoom() || 19;
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
    
    map.setView(center, clampedZoom);
  }, [map, center, zoom]);

  return null;
}