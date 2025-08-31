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
  transitSettings?: any;
  transitStops?: GeoJSON.FeatureCollection | null;
  transitRoutes?: GeoJSON.FeatureCollection | null;
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
  transitSettings,
  transitStops = null,
  transitRoutes = null
}: SimpleVectorGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const adminBorderEntitiesRef = useRef<any[]>([]);
  const buildingsRef = useRef<any>(null);
  const [currentZoomLevel, setCurrentZoomLevel] = useState<number>(3);

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
    if (!buildingsRef.current || !viewer) return;
    
    const camera = viewer.camera;
    const canvas = viewer.canvas;
    
    // Get viewport bounds
    const upperLeft = camera.pickEllipsoid(new window.Cesium.Cartesian2(0, 0), viewer.scene.globe.ellipsoid);
    const lowerRight = camera.pickEllipsoid(new window.Cesium.Cartesian2(canvas.clientWidth, canvas.clientHeight), viewer.scene.globe.ellipsoid);
    
    if (!upperLeft || !lowerRight) return;
    
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
    
    // Load buildings for visible tiles
    for (let x = topLeft.x; x <= bottomRight.x; x++) {
      for (let y = topLeft.y; y <= bottomRight.y; y++) {
        const tileKey = `${zoomLevel}/${x}/${y}`;
        
        // Skip if already loaded
        if (buildingsRef.current.entities.has(tileKey)) continue;
        
        try {
          const response = await fetch(`http://localhost:8001/api/v1/tiles/buildings/${zoomLevel}/${x}/${y}.json`);
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
  }) => {
    if (!viewerRef.current || !window.Cesium) return;

    // Clear existing admin border entities
    adminBorderEntitiesRef.current.forEach(entity => {
      viewerRef.current.entities.remove(entity);
    });
    adminBorderEntitiesRef.current = [];

    try {
      let osmId = '';
      if (location.osm_id && location.osm_type) {
        const osmType = location.osm_type === 'node' ? 'N' : 
                       location.osm_type === 'way' ? 'W' : 'R';
        osmId = `${osmType}${location.osm_id}`;
      }

      if (osmId) {
        // Fetch boundary using OSM ID
        const response = await fetch(
          `https://nominatim.openstreetmap.org/lookup?format=geojson&osm_ids=${osmId}&polygon_geojson=1`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            if (feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')) {
              const borderColor = getBorderColorByType(location.type || '');
              
              if (feature.geometry.type === 'Polygon') {
                // Handle single polygon
                const coordinates = feature.geometry.coordinates[0];
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
              } else if (feature.geometry.type === 'MultiPolygon') {
                // Handle multiple polygons (common for countries with islands)
                feature.geometry.coordinates.forEach((polygon: number[][][], index: number) => {
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
          }
        }
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
          
          // Show buildings only when zoomed in to city level (zoom >= 11)
          if (buildingsRef.current) {
            const shouldShowBuildings = zoomLevel >= 11;
            if (buildingsRef.current.show !== shouldShowBuildings) {
              toggleBuildingVisibility(shouldShowBuildings);
              console.log(`🏢 Buildings ${shouldShowBuildings ? 'SHOWN' : 'HIDDEN'} at zoom level ${Math.round(zoomLevel * 10) / 10}`);
              
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
          if (buildingsRef.current && buildingsRef.current.show && currentZoomLevel >= 11) {
            loadBuildingsForView(viewer);
          }
        });

        // Handle clicks
        if (onClick) {
          viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(
            (event: any) => {
              // First check if a transit entity was clicked
              const pickedObject = viewer.scene.pick(event.position);
              if (pickedObject && pickedObject.id && pickedObject.id.id?.startsWith('transit_stop_')) {
                // Handle transit stop click
                const stopId = pickedObject.id.id.replace('transit_stop_', '');
                const position = pickedObject.id.position.getValue(viewer.clock.currentTime);
                if (position) {
                  const cartographic = window.Cesium.Cartographic.fromCartesian(position);
                  const longitude = window.Cesium.Math.toDegrees(cartographic.longitude);
                  const latitude = window.Cesium.Math.toDegrees(cartographic.latitude);
                  
                  console.log('Transit stop clicked:', stopId);
                  // Call onClick with transit stop information
                  onClick({
                    position: { latitude, longitude },
                    screenPosition: { x: event.position.x, y: event.position.y }
                  });
                }
                return;
              }

              // Regular click handling for non-transit objects
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
    if (!viewerRef.current || !window.Cesium) return;

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
  }, [markers]);

  // Handle navigation route visualization
  useEffect(() => {
    if (!viewerRef.current || !window.Cesium || !navigationRoute) return;
    
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
  }, [navigationRoute]);

  // Handle transit data visualization
  useEffect(() => {
    console.log('SimpleVectorGlobe transit effect triggered:', {
      viewer: !!viewerRef.current,
      cesium: !!window.Cesium,
      transitEnabled: transitSettings?.enabled,
      transitSettings,
      transitStops: transitStops?.features?.length || 0,
      transitRoutes: transitRoutes?.features?.length || 0
    });

    // Always add a test entity to verify Cesium rendering is working
    if (viewerRef.current && window.Cesium && transitSettings?.enabled) {
      console.log('Adding test transit entity for debugging...');
      const viewer = viewerRef.current;
      
    }

    if (!viewerRef.current || !window.Cesium || !transitSettings?.enabled) {
      // Clear existing transit entities when disabled
      if (viewerRef.current && window.Cesium) {
        const viewer = viewerRef.current;
        const transitEntities = viewer.entities.values.filter((entity: any) => 
          entity.id?.startsWith('transit_')
        );
        transitEntities.forEach((entity: any) => viewer.entities.remove(entity));
      }
      return;
    }

    const viewer = viewerRef.current;
    
    // Clear existing transit entities
    const existingTransitEntities = viewer.entities.values.filter((entity: any) => 
      entity.id?.startsWith('transit_')
    );
    existingTransitEntities.forEach((entity: any) => viewer.entities.remove(entity));

    // Add transit stops
    if (transitStops && transitSettings.showStops) {
      console.log('Adding transit stops to map:', transitStops.features.length);
      console.log('Current viewer entities count before adding:', viewer.entities.values.length);
      
      let addedCount = 0;
      let firstStopCoords = null;
      
      transitStops.features.forEach((feature: any, index: number) => {
        if (feature.geometry.type === 'Point') {
          const [lon, lat] = feature.geometry.coordinates;
          const props = feature.properties;
          
          // Filter out ferry terminals from metro display
          if (props?.transitType?.toLowerCase()?.includes('ferry')) {
            return;
          }
          
          console.log(`Adding stop ${index + 1}:`, {
            name: props.name,
            coords: [lat, lon],
            transitType: props.transitType,
            id: props.id
          });
          
          const entity = viewer.entities.add({
            id: `transit_stop_${props.id}`,
            position: window.Cesium.Cartesian3.fromDegrees(lon, lat),
            point: {
              pixelSize: 20, // Made even larger
              color: window.Cesium.Color.RED, // Always red for maximum visibility
              outlineColor: window.Cesium.Color.WHITE,
              outlineWidth: 4,
              heightReference: window.Cesium.HeightReference.CLAMP_TO_GROUND,
              disableDepthTestDistance: Number.POSITIVE_INFINITY, // Always visible
              show: true
            },
            label: {
              text: props.name || 'Metro Station',
              font: '16pt sans-serif',
              style: window.Cesium.LabelStyle.FILL_AND_OUTLINE,
              fillColor: window.Cesium.Color.YELLOW,
              outlineColor: window.Cesium.Color.BLACK,
              outlineWidth: 2,
              pixelOffset: new window.Cesium.Cartesian2(0, -50),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              showBackground: true,
              backgroundColor: window.Cesium.Color.BLACK.withAlpha(0.9),
              backgroundPadding: new window.Cesium.Cartesian2(10, 7),
              show: true
            },
            show: true
          });
          
          console.log(`Entity added with ID: ${entity.id}, visible: ${entity.show}`);
          addedCount++;
        }
      });
      
      console.log(`Finished adding ${addedCount} transit stops`);
      console.log('Current viewer entities count after adding:', viewer.entities.values.length);
      
      // List all transit entities to verify they exist
      const transitEntities = viewer.entities.values.filter((entity: any) => 
        entity.id?.startsWith('transit_')
      );
      console.log('Transit entities in viewer:', transitEntities.map(e => ({
        id: e.id,
        position: e.position,
        show: e.show
      })));
      
      // Don't automatically fly to stops - let user control camera
    }

    // Add transit routes (metro lines)
    if (transitRoutes && transitSettings.showRoutes) {
      transitRoutes.features.forEach((feature: any) => {
        if (feature.geometry.type === 'LineString' && feature.geometry.coordinates.length > 1) {
          const props = feature.properties;
          const positions = feature.geometry.coordinates.map((coord: number[]) =>
            window.Cesium.Cartesian3.fromDegrees(coord[0], coord[1])
          );

          viewer.entities.add({
            id: `transit_route_${props.id}`,
            polyline: {
              positions: positions,
              width: 4,
              material: window.Cesium.Color.fromCssColorString(props.color || '#0000FF'),
              clampToGround: true,
              zIndex: 100
            },
            label: feature.geometry.coordinates.length > 2 ? {
              text: props.shortName || props.name,
              position: window.Cesium.Cartesian3.fromDegrees(
                feature.geometry.coordinates[Math.floor(feature.geometry.coordinates.length / 2)][0],
                feature.geometry.coordinates[Math.floor(feature.geometry.coordinates.length / 2)][1]
              ),
              font: '10pt sans-serif',
              style: window.Cesium.LabelStyle.FILL_AND_OUTLINE,
              fillColor: window.Cesium.Color.fromCssColorString(props.textColor || '#FFFFFF'),
              outlineColor: window.Cesium.Color.BLACK,
              outlineWidth: 1,
              pixelOffset: new window.Cesium.Cartesian2(0, -10),
              scaleByDistance: new window.Cesium.NearFarScalar(1.5e3, 1.0, 1.5e6, 0.0)
            } : undefined
          });
        }
      });
    }

    console.log('Transit data rendered:', {
      stops: transitStops?.features?.length || 0,
      routes: transitRoutes?.features?.length || 0,
      enabled: transitSettings?.enabled
    });

  }, [transitStops, transitRoutes, transitSettings]);

  // Handle selectedLocation changes - fetch and display admin boundaries
  useEffect(() => {
    if (!viewerRef.current || !window.Cesium || !selectedLocation) {
      console.log('selectedLocation effect: missing requirements', {
        viewer: !!viewerRef.current,
        cesium: !!window.Cesium,
        location: !!selectedLocation
      });
      return;
    }

    console.log('selectedLocation changed:', selectedLocation);

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
  }, [selectedLocation]);

  // Handle bounds fitting and camera animation
  useEffect(() => {
    if (!viewerRef.current || !window.Cesium) {
      console.log('Camera effect: missing requirements', {
        viewer: !!viewerRef.current,
        cesium: !!window.Cesium
      });
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
  }, [center, zoom, boundsToFit]);

  // Handle layer and data layers changes
  useEffect(() => {
    if (!viewerRef.current || !window.Cesium) return;

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
    
    console.log(`✅ ${currentLayer} tiles updated with labels:`, dataLayers?.labels);
    console.log('Current theme state:', { currentLayer, isDarkTheme, useVectorTiles });
  }, [currentLayer, dataLayers]);

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