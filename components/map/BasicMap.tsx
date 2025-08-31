'use client';

import { useCallback, useState, useRef, useMemo } from 'react';
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
import { 
  processOSRMSteps, 
  generateRouteHighlights, 
  estimateTolls, 
  estimateFuelConsumption,
  type ProcessedRouteStep 
} from '@/lib/routeInstructionProcessor';

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
  total_duration_s: number;
  total_traffic_duration_s: number;
  segments: ProcessedRouteStep[];
  overview_geometry: number[][];
  traffic_delay_s: number;
  confidence: number;
  route_highlights?: string[];
  tolls?: {
    amount: number;
    currency: string;
    locations: number;
  };
  fuel_consumption?: {
    liters: number;
    cost_estimate: number;
  };
}

interface BasicMapProps {
  navigationRoute?: NavigationRoute | null;
  showTrafficOverlay?: boolean;
  navigationMode?: boolean;
  hideControls?: boolean;
  onRouteRequest?: (route: NavigationRoute, origin?: any, destination?: any) => void;
  onNavigationStart?: (origin: any, destination: any) => void;
}

export default function BasicMap({ 
  navigationRoute, 
  showTrafficOverlay, 
  navigationMode = false,
  hideControls = false,
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

  // Handle zoom-aware map clicks to show appropriate information
  const handleMapClick = useCallback(async (e: { position: { latitude: number; longitude: number }; screenPosition?: { x: number; y: number } }) => {
    const { latitude: lat, longitude: lng } = e.position;
    
    console.log('Map click at zoom:', zoom, 'position:', lat, lng);
    
    // Determine what type of feature should be prioritized at this zoom level
    let targetFeatureType = '';
    
    // Check if this might be a click on an administrative boundary
    const isLikelyBoundaryClick = await checkForAdminBoundaryClick(lat, lng, zoom);
    
    if (isLikelyBoundaryClick) {
      targetFeatureType = 'admin_boundary';
    } else if (zoom <= 5) {
      targetFeatureType = 'country';
    } else if (zoom <= 8) {
      targetFeatureType = 'state';
    } else if (zoom <= 12) {
      targetFeatureType = 'city';
    } else if (zoom <= 15) {
      targetFeatureType = 'road';
    } else {
      targetFeatureType = 'building';
    }
    
    try {
      console.log('Performing smart geocode with target type:', targetFeatureType);
      const result = await performSmartReverseGeocode(lat, lng, zoom, targetFeatureType);
      console.log('Smart geocode result:', result);
      
      if (result) {
        // Create location data for the modal
        const locationData = {
          lat: parseFloat(result.lat) || lat,
          lon: parseFloat(result.lon) || lng,
          name: result.name || result.display_name?.split(',')[0] || 'Unknown Location',
          osm_id: result.osm_id,
          osm_type: result.osm_type || 'node',
          type: result.type || 'unknown',
          class: result.class || 'place',
          tags: result.extratags || {}
        };
        
        console.log('Setting location data:', locationData);
        setSelectedLocation(locationData);
        setModalSourcePosition(e.screenPosition || { x: window.innerWidth / 2, y: window.innerHeight / 2 });
        setShowLocationModal(true);
      } else {
        console.log('No result returned from smart geocode');
      }
    } catch (error) {
      console.error('Feature click detection failed:', error);
    }
  }, [zoom]);

  // Check if click might be on an administrative boundary by looking for nearby admin features
  const checkForAdminBoundaryClick = async (lat: number, lon: number, zoom: number): Promise<boolean> => {
    // For very low zoom (country level), always try boundary detection
    if (zoom <= 5) return true;
    
    // Only check for boundaries at zoom levels where they're typically visible
    if (zoom < 6 || zoom > 16) return false;
    
    try {
      // Quick check: get a reverse geocoding result and see if we're near administrative boundaries
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        zoom: '10', // Medium zoom for admin detection
        format: 'json',
        addressdetails: '1',
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${params}`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'MapMap-Tools/1.0',
          }
        }
      );

      if (!response.ok) return false;
      
      const result = await response.json();
      
      // Heuristic: if we have rich administrative info, user might be clicking on boundaries
      const address = result.address || {};
      const hasMultipleAdminLevels = [
        address.country,
        address.state || address.region || address.province,
        address.county,
        address.city || address.town,
        address.suburb || address.district
      ].filter(Boolean).length;
      
      // If we have 3+ admin levels and zoom is in boundary-visible range, likely a boundary click
      return hasMultipleAdminLevels >= 3 && zoom >= 8 && zoom <= 15;
    } catch (error) {
      return false;
    }
  };

  // Smart reverse geocoding that tries to find the most relevant feature for the zoom level
  const performSmartReverseGeocode = async (lat: number, lon: number, zoom: number, targetType: string) => {
    try {
      // For administrative boundaries, try multiple approaches
      if (targetType === 'admin_boundary') {
        return await detectAdminBoundary(lat, lon, zoom);
      }
      
      // Use different zoom levels for Nominatim based on what we're looking for
      const zoomMap: Record<string, number> = {
        'country': 3,
        'state': 5, 
        'city': 10,
        'road': 16,
        'building': 18
      };
      
      const nominatimZoom = zoomMap[targetType] || Math.floor(zoom);
      
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        zoom: nominatimZoom.toString(),
        format: 'json',
        addressdetails: '1',
        extratags: '1',
        namedetails: '1',
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${params}`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'MapMap-Tools/1.0',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Post-process the result to match what should be visible at this zoom
      return adaptResultForZoom(result, zoom, targetType);
    } catch (error) {
      console.error('Smart reverse geocoding failed:', error);
      return null;
    }
  };

  // Special function to detect administrative boundaries
  const detectAdminBoundary = async (lat: number, lon: number, zoom: number) => {
    try {
      // For very low zoom (country level), use a different approach
      if (zoom <= 5) {
        return await detectCountryBoundary(lat, lon);
      }
      
      // Fallback to regular reverse geocoding but prioritize admin features
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        zoom: (zoom <= 10 ? Math.max(zoom - 2, 3) : Math.min(zoom, 14)).toString(),
        format: 'json',
        addressdetails: '1',
        extratags: '1',
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${params}`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'MapMap-Tools/1.0',
          }
        }
      );

      if (!response.ok) return null;
      
      const result = await response.json();
      return adaptAdminResult(result, zoom);
    } catch (error) {
      console.error('Admin boundary detection failed:', error);
      return null;
    }
  };

  // Special function to detect country boundaries at low zoom
  const detectCountryBoundary = async (lat: number, lon: number) => {
    try {
      console.log('Detecting country boundary at:', lat, lon);
      
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        zoom: '3', // Low zoom for country detection
        format: 'json',
        addressdetails: '1',
        extratags: '1',
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${params}`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'MapMap-Tools/1.0',
          }
        }
      );

      if (!response.ok) {
        console.error('Country detection request failed:', response.status);
        return null;
      }

      const result = await response.json();
      console.log('Country detection result:', result);
      
      if (result && result.address?.country) {
        // Force it to be a country boundary result
        const adapted = {
          ...result,
          name: result.address.country,
          display_name: result.address.country,
          type: 'country',
          class: 'boundary',
          admin_level: '2', // Country level
        };
        
        console.log('Adapted country result:', adapted);
        return adapted;
      }
      
      return result;
    } catch (error) {
      console.error('Country boundary detection failed:', error);
      return null;
    }
  };

  // Adapt admin results for display
  const adaptAdminResult = (result: any, zoom: number) => {
    if (!result) return null;
    
    const adapted = { ...result };
    const address = result.address || {};
    
    // Force the result to show admin boundary information based on zoom level
    if (zoom <= 5 && address.country) {
      // Country level
      adapted.display_name = address.country;
      adapted.name = address.country;
      adapted.type = 'country';
      adapted.class = 'boundary';
      adapted.admin_level = '2'; // Country level
    } else if (zoom >= 6 && zoom <= 10 && address.state) {
      // State level  
      adapted.display_name = address.state;
      adapted.name = address.state;
      adapted.type = 'state';
      adapted.class = 'boundary';
      adapted.admin_level = '4'; // State level
    } else if (zoom >= 8 && zoom <= 15 && address.state) {
      adapted.display_name = address.state;
      adapted.name = address.state;
      adapted.type = 'state';
      adapted.class = 'boundary';
      adapted.admin_level = '4'; // State level
    } else if (zoom >= 11 && zoom <= 16 && address.county) {
      adapted.display_name = address.county;
      adapted.name = address.county;
      adapted.type = 'county';
      adapted.class = 'boundary';
      adapted.admin_level = '6'; // County level
    }
    
    return adapted;
  };

  // Adapt the geocoding result to show the most appropriate information for the zoom level
  const adaptResultForZoom = (result: any, zoom: number, targetType: string) => {
    if (!result) return null;
    
    const adapted = { ...result };
    const address = result.address || {};
    
    // Force the display name and type to match the zoom level expectation
    if (targetType === 'country' && address.country) {
      adapted.display_name = address.country;
      adapted.name = address.country;
      adapted.type = 'country';
      adapted.class = 'place';
    } else if (targetType === 'state' && address.state) {
      adapted.display_name = address.state;
      adapted.name = address.state;
      adapted.type = 'state';
      adapted.class = 'place';
    } else if (targetType === 'city' && (address.city || address.town)) {
      const cityName = address.city || address.town;
      adapted.display_name = cityName;
      adapted.name = cityName;
      adapted.type = address.city ? 'city' : 'town';
      adapted.class = 'place';
    } else if (targetType === 'road' && address.road) {
      adapted.display_name = address.road;
      adapted.name = address.road;
      adapted.type = 'highway'; 
      adapted.class = 'highway';
    }
    
    return adapted;
  };

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
      {/* Top Bar - Hide during live navigation */}
      {!hideControls && (
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
                    
                    // Process OSRM steps into Google Maps-style instructions
                    const processedSteps = processOSRMSteps(osrmRoute.legs[0]?.steps || []);
                    const routeHighlights = generateRouteHighlights(processedSteps);
                    const tolls = estimateTolls(processedSteps);
                    const fuelConsumption = estimateFuelConsumption(osrmRoute.distance);
                    
                    const route = {
                      total_distance_m: osrmRoute.distance,
                      total_duration_s: osrmRoute.duration,
                      total_traffic_duration_s: osrmRoute.duration,
                      segments: processedSteps,
                      overview_geometry: osrmRoute.geometry.coordinates,
                      traffic_delay_s: 0,
                      confidence: 0.9,
                      route_highlights: routeHighlights,
                      tolls,
                      fuel_consumption: fuelConsumption
                    };
                    
                    console.log('Processed route with geometry:', route.overview_geometry.length, 'points');
                    setCalculatedRoute(route);
                    
                    console.log('onRouteRequest available:', !!onRouteRequest);
                    if (onRouteRequest) {
                      console.log('Calling onRouteRequest with:', { route: route.total_distance_m + 'm', origin, destination });
                      onRouteRequest(route, origin, destination);
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
                    onRouteRequest(route, origin, destination);
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
      )}

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

      {/* UltraMaps Branding */}
      <div className="absolute bottom-4 left-4 z-[1000] flex items-center gap-3">
        <img 
          src="/ultramaps-logo.png" 
          alt="UltraMaps" 
          className="w-10 h-10 filter brightness-110"
        />
        <div className="text-xl font-geist-sans font-bold text-white tracking-tight leading-none">
          UltraMaps
        </div>
      </div>
    </div>
  );
}