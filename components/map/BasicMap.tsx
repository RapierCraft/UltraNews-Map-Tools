'use client';

import { useCallback, useState, useRef, useMemo, useEffect } from 'react';
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
    buildings: true,
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
  const [modalSourceGeoPosition, setModalSourceGeoPosition] = useState<{ lat: number; lon: number } | null>(null);
  const [showFullArticle, setShowFullArticle] = useState(false);
  const [manualLayerSelection, setManualLayerSelection] = useState(false);
  const [highlightedRoad, setHighlightedRoad] = useState<{
    osm_id: number;
    osm_type: string;
    name: string;
    tags: any;
  } | null>(null);


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
      setModalSourceGeoPosition({ lat, lon });
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

  // Calculate bounds from GeoJSON geometry
  const calculateGeometryBounds = (geometry: any) => {
    if (!geometry || !geometry.coordinates) return null;
    
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;
    
    const processCoordinates = (coords: any) => {
      if (typeof coords[0] === 'number') {
        // Single coordinate pair [lon, lat]
        const [lon, lat] = coords;
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      } else {
        // Nested array
        coords.forEach(processCoordinates);
      }
    };
    
    processCoordinates(geometry.coordinates);
    
    if (minLat === Infinity) return null;
    
    return {
      south: minLat,
      north: maxLat,
      west: minLon,
      east: maxLon
    };
  };

  // Enhanced boundary polygon fetching for administrative areas
  const fetchAdminBoundaryPolygon = async (result: any): Promise<any> => {
    if (!result?.osm_id || !result?.osm_type) return result;
    
    // Only fetch polygons for administrative boundaries and places
    const isAdminFeature = result.class === 'boundary' || 
                          result.class === 'place' ||
                          (result.type && ['country', 'state', 'province', 'city', 'town', 'county'].includes(result.type));
    
    if (!isAdminFeature) return result;
    
    try {
      const osmType = result.osm_type === 'node' ? 'N' : 
                     result.osm_type === 'way' ? 'W' : 'R';
      const osmId = `${osmType}${result.osm_id}`;
      
      console.log('Fetching boundary polygon for:', osmId, result.name || result.display_name);
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/lookup?format=geojson&osm_ids=${osmId}&polygon_geojson=1&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'MapMap-Tools/1.0'
          }
        }
      );
      
      if (!response.ok) return result;
      
      const geoData = await response.json();
      
      if (geoData.features && geoData.features.length > 0) {
        const feature = geoData.features[0];
        const geometry = feature.geometry;
        
        // Calculate actual bounds from polygon geometry
        if (geometry && (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon')) {
          const bounds = calculateGeometryBounds(geometry);
          console.log('Calculated polygon bounds for', result.name, ':', bounds);
          
          // Return enhanced result with polygon geometry and proper bounds
          return {
            ...result,
            geojson: geometry,
            boundingbox: bounds ? [
              bounds.south.toString(),
              bounds.north.toString(), 
              bounds.west.toString(),
              bounds.east.toString()
            ] : result.boundingbox,
            polygon_bounds: bounds
          };
        }
      }
      
      return result;
    } catch (error) {
      console.error('Failed to fetch boundary polygon for', result.name, ':', error);
      return result;
    }
  };

  // Handle zoom-aware map clicks to show appropriate information
  const handleMapClick = useCallback(async (e: { position: { latitude: number; longitude: number }; screenPosition?: { x: number; y: number } }) => {
    const { latitude: lat, longitude: lng } = e.position;
    
    // Get actual current zoom from Cesium viewer
    let currentZoom = zoom; // Default to state zoom
    if (cesiumViewerRef.current && window.Cesium) {
      try {
        const viewer = cesiumViewerRef.current as any;
        const camera = viewer.camera;
        const cartographic = camera.positionCartographic;
        const height = cartographic.height;
        
        // Convert Cesium camera height to approximate zoom level
        // This formula approximates the relationship between height and zoom
        currentZoom = Math.max(1, Math.min(20, 20 - Math.log2(height / 10000)));
        currentZoom = Math.round(currentZoom);
        
        console.log('Cesium camera height:', height, 'converted zoom:', currentZoom);
      } catch (error) {
        console.warn('Failed to get zoom from Cesium viewer, using state zoom:', zoom);
        currentZoom = zoom;
      }
    }
    
    console.log('Map click at zoom:', currentZoom, 'position:', lat, lng);
    
    // Immediately show location card with basic info and loading state
    const basicLocationData = {
      lat,
      lon: lng,
      name: 'Loading...', // Will be updated when data arrives
      osm_id: undefined,
      osm_type: 'node',
      type: getLocationTypeByZoom(currentZoom),
      class: 'place',
      tags: {},
      isLoading: true // Add loading flag
    };
    
    console.log('Showing immediate location card:', basicLocationData);
    setSelectedLocation(basicLocationData);
    setModalSourcePosition(e.screenPosition || { x: window.innerWidth / 2, y: window.innerHeight / 2 });
    setModalSourceGeoPosition({ lat, lon: lng });
    setShowLocationModal(true);
    
    // Determine what type of feature should be prioritized at this zoom level
    let targetFeatureType = '';
    
    // Check if this might be a click on an administrative boundary
    const isLikelyBoundaryClick = await checkForAdminBoundaryClick(lat, lng, currentZoom);
    
    if (isLikelyBoundaryClick) {
      targetFeatureType = 'admin_boundary';
    } else if (currentZoom <= 5) {
      targetFeatureType = 'country';
    } else if (currentZoom <= 8) {
      targetFeatureType = 'state';
    } else if (currentZoom <= 11) {
      targetFeatureType = 'city';
    } else if (currentZoom <= 14) {
      targetFeatureType = 'district';
    } else if (currentZoom <= 17) {
      targetFeatureType = 'road';
    } else {
      targetFeatureType = 'building';
    }
    
    // Fetch detailed information in background
    try {
      console.log('Performing smart geocode with target type:', targetFeatureType);
      const result = await performSmartReverseGeocode(lat, lng, currentZoom, targetFeatureType);
      console.log('Smart geocode result:', result);
      
      if (result) {
        // For administrative boundaries, fetch the actual boundary polygon
        let enhancedResult = result;
        
        if (targetFeatureType === 'admin_boundary' || currentZoom <= 11) {
          console.log('Fetching admin boundary polygon for:', result.name);
          enhancedResult = await fetchAdminBoundaryPolygon(result);
        }
        
        // Update location data with detailed information
        const detailedLocationData = {
          lat: parseFloat(enhancedResult.lat) || lat,
          lon: parseFloat(enhancedResult.lon) || lng,
          name: enhancedResult.name || enhancedResult.display_name?.split(',')[0] || 'Unknown Location',
          osm_id: enhancedResult.osm_id,
          osm_type: enhancedResult.osm_type || 'node',
          type: enhancedResult.type || 'unknown',
          class: enhancedResult.class || 'place',
          tags: enhancedResult.extratags || {},
          boundingbox: enhancedResult.boundingbox,
          geojson: enhancedResult.geojson, // Include boundary polygon
          isLoading: false, // Loading complete
          fullData: enhancedResult // Store full result for detailed display
        };
        
        console.log('Updating with detailed location data:', detailedLocationData);
        setSelectedLocation(detailedLocationData);
        
        // Check if this is a road/highway that should be highlighted
        const isRoad = enhancedResult.class === 'highway' || 
                      (enhancedResult.tags && enhancedResult.tags.highway) ||
                      targetFeatureType === 'road';
        
        if (isRoad && enhancedResult.osm_id && enhancedResult.osm_type === 'way') {
          console.log('Setting road for highlighting:', enhancedResult.name);
          const roadData = {
            osm_id: enhancedResult.osm_id,
            osm_type: enhancedResult.osm_type,
            name: enhancedResult.name || enhancedResult.display_name?.split(',')[0] || 'Unknown Road',
            tags: enhancedResult.tags || {}
          };
          setHighlightedRoad(roadData);

          // Wait briefly for the road highlighting to fetch geometry and stats
          setTimeout(async () => {
            try {
              // Get the road statistics from the highlighted road display
              // This will be populated by the fetchAndDisplayHighlightedRoad function
              const updatedLocationData = {
                ...detailedLocationData,
                distance_km: (enhancedResult as any).distance_km,
                intersections: (enhancedResult as any).intersections,
                highway_type: enhancedResult.tags?.highway || 'road'
              };
              setSelectedLocation(updatedLocationData);
            } catch (error) {
              console.warn('Failed to update road statistics:', error);
            }
          }, 1000);
        } else {
          // Clear road highlighting for non-road selections
          setHighlightedRoad(null);
        }
        
        // If we have proper polygon bounds, fit to them instead of basic bounding box
        if (enhancedResult.polygon_bounds) {
          const polyBounds: [[number, number], [number, number]] = [
            [enhancedResult.polygon_bounds.south, enhancedResult.polygon_bounds.west],
            [enhancedResult.polygon_bounds.north, enhancedResult.polygon_bounds.east]
          ];
          
          console.log('Fitting to polygon bounds:', polyBounds);
          setBoundsToFit(polyBounds);
          
          // Calculate zoom based on polygon size, not search result bounds
          const latDiff = enhancedResult.polygon_bounds.north - enhancedResult.polygon_bounds.south;
          const lonDiff = enhancedResult.polygon_bounds.east - enhancedResult.polygon_bounds.west;
          const maxDiff = Math.max(latDiff, lonDiff);
          
          let calculatedZoom;
          if (maxDiff > 50) calculatedZoom = 2;        // Large countries/continents
          else if (maxDiff > 20) calculatedZoom = 3;   // Countries
          else if (maxDiff > 10) calculatedZoom = 4;   // Large states
          else if (maxDiff > 5) calculatedZoom = 5;    // Medium states
          else if (maxDiff > 2) calculatedZoom = 6;    // Small states/large cities
          else if (maxDiff > 1) calculatedZoom = 8;    // Cities
          else if (maxDiff > 0.5) calculatedZoom = 10; // Small cities
          else if (maxDiff > 0.1) calculatedZoom = 12; // Districts
          else calculatedZoom = 14;                     // Small areas
          
          console.log(`Setting zoom for ${enhancedResult.name}: ${calculatedZoom} (polygon size: ${maxDiff.toFixed(3)}°)`);
          setZoom(calculatedZoom);
        }
        
      } else {
        // Update to show that loading failed but keep basic info
        setSelectedLocation(prev => prev ? { ...prev, name: 'Location', isLoading: false } : null);
      }
    } catch (error) {
      console.error('Feature click detection failed:', error);
      // Update to show that loading failed
      setSelectedLocation(prev => prev ? { ...prev, name: 'Location', isLoading: false } : null);
    }
  }, [zoom]);

  // Helper function to get location type by zoom
  const getLocationTypeByZoom = (zoom: number): string => {
    if (zoom <= 5) return 'country';
    if (zoom <= 7) return 'state';
    if (zoom <= 11) return 'city';
    if (zoom <= 14) return 'district';
    if (zoom <= 17) return 'building';
    return 'poi';
  };

  // Check if click might be on an administrative boundary by looking for nearby admin features
  const checkForAdminBoundaryClick = async (lat: number, lon: number, zoom: number): Promise<boolean> => {
    // Always try admin boundary detection for zoom levels where admin areas are visible
    if (zoom <= 14) return true; // Countries, states, cities, districts all have boundaries
    
    // For higher zooms, check if we might be clicking on admin boundaries
    if (zoom > 14 && zoom <= 16) {
      try {
        // Quick check: get a reverse geocoding result and see if we're near administrative boundaries
        const params = new URLSearchParams({
          lat: lat.toString(),
          lon: lon.toString(),
          zoom: '12', // Medium zoom for admin detection
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
        
        // Check if we have good administrative info
        const address = result.address || {};
        const hasAdminInfo = [
          address.country,
          address.state || address.region || address.province,
          address.county,
          address.city || address.town,
          address.suburb || address.district
        ].filter(Boolean).length;
        
        return hasAdminInfo >= 3;
      } catch (error) {
        return false;
      }
    }
    
    return false; // For very high zoom (buildings/POIs), don't treat as admin boundary
  };

  // Smart reverse geocoding that tries to find the most relevant feature for the zoom level
  const performSmartReverseGeocode = async (lat: number, lon: number, zoom: number, targetType: string) => {
    try {
      // For zoom levels where admin boundaries should be shown, ALWAYS use admin detection
      if (zoom <= 14 && ['admin_boundary', 'country', 'state', 'city', 'district'].includes(targetType)) {
        console.log('Using admin boundary detection for', targetType, 'at zoom', zoom);
        return await detectAdminBoundary(lat, lon, zoom);
      }
      
      // For roads/buildings/POIs, use regular geocoding
      const zoomMap: Record<string, number> = {
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

  // Simple zoom-based admin detection - just get what we need for the zoom level
  const detectAdminBoundary = async (lat: number, lon: number, zoom: number) => {
    try {
      console.log(`Detecting admin boundary at zoom ${zoom}`);
      
      // Get reverse geocoding data
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        zoom: '10', // Use medium zoom to get all admin levels
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
      const address = result.address || {};
      
      console.log('Available address data:', address);
      
      // FORCE the result based ONLY on zoom level - ignore everything else
      if (zoom <= 5) {
        // Country level - find the country boundary
        if (!address.country) return null;
        console.log('FORCING COUNTRY:', address.country);
        return await findSpecificAdminBoundary(lat, lon, address.country, 'country', '2');
      } else if (zoom <= 8) {
        // State level - find the state boundary  
        const stateName = address.state || address.region || address.province;
        if (!stateName) {
          // Fallback to country if no state
          if (address.country) {
            console.log('FORCING COUNTRY (no state available):', address.country);
            return await findSpecificAdminBoundary(lat, lon, address.country, 'country', '2');
          }
          return null;
        }
        console.log('FORCING STATE:', stateName);
        return await findSpecificAdminBoundary(lat, lon, stateName, 'state', '4');
      } else if (zoom <= 11) {
        // City level
        const cityName = address.city || address.town;
        if (!cityName) {
          // Fallback to county if no city
          if (address.county) {
            console.log('FORCING COUNTY (no city available):', address.county);
            return await findSpecificAdminBoundary(lat, lon, address.county, 'county', '6');
          }
          return null;
        }
        console.log('FORCING CITY:', cityName);
        return await findSpecificAdminBoundary(lat, lon, cityName, 'city', '8');
      } else if (zoom <= 14) {
        // District level - try district first, fallback to town/municipality
        const districtName = address.suburb || address.district || address.neighbourhood || 
                            address.town || address.municipality;
        if (!districtName) {
          // If no district data, show the county instead
          if (address.county) {
            console.log('FORCING COUNTY (no district available):', address.county);
            return await findSpecificAdminBoundary(lat, lon, address.county, 'county', '6');
          }
          return null;
        }
        console.log('FORCING DISTRICT:', districtName);
        return await findSpecificAdminBoundary(lat, lon, districtName, 'district', '10');
      }
      
      return null;
    } catch (error) {
      console.error('Admin boundary detection failed:', error);
      return null;
    }
  };

  // Find a specific administrative boundary by name and type
  const findSpecificAdminBoundary = async (lat: number, lon: number, name: string, type: string, adminLevel: string) => {
    try {
      // Search for the specific admin boundary
      const searchParams = new URLSearchParams({
        q: name,
        format: 'json',
        addressdetails: '1',
        extratags: '1',
        limit: '5'
      });

      const searchResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?${searchParams}`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'MapMap-Tools/1.0',
          }
        }
      );

      if (!searchResponse.ok) return null;
      
      const searchResults = await searchResponse.json();
      
      // Find the best match for our admin level
      const match = searchResults.find((r: any) => 
        r.class === 'boundary' || r.class === 'place'
      ) || searchResults[0];

      if (match) {
        return {
          ...match,
          name: name,
          display_name: name,
          type: type,
          class: type === 'country' || type === 'state' ? 'boundary' : 'place',
          admin_level: adminLevel,
          lat: match.lat || lat,
          lon: match.lon || lon
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to find specific admin boundary:', error);
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

  // Adapt admin results for display based on zoom levels with fallbacks
  const adaptAdminResult = (result: any, zoom: number) => {
    if (!result) return null;
    
    const address = result.address || {};
    console.log(`Adapting admin result for zoom ${zoom}:`, address);
    
    // Try to get the appropriate admin level for the zoom, with fallbacks
    if (zoom <= 5) {
      // Country level - try country first
      if (address.country) {
        return {
          ...result,
          display_name: address.country,
          name: address.country,
          type: 'country',
          class: 'boundary',
          admin_level: '2',
          lat: result.lat,
          lon: result.lon,
          osm_id: result.osm_id,
          osm_type: result.osm_type
        };
      }
    } else if (zoom >= 6 && zoom <= 8) {
      // State level - try state first, fallback to country
      const stateName = address.state || address.region || address.province;
      if (stateName) {
        return {
          ...result,
          display_name: stateName,
          name: stateName,
          type: 'state',
          class: 'boundary',
          admin_level: '4',
          lat: result.lat,
          lon: result.lon,
          osm_id: result.osm_id,
          osm_type: result.osm_type
        };
      } else if (address.country) {
        // Fallback to country if no state
        return {
          ...result,
          display_name: address.country,
          name: address.country,
          type: 'country',
          class: 'boundary',
          admin_level: '2',
          lat: result.lat,
          lon: result.lon,
          osm_id: result.osm_id,
          osm_type: result.osm_type
        };
      }
    } else if (zoom >= 9 && zoom <= 11) {
      // City level - try city first, fallback to county/state
      const cityName = address.city || address.town || address.municipality;
      if (cityName) {
        return {
          ...result,
          display_name: cityName,
          name: cityName,
          type: address.city ? 'city' : 'town',
          class: 'place',
          admin_level: '8',
          lat: result.lat,
          lon: result.lon,
          osm_id: result.osm_id,
          osm_type: result.osm_type
        };
      } else if (address.county) {
        return {
          ...result,
          display_name: address.county,
          name: address.county,
          type: 'county',
          class: 'boundary',
          admin_level: '6',
          lat: result.lat,
          lon: result.lon,
          osm_id: result.osm_id,
          osm_type: result.osm_type
        };
      }
    } else if (zoom >= 12 && zoom <= 14) {
      // District level - try district first, fallback to city/county
      const districtName = address.suburb || address.district || address.neighbourhood;
      if (districtName) {
        return {
          ...result,
          display_name: districtName,
          name: districtName,
          type: 'district',
          class: 'place',
          admin_level: '10',
          lat: result.lat,
          lon: result.lon,
          osm_id: result.osm_id,
          osm_type: result.osm_type
        };
      } else if (address.city || address.town) {
        // Fallback to city
        const cityName = address.city || address.town;
        return {
          ...result,
          display_name: cityName,
          name: cityName,
          type: address.city ? 'city' : 'town',
          class: 'place',
          admin_level: '8',
          lat: result.lat,
          lon: result.lon,
          osm_id: result.osm_id,
          osm_type: result.osm_type
        };
      }
    }
    
    console.log(`No appropriate admin level found for zoom ${zoom}, using original result`);
    return result; // Return original if no appropriate admin level found
  };

  // Adapt the geocoding result to show the most appropriate information for the zoom level
  const adaptResultForZoom = (result: any, zoom: number, targetType: string) => {
    if (!result) return null;
    
    const adapted = { ...result };
    const address = result.address || {};
    
    console.log(`Adapting result for zoom ${zoom}, target ${targetType}:`, {
      original_name: result.name,
      original_type: result.type,
      address: address
    });
    
    // Force the display name and type to match the zoom level expectation
    if (targetType === 'country' && address.country) {
      adapted.display_name = address.country;
      adapted.name = address.country;
      adapted.type = 'country';
      adapted.class = 'boundary';
      adapted.admin_level = '2';
    } else if (targetType === 'state' && address.state) {
      adapted.display_name = address.state;
      adapted.name = address.state;
      adapted.type = 'state';
      adapted.class = 'boundary';
      adapted.admin_level = '4';
    } else if (targetType === 'city' && (address.city || address.town)) {
      const cityName = address.city || address.town;
      adapted.display_name = cityName;
      adapted.name = cityName;
      adapted.type = address.city ? 'city' : 'town';
      adapted.class = 'place';
      adapted.admin_level = '8';
    } else if (targetType === 'district' && (address.suburb || address.district || address.neighbourhood)) {
      const districtName = address.suburb || address.district || address.neighbourhood;
      adapted.display_name = districtName;
      adapted.name = districtName;
      adapted.type = 'district';
      adapted.class = 'place';
      adapted.admin_level = '10';
    } else if (targetType === 'road' && address.road) {
      adapted.display_name = address.road;
      adapted.name = address.road;
      adapted.type = 'highway'; 
      adapted.class = 'highway';
    } else if (targetType === 'building') {
      // For buildings, use the most specific address info available
      if (address.house_number && address.road) {
        adapted.display_name = `${address.house_number} ${address.road}`;
        adapted.name = `${address.house_number} ${address.road}`;
      } else if (result.name) {
        adapted.display_name = result.name;
        adapted.name = result.name;
      } else if (address.road) {
        adapted.display_name = address.road;
        adapted.name = address.road;
      }
      adapted.type = 'building';
      adapted.class = 'building';
    }
    
    console.log(`Adapted to:`, {
      name: adapted.name,
      type: adapted.type,
      class: adapted.class,
      admin_level: adapted.admin_level
    });
    
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

  // Update modal source position when map moves (to keep pin fixed to geographic location)
  useEffect(() => {
    if (!cesiumViewerRef.current || !modalSourceGeoPosition || !showLocationModal || !window.Cesium) {
      return;
    }

    const viewer = cesiumViewerRef.current as any;
    
    const updateSourcePosition = () => {
      try {
        // Convert geographic position to Cesium world coordinates
        const worldPosition = window.Cesium.Cartesian3.fromDegrees(
          modalSourceGeoPosition.lon, 
          modalSourceGeoPosition.lat
        );
        
        // Convert world coordinates to canvas/screen coordinates
        const canvasPosition = viewer.scene.cartesianToCanvasCoordinates(worldPosition);
        
        if (canvasPosition && window.Cesium.defined(canvasPosition)) {
          setModalSourcePosition({
            x: canvasPosition.x,
            y: canvasPosition.y
          });
        }
      } catch (error) {
        console.warn('Failed to update modal source position:', error);
      }
    };

    // Update immediately
    updateSourcePosition();
    
    // Use a high-frequency interval for smooth pin tracking during camera movement
    const interval = setInterval(updateSourcePosition, 16); // ~60fps for smooth updates
    
    // Also listen for camera events as backup
    const removeListener = viewer.camera.changed.addEventListener(updateSourcePosition);
    const removeMoveEndListener = viewer.camera.moveEnd.addEventListener(updateSourcePosition);
    const removeMoveStartListener = viewer.camera.moveStart.addEventListener(updateSourcePosition);
    
    return () => {
      clearInterval(interval);
      if (removeListener) removeListener();
      if (removeMoveEndListener) removeMoveEndListener();
      if (removeMoveStartListener) removeMoveStartListener();
    };
  }, [modalSourceGeoPosition, showLocationModal]);

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
        highlightedRoad={highlightedRoad}
      />

      {/* Advanced Location Information Modal */}
      {showLocationModal && selectedLocation && !showFullArticle && (
        <DraggableInfoModal
          isOpen={showLocationModal}
          onClose={() => {
            setShowLocationModal(false);
            setModalSourceGeoPosition(null);
            setModalSourcePosition(null);
            setSelectedLocation(undefined);
            setHighlightedRoad(null);
          }}
          onExpand={() => setShowFullArticle(true)}
          title={selectedLocation.name.split(',')[0]}
          sourcePosition={modalSourcePosition}
          badge={selectedLocation.type || 'Location'}
        >
          <LocationInfoModal 
            location={selectedLocation}
            onClose={() => {
              setShowLocationModal(false);
              setModalSourceGeoPosition(null);
              setModalSourcePosition(null);
              setSelectedLocation(undefined);
              setHighlightedRoad(null);
            }}
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
            setShowLocationModal(false);
            setSelectedLocation(undefined);
            setHighlightedRoad(null);
            setModalSourceGeoPosition(null);
            setModalSourcePosition(null);
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