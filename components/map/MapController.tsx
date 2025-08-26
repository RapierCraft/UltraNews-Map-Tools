'use client';

import { useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';

interface MapControllerProps {
  center: [number, number];
  zoom: number;
  boundsToFit?: [[number, number], [number, number]];
}

export default function MapController({ center, zoom, boundsToFit }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (boundsToFit) {
      // Fit to bounds if provided
      const leafletBounds = L.latLngBounds(boundsToFit);
      map.fitBounds(leafletBounds, {
        padding: [50, 50], // Add some padding around the bounds
        maxZoom: 16 // Don't zoom in too close
      });
    } else {
      // Otherwise use center and zoom
      const minZoom = map.getMinZoom() || 2;
      const maxZoom = map.getMaxZoom() || 19;
      const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
      
      map.setView(center, clampedZoom);
    }
  }, [map, center, zoom, boundsToFit]);

  return null;
}