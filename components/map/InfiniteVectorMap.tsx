'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { overpassService } from '@/lib/overpassService';
import 'maplibre-gl/dist/maplibre-gl.css';

interface InfiniteVectorMapProps {
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

export default function InfiniteVectorMap({
  center = [40.7128, -74.0060],
  zoom = 12,
  markers = [],
  className = '',
  style = {},
  selectedLocation,
  onClick,
  currentLayer = 'infinite-vector',
  isDarkTheme = false,
  showBuildings = true
}: InfiniteVectorMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedTiles, setLoadedTiles] = useState<Set<string>>(new Set());

  const loadDataForView = useCallback(async () => {
    if (!map.current || isLoading) return;
    
    setIsLoading(true);
    
    try {
      const mapCenter = map.current.getCenter();
      const mapZoom = Math.floor(map.current.getZoom());
      
      if (mapZoom < 8) {
        setIsLoading(false);
        return; // Don't load data for very low zoom levels
      }
      
      const bbox = overpassService.getBoundingBox([mapCenter.lat, mapCenter.lng], mapZoom);
      const tileKey = `${Math.round(bbox.south * 1000)}-${Math.round(bbox.west * 1000)}-${Math.round(bbox.north * 1000)}-${Math.round(bbox.east * 1000)}-${mapZoom}`;
      
      if (loadedTiles.has(tileKey)) {
        setIsLoading(false);
        return; // Already loaded this area
      }
      
      const geoJSON = await overpassService.fetchOSMData(bbox, mapZoom);
      
      // Add data to map
      const sourceId = `osm-data-${tileKey}`;
      
      if (!map.current.getSource(sourceId)) {
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: geoJSON
        });
        
        // Add layers for different feature types
        addLayersForSource(sourceId, mapZoom);
      }
      
      setLoadedTiles(prev => new Set([...prev, tileKey]));
    } catch (error) {
      console.warn('Failed to load OSM data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, loadedTiles, isDarkTheme, showBuildings]);

  const addLayersForSource = (sourceId: string, zoom: number) => {
    if (!map.current) return;

    // Water areas FIRST (underneath everything)
    map.current.addLayer({
      id: `${sourceId}-water`,
      source: sourceId,
      type: 'fill',
      filter: ['any',
        ['==', ['get', 'natural'], 'water'],
        ['==', ['get', 'waterway'], 'riverbank'],
        ['==', ['get', 'landuse'], 'reservoir'],
        ['==', ['get', 'landuse'], 'basin']
      ],
      paint: {
        'fill-color': isDarkTheme ? '#1e3a5f' : '#a4ccf4',
        'fill-opacity': 0.9
      }
    });

    // Landuse areas
    map.current.addLayer({
      id: `${sourceId}-landuse`,
      source: sourceId,
      type: 'fill',
      filter: ['has', 'landuse'],
      paint: {
        'fill-color': [
          'case',
          ['==', ['get', 'landuse'], 'forest'], isDarkTheme ? '#1a3d1a' : '#aed1ae',
          ['==', ['get', 'landuse'], 'grass'], isDarkTheme ? '#2d4a3d' : '#c8e6c8',
          ['==', ['get', 'landuse'], 'residential'], isDarkTheme ? '#3d3d3d' : '#e8e8e8',
          ['==', ['get', 'landuse'], 'commercial'], isDarkTheme ? '#4a3d3d' : '#ffd4d4',
          ['==', ['get', 'landuse'], 'industrial'], isDarkTheme ? '#3d3d4a' : '#dcd4ff',
          ['==', ['get', 'landuse'], 'farmland'], isDarkTheme ? '#3d4a3d' : '#ffeaa7',
          ['==', ['get', 'landuse'], 'meadow'], isDarkTheme ? '#2d4a2d' : '#d4f1d4',
          isDarkTheme ? '#333333' : '#f5f5f5'
        ],
        'fill-opacity': 0.6
      }
    });

    // Natural areas
    map.current.addLayer({
      id: `${sourceId}-natural`,
      source: sourceId,
      type: 'fill',
      filter: ['all', ['has', 'natural'], ['!=', ['get', 'natural'], 'water']],
      paint: {
        'fill-color': [
          'case',
          ['==', ['get', 'natural'], 'wood'], isDarkTheme ? '#1a3d1a' : '#aed1ae',
          ['==', ['get', 'natural'], 'grassland'], isDarkTheme ? '#2d4a3d' : '#c8e6c8',
          ['==', ['get', 'natural'], 'scrub'], isDarkTheme ? '#3d4a3d' : '#b5d0b5',
          ['==', ['get', 'natural'], 'sand'], isDarkTheme ? '#4a453d' : '#f5e6a3',
          ['==', ['get', 'natural'], 'beach'], isDarkTheme ? '#4a453d' : '#fff1ba',
          isDarkTheme ? '#2a2a2a' : '#f0f0f0'
        ],
        'fill-opacity': 0.7
      }
    });

    // Leisure areas
    map.current.addLayer({
      id: `${sourceId}-leisure`,
      source: sourceId,
      type: 'fill',
      filter: ['has', 'leisure'],
      paint: {
        'fill-color': [
          'case',
          ['==', ['get', 'leisure'], 'park'], isDarkTheme ? '#2d4a3d' : '#c8facc',
          ['==', ['get', 'leisure'], 'garden'], isDarkTheme ? '#2d4a3d' : '#c8facc',
          ['==', ['get', 'leisure'], 'pitch'], isDarkTheme ? '#3d4a3d' : '#aae0aa',
          ['==', ['get', 'leisure'], 'playground'], isDarkTheme ? '#4a3d3d' : '#ffd4aa',
          isDarkTheme ? '#333333' : '#f5f5f5'
        ],
        'fill-opacity': 0.7
      }
    });

    // Buildings (polygons) with proper 3D
    if (showBuildings) {
      map.current.addLayer({
        id: `${sourceId}-buildings`,
        source: sourceId,
        type: 'fill-extrusion',
        filter: ['has', 'building'],
        paint: {
          'fill-extrusion-color': [
            'case',
            ['has', 'building:colour'],
            ['get', 'building:colour'],
            isDarkTheme ? '#404040' : '#d6d6d6'
          ],
          'fill-extrusion-height': [
            'case',
            ['has', 'height'],
            ['to-number', ['get', 'height']],
            ['has', 'building:levels'],
            ['*', ['to-number', ['get', 'building:levels']], 3.5],
            10
          ],
          'fill-extrusion-base': [
            'case',
            ['has', 'min_height'],
            ['to-number', ['get', 'min_height']],
            0
          ],
          'fill-extrusion-opacity': 0.8
        }
      });
    }

    // Railway lines
    map.current.addLayer({
      id: `${sourceId}-railway`,
      source: sourceId,
      type: 'line',
      filter: ['has', 'railway'],
      paint: {
        'line-color': isDarkTheme ? '#888' : '#666',
        'line-width': 2,
        'line-dasharray': [2, 2]
      }
    });

    // Waterways (lines)
    map.current.addLayer({
      id: `${sourceId}-waterways`,
      source: sourceId,
      type: 'line',
      filter: ['has', 'waterway'],
      paint: {
        'line-color': isDarkTheme ? '#1e3a5f' : '#a4ccf4',
        'line-width': [
          'case',
          ['==', ['get', 'waterway'], 'river'], 4,
          ['==', ['get', 'waterway'], 'canal'], 3,
          ['==', ['get', 'waterway'], 'stream'], 2,
          1
        ]
      }
    });

    // Road casings (outlines) - render first for proper layering
    map.current.addLayer({
      id: `${sourceId}-road-casing`,
      source: sourceId,
      type: 'line',
      filter: ['has', 'highway'],
      paint: {
        'line-color': isDarkTheme ? '#222' : '#999',
        'line-width': [
          'interpolate',
          ['exponential', 2],
          ['zoom'],
          8, [
            'case',
            ['in', ['get', 'highway'], ['literal', ['motorway', 'trunk']]], 3,
            ['in', ['get', 'highway'], ['literal', ['primary', 'secondary']]], 2.5,
            2
          ],
          20, [
            'case',
            ['in', ['get', 'highway'], ['literal', ['motorway', 'trunk']]], 20,
            ['in', ['get', 'highway'], ['literal', ['primary', 'secondary']]], 16,
            ['in', ['get', 'highway'], ['literal', ['tertiary', 'residential']]], 12,
            8
          ]
        ],
        'line-gap-width': [
          'interpolate',
          ['exponential', 2],
          ['zoom'],
          8, [
            'case',
            ['in', ['get', 'highway'], ['literal', ['motorway', 'trunk']]], 2,
            ['in', ['get', 'highway'], ['literal', ['primary', 'secondary']]], 1.5,
            1
          ],
          20, [
            'case',
            ['in', ['get', 'highway'], ['literal', ['motorway', 'trunk']]], 16,
            ['in', ['get', 'highway'], ['literal', ['primary', 'secondary']]], 12,
            ['in', ['get', 'highway'], ['literal', ['tertiary', 'residential']]], 8,
            4
          ]
        ]
      }
    });

    // Roads (all types with proper hierarchy)
    map.current.addLayer({
      id: `${sourceId}-roads`,
      source: sourceId,
      type: 'line',
      filter: ['has', 'highway'],
      paint: {
        'line-color': [
          'case',
          ['in', ['get', 'highway'], ['literal', ['motorway', 'motorway_link']]], isDarkTheme ? '#e892a2' : '#e892a2',
          ['in', ['get', 'highway'], ['literal', ['trunk', 'trunk_link']]], isDarkTheme ? '#f9b29c' : '#f9b29c',
          ['in', ['get', 'highway'], ['literal', ['primary', 'primary_link']]], isDarkTheme ? '#fcd6a4' : '#fcd6a4',
          ['in', ['get', 'highway'], ['literal', ['secondary', 'secondary_link']]], isDarkTheme ? '#f7fabf' : '#f7fabf',
          ['in', ['get', 'highway'], ['literal', ['tertiary', 'tertiary_link']]], isDarkTheme ? '#ffffff' : '#ffffff',
          ['in', ['get', 'highway'], ['literal', ['residential', 'living_street']]], isDarkTheme ? '#ffffff' : '#ffffff',
          ['in', ['get', 'highway'], ['literal', ['service', 'unclassified']]], isDarkTheme ? '#ffffff' : '#ffffff',
          ['in', ['get', 'highway'], ['literal', ['pedestrian', 'footway', 'path']]], isDarkTheme ? '#ccc' : '#ededed',
          ['in', ['get', 'highway'], ['literal', ['cycleway']]], isDarkTheme ? '#9cf' : '#d4e4ff',
          isDarkTheme ? '#aaa' : '#ddd'
        ],
        'line-width': [
          'interpolate',
          ['exponential', 2],
          ['zoom'],
          8, [
            'case',
            ['in', ['get', 'highway'], ['literal', ['motorway', 'trunk']]], 2,
            ['in', ['get', 'highway'], ['literal', ['primary', 'secondary']]], 1.5,
            ['in', ['get', 'highway'], ['literal', ['tertiary', 'residential']]], 1,
            0.5
          ],
          20, [
            'case',
            ['in', ['get', 'highway'], ['literal', ['motorway', 'trunk']]], 16,
            ['in', ['get', 'highway'], ['literal', ['primary', 'secondary']]], 12,
            ['in', ['get', 'highway'], ['literal', ['tertiary', 'residential']]], 8,
            ['in', ['get', 'highway'], ['literal', ['service', 'unclassified']]], 4,
            ['in', ['get', 'highway'], ['literal', ['pedestrian', 'footway', 'path', 'cycleway']]], 2,
            3
          ]
        ]
      }
    });

    // POI points
    if (zoom >= 14) {
      map.current.addLayer({
        id: `${sourceId}-pois`,
        source: sourceId,
        type: 'circle',
        filter: ['any', ['has', 'amenity'], ['has', 'shop'], ['has', 'tourism']],
        paint: {
          'circle-radius': [
            'interpolate',
            ['exponential', 2],
            ['zoom'],
            14, 3,
            20, 10
          ],
          'circle-color': [
            'case',
            ['has', 'amenity'], isDarkTheme ? '#ffa500' : '#ff8c00',
            ['has', 'shop'], isDarkTheme ? '#32cd32' : '#228b22',
            ['has', 'tourism'], isDarkTheme ? '#ff69b4' : '#ff1493',
            isDarkTheme ? '#888' : '#666'
          ],
          'circle-stroke-color': isDarkTheme ? '#fff' : '#000',
          'circle-stroke-width': 1
        }
      });

      // POI labels
      map.current.addLayer({
        id: `${sourceId}-poi-labels`,
        source: sourceId,
        type: 'symbol',
        filter: ['any', ['has', 'amenity'], ['has', 'shop'], ['has', 'tourism']],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Regular'],
          'text-size': [
            'interpolate',
            ['exponential', 2],
            ['zoom'],
            14, 10,
            20, 16
          ],
          'text-anchor': 'top',
          'text-offset': [0, 1]
        },
        paint: {
          'text-color': isDarkTheme ? '#ffffff' : '#333333',
          'text-halo-color': isDarkTheme ? '#000000' : '#ffffff',
          'text-halo-width': 1
        }
      });
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'base-tiles': {
            type: 'raster',
            tiles: ['http://localhost:8002/api/v1/tiles/osm/{z}/{x}/{y}.png'],
            tileSize: 256,
            maxzoom: 18
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
            id: 'base-layer',
            type: 'raster',
            source: 'base-tiles',
            paint: {
              'raster-opacity': 0.4 // Dim base tiles so vectors show clearly
            }
          }
        ]
      },
      center: [center[1], center[0]], // MapboxGL uses [lng, lat]
      zoom: zoom,
      accessToken: '' // Not needed for custom data
    });

    map.current.on('load', () => {
      setIsLoaded(true);
      loadDataForView();
    });

    // Load data when map moves
    map.current.on('moveend', () => {
      setTimeout(loadDataForView, 100); // Small delay to avoid rapid requests
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
    map.current.setPaintProperty('background', 'background-color', bgColor);

    // Update all existing layers
    const style = map.current.getStyle();
    style.layers.forEach(layer => {
      if (layer.id.includes('-roads')) {
        // Update road colors
      } else if (layer.id.includes('-buildings')) {
        // Update building colors
      } else if (layer.id.includes('-pois')) {
        // Update POI colors
      }
    });
  }, [isDarkTheme, isLoaded]);

  // Update center and zoom
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    map.current.flyTo({
      center: [center[1], center[0]],
      zoom: zoom,
      duration: 2000
    });
  }, [center, zoom, isLoaded]);

  // Update markers
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.custom-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Add new markers
    markers.forEach(marker => {
      const el = document.createElement('div');
      el.className = 'custom-marker';
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
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-4 right-4 z-[1000] bg-blue-600/90 text-white text-xs px-3 py-2 rounded-full flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          Loading OSM data...
        </div>
      )}
      
      {/* Map mode indicator */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-black/70 text-white text-xs px-2 py-1 rounded">
        Infinite Vector Mode • {loadedTiles.size} areas loaded
      </div>
      
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900">
          <div className="text-center space-y-6">
            <div className="relative">
              <img 
                src="/ultramaps-logo.png" 
                alt="UltraMaps" 
                className="w-20 h-20 mx-auto animate-pulse"
              />
              <div className="absolute inset-0 w-20 h-20 mx-auto border-2 border-blue-400/30 dark:border-cyan-400/30 rounded-full animate-spin"></div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">UltraMaps</h3>
              <p className="text-blue-600 dark:text-cyan-300 text-sm">Loading Infinite Vector Map...</p>
              <div className="w-24 h-0.5 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 dark:from-cyan-400 dark:to-purple-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}