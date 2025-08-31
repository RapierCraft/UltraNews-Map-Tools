'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import type { TransitStop, TransitRoute } from '@/lib/transitService';

interface NativeTransitOverlayProps {
  stops: TransitStop[];
  routes: TransitRoute[];
  enabled: boolean;
  settings: {
    showStations: boolean;
    showLines: boolean;
    routeTypes: {
      metro: boolean;
      bus: boolean;
      rail: boolean;
      ferry: boolean;
      tram: boolean;
    };
  };
  isDarkMode?: boolean;
}

export default function NativeTransitOverlay({
  stops,
  routes,
  enabled,
  settings,
  isDarkMode = false
}: NativeTransitOverlayProps) {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map || !enabled) {
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
      return;
    }

    // Clear existing layer
    if (layerGroupRef.current) {
      map.removeLayer(layerGroupRef.current);
    }

    // Create new layer group
    const layerGroup = L.layerGroup();
    layerGroupRef.current = layerGroup;

    // Filter routes based on settings
    const filteredRoutes = routes.filter(route => {
      const routeType = route.type?.toLowerCase() || '';
      if (routeType.includes('subway') || routeType.includes('metro')) return settings.routeTypes.metro;
      if (routeType.includes('bus')) return settings.routeTypes.bus;
      if (routeType.includes('rail') || routeType.includes('train')) return settings.routeTypes.rail;
      if (routeType.includes('ferry')) return settings.routeTypes.ferry;
      if (routeType.includes('tram') || routeType.includes('light_rail')) return settings.routeTypes.tram;
      return settings.routeTypes.metro; // Default to metro
    });

    // Render transit lines with native styling
    if (settings.showLines) {
      filteredRoutes.forEach(route => {
        if (!route.geometry || route.geometry.length === 0) return;

        const routeType = route.type?.toLowerCase() || '';
        const isMetro = routeType.includes('subway') || routeType.includes('metro');
        const isBus = routeType.includes('bus');
        const isRail = routeType.includes('rail') || routeType.includes('train');
        const isFerry = routeType.includes('ferry');
        
        // Native Google Maps-like styling
        let lineColor = route.color || '#4285F4'; // Default blue
        let lineWeight = 3;
        let lineOpacity = 0.8;
        let dashArray = '';
        
        if (isMetro) {
          // Metro lines - solid, vibrant colors
          lineWeight = 4;
          lineOpacity = 0.9;
          lineColor = route.color || '#FF6B6B';
        } else if (isRail) {
          // Rail lines - slightly thicker, dashed
          lineWeight = 3;
          lineOpacity = 0.7;
          dashArray = '8, 4';
          lineColor = route.color || '#6C63FF';
        } else if (isBus) {
          // Bus lines - thinner, semi-transparent
          lineWeight = 2;
          lineOpacity = 0.5;
          lineColor = route.color || '#52C41A';
        } else if (isFerry) {
          // Ferry lines - dashed blue
          lineWeight = 3;
          lineOpacity = 0.6;
          dashArray = '10, 10';
          lineColor = route.color || '#1890FF';
        }

        // Adjust for dark mode
        if (isDarkMode) {
          lineOpacity = Math.min(lineOpacity + 0.1, 1);
        }

        // Create the main line
        const polyline = L.polyline(
          route.geometry.map(coord => [coord[1], coord[0]]),
          {
            color: lineColor,
            weight: lineWeight,
            opacity: lineOpacity,
            dashArray: dashArray,
            lineCap: 'round',
            lineJoin: 'round',
            className: 'transit-line transit-' + routeType.replace(/\s+/g, '-')
          }
        );

        // Add white outline for metro lines (like Google Maps)
        if (isMetro && lineWeight > 3) {
          const outline = L.polyline(
            route.geometry.map(coord => [coord[1], coord[0]]),
            {
              color: isDarkMode ? '#000000' : '#FFFFFF',
              weight: lineWeight + 2,
              opacity: 0.8,
              lineCap: 'round',
              lineJoin: 'round',
              className: 'transit-line-outline'
            }
          );
          outline.addTo(layerGroup);
        }

        // Add tooltip with route info
        polyline.bindTooltip(
          `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 4px;">
            <strong>${route.name || route.ref || 'Transit Route'}</strong>
            ${route.operator ? `<br><span style="font-size: 0.9em; opacity: 0.8;">${route.operator}</span>` : ''}
          </div>`,
          {
            sticky: true,
            className: 'native-transit-tooltip',
            direction: 'top'
          }
        );

        polyline.addTo(layerGroup);
      });
    }

    // Render transit stops with native styling
    if (settings.showStations) {
      const zoom = map.getZoom();
      const showAllStops = zoom >= 14; // Only show all stops at high zoom
      const filteredStops = showAllStops ? stops : stops.filter(stop => {
        // At lower zoom, only show major stations
        const stopType = stop.type?.toLowerCase() || '';
        return stopType.includes('station') || 
               stopType.includes('subway') || 
               stopType.includes('metro') ||
               stopType.includes('rail');
      });

      filteredStops.forEach(stop => {
        const stopType = stop.type?.toLowerCase() || '';
        const isMetro = stopType.includes('subway') || stopType.includes('metro');
        const isBus = stopType.includes('bus');
        const isRail = stopType.includes('rail') || stopType.includes('train');
        
        // Native marker styling
        let markerSize = 8;
        let markerColor = '#4285F4';
        let borderColor = isDarkMode ? '#000000' : '#FFFFFF';
        let borderWidth = 2;
        
        if (isMetro) {
          markerSize = 10;
          markerColor = '#FF6B6B';
          borderWidth = 3;
        } else if (isRail) {
          markerSize = 9;
          markerColor = '#6C63FF';
        } else if (isBus && zoom >= 15) {
          markerSize = 6;
          markerColor = '#52C41A';
          borderWidth = 1.5;
        } else if (zoom < 15 && !isMetro && !isRail) {
          return; // Skip minor stops at low zoom
        }

        // Create circular marker (like Google Maps)
        const marker = L.circleMarker([stop.lat, stop.lon], {
          radius: markerSize,
          fillColor: markerColor,
          fillOpacity: 0.9,
          color: borderColor,
          weight: borderWidth,
          className: 'transit-stop transit-stop-' + stopType.replace(/\s+/g, '-')
        });

        // Add popup with stop info
        marker.bindPopup(
          `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
              ${stop.name}
            </h3>
            ${stop.type ? `<p style="margin: 4px 0; font-size: 14px; color: #666;">${stop.type}</p>` : ''}
            ${stop.network ? `<p style="margin: 4px 0; font-size: 13px; color: #888;">Network: ${stop.network}</p>` : ''}
            ${stop.operator ? `<p style="margin: 4px 0; font-size: 13px; color: #888;">Operator: ${stop.operator}</p>` : ''}
          </div>`,
          {
            className: 'native-transit-popup',
            maxWidth: 300
          }
        );

        // Show station name on hover (only for major stations)
        if (isMetro || isRail) {
          marker.bindTooltip(stop.name, {
            permanent: zoom >= 15,
            direction: 'top',
            className: 'native-station-label',
            offset: [0, -10],
            opacity: 0.9
          });
        }

        marker.addTo(layerGroup);
      });
    }

    // Add the layer group to the map
    layerGroup.addTo(map);

    // Add custom CSS for native styling
    if (!document.getElementById('native-transit-styles')) {
      const style = document.createElement('style');
      style.id = 'native-transit-styles';
      style.innerHTML = `
        .transit-line {
          transition: opacity 0.3s ease;
        }
        .transit-line:hover {
          opacity: 1 !important;
        }
        .transit-stop {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .transit-stop:hover {
          stroke-width: 4;
        }
        .native-transit-tooltip {
          background: ${isDarkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)'};
          border: none;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          color: ${isDarkMode ? '#FFFFFF' : '#333333'};
          font-size: 13px;
        }
        .native-transit-popup .leaflet-popup-content-wrapper {
          background: ${isDarkMode ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.98)'};
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .native-transit-popup .leaflet-popup-content {
          color: ${isDarkMode ? '#FFFFFF' : '#333333'};
          margin: 12px;
        }
        .native-station-label {
          background: ${isDarkMode ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.9)'};
          border: none;
          border-radius: 3px;
          color: ${isDarkMode ? '#FFFFFF' : '#333333'};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 11px;
          font-weight: 500;
          padding: 2px 6px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
          white-space: nowrap;
        }
        .transit-line-outline {
          pointer-events: none;
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      if (layerGroupRef.current && map) {
        map.removeLayer(layerGroupRef.current);
      }
    };
  }, [map, stops, routes, enabled, settings, isDarkMode]);

  return null;
}