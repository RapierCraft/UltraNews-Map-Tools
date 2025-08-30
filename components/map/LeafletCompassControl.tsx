'use client';

import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LeafletCompassControlProps {
  position?: L.ControlPosition;
  isDarkTheme?: boolean;
}

export default function LeafletCompassControl({ 
  position = 'topright',
  isDarkTheme = false 
}: LeafletCompassControlProps) {
  const map = useMap();
  const [bearing, setBearing] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const controlRef = useRef<L.Control | null>(null);

  useEffect(() => {
    if (!map) return;

    const CompassControlClass = L.Control.extend({
      onAdd: function() {
        const container = L.DomUtil.create('div', 'leaflet-compass-control');
        container.style.cssText = 'background: none; border: none; padding: 0;';
        
        // Prevent map events on control
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        
        return container;
      }
    });

    controlRef.current = new CompassControlClass({ position });
    map.addControl(controlRef.current);

    const updateBearing = () => {
      // For Leaflet, we track rotation using the map's rotation if available
      // Since basic Leaflet doesn't have rotation, we'll show the compass for any bearing changes
      const currentBearing = 0; // Leaflet doesn't have built-in rotation by default
      setBearing(currentBearing);
      setIsVisible(true); // Always show for Leaflet maps as a north indicator
    };

    // Listen for any map events that might indicate rotation
    map.on('moveend', updateBearing);
    map.on('zoomend', updateBearing);
    
    // Initial update
    updateBearing();

    return () => {
      if (controlRef.current) {
        map.removeControl(controlRef.current);
      }
      map.off('moveend', updateBearing);
      map.off('zoomend', updateBearing);
    };
  }, [map, position]);

  const resetNorth = () => {
    if (!map) return;
    
    // For Leaflet, this serves as a "center and orient north" button
    // We'll center the map to the current view and ensure it's properly oriented
    map.setView(map.getCenter(), map.getZoom(), {
      animate: true,
      duration: 0.5
    });
  };

  useEffect(() => {
    if (!controlRef.current) return;

    const container = controlRef.current.getContainer();
    if (!container) return;

    // Clear previous content
    container.innerHTML = '';

    if (isVisible) {
      // Create React-style button element
      const buttonElement = document.createElement('button');
      buttonElement.className = `
        inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium 
        ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 
        focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none 
        disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground 
        h-10 w-10 shadow-lg border-2 transition-transform duration-200
        ${isDarkTheme 
          ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-600' 
          : 'bg-white hover:bg-gray-100 text-gray-900 border-gray-300'
        }
      `.replace(/\s+/g, ' ').trim();
      
      buttonElement.style.transform = `rotate(${-bearing}deg)`;
      buttonElement.title = 'Reset bearing to north';
      buttonElement.innerHTML = `
        <svg class="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <polygon points="3,11 22,2 13,21 11,13 3,11"></polygon>
        </svg>
      `;
      
      buttonElement.addEventListener('click', resetNorth);
      container.appendChild(buttonElement);
    }
  }, [isVisible, bearing, isDarkTheme]);

  return null;
}