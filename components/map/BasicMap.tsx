'use client';

import { useCallback, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import LoadingScreen from './LoadingScreen';

const VectorCesiumWrapper = dynamic(
  () => import('./VectorCesiumWrapper'),
  { 
    ssr: false,
    loading: () => <LoadingScreen />
  }
);
import MapControls from './MapControls';
import SearchBar from './SearchBar';
import SimpleThemeToggle from '@/components/SimpleThemeToggle';
import DraggableInfoModal from './DraggableInfoModal';
import LocationInfoModal from './LocationInfoModal';
import FullArticleModal from './FullArticleModal';
import { Card } from '@/components/ui/card';
import { MapPin, Navigation, Globe, Map } from 'lucide-react';

interface Marker {
  id: string;
  position: [number, number];
  popup?: string;
  timestamp?: Date;
  accuracy?: number;
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

interface NavigationRoute {
  total_distance_m: number;
  total_traffic_duration_s: number;
  segments: Array<{
    instructions: string;
    distance_m: number;
    traffic_duration_s: number;
  }>;
  overview_geometry: number[][];
}

interface BasicMapProps {
  navigationRoute?: NavigationRoute | null;
  showTrafficOverlay?: boolean;
  navigationMode?: boolean;
  onRouteRequest?: (route: NavigationRoute) => void;
  onNavigationStart?: (origin: any, destination: any) => void;
}

export default function BasicMap({ 
  navigationRoute, 
  showTrafficOverlay, 
  navigationMode = false,
  onRouteRequest,
  onNavigationStart 
}: BasicMapProps = {}) {
  const [center, setCenter] = useState<[number, number]>([40.7128, -74.0060]); // NYC default
  const [zoom, setZoom] = useState(12);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [currentLayer, setCurrentLayer] = useState('osm-standard');
  const [calculatedRoute, setCalculatedRoute] = useState<NavigationRoute | null>(navigationRoute || null);
  const [useVectorTiles, setUseVectorTiles] = useState(true);
  const [mapHeading, setMapHeading] = useState(0);
  const cesiumViewerRef = useRef<unknown>(null);
  const [dataLayers, setDataLayers] = useState({
    roads: true,
    buildings: false,
    waterways: true,
    parks: true,
    labels: true,
    poi: true
  });
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [showBuildings, setShowBuildings] = useState(true);
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
  const [manualLayerSelection, setManualLayerSelection] = useState(false);

  // Handle theme change
  const handleThemeChange = useCallback((isDark: boolean) => {
    setIsDarkTheme(isDark);
    // Only auto-switch if user hasn't manually selected a layer
    if (!manualLayerSelection) {
      if (isDark && currentLayer === 'osm-standard') {
        setCurrentLayer('osm-dark');
      } else if (!isDark && currentLayer === 'osm-dark') {
        setCurrentLayer('osm-standard');
      }
    }
  }, [currentLayer, manualLayerSelection]);

  // Handle layer change and sync theme state
  const handleLayerChange = useCallback((layer: string) => {
    console.log('Layer change requested:', layer);
    setManualLayerSelection(true); // Mark as manual selection
    setCurrentLayer(layer);
    // Update theme state to match layer selection
    if (layer === 'osm-dark') {
      console.log('Setting theme to dark');
      setIsDarkTheme(true);
    } else if (layer === 'osm-standard') {
      console.log('Setting theme to light');
      setIsDarkTheme(false);
    }
    // For satellite, keep current theme state
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
          
          // Calculate zoom based on accuracy - larger accuracy areas need lower zoom
          const accuracy = position.coords.accuracy || 50;
          let appropriateZoom;
          if (accuracy > 1000) appropriateZoom = 11;      // Very low accuracy
          else if (accuracy > 500) appropriateZoom = 12;  // Low accuracy  
          else if (accuracy > 200) appropriateZoom = 13;  // Medium accuracy
          else if (accuracy > 100) appropriateZoom = 14;  // Good accuracy
          else if (accuracy > 50) appropriateZoom = 15;   // High accuracy
          else appropriateZoom = 16;                      // Very high accuracy
          
          setZoom(appropriateZoom);
          
          // Add user location marker with special type
          const userMarker: Marker = {
            id: 'user-location',
            position: newCenter,
            popup: `Your current location (±${Math.round(position.coords.accuracy || 0)}m accuracy)`,
            accuracy: position.coords.accuracy || 50
          };
          setMarkers(prev => [...prev.filter(m => m.id !== 'user-location'), userMarker]);
        },
        (error) => {
          console.error('Error getting location:', error);
          let errorMessage = 'Unable to get your location. ';
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Please allow location access in your browser.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location request timed out.';
              break;
            default:
              errorMessage += 'Please check your browser permissions.';
          }
          alert(errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
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

    console.log('Search result data:', result);
    console.log('Location data set:', locationData);

    setSelectedLocation(locationData);

    // Show advanced modal for administrative areas and notable places
    const shouldShowModal = 
      result.class === 'place' ||
      result.class === 'boundary' ||
      result.type === 'city' ||
      result.type === 'town' ||
      result.type === 'village' ||
      result.type === 'state' ||
      result.type === 'country' ||
      result.type === 'administrative';
      
    console.log('Should show modal:', shouldShowModal, 'Class:', result.class, 'Type:', result.type);
      
    if (shouldShowModal) {
      // Calculate center of screen for modal source position
      setModalSourcePosition({ 
        x: window.innerWidth / 2, 
        y: window.innerHeight / 2 
      });
      setShowLocationModal(true);
      console.log('Modal should be opening now');
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
      
      // Calculate appropriate zoom level based on bounding box size
      const latDiff = Math.abs(parseFloat(result.boundingbox[1]) - parseFloat(result.boundingbox[0]));
      const lonDiff = Math.abs(parseFloat(result.boundingbox[3]) - parseFloat(result.boundingbox[2]));
      const maxDiff = Math.max(latDiff, lonDiff);
      
      // Calculate zoom based on area size - larger areas get lower zoom
      let calculatedZoom;
      if (maxDiff > 50) calculatedZoom = 3;        // Countries/continents
      else if (maxDiff > 20) calculatedZoom = 4;   // Large countries
      else if (maxDiff > 10) calculatedZoom = 5;   // Medium countries/states
      else if (maxDiff > 5) calculatedZoom = 6;    // Small states/large cities
      else if (maxDiff > 2) calculatedZoom = 8;    // Cities
      else if (maxDiff > 1) calculatedZoom = 10;   // Small cities
      else if (maxDiff > 0.1) calculatedZoom = 12; // Districts
      else calculatedZoom = 15;                     // Small areas
      
      setZoom(calculatedZoom);
      setBoundsToFit(bounds);
      console.log(`Fitting bounds for ${result.display_name}: zoom=${calculatedZoom}, bounds=`, bounds);
    } else {
      setCenter(newCenter);
      setZoom(15);
      setBoundsToFit(undefined);
    }
  }, []);

  // Handle POI click to show information modal (adapted for Cesium)
  const handleMapClick = useCallback(async (e: { position: { latitude: number; longitude: number }; screenPosition?: { x: number; y: number } }) => {
    const { latitude: lat, longitude: lng } = e.position;
    
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
            setModalSourcePosition(e.screenPosition || { x: window.innerWidth / 2, y: window.innerHeight / 2 });
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

  // Handle compass click to reset map bearing
  const handleCompassClick = useCallback(() => {
    if (cesiumViewerRef.current && window.Cesium) {
      const camera = cesiumViewerRef.current.camera;
      const currentPosition = camera.position.clone();
      
      camera.flyTo({
        destination: currentPosition,
        orientation: {
          heading: 0.0,
          pitch: window.Cesium.Math.toRadians(-90),
          roll: 0.0
        },
        duration: 0.5
      });
    }
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Top Bar */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex gap-4">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <SearchBar 
            onLocationSelect={handleLocationSelect}
            onRouteRequest={async (origin, destination, mode) => {
              // Calculate route using the backend API
              console.log('Route calculation requested:', { origin, destination, mode });
              try {
                // Try public OSRM API first
                const osrmMode = mode === 'driving' ? 'car' : mode === 'cycling' ? 'bike' : 'foot';
                const osrmUrl = `https://router.project-osrm.org/route/v1/${osrmMode}/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson&steps=true`;
                
                console.log('Fetching route from OSRM:', osrmUrl);
                const osrmResponse = await fetch(osrmUrl);
                
                if (osrmResponse.ok) {
                  const osrmData = await osrmResponse.json();
                  console.log('OSRM response:', osrmData);
                  
                  if (osrmData.routes && osrmData.routes.length > 0) {
                    const osrmRoute = osrmData.routes[0];
                    const route = {
                      total_distance_m: osrmRoute.distance,
                      total_duration_s: osrmRoute.duration,
                      total_traffic_duration_s: osrmRoute.duration,
                      segments: osrmRoute.legs[0]?.steps || [],
                      overview_geometry: osrmRoute.geometry.coordinates,
                      traffic_delay_s: 0,
                      confidence: 0.9
                    };
                    
                    console.log('Processed route with geometry:', route.overview_geometry.length, 'points');
                    setCalculatedRoute(route);
                    
                    if (onRouteRequest) {
                      onRouteRequest(route);
                    }
                    return;
                  }
                }
                
                // Fallback to backend API
                const requestBody = {
                  origin,
                  destination,
                  profile: mode === 'driving' ? 'driving-traffic' : mode,
                  include_alternatives: false
                };
                console.log('Falling back to backend API:', requestBody);
                const response = await fetch('http://localhost:8001/api/v1/routing/calculate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(requestBody)
                });

                if (response.ok) {
                  const data = await response.json();
                  console.log('Backend API response:', data);
                  const route = data.primary_route;
                  
                  // If still no geometry, create straight line
                  if (!route.overview_geometry || route.overview_geometry.length === 0) {
                    console.log('Creating fallback straight line');
                    route.overview_geometry = [
                      [origin.lon, origin.lat],
                      [destination.lon, destination.lat]
                    ];
                  }
                  
                  setCalculatedRoute(route);
                  if (onRouteRequest) {
                    onRouteRequest(route);
                  }
                }
              } catch (error) {
                console.error('Route calculation failed:', error);
                // Last resort - straight line
                const fallbackRoute = {
                  total_distance_m: 0,
                  total_duration_s: 0,
                  total_traffic_duration_s: 0,
                  segments: [],
                  overview_geometry: [
                    [origin.lon, origin.lat],
                    [destination.lon, destination.lat]
                  ],
                  traffic_delay_s: 0,
                  confidence: 0.1
                };
                setCalculatedRoute(fallbackRoute);
              }
            }}
            showModeSelector={true}
            navigationMode={navigationMode}
          />
        </div>


        {/* Theme Toggle */}
        <SimpleThemeToggle onThemeChange={handleThemeChange} />
      </div>

      {/* Map Controls for tile layer selection */}
      <MapControls
        onLocate={handleLocate}
        onLayerChange={handleLayerChange}
        onDataLayersChange={setDataLayers}
        onBorderSettingsChange={setBorderSettings}
        onBuildingsToggle={setShowBuildings}
        onCompassClick={handleCompassClick}
        currentLayer={currentLayer}
        isDarkTheme={isDarkTheme}
        borderSettings={borderSettings}
        showBuildings={showBuildings}
        mapHeading={mapHeading}
      />

      {/* Vector-Enhanced Cesium Globe */}
      <VectorCesiumWrapper
        center={center}
        zoom={zoom}
        markers={markers}
        selectedLocation={selectedLocation}
        boundsToFit={boundsToFit}
        className="w-full h-full"
        onClick={handleMapClick}
        currentLayer={currentLayer}
        isDarkTheme={isDarkTheme}
        showBuildings={showBuildings}
        useVectorTiles={useVectorTiles}
        dataLayers={dataLayers}
        onViewerReady={(viewer) => { cesiumViewerRef.current = viewer; }}
        onHeadingChange={setMapHeading}
        navigationRoute={calculatedRoute}
        showTrafficOverlay={showTrafficOverlay}
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
          3D Globe Mode • Interactive 3D terrain • Click POIs for info • Search to explore
        </p>
      </Card>
    </div>
  );
}