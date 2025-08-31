'use client';

import { useEffect, useRef, useState } from 'react';

interface LayerState {
  roads: boolean;
  buildings: boolean;
  waterways: boolean;
  parks: boolean;
  labels: boolean;
  poi: boolean;
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

interface SimpleVectorGlobeProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    popup?: string;
    id: string;
    accuracy?: number;
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
    boundingbox?: string[];
  };
  boundsToFit?: [[number, number], [number, number]];
  onClick?: (e: { position: { latitude: number; longitude: number }; screenPosition?: { x: number; y: number } }) => void;
  currentLayer?: string;
  isDarkTheme?: boolean;
  useVectorTiles?: boolean;
  showBuildings?: boolean;
  dataLayers?: LayerState;
  onViewerReady?: (viewer: any) => void;
  onHeadingChange?: (heading: number) => void;
  navigationRoute?: NavigationRoute | null;
  showTrafficOverlay?: boolean;
  highlightedRoad?: {
    osm_id: number;
    osm_type: string;
    name: string;
    tags: any;
  } | null;
}

declare global {
  interface Window {
    Cesium: any;
  }
}

export default function SimpleVectorGlobe({
  center = [40.7128, -74.0060],
  zoom = 12,
  markers = [],
  className = '',
  style = {},
  selectedLocation,
  boundsToFit,
  onClick,
  currentLayer = 'osm-standard',
  isDarkTheme = false,
  useVectorTiles = true,
  showBuildings = true,
  dataLayers = {
    roads: true,
    buildings: false,
    waterways: true,
    parks: true,
    labels: true,
    poi: true
  },
  onViewerReady,
  onHeadingChange,
  navigationRoute = null,
  showTrafficOverlay = false,
  highlightedRoad = null,
}: SimpleVectorGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const adminBorderEntitiesRef = useRef<any[]>([]);
  const buildingsRef = useRef<any>(null);
  const [currentZoomLevel, setCurrentZoomLevel] = useState<number>(3);
  const roadEntitiesRef = useRef<any[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Convert screen coordinates to tile coordinates
  const lonLatToTile = (lon: number, lat: number, zoom: number) => {
    const x = Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    return { x, y, z: zoom };
  };

  // Load building data for visible tiles
  const loadBuildingsForView = async (viewer: any) => {
    if (!buildingsRef.current || !viewer) {
      console.log('🏢 Cannot load buildings - buildingsRef:', !!buildingsRef.current, 'viewer:', !!viewer);
      return;
    }
    
    const camera = viewer.camera;
    const canvas = viewer.canvas;
    
    // Get viewport bounds
    const upperLeft = camera.pickEllipsoid(new window.Cesium.Cartesian2(0, 0), viewer.scene.globe.ellipsoid);
    const lowerRight = camera.pickEllipsoid(new window.Cesium.Cartesian2(canvas.clientWidth, canvas.clientHeight), viewer.scene.globe.ellipsoid);
    
    if (!upperLeft || !lowerRight) {
      console.log('🏢 Cannot determine viewport bounds');
      return;
    }
    
    const upperLeftCartographic = window.Cesium.Cartographic.fromCartesian(upperLeft);
    const lowerRightCartographic = window.Cesium.Cartographic.fromCartesian(lowerRight);
    
    const north = window.Cesium.Math.toDegrees(upperLeftCartographic.latitude);
    const south = window.Cesium.Math.toDegrees(lowerRightCartographic.latitude);
    const west = window.Cesium.Math.toDegrees(upperLeftCartographic.longitude);
    const east = window.Cesium.Math.toDegrees(lowerRightCartographic.longitude);
    
    // Use zoom level 15 for building data (city level detail)
    const zoomLevel = Math.min(15, Math.max(11, Math.floor(currentZoomLevel)));
    
    // Get tile bounds
    const topLeft = lonLatToTile(west, north, zoomLevel);
    const bottomRight = lonLatToTile(east, south, zoomLevel);
    
    console.log(`🏢 Loading buildings for tiles: zoom=${zoomLevel}, x=[${topLeft.x}-${bottomRight.x}], y=[${topLeft.y}-${bottomRight.y}]`);
    
    // Load buildings for visible tiles
    for (let x = topLeft.x; x <= bottomRight.x; x++) {
      for (let y = topLeft.y; y <= bottomRight.y; y++) {
        const tileKey = `${zoomLevel}/${x}/${y}`;
        
        // Skip if already loaded
        if (buildingsRef.current.entities.has(tileKey)) continue;
        
        try {
          const response = await fetch(`http://localhost:8002/api/v1/tiles/buildings/${zoomLevel}/${x}/${y}.json`);
          const buildingData = await response.json();
          
          if (buildingData.features && buildingData.features.length > 0) {
            buildingData.features.forEach((feature: any) => {
              const geometry = feature.geometry;
              const properties = feature.properties;
              
              if (geometry.type === 'Polygon' && geometry.coordinates[0]) {
                const positions = geometry.coordinates[0].map((coord: number[]) => 
                  window.Cesium.Cartesian3.fromDegrees(coord[0], coord[1])
                );
                
                const height = properties.height || 10;
                const extrudedHeight = height;
                
                const entity = viewer.entities.add({
                  name: properties.name || 'Building',
                  polygon: {
                    hierarchy: positions,
                    height: 0,
                    extrudedHeight: extrudedHeight,
                    material: isDarkTheme 
                      ? window.Cesium.Color.fromCssColorString('rgba(150, 150, 180, 0.9)')
                      : window.Cesium.Color.fromCssColorString('rgba(220, 220, 240, 0.95)'),
                    outline: false,
                    show: buildingsRef.current.show
                  }
                });
                
                // Store entity reference
                if (!buildingsRef.current.entities.has(tileKey)) {
                  buildingsRef.current.entities.set(tileKey, []);
                }
                buildingsRef.current.entities.get(tileKey).push(entity);
              }
            });
            
            console.log(`🏢 Loaded ${buildingData.features.length} buildings for tile ${tileKey}`);
          }
        } catch (error) {
          console.warn(`Failed to load buildings for tile ${tileKey}:`, error);
          // Mark tile as attempted to avoid retry loops
          buildingsRef.current.entities.set(tileKey, []);
        }
      }
    }
  };

  // Toggle building visibility
  const toggleBuildingVisibility = (show: boolean) => {
    if (!buildingsRef.current) return;
    
    buildingsRef.current.show = show;
    
    // Update all building entities
    buildingsRef.current.entities.forEach((entities: any[]) => {
      entities.forEach((entity: any) => {
        if (entity.polygon) {
          entity.polygon.show = show;
        }
      });
    });
  };

  // Fetch and display administrative boundaries
  const fetchAndDisplayAdminBoundary = async (location: {
    lat: number;
    lon: number;
    name: string;
    osm_id?: number;
    osm_type?: string;
    type?: string;
    geojson?: any; // Pre-fetched boundary polygon
  }) => {
    if (!viewerRef.current || !window.Cesium) return;

    // Clear existing admin border entities with batch operations for better performance
    if (adminBorderEntitiesRef.current.length > 0) {
      const viewer = viewerRef.current;
      viewer.entities.suspendEvents();
      adminBorderEntitiesRef.current.forEach(entity => {
        viewer.entities.remove(entity);
      });
      viewer.entities.resumeEvents();
      adminBorderEntitiesRef.current = [];
    }

    try {
      let geometry = null;
      
      // Use existing geojson if available (from enhanced click detection)
      if (location.geojson) {
        console.log('Using pre-fetched boundary polygon for:', location.name);
        geometry = location.geojson;
      } else if (location.osm_id && location.osm_type) {
        // Fallback: fetch boundary using OSM ID
        const osmType = location.osm_type === 'node' ? 'N' : 
                       location.osm_type === 'way' ? 'W' : 'R';
        const osmId = `${osmType}${location.osm_id}`;
        
        console.log('Fetching boundary polygon from API for:', location.name);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/lookup?format=geojson&osm_ids=${osmId}&polygon_geojson=1`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            geometry = data.features[0].geometry;
          }
        }
      }

      if (geometry && (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon')) {
        const borderColor = getBorderColorByType(location.type || '');
        
        if (geometry.type === 'Polygon') {
          // Handle single polygon
          const coordinates = geometry.coordinates[0];
                const positions = coordinates.map((coord: number[]) => 
                  window.Cesium.Cartesian3.fromDegrees(coord[0], coord[1])
                );
                
                const entity = viewerRef.current.entities.add({
                  name: `Administrative Border: ${location.name}`,
                  polygon: {
                    hierarchy: new window.Cesium.PolygonHierarchy(positions),
                    material: window.Cesium.Color.fromCssColorString(borderColor).withAlpha(0.1),
                    outline: true,
                    outlineColor: window.Cesium.Color.fromCssColorString(borderColor),
                    outlineWidth: 3,
                    heightReference: window.Cesium.HeightReference.RELATIVE_TO_GROUND,
                    extrudedHeightReference: window.Cesium.HeightReference.RELATIVE_TO_GROUND,
                    height: 0,
                    extrudedHeight: 600,
                    followSurface: true,
                    classificationType: window.Cesium.ClassificationType.TERRAIN
                  }
                });
                
                adminBorderEntitiesRef.current.push(entity);
        } else if (geometry.type === 'MultiPolygon') {
          // Handle multiple polygons (common for countries with islands)
          geometry.coordinates.forEach((polygon: number[][][], index: number) => {
                  const coordinates = polygon[0];
                  const positions = coordinates.map((coord: number[]) => 
                    window.Cesium.Cartesian3.fromDegrees(coord[0], coord[1])
                  );
                  
                  const entity = viewerRef.current.entities.add({
                    name: `Administrative Border: ${location.name} (Part ${index + 1})`,
                    polygon: {
                      hierarchy: new window.Cesium.PolygonHierarchy(positions),
                      material: window.Cesium.Color.fromCssColorString(borderColor).withAlpha(0.1),
                      outline: true,
                      outlineColor: window.Cesium.Color.fromCssColorString(borderColor),
                      outlineWidth: 3,
                      heightReference: window.Cesium.HeightReference.RELATIVE_TO_GROUND,
                      extrudedHeightReference: window.Cesium.HeightReference.RELATIVE_TO_GROUND,
                      height: 0,
                      extrudedHeight: 600,
                      followSurface: true,
                      classificationType: window.Cesium.ClassificationType.TERRAIN
                    }
                  });
                  
            adminBorderEntitiesRef.current.push(entity);
          });
        }
        
        console.log(`✅ Administrative border added for ${location.name}`);
      }
    } catch (error) {
      console.error('Failed to fetch administrative boundary:', error);
    }
  };

  // Get border color based on administrative area type
  const getBorderColorByType = (type: string): string => {
    switch (type) {
      case 'country': 
      case 'nation': 
        return '#FF0000'; // Red for countries
      case 'state': 
      case 'province': 
        return '#0066FF'; // Blue for states
      case 'city': 
      case 'town': 
      case 'municipality': 
        return '#FF8800'; // Orange for cities
      case 'county':
      case 'region':
        return '#00AA00'; // Green for counties
      default: 
        return '#AA00AA'; // Purple for other admin areas
    }
  };

  // Fetch and display highlighted road
  const fetchAndDisplayHighlightedRoad = async (roadInfo: {
    osm_id: number;
    osm_type: string;
    name: string;
    tags: any;
  }) => {
    if (!viewerRef.current || !window.Cesium) return null;

    // Clear existing road entities with batch operations for better performance
    if (roadEntitiesRef.current.length > 0) {
      const viewer = viewerRef.current;
      viewer.entities.suspendEvents();
      roadEntitiesRef.current.forEach(entity => {
        viewer.entities.remove(entity);
      });
      viewer.entities.resumeEvents();
      roadEntitiesRef.current = [];
    }

    try {
      console.log('Fetching road geometry for:', roadInfo.name, roadInfo.osm_id);
      
      // Fetch the complete road geometry using Overpass API
      const overpassQuery = `
        [out:json][timeout:25];
        (
          way(${roadInfo.osm_id});
        );
        (._;>;);
        out geom;
      `;
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`
      });
      
      if (!response.ok) {
        throw new Error(`Overpass query failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Overpass response:', data);
      
      if (data.elements && data.elements.length > 0) {
        const way = data.elements.find((el: any) => el.type === 'way' && el.id === roadInfo.osm_id);
        const nodes = data.elements.filter((el: any) => el.type === 'node');
        
        if (way && way.nodes && nodes.length > 0) {
          // Build node lookup
          const nodeMap = new Map();
          nodes.forEach((node: any) => {
            nodeMap.set(node.id, node);
          });
          
          // Build road geometry
          const coordinates: number[][] = [];
          let totalDistance = 0;
          let intersections: Array<{name: string, coordinates: [number, number]}> = [];
          
          for (let i = 0; i < way.nodes.length; i++) {
            const node = nodeMap.get(way.nodes[i]);
            if (node && node.lat !== undefined && node.lon !== undefined) {
              coordinates.push([node.lon, node.lat]);
              
              // Calculate distance for each segment
              if (i > 0) {
                const prevCoord = coordinates[i - 1];
                const currCoord = coordinates[i];
                const segmentDistance = calculateDistance(
                  prevCoord[1], prevCoord[0], 
                  currCoord[1], currCoord[0]
                );
                totalDistance += segmentDistance;
              }
              
              // Check if node is an intersection (has highway tag or multiple way connections)
              if (node.tags && (node.tags.highway || node.tags.crossing)) {
                intersections.push({
                  name: node.tags.name || `${node.tags.highway || 'Intersection'} ${node.id}`,
                  coordinates: [node.lon, node.lat]
                });
              }
            }
          }
          
          if (coordinates.length > 1) {
            // Convert to Cesium positions
            const positions = coordinates.map(coord => 
              window.Cesium.Cartesian3.fromDegrees(coord[0], coord[1], 10)
            );
            
            // Get road style based on highway type
            const highwayType = roadInfo.tags.highway || 'road';
            const roadStyle = getRoadStyle(highwayType);
            
            // Add subtle road outline (outer glow effect)
            const outerGlowEntity = viewerRef.current.entities.add({
              name: `Road Outer Glow: ${roadInfo.name}`,
              polyline: {
                positions: positions,
                width: roadStyle.width + 8,
                material: window.Cesium.Color.YELLOW.withAlpha(0.3),
                clampToGround: true,
                zIndex: 1997
              }
            });
            roadEntitiesRef.current.push(outerGlowEntity);
            
            // Add middle road outline 
            const middleOutlineEntity = viewerRef.current.entities.add({
              name: `Road Middle Outline: ${roadInfo.name}`,
              polyline: {
                positions: positions,
                width: roadStyle.width + 4,
                material: window.Cesium.Color.ORANGE.withAlpha(0.6),
                clampToGround: true,
                zIndex: 1998
              }
            });
            roadEntitiesRef.current.push(middleOutlineEntity);
            
            // Add inner road outline
            const innerOutlineEntity = viewerRef.current.entities.add({
              name: `Road Inner Outline: ${roadInfo.name}`,
              polyline: {
                positions: positions,
                width: roadStyle.width + 2,
                material: window.Cesium.Color.WHITE.withAlpha(0.8),
                clampToGround: true,
                zIndex: 1999
              }
            });
            roadEntitiesRef.current.push(innerOutlineEntity);
            
            // Add start point (green)
            const startEntity = viewerRef.current.entities.add({
              name: `Road Start: ${roadInfo.name}`,
              position: positions[0],
              point: {
                pixelSize: 12,
                color: window.Cesium.Color.fromCssColorString('#10b981'),
                outlineColor: window.Cesium.Color.WHITE,
                outlineWidth: 3,
                heightReference: window.Cesium.HeightReference.CLAMP_TO_GROUND
              },
              label: {
                text: 'START',
                font: '10pt Arial',
                fillColor: window.Cesium.Color.WHITE,
                outlineColor: window.Cesium.Color.fromCssColorString('#10b981'),
                outlineWidth: 2,
                pixelOffset: new window.Cesium.Cartesian2(0, -30),
                horizontalOrigin: window.Cesium.HorizontalOrigin.CENTER
              }
            });
            roadEntitiesRef.current.push(startEntity);
            
            // Add end point (red)
            const endEntity = viewerRef.current.entities.add({
              name: `Road End: ${roadInfo.name}`,
              position: positions[positions.length - 1],
              point: {
                pixelSize: 12,
                color: window.Cesium.Color.fromCssColorString('#ef4444'),
                outlineColor: window.Cesium.Color.WHITE,
                outlineWidth: 3,
                heightReference: window.Cesium.HeightReference.CLAMP_TO_GROUND
              },
              label: {
                text: 'END',
                font: '10pt Arial',
                fillColor: window.Cesium.Color.WHITE,
                outlineColor: window.Cesium.Color.fromCssColorString('#ef4444'),
                outlineWidth: 2,
                pixelOffset: new window.Cesium.Cartesian2(0, -30),
                horizontalOrigin: window.Cesium.HorizontalOrigin.CENTER
              }
            });
            roadEntitiesRef.current.push(endEntity);
            
            // Add intersection markers
            intersections.forEach((intersection, index) => {
              const intersectionEntity = viewerRef.current.entities.add({
                name: `Intersection: ${intersection.name}`,
                position: window.Cesium.Cartesian3.fromDegrees(intersection.coordinates[0], intersection.coordinates[1], 5),
                point: {
                  pixelSize: 8,
                  color: window.Cesium.Color.fromCssColorString('#f59e0b'),
                  outlineColor: window.Cesium.Color.WHITE,
                  outlineWidth: 2,
                  heightReference: window.Cesium.HeightReference.CLAMP_TO_GROUND
                },
                label: {
                  text: `I${index + 1}`,
                  font: '8pt Arial',
                  fillColor: window.Cesium.Color.WHITE,
                  outlineColor: window.Cesium.Color.fromCssColorString('#f59e0b'),
                  outlineWidth: 1,
                  pixelOffset: new window.Cesium.Cartesian2(0, -20),
                  horizontalOrigin: window.Cesium.HorizontalOrigin.CENTER
                }
              });
              roadEntitiesRef.current.push(intersectionEntity);
            });
            
            // Fit camera to road bounds
            const boundingSphere = window.Cesium.BoundingSphere.fromPoints(positions);
            viewerRef.current.camera.flyToBoundingSphere(boundingSphere, {
              duration: 1.5,
              offset: new window.Cesium.HeadingPitchRange(0, -window.Cesium.Math.PI_OVER_FOUR, boundingSphere.radius * 3)
            });
            
            console.log(`✅ Road highlighted: ${roadInfo.name} (${totalDistance.toFixed(1)}km, ${intersections.length} intersections)`);
            
            // Return road info for the info card
            return {
              name: roadInfo.name,
              type: 'highway',
              class: 'highway',
              tags: roadInfo.tags,
              distance_km: totalDistance,
              intersections: intersections.length,
              highway_type: highwayType,
              coordinates: coordinates
            };
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch road geometry:', error);
    }
    
    return null;
  };

  // Get road style based on highway type
  const getRoadStyle = (highwayType: string) => {
    switch (highwayType) {
      case 'motorway':
      case 'trunk':
        return { width: 12, color: '#e11d48' }; // Wide red for highways
      case 'primary':
        return { width: 10, color: '#dc2626' }; // Medium red for primary roads
      case 'secondary':
        return { width: 8, color: '#ea580c' }; // Orange for secondary roads
      case 'tertiary':
        return { width: 6, color: '#d97706' }; // Yellow-orange for tertiary
      case 'residential':
      case 'living_street':
        return { width: 4, color: '#65a30d' }; // Green for residential
      case 'service':
      case 'track':
        return { width: 3, color: '#737373' }; // Gray for service roads
      default:
        return { width: 5, color: '#3b82f6' }; // Blue for other roads
    }
  };

  // Calculate distance between two coordinates in kilometers
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };


  // Load Cesium
  useEffect(() => {
    if (!isMounted) return;
    
    if (window.Cesium) {
      setIsLoaded(true);
      return;
    }

    const link = document.createElement('link');
    link.href = '/cesium/Widgets/widgets.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    const script = document.createElement('script');
    script.src = '/cesium/Cesium.js';
    script.onload = () => {
      if (window.Cesium) {
        window.Cesium.buildModuleUrl.setBaseUrl('/cesium/');
        setIsLoaded(true);
      }
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [isMounted]);

  // Initialize Cesium viewer
  useEffect(() => {
    if (!isLoaded || !containerRef.current || !window.Cesium) return;

    const initializeViewer = async () => {
      try {
        const viewer = new window.Cesium.Viewer(containerRef.current, {
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: false,
          vrButton: false,
          infoBox: false,
          selectionIndicator: false
        });

        viewerRef.current = viewer;

        // Notify parent that viewer is ready
        if (onViewerReady) {
          onViewerReady(viewer);
        }

        // Configure scene - disable lighting for better visibility
        viewer.scene.skyBox.show = false;
        viewer.scene.backgroundColor = window.Cesium.Color.fromCssColorString(
          isDarkTheme ? '#1a1a1a' : '#f8f8f8'
        );
        viewer.scene.skyAtmosphere.show = false;
        viewer.scene.sun.show = false; // Remove bright sun
        viewer.scene.moon.show = false; // Remove moon
        viewer.scene.globe.enableLighting = false; // Disable lighting effects
        viewer.scene.globe.dynamicAtmosphereLighting = false; // Disable atmospheric lighting
        
        // Configure water appearance based on theme
        if (currentLayer === 'osm-standard') {
          viewer.scene.globe.showWaterEffect = true;
          viewer.scene.globe.oceanNormalMapUrl = '/cesium/Assets/Textures/waterNormals.jpg';
          viewer.scene.globe.baseColor = window.Cesium.Color.fromCssColorString('#1e3a5f'); // Dark blue water
        } else {
          viewer.scene.globe.showWaterEffect = false;
        }

        // Remove default imagery
        viewer.imageryLayers.removeAll();

        // Add appropriate imagery based on current layer selection
        let imageryProvider;
        
        switch(currentLayer) {
          case 'osm-standard':
          case 'osm-dark':
            // Use high-quality CartoDB vector tiles for both modes (invert applied via CSS)
            imageryProvider = new window.Cesium.UrlTemplateImageryProvider({
              url: dataLayers?.labels 
                ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
                : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
              credit: '© OpenStreetMap contributors | CartoDB',
              subdomains: ['a', 'b', 'c', 'd'],
              maximumLevel: 18
            });
            break;
            
          case 'voyager':
            imageryProvider = new window.Cesium.UrlTemplateImageryProvider({
              url: dataLayers?.labels 
                ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
                : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png',
              credit: '© OpenStreetMap contributors | CartoDB',
              subdomains: ['a', 'b', 'c', 'd'],
              maximumLevel: 18
            });
            break;
            
          case 'esri-worldimagery':
            imageryProvider = new window.Cesium.UrlTemplateImageryProvider({
              url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              credit: '© Esri, Maxar, Earthstar Geographics, and the GIS User Community',
              maximumLevel: 19
            });
            break;
            
          default:
            // Fallback to OSM standard light
            imageryProvider = new window.Cesium.UrlTemplateImageryProvider({
              url: dataLayers?.labels 
                ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
                : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
              credit: '© OpenStreetMap contributors | CartoDB',
              subdomains: ['a', 'b', 'c', 'd'],
              maximumLevel: 18
            });
        }
        
        viewer.imageryLayers.addImageryProvider(imageryProvider);
        console.log(`✅ ${currentLayer} tiles enabled with labels:`, dataLayers?.labels);

        // Use flat ellipsoid for better performance and cleaner appearance
        viewer.terrainProvider = new window.Cesium.EllipsoidTerrainProvider();
        viewer.scene.globe.depthTestAgainstTerrain = false;
        console.log('✅ Flat terrain enabled (no 3D elevation)');

        // Initialize custom building system
        if (showBuildings) {
          buildingsRef.current = {
            show: false,
            entities: new Map() // Track building entities by tile key
          };
          console.log('✅ Custom building system initialized');
        }

        // Set initial view
        const cartesian = window.Cesium.Cartesian3.fromDegrees(center[1], center[0], 15000000);
        viewer.camera.setView({ destination: cartesian });

        // Set zoom constraints to prevent infinite zoom out
        viewer.scene.screenSpaceCameraController.minimumZoomDistance = 1000; // Minimum zoom distance (1km above ground)
        viewer.scene.screenSpaceCameraController.maximumZoomDistance = 50000000; // Maximum zoom out (50,000km from earth surface)
        
        // Enable collision detection to prevent going below terrain
        viewer.scene.screenSpaceCameraController.enableCollisionDetection = true;

        // Add camera movement listener to track zoom, heading, and show/hide buildings
        const updateCameraState = async () => {
          const height = viewer.camera.positionCartographic.height;
          const zoomLevel = getZoomFromHeight(height);
          setCurrentZoomLevel(zoomLevel);
          
          // Track heading changes for compass
          const headingRadians = viewer.camera.heading;
          const headingDegrees = window.Cesium.Math.toDegrees(headingRadians);
          if (onHeadingChange) {
            onHeadingChange(headingDegrees);
          }
          
          // Show buildings only when zoomed in to city level (zoom >= 11) AND buildings layer is enabled
          if (buildingsRef.current) {
            const shouldShowBuildings = zoomLevel >= 11 && dataLayers.buildings;
            if (buildingsRef.current.show !== shouldShowBuildings) {
              toggleBuildingVisibility(shouldShowBuildings);
              console.log(`🏢 Buildings ${shouldShowBuildings ? 'SHOWN' : 'HIDDEN'} at zoom level ${Math.round(zoomLevel * 10) / 10} (buildings layer: ${dataLayers.buildings})`);
              
              // Load building data when showing for the first time
              if (shouldShowBuildings) {
                await loadBuildingsForView(viewer);
              }
            }
          }
        };

        viewer.camera.moveEnd.addEventListener(updateCameraState);
        viewer.camera.changed.addEventListener(updateCameraState);
        
        // Also load buildings when camera stops moving
        viewer.camera.moveEnd.addEventListener(() => {
          if (buildingsRef.current && buildingsRef.current.show && currentZoomLevel >= 11 && dataLayers.buildings) {
            loadBuildingsForView(viewer);
          }
        });

        // Handle clicks
        if (onClick) {
          viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(
            (event: any) => {
              // Handle map clicks
              const pickedPosition = viewer.camera.pickEllipsoid(event.position, viewer.scene.globe.ellipsoid);
              if (pickedPosition) {
                const cartographic = window.Cesium.Cartographic.fromCartesian(pickedPosition);
                const longitude = window.Cesium.Math.toDegrees(cartographic.longitude);
                const latitude = window.Cesium.Math.toDegrees(cartographic.latitude);
                
                onClick({
                  position: { latitude, longitude },
                  screenPosition: { x: event.position.x, y: event.position.y }
                });
              }
            },
            window.Cesium.ScreenSpaceEventType.LEFT_CLICK
          );
        }

      } catch (error) {
        console.error('Failed to initialize Cesium:', error);
      }
    };

    initializeViewer();

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
      }
    };
  }, [isLoaded, useVectorTiles, isDarkTheme, showBuildings]);

  // Add markers
  useEffect(() => {
    if (!isLoaded || !viewerRef.current || !window.Cesium) return;

    // Remove only marker and accuracy entities, preserve admin borders
    const markerEntities = viewerRef.current.entities.values.filter((entity: any) => 
      entity.name && !entity.name.includes('Administrative Border') && 
      (entity.name.includes('Marker:') || entity.name.includes('Accuracy:'))
    );
    
    markerEntities.forEach((entity: any) => {
      viewerRef.current.entities.remove(entity);
    });

    markers.forEach(marker => {
      const isUserLocation = marker.id === 'user-location';
      
      if (isUserLocation) {
        // Create blue dot for user location
        viewerRef.current.entities.add({
          name: `Marker: ${marker.id}`,
          position: window.Cesium.Cartesian3.fromDegrees(marker.position[1], marker.position[0], 200), // Higher elevation
          point: {
            pixelSize: 15,
            color: window.Cesium.Color.DODGERBLUE,
            outlineColor: window.Cesium.Color.WHITE,
            outlineWidth: 4,
            heightReference: window.Cesium.HeightReference.RELATIVE_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY, // Always visible
            scaleByDistance: new window.Cesium.NearFarScalar(1.5e2, 1.0, 1.5e7, 0.5)
          }
        });
        
        // Add separate accuracy circle entity at fixed height above terrain
        viewerRef.current.entities.add({
          name: `Accuracy: ${marker.id}`,
          position: window.Cesium.Cartesian3.fromDegrees(marker.position[1], marker.position[0], 150),
          cylinder: {
            length: 50, // Visible cylinder height
            topRadius: marker.accuracy || 50,
            bottomRadius: marker.accuracy || 50,
            material: window.Cesium.Color.DODGERBLUE.withAlpha(0.15),
            outline: true,
            outlineColor: window.Cesium.Color.DODGERBLUE.withAlpha(0.8),
            heightReference: window.Cesium.HeightReference.RELATIVE_TO_GROUND
          },
          label: marker.popup ? {
            text: marker.popup,
            font: '11pt Arial',
            fillColor: window.Cesium.Color.WHITE,
            outlineColor: window.Cesium.Color.DODGERBLUE,
            outlineWidth: 2,
            pixelOffset: new window.Cesium.Cartesian2(0, -25),
            horizontalOrigin: window.Cesium.HorizontalOrigin.CENTER
          } : undefined
        });
      } else {
        // Regular marker for other locations
        viewerRef.current.entities.add({
          name: `Marker: ${marker.id}`,
          position: window.Cesium.Cartesian3.fromDegrees(marker.position[1], marker.position[0]),
          billboard: {
            image: '/leaflet/marker-icon.png',
            scale: 0.5,
            verticalOrigin: window.Cesium.VerticalOrigin.BOTTOM
          },
          label: marker.popup ? {
            text: marker.popup,
            font: '12pt Arial',
            fillColor: window.Cesium.Color.WHITE,
            outlineColor: window.Cesium.Color.BLACK,
            outlineWidth: 2,
            pixelOffset: new window.Cesium.Cartesian2(0, -50)
          } : undefined
        });
      }
    });
  }, [isLoaded, markers]);

  // Handle navigation route visualization
  useEffect(() => {
    if (!isLoaded || !viewerRef.current || !window.Cesium || !navigationRoute) return;
    
    const viewer = viewerRef.current;
    
    // Remove existing route entities
    const routeEntities = viewer.entities.values.filter((entity: any) => 
      entity.name && entity.name.startsWith('route-')
    );
    routeEntities.forEach((entity: any) => viewer.entities.remove(entity));
    
    if (navigationRoute && navigationRoute.overview_geometry && navigationRoute.overview_geometry.length > 0) {
      // Convert route coordinates to Cesium Cartesian3 positions
      const positions = navigationRoute.overview_geometry.map((coord: number[]) => {
        // coord format: [longitude, latitude]
        return window.Cesium.Cartesian3.fromDegrees(coord[0], coord[1]);
      });
      
      // Add main route polyline
      viewer.entities.add({
        name: 'route-main',
        polyline: {
          positions: positions,
          width: 8,
          material: window.Cesium.Color.fromCssColorString('#2563eb'), // Blue route
          clampToGround: true,
          zIndex: 1000
        }
      });
      
      // Add route outline for better visibility
      viewer.entities.add({
        name: 'route-outline',
        polyline: {
          positions: positions,
          width: 12,
          material: window.Cesium.Color.fromCssColorString('#ffffff'),
          clampToGround: true,
          zIndex: 999
        }
      });
      
      // Add start marker (green)
      if (positions.length > 0) {
        viewer.entities.add({
          name: 'route-start',
          position: positions[0],
          point: {
            pixelSize: 12,
            color: window.Cesium.Color.fromCssColorString('#10b981'),
            outlineColor: window.Cesium.Color.WHITE,
            outlineWidth: 3,
            heightReference: window.Cesium.HeightReference.CLAMP_TO_GROUND
          }
        });
      }
      
      // Add end marker (red)
      if (positions.length > 1) {
        viewer.entities.add({
          name: 'route-end',
          position: positions[positions.length - 1],
          point: {
            pixelSize: 12,
            color: window.Cesium.Color.fromCssColorString('#ef4444'),
            outlineColor: window.Cesium.Color.WHITE,
            outlineWidth: 3,
            heightReference: window.Cesium.HeightReference.CLAMP_TO_GROUND
          }
        });
      }
      
      // Fit camera to route bounds
      const boundingSphere = window.Cesium.BoundingSphere.fromPoints(positions);
      viewer.camera.flyToBoundingSphere(boundingSphere, {
        duration: 1.5,
        offset: new window.Cesium.HeadingPitchRange(0, -window.Cesium.Math.PI_OVER_FOUR, 0)
      });
    }
  }, [isLoaded, navigationRoute]);


  // Handle selectedLocation changes - fetch and display admin boundaries
  useEffect(() => {
    if (!isLoaded || !viewerRef.current || !window.Cesium) {
      return;
    }

    console.log('selectedLocation changed:', selectedLocation);

    // If selectedLocation is undefined or null, immediately clear all highlights
    if (!selectedLocation) {
      console.log('selectedLocation is null/undefined, clearing all highlights');
      // Clear admin borders immediately with batch removal for better performance
      if (adminBorderEntitiesRef.current.length > 0) {
        const viewer = viewerRef.current;
        viewer.entities.suspendEvents();
        adminBorderEntitiesRef.current.forEach(entity => {
          viewer.entities.remove(entity);
        });
        viewer.entities.resumeEvents();
        adminBorderEntitiesRef.current = [];
        console.log('✅ Admin borders cleared immediately');
      }
      return;
    }

    // Check if this is an administrative area that should show borders
    const isAdminArea = selectedLocation.type && [
      'country', 'nation', 'state', 'province', 'city', 'town', 'municipality', 
      'county', 'region', 'district', 'administrative'
    ].includes(selectedLocation.type);

    console.log('Is admin area?', isAdminArea, 'Type:', selectedLocation.type);

    if (isAdminArea) {
      console.log('Fetching admin boundary for:', selectedLocation.name);
      fetchAndDisplayAdminBoundary(selectedLocation);
    } else {
      console.log('Not an admin area, clearing borders');
      // Clear admin borders for non-admin locations
      adminBorderEntitiesRef.current.forEach(entity => {
        viewerRef.current.entities.remove(entity);
      });
      adminBorderEntitiesRef.current = [];
    }
  }, [isLoaded, selectedLocation]);

  // Handle highlighted road changes
  useEffect(() => {
    if (!isLoaded || !viewerRef.current || !window.Cesium) {
      return;
    }

    if (highlightedRoad) {
      console.log('Highlighting road:', highlightedRoad.name);
      fetchAndDisplayHighlightedRoad(highlightedRoad);
    } else {
      // Clear road highlighting when no road is selected
      if (roadEntitiesRef.current.length > 0) {
        const viewer = viewerRef.current;
        viewer.entities.suspendEvents();
        roadEntitiesRef.current.forEach(entity => {
          viewer.entities.remove(entity);
        });
        viewer.entities.resumeEvents();
        roadEntitiesRef.current = [];
        console.log('✅ Road highlighting cleared immediately');
      }
    }
  }, [isLoaded, highlightedRoad]);

  // Handle bounds fitting and camera animation
  useEffect(() => {
    if (!isLoaded || !viewerRef.current || !window.Cesium) {
      return;
    }

    console.log('Camera update triggered:', { center, zoom, boundsToFit });

    if (boundsToFit) {
      // Convert bounds to Cesium rectangle and fly to it
      const [[south, west], [north, east]] = boundsToFit;
      const rectangle = window.Cesium.Rectangle.fromDegrees(west, south, east, north);
      
      console.log(`🎯 Flying to bounds: [${south}, ${west}] to [${north}, ${east}]`);
      
      viewerRef.current.camera.flyTo({
        destination: rectangle,
        duration: 2.0
      });
      
    } else {
      // Fall back to center and zoom-based navigation
      const height = getHeightFromZoom(zoom);
      const destination = window.Cesium.Cartesian3.fromDegrees(center[1], center[0], height);
      
      console.log(`🎯 Flying to center: [${center}] with height: ${height}`);
      
      viewerRef.current.camera.flyTo({
        destination: destination,
        duration: 2.0
      });
    }
  }, [isLoaded, center, zoom, boundsToFit]);

  // Handle layer and data layers changes
  useEffect(() => {
    if (!isLoaded || !viewerRef.current || !window.Cesium) return;

    const viewer = viewerRef.current;
    
    // Remove existing imagery layers
    viewer.imageryLayers.removeAll();
    
    // Add appropriate imagery based on current layer selection
    let imageryProvider;
    
    switch(currentLayer) {
      case 'cartodb-light':
        imageryProvider = new window.Cesium.UrlTemplateImageryProvider({
          url: dataLayers?.labels 
            ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
          credit: '© OpenStreetMap contributors | CartoDB',
          subdomains: ['a', 'b', 'c', 'd'],
          maximumLevel: 18
        });
        break;
        
      case 'cartodb-dark':
        imageryProvider = new window.Cesium.UrlTemplateImageryProvider({
          url: dataLayers?.labels 
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
            : 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
          credit: '© OpenStreetMap contributors | CartoDB',
          subdomains: ['a', 'b', 'c', 'd'],
          maximumLevel: 18
        });
        break;
        
      case 'esri-worldimagery':
        imageryProvider = new window.Cesium.UrlTemplateImageryProvider({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          credit: '© Esri, Maxar, Earthstar Geographics, and the GIS User Community',
          maximumLevel: 19
        });
        break;
        
      default:
        // Fallback to CartoDB light
        imageryProvider = new window.Cesium.UrlTemplateImageryProvider({
          url: dataLayers?.labels 
            ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
          credit: '© OpenStreetMap contributors | CartoDB',
          subdomains: ['a', 'b', 'c', 'd'],
          maximumLevel: 18
        });
    }
    
    viewer.imageryLayers.addImageryProvider(imageryProvider);
    
    // Update water appearance based on current layer
    if (currentLayer === 'osm-standard') {
      viewer.scene.globe.showWaterEffect = true;
      viewer.scene.globe.oceanNormalMapUrl = '/cesium/Assets/Textures/waterNormals.jpg';
      viewer.scene.globe.baseColor = window.Cesium.Color.fromCssColorString('#1e3a5f'); // Dark blue water
    } else {
      viewer.scene.globe.showWaterEffect = false;
      viewer.scene.globe.baseColor = window.Cesium.Color.fromCssColorString('#000000'); // Default
    }
    
    // Handle building layer toggle
    if (buildingsRef.current && buildingsRef.current.show !== dataLayers.buildings) {
      toggleBuildingVisibility(dataLayers.buildings);
      console.log(`🏢 Buildings layer toggled: ${dataLayers.buildings ? 'ENABLED' : 'DISABLED'}`);
      
      // Load building data if enabled and at appropriate zoom
      if (dataLayers.buildings && currentZoomLevel >= 11) {
        loadBuildingsForView(viewer);
      }
    }
    
    console.log(`✅ ${currentLayer} tiles updated with labels:`, dataLayers?.labels);
    console.log('Current theme state:', { currentLayer, isDarkTheme, useVectorTiles });
  }, [isLoaded, currentLayer, dataLayers]);

  // Convert zoom level to camera height for Cesium
  const getHeightFromZoom = (zoomLevel: number): number => {
    // Approximate conversion from web map zoom to Cesium camera height
    const baseHeight = 40075000; // Earth's circumference in meters
    return baseHeight / Math.pow(2, zoomLevel);
  };

  // Convert camera height to zoom level
  const getZoomFromHeight = (height: number): number => {
    const baseHeight = 40075000;
    return Math.log2(baseHeight / height);
  };

  if (!isMounted) {
    return (
      <div className={`w-full h-full bg-gray-100 dark:bg-gray-900 ${className}`} style={style}>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Loading 3D globe...</p>
        </div>
      </div>
    );
  }

  // Apply CSS filters based on current layer for better contrast
  const getMapStyle = () => {
    const baseStyle = { ...style };
    
    if (currentLayer === 'osm-dark') {
      // Lighter dark mode with better road/feature visibility
      baseStyle.filter = 'invert(1) hue-rotate(180deg) brightness(1.6) contrast(0.9) saturate(0.7)';
    } else if (currentLayer === 'osm-standard') {
      // Enhanced light mode - inverse of dark mode adjustments
      baseStyle.filter = 'brightness(0.85) contrast(1.3) saturate(1.2)';
    } else if (currentLayer === 'voyager') {
      // Clean voyager style with slight enhancement
      baseStyle.filter = 'contrast(1.1) saturate(1.1)';
    }
    
    return baseStyle;
  };

  return <div ref={containerRef} className={`w-full h-full ${className}`} style={getMapStyle()} />;
}