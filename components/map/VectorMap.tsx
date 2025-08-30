'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import CompassControl from './CompassControl';

interface VectorMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    popup?: string;
    id: string;
  }>;
  className?: string;
  style?: React.CSSProperties;
  selectedLocation?: {
    lat: number;
    lon: number;
    name: string;
    osm_id?: number;
    osm_type?: string;
    type?: string;
    class?: string;
    tags?: any;
  };
  onClick?: (e: { position: { latitude: number; longitude: number }; screenPosition?: { x: number; y: number } }) => void;
  currentLayer?: string;
  isDarkTheme?: boolean;
  showBuildings?: boolean;
}

export default function VectorMap({
  center = [40.7128, -74.0060],
  zoom = 12,
  markers = [],
  className = '',
  style = {},
  selectedLocation,
  onClick,
  currentLayer = 'maptiler-vector',
  isDarkTheme = false,
  showBuildings = true
}: VectorMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    // Create MapLibre map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          maptiler: {
            type: 'vector',
            tiles: ['http://localhost:8001/api/v1/tiles/maptiler/{z}/{x}/{y}.pbf'],
            maxzoom: 14
          }
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': isDarkTheme ? '#1a1a1a' : '#f8f9fa'
            }
          },
          {
            id: 'water',
            source: 'maptiler',
            'source-layer': 'water',
            type: 'fill',
            paint: {
              'fill-color': isDarkTheme ? '#1e3a5f' : '#a4ccf4'
            }
          },
          {
            id: 'landcover',
            source: 'maptiler',
            'source-layer': 'landcover',
            type: 'fill',
            paint: {
              'fill-color': [
                'case',
                ['==', ['get', 'class'], 'grass'], isDarkTheme ? '#2d4a3d' : '#e8f5e8',
                ['==', ['get', 'class'], 'wood'], isDarkTheme ? '#2d3d2d' : '#d4e7d4',
                ['==', ['get', 'class'], 'sand'], isDarkTheme ? '#4a453d' : '#f7f3e8',
                isDarkTheme ? '#2a2a2a' : '#f0f0f0'
              ]
            }
          },
          {
            id: 'landuse',
            source: 'maptiler',
            'source-layer': 'landuse',
            type: 'fill',
            paint: {
              'fill-color': [
                'case',
                ['==', ['get', 'class'], 'residential'], isDarkTheme ? '#3d3d3d' : '#eeeeee',
                ['==', ['get', 'class'], 'commercial'], isDarkTheme ? '#4a3d3d' : '#f5e8e8',
                ['==', ['get', 'class'], 'industrial'], isDarkTheme ? '#3d3d4a' : '#e8e8f5',
                ['==', ['get', 'class'], 'park'], isDarkTheme ? '#2d4a3d' : '#e8f5e8',
                isDarkTheme ? '#333333' : '#f5f5f5'
              ]
            }
          },
          {
            id: 'roads-casing',
            source: 'maptiler',
            'source-layer': 'transportation',
            type: 'line',
            paint: {
              'line-color': isDarkTheme ? '#555' : '#fff',
              'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                6, ['case', ['in', ['get', 'class'], ['literal', ['motorway', 'trunk']]], 1, 0],
                10, ['case', ['in', ['get', 'class'], ['literal', ['motorway', 'trunk']]], 6, ['in', ['get', 'class'], ['literal', ['primary', 'secondary']]], 4, 2],
                15, ['case', ['in', ['get', 'class'], ['literal', ['motorway', 'trunk']]], 12, ['in', ['get', 'class'], ['literal', ['primary', 'secondary']]], 8, 4]
              ]
            }
          },
          {
            id: 'roads',
            source: 'maptiler',
            'source-layer': 'transportation',
            type: 'line',
            paint: {
              'line-color': [
                'case',
                ['in', ['get', 'class'], ['literal', ['motorway', 'trunk']]], isDarkTheme ? '#ff6b35' : '#ff8c42',
                ['in', ['get', 'class'], ['literal', ['primary', 'secondary']]], isDarkTheme ? '#ffa500' : '#ffb347',
                isDarkTheme ? '#666' : '#ccc'
              ],
              'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                6, ['case', ['in', ['get', 'class'], ['literal', ['motorway', 'trunk']]], 0.5, 0],
                10, ['case', ['in', ['get', 'class'], ['literal', ['motorway', 'trunk']]], 4, ['in', ['get', 'class'], ['literal', ['primary', 'secondary']]], 2, 1],
                15, ['case', ['in', ['get', 'class'], ['literal', ['motorway', 'trunk']]], 8, ['in', ['get', 'class'], ['literal', ['primary', 'secondary']]], 6, 2]
              ]
            }
          },
          {
            id: 'buildings',
            source: 'maptiler',
            'source-layer': 'building',
            type: 'fill-extrusion',
            paint: {
              'fill-extrusion-color': isDarkTheme ? '#404040' : '#d6d6d6',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.8
            },
            layout: {
              visibility: showBuildings ? 'visible' : 'none'
            }
          },
          {
            id: 'place-labels',
            source: 'maptiler',
            'source-layer': 'place',
            type: 'symbol',
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Noto Sans Regular'],
              'text-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                6, ['case', ['==', ['get', 'class'], 'country'], 12, 0],
                10, ['case', ['==', ['get', 'class'], 'country'], 16, ['==', ['get', 'class'], 'state'], 14, ['==', ['get', 'class'], 'city'], 12, 0],
                15, ['case', ['==', ['get', 'class'], 'country'], 18, ['==', ['get', 'class'], 'state'], 16, ['==', ['get', 'class'], 'city'], 14, 10]
              ],
              'text-anchor': 'center'
            },
            paint: {
              'text-color': isDarkTheme ? '#ffffff' : '#333333',
              'text-halo-color': isDarkTheme ? '#000000' : '#ffffff',
              'text-halo-width': 1
            }
          }
        ]
      },
      center: [center[1], center[0]], // MapLibre uses [lng, lat]
      zoom: zoom
    });

    map.current.on('load', () => {
      setIsLoaded(true);
    });

    // Handle map clicks
    if (onClick) {
      map.current.on('click', (e) => {
        onClick({
          position: { latitude: e.lngLat.lat, longitude: e.lngLat.lng },
          screenPosition: { x: e.point.x, y: e.point.y }
        });
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Update theme
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const bgColor = isDarkTheme ? '#1a1a1a' : '#f8f9fa';
    const waterColor = isDarkTheme ? '#1e3a5f' : '#a4ccf4';
    const buildingColor = isDarkTheme ? '#404040' : '#d6d6d6';
    const textColor = isDarkTheme ? '#ffffff' : '#333333';
    const textHaloColor = isDarkTheme ? '#000000' : '#ffffff';

    map.current.setPaintProperty('background', 'background-color', bgColor);
    map.current.setPaintProperty('water', 'fill-color', waterColor);
    map.current.setPaintProperty('buildings', 'fill-extrusion-color', buildingColor);
    map.current.setPaintProperty('place-labels', 'text-color', textColor);
    map.current.setPaintProperty('place-labels', 'text-halo-color', textHaloColor);
  }, [isDarkTheme, isLoaded]);

  // Update buildings visibility
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    map.current.setLayoutProperty('buildings', 'visibility', showBuildings ? 'visible' : 'none');
  }, [showBuildings, isLoaded]);

  // Update center and zoom
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    map.current.flyTo({
      center: [center[1], center[0]], // MapboxGL uses [lng, lat]
      zoom: zoom,
      duration: 2000
    });
  }, [center, zoom, isLoaded]);

  // Update markers
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Remove existing markers
    markers.forEach(marker => {
      const existingMarker = document.getElementById(`marker-${marker.id}`);
      if (existingMarker) {
        existingMarker.remove();
      }
    });

    // Add new markers
    markers.forEach(marker => {
      const el = document.createElement('div');
      el.id = `marker-${marker.id}`;
      el.className = 'marker';
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#ffff00';
      el.style.border = '2px solid #000';
      el.style.cursor = 'pointer';

      new maplibregl.Marker(el)
        .setLngLat([marker.position[1], marker.position[0]])
        .addTo(map.current!);

      if (marker.popup) {
        const popup = new maplibregl.Popup({ offset: 25 })
          .setHTML(`<p>${marker.popup}</p>`);
        
        el.addEventListener('click', () => {
          popup.setLngLat([marker.position[1], marker.position[0]])
            .addTo(map.current!);
        });
      }
    });
  }, [markers, isLoaded]);

  return (
    <div className={`relative w-full h-full ${className}`} style={style}>
      <div 
        ref={mapContainer}
        className="w-full h-full"
      />
      <CompassControl 
        map={map.current} 
        position="topright"
        isDarkTheme={isDarkTheme}
      />
    </div>
  );
}