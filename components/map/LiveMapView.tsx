'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import DynamicMap from './DynamicMap';
import MapControls from './MapControls';
import SearchBar from './SearchBar';
import SimpleThemeToggle from '@/components/SimpleThemeToggle';
import StoryAnalyzer from './StoryAnalyzer';
import StoryMapLegend from './StoryMapLegend';
import { Card } from '@/components/ui/card';
import { logger } from '@/lib/logger';

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

interface BorderSettings {
  enabled: boolean;
  types: {
    country: boolean;
    state: boolean;
    city: boolean;
    district: boolean;
  };
}

interface NewsStory {
  id: string;
  headline: string;
  content: string;
  publishedAt: Date;
  source: string;
}

interface LiveMapViewProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  liveUpdateInterval?: number;
  onMarkerClick?: (marker: Marker) => void;
}

const defaultDataLayers: LayerState = {
  roads: true,
  buildings: false,
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
  const [selectedLocation, setSelectedLocation] = useState<{ 
    lat: number; 
    lon: number; 
    name: string;
    osm_id?: number;
    osm_type?: string;
    boundingbox?: string[];
    geojson?: any;
    type?: string;
    class?: string;
  } | undefined>();
  const [borderSettings, setBorderSettings] = useState<BorderSettings>({
    enabled: true,
    types: {
      country: true,
      state: true,
      city: true,
      district: false
    }
  });
  const [boundsToFit, setBoundsToFit] = useState<[[number, number], [number, number]] | undefined>();
  const [currentStory, setCurrentStory] = useState<NewsStory | null>(null);
  const [timelinePosition, setTimelinePosition] = useState(100);
  const [isAnalyzingStory, setIsAnalyzingStory] = useState(false);
  const mapRef = useRef<any>(null);

  // Handle theme change from SimpleThemeToggle
  const handleThemeChange = useCallback((isDark: boolean) => {
    logger.mapEvent('theme_change', { isDark });
    setIsDarkTheme(isDark);
    
    // Use standard OSM for both themes to avoid rate limits
    // CSS filters will handle the dark/light appearance
    setCurrentLayer('osm-standard');
  }, []);

  // Track layer changes
  useEffect(() => {
    logger.mapEvent('layer_change', { layer: currentLayer });
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

  const handleLocationSelect = useCallback((result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const newCenter: [number, number] = [lat, lon];
    
    // Set selected location for border overlay with full result data
    setSelectedLocation({ 
      lat, 
      lon, 
      name: result.display_name,
      osm_id: result.osm_id,
      osm_type: result.osm_type,
      boundingbox: result.boundingbox,
      geojson: result.geojson,
      type: result.type,
      class: result.class
    });

    // Only add a marker for specific addresses (buildings, houses, etc.)
    const shouldShowMarker = 
      result.class === 'building' || 
      result.class === 'amenity' ||
      result.class === 'shop' ||
      result.type === 'house' ||
      result.type === 'address';

    if (shouldShowMarker) {
      const searchMarker: Marker = {
        id: 'search-result',
        position: newCenter,
        popup: result.display_name
      };
      setMarkers(prev => [...prev.filter(m => m.id !== 'search-result'), searchMarker]);
    } else {
      // Remove the search marker if it exists
      setMarkers(prev => prev.filter(m => m.id !== 'search-result'));
    }

    // Auto-zoom to fit bounds if available
    if (result.boundingbox && result.boundingbox.length === 4) {
      const bounds: [[number, number], [number, number]] = [
        [parseFloat(result.boundingbox[0]), parseFloat(result.boundingbox[2])],
        [parseFloat(result.boundingbox[1]), parseFloat(result.boundingbox[3])]
      ];
      
      // Store bounds to be used by the map
      setCenter(newCenter);
      setZoom(15); // This will be overridden by fitBounds in MapController
      
      // We'll need to pass bounds to the map
      setBoundsToFit(bounds);
    } else {
      setCenter(newCenter);
      setZoom(15);
      setBoundsToFit(undefined);
    }
  }, []);

  const handleLayerChange = useCallback((layer: string) => {
    setCurrentLayer(layer);
  }, []);

  const handleDataLayersChange = useCallback((layers: LayerState) => {
    logger.mapEvent('data_layers_change', layers);
    setDataLayers(layers);
  }, []);

  const handleBorderSettingsChange = useCallback((settings: BorderSettings) => {
    logger.mapEvent('border_settings_change', settings);
    setBorderSettings(settings);
  }, []);

  const handleStoryAnalyze = useCallback((story: NewsStory) => {
    logger.info('Analyzing news story', { headline: story.headline, source: story.source });
    setCurrentStory(story);
    setIsAnalyzingStory(true);
    
    // Simulate analysis delay
    setTimeout(() => {
      setIsAnalyzingStory(false);
    }, 2000);
  }, []);

  const handleTimelineChange = useCallback((position: number) => {
    setTimelinePosition(position);
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Story Analyzer */}
      <StoryAnalyzer
        onStoryAnalyze={handleStoryAnalyze}
        onTimelineChange={handleTimelineChange}
        currentStory={currentStory}
        isAnalyzing={isAnalyzingStory}
      />

      {/* Top Bar with Search and Theme Toggle */}
      <div className="absolute top-4 left-[420px] right-4 z-[1000] flex gap-4">
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
        onBorderSettingsChange={handleBorderSettingsChange}
        currentLayer={currentLayer}
        isDarkTheme={isDarkTheme}
        borderSettings={borderSettings}
      />

      {/* Map */}
      <DynamicMap
        center={center}
        zoom={zoom}
        markers={markers}
        tileLayer={currentLayer}
        dataLayers={dataLayers}
        isDarkTheme={isDarkTheme}
        selectedLocation={selectedLocation}
        borderSettings={borderSettings}
        boundsToFit={boundsToFit}
        newsStory={currentStory}
        timelinePosition={timelinePosition}
        enableZoomAwareInfo={true}
        className="w-full h-full"
      />

      {/* Story Map Legend - shown when analyzing news story */}
      {currentStory && !isAnalyzingStory && (
        <StoryMapLegend 
          storyType={
            currentStory.headline.toLowerCase().includes('ukraine') || currentStory.content.toLowerCase().includes('war') ? 'ukraine' :
            currentStory.headline.toLowerCase().includes('pipeline') || currentStory.content.toLowerCase().includes('nord stream') ? 'pipeline' :
            currentStory.headline.toLowerCase().includes('bank') || currentStory.content.toLowerCase().includes('silicon valley bank') ? 'banking' :
            'generic'
          }
        />
      )}
    </div>
  );
}