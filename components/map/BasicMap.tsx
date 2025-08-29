'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';

const SimpleMapContainer = dynamic(
  () => import('./SimpleMapContainer'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
        <p className="text-gray-500">Loading map...</p>
      </div>
    )
  }
);
import MapControls from './MapControls';
import SearchBar from './SearchBar';
import SimpleThemeToggle from '@/components/SimpleThemeToggle';
import DraggableInfoModal from './DraggableInfoModal';
import LocationInfoModal from './LocationInfoModal';
import FullArticleModal from './FullArticleModal';
import { Card } from '@/components/ui/card';
import { MapPin, Navigation } from 'lucide-react';

interface Marker {
  id: string;
  position: [number, number];
  popup?: string;
  timestamp?: Date;
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

export default function BasicMap() {
  const [center, setCenter] = useState<[number, number]>([40.7128, -74.0060]); // NYC default
  const [zoom, setZoom] = useState(12);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [currentLayer, setCurrentLayer] = useState('osm-standard');
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ 
    lat: number; 
    lon: number; 
    name: string;
    osm_id?: number;
    osm_type?: string;
    boundingbox?: string[];
    geojson?: object;
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
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [modalSourcePosition, setModalSourcePosition] = useState<{ x: number; y: number } | null>(null);
  const [showFullArticle, setShowFullArticle] = useState(false);

  // Handle theme change
  const handleThemeChange = useCallback((isDark: boolean) => {
    setIsDarkTheme(isDark);
    setCurrentLayer('osm-standard'); // Always use OSM standard with CSS filters
  }, []);

  // Get user location
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
          alert('Unable to get your location. Please check your browser permissions.');
        }
      );
    }
  }, []);

  // Handle search location selection
  const handleLocationSelect = useCallback((result: {
    lat: string;
    lon: string;
    display_name: string;
    osm_id?: number;
    osm_type?: string;
    boundingbox?: string[];
    geojson?: object;
    type?: string;
    class?: string;
  }) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const newCenter: [number, number] = [lat, lon];
    
    const locationData = { 
      lat, 
      lon, 
      name: result.display_name,
      osm_id: result.osm_id,
      osm_type: result.osm_type,
      boundingbox: result.boundingbox,
      geojson: result.geojson,
      type: result.type,
      class: result.class
    };

    setSelectedLocation(locationData);

    // Show advanced modal for administrative areas and notable places
    const shouldShowModal = 
      result.class === 'place' ||
      result.class === 'boundary' ||
      result.type === 'city' ||
      result.type === 'town' ||
      result.type === 'village' ||
      result.type === 'state' ||
      result.type === 'country';
      
    if (shouldShowModal) {
      // Calculate center of screen for modal source position
      setModalSourcePosition({ 
        x: window.innerWidth / 2, 
        y: window.innerHeight / 2 
      });
      setShowLocationModal(true);
    }

    // Add marker for specific locations
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
      setMarkers(prev => prev.filter(m => m.id !== 'search-result'));
    }

    // Fit to bounds if available
    if (result.boundingbox && result.boundingbox.length === 4) {
      const bounds: [[number, number], [number, number]] = [
        [parseFloat(result.boundingbox[0]), parseFloat(result.boundingbox[2])],
        [parseFloat(result.boundingbox[1]), parseFloat(result.boundingbox[3])]
      ];
      setCenter(newCenter);
      setZoom(15);
      setBoundsToFit(bounds);
    } else {
      setCenter(newCenter);
      setZoom(15);
      setBoundsToFit(undefined);
    }
  }, []);

  // Handle POI click to show information modal
  const handleMapClick = useCallback(async (e: { latlng: { lat: number; lng: number } }) => {
    const { lat, lng } = e.latlng;
    
    try {
      // Fetch POI data from OpenStreetMap Overpass API
      const response = await fetch(
        `https://overpass-api.de/api/interpreter?data=[out:json][timeout:25];(node(around:100,${lat},${lng})[amenity];node(around:100,${lat},${lng})[shop];node(around:100,${lat},${lng})[tourism];node(around:100,${lat},${lng})[historic];node(around:100,${lat},${lng})[leisure];node(around:100,${lat},${lng})[office];);out geom;`
      );
      
      if (response.ok) {
        const data = await response.json();
        const elements = data.elements;
        
        if (elements && elements.length > 0) {
          // Find closest POI
          const closest = elements.reduce((closest: any, poi: any) => {
            const distance = Math.sqrt(
              Math.pow(poi.lat - lat, 2) + Math.pow(poi.lon - lng, 2)
            );
            return !closest || distance < closest.distance 
              ? { ...poi, distance } 
              : closest;
          }, null);
          
          if (closest) {
            // Create location data for the modal
            const locationData = {
              lat: closest.lat,
              lon: closest.lon,
              name: closest.tags?.name || closest.tags?.amenity || closest.tags?.shop || 'Unknown POI',
              osm_id: closest.id,
              osm_type: 'node',
              type: closest.tags?.amenity || closest.tags?.shop || closest.tags?.tourism || 'poi',
              class: 'poi',
              tags: closest.tags
            };
            
            setSelectedLocation(locationData);
            setModalSourcePosition({ x: e.originalEvent?.clientX || window.innerWidth / 2, y: e.originalEvent?.clientY || window.innerHeight / 2 });
            setShowLocationModal(true);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch POI data:', error);
    }
  }, []);

  // Clear all markers
  const clearMarkers = useCallback(() => {
    setMarkers([]);
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Top Bar */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex gap-4">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <SearchBar onLocationSelect={handleLocationSelect} />
        </div>

        {/* Quick Actions */}
        <Card className="px-4 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur flex items-center gap-3">
          <button
            onClick={handleLocate}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            title="Get my location"
          >
            <Navigation className="h-4 w-4" />
            My Location
          </button>
          
          {markers.length > 0 && (
            <>
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="inline h-3 w-3 mr-1" />
                {markers.length} marker{markers.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={clearMarkers}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              >
                Clear
              </button>
            </>
          )}
        </Card>

        {/* Theme Toggle */}
        <SimpleThemeToggle onThemeChange={handleThemeChange} />
      </div>

      {/* Map Controls */}
      <MapControls
        onLocate={handleLocate}
        onLayerChange={setCurrentLayer}
        onDataLayersChange={() => {}}
        onBorderSettingsChange={setBorderSettings}
        currentLayer={currentLayer}
        isDarkTheme={isDarkTheme}
        borderSettings={borderSettings}
      />

      {/* Map */}
      <SimpleMapContainer
        center={center}
        zoom={zoom}
        markers={markers}
        tileLayer={currentLayer}
        isDarkTheme={isDarkTheme}
        selectedLocation={selectedLocation}
        borderSettings={borderSettings}
        boundsToFit={boundsToFit}
        className="w-full h-full"
        onClick={handleMapClick}
      />

      {/* Advanced Location Information Modal */}
      {showLocationModal && selectedLocation && !showFullArticle && (
        <DraggableInfoModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          onExpand={() => setShowFullArticle(true)}
          title={selectedLocation.name.split(',')[0]}
          sourcePosition={modalSourcePosition}
          badge={selectedLocation.type || 'Location'}
        >
          <LocationInfoModal 
            location={selectedLocation}
            onClose={() => setShowLocationModal(false)}
          />
        </DraggableInfoModal>
      )}

      {/* Full Article Modal */}
      {showFullArticle && selectedLocation && (
        <FullArticleModal
          title={selectedLocation.name.split(',')[0]}
          isOpen={showFullArticle}
          onClose={() => {
            setShowFullArticle(false);
            setShowLocationModal(true); // Return to location modal
          }}
        />
      )}

      {/* Instructions */}
      <Card className="absolute bottom-4 left-4 z-[1000] px-3 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Click on map POIs to see information • Search for cities/places to explore • Use expand for full articles
        </p>
      </Card>
    </div>
  );
}