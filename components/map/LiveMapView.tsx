'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import DynamicMap from './DynamicMap';
import MapControls from './MapControls';
import SearchBar from './SearchBar';
import SimpleThemeToggle from '@/components/SimpleThemeToggle';
import { Card } from '@/components/ui/card';

interface Marker {
  id: string;
  position: [number, number];
  popup?: string;
  timestamp?: Date;
}

interface LayerState {
  roads: boolean;
  buildings: boolean;
  waterways: boolean;
  parks: boolean;
  labels: boolean;
  poi: boolean;
  transit: boolean;
  boundaries: boolean;
  landuse: boolean;
  hillshading: boolean;
}

interface LiveMapViewProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  liveUpdateInterval?: number;
  onMarkerClick?: (marker: Marker) => void;
}

const defaultDataLayers: LayerState = {
  roads: true,
  buildings: true,
  waterways: true,
  parks: true,
  labels: true,
  poi: true,
  transit: true,
  boundaries: true,
  landuse: true,
  hillshading: false,
};

export default function LiveMapView({
  initialCenter = [40.7128, -74.0060], // Default to New York
  initialZoom = 12,
  liveUpdateInterval = 5000,
  onMarkerClick
}: LiveMapViewProps) {
  const [center, setCenter] = useState<[number, number]>(initialCenter);
  const [zoom, setZoom] = useState(initialZoom);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [currentLayer, setCurrentLayer] = useState('osm-standard');
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [dataLayers, setDataLayers] = useState<LayerState>(defaultDataLayers);
  const mapRef = useRef<any>(null);

  // Handle theme change from SimpleThemeToggle
  const handleThemeChange = useCallback((isDark: boolean) => {
    console.log('Theme change received:', isDark);
    setIsDarkTheme(isDark);
    
    // Use standard OSM for both themes to avoid rate limits
    // CSS filters will handle the dark/light appearance
    setCurrentLayer('osm-standard');
  }, []);

  // Debug layer changes
  useEffect(() => {
    console.log('Current map layer is now:', currentLayer);
  }, [currentLayer]);

  // Simulate live marker updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      // Simulate receiving new marker data
      const newMarker: Marker = {
        id: `marker-${Date.now()}`,
        position: [
          center[0] + (Math.random() - 0.5) * 0.1,
          center[1] + (Math.random() - 0.5) * 0.1
        ],
        popup: `Live update at ${new Date().toLocaleTimeString()}`,
        timestamp: new Date()
      };

      setMarkers(prev => {
        // Keep only last 20 markers
        const updated = [...prev, newMarker];
        return updated.slice(-20);
      });
    }, liveUpdateInterval);

    return () => clearInterval(interval);
  }, [isLive, center, liveUpdateInterval]);

  const handleLocate = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCenter: [number, number] = [
            position.coords.latitude,
            position.coords.longitude
          ];
          setCenter(newCenter);
          setZoom(15);
          
          // Add user location marker
          const userMarker: Marker = {
            id: 'user-location',
            position: newCenter,
            popup: 'Your current location'
          };
          setMarkers(prev => [...prev.filter(m => m.id !== 'user-location'), userMarker]);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  const handleLocationSelect = useCallback((lat: number, lon: number, name: string) => {
    const newCenter: [number, number] = [lat, lon];
    setCenter(newCenter);
    setZoom(15);

    // Add search result marker
    const searchMarker: Marker = {
      id: 'search-result',
      position: newCenter,
      popup: name
    };
    setMarkers(prev => [...prev.filter(m => m.id !== 'search-result'), searchMarker]);
  }, []);

  const handleLayerChange = useCallback((layer: string) => {
    setCurrentLayer(layer);
  }, []);

  const handleDataLayersChange = useCallback((layers: LayerState) => {
    console.log('Data layers changed:', layers);
    setDataLayers(layers);
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Top Bar with Search and Theme Toggle */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex gap-4">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <SearchBar onLocationSelect={handleLocationSelect} />
        </div>

        {/* Live Status */}
        <Card className="px-4 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm font-medium">
              {isLive ? 'Live' : 'Offline'}
            </span>
          </div>
          <button
            onClick={() => setIsLive(!isLive)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            {isLive ? 'Stop' : 'Start'} Live Updates
          </button>
          {markers.length > 0 && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {markers.length} markers
            </span>
          )}
        </Card>

        {/* Theme Toggle */}
        <SimpleThemeToggle onThemeChange={handleThemeChange} />
      </div>

      {/* Map Controls */}
      <MapControls
        onLocate={handleLocate}
        onLayerChange={handleLayerChange}
        onDataLayersChange={handleDataLayersChange}
        currentLayer={currentLayer}
        isDarkTheme={isDarkTheme}
      />

      {/* Map */}
      <DynamicMap
        center={center}
        zoom={zoom}
        markers={markers}
        tileLayer={currentLayer}
        dataLayers={dataLayers}
        isDarkTheme={isDarkTheme}
        className="w-full h-full"
      />
    </div>
  );
}