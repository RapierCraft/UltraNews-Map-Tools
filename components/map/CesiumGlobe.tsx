'use client';

import { useEffect, useRef, useState } from 'react';
import { getVectorCache } from '@/lib/vectorCache';

interface CesiumGlobeProps {
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
    tags?: any;
  };
  onClick?: (e: { position: { latitude: number; longitude: number }; screenPosition?: { x: number; y: number } }) => void;
  currentLayer?: string;
  isDarkTheme?: boolean;
  showBuildings?: boolean;
}

declare global {
  interface Window {
    Cesium: any;
  }
}

export default function CesiumGlobe({
  center = [40.7128, -74.0060],
  zoom = 12,
  markers = [],
  className = '',
  style = {},
  selectedLocation,
  onClick,
  currentLayer = 'osm-standard',
  isDarkTheme = false,
  showBuildings = true
}: CesiumGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const buildingsRef = useRef<any>(null);
  const cacheRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Initialize cache safely after mounting
  useEffect(() => {
    if (typeof window !== 'undefined' && !cacheRef.current) {
      try {
        cacheRef.current = getVectorCache();
      } catch (error) {
        // Silent cache initialization
      }
    }
  }, []);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth < 768
      );
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Define your custom tile layers
  const tileLayers: Record<string, { url: string; attribution: string; maxZoom?: number }> = {
    'osm-standard': {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors',
    },
    'cartodb-light': {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    },
    'cartodb-dark': {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    },
    'cartodb-voyager': {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    },
    'esri-worldimagery': {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri',
    },
  };

  // Handle client-side mounting and register service worker
  useEffect(() => {
    setIsMounted(true);
    
    // Register service worker for enhanced caching
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          // Silent service worker registration
        })
        .catch(error => {
          // Silent service worker errors
        });
    }
  }, []);

  // Load Cesium from local assets with extensive preloading
  useEffect(() => {
    if (!isMounted) return;
    
    if (window.Cesium) {
      setIsLoaded(true);
      return;
    }


    // Load Cesium CSS first
    const link = document.createElement('link');
    link.href = '/cesium/Widgets/widgets.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    // Load Cesium script
    const script = document.createElement('script');
    script.src = '/cesium/Cesium.js';
    script.onload = () => {
      if (window.Cesium) {
        // Set the base URL for Cesium assets
        window.Cesium.buildModuleUrl.setBaseUrl('/cesium/');
        
        
        setIsLoaded(true);
      }
    };
    script.onerror = (error) => {
      // Silent script loading errors
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

    try {
      // Use fast Cesium built-in OSM provider for maximum performance
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
        selectionIndicator: false,
        shouldAnimate: false,
        requestRenderMode: false, // Always render for smoother experience
        maximumRenderTimeChange: undefined
      });

      // Fix blurry background stars
      viewer.scene.skyBox.show = false;
      viewer.scene.backgroundColor = window.Cesium.Color.BLACK;
      viewer.scene.skyAtmosphere.show = false;
      
      // Set zoom limits: max zoom out to see whole globe, max zoom in to OSM resolution limit
      viewer.scene.screenSpaceCameraController.maximumZoomDistance = 20000000; // ~20M meters - prevents infinite zoom out
      viewer.scene.screenSpaceCameraController.minimumZoomDistance = 1; // ~1 meter - matches OSM max zoom level 18-19
      
      // Set maximum tilt with middle mouse button to minimum of 25 degrees
      viewer.scene.screenSpaceCameraController.minimumCollisionTerrainHeight = 15000;
      viewer.scene.screenSpaceCameraController.minimumPickingTerrainHeight = 150000;
      
      // Remove all default imagery layers
      viewer.imageryLayers.removeAll();
      
      // Optimized OSM provider with aggressive caching
      const osmProvider = new window.Cesium.UrlTemplateImageryProvider({
        url: 'http://localhost:8001/api/v1/tiles/osm/{z}/{x}/{y}.png',
        credit: '© OpenStreetMap contributors',
        maximumLevel: 18,
        minimumLevel: 0,
        tileWidth: 256,
        tileHeight: 256,
        enablePickFeatures: false,
        hasAlphaChannel: false,
        rectangle: window.Cesium.Rectangle.fromDegrees(-180, -85, 180, 85),
        // Performance optimizations
        tilingScheme: new window.Cesium.WebMercatorTilingScheme(),
        ellipsoid: window.Cesium.Ellipsoid.WGS84
      });
      
      const osmLayer = viewer.imageryLayers.addImageryProvider(osmProvider);
      osmLayer.alpha = 1.0;
      osmLayer.brightness = 1.0;
      osmLayer.contrast = 1.0;
      osmLayer.show = true;

      
      // Attribution is handled by the OSM provider above

      // Simple browser-level caching through HTTP headers

      // Ensure zoom controls are enabled
      viewer.scene.screenSpaceCameraController.enableZoom = true;
      viewer.scene.screenSpaceCameraController.enableRotate = true;
      viewer.scene.screenSpaceCameraController.enableTranslate = true;
      viewer.scene.screenSpaceCameraController.enableTilt = true;
      viewer.scene.screenSpaceCameraController.enableLook = true;

      // Optimize for high-resolution tile loading
      viewer.scene.globe.enableLighting = false;
      viewer.scene.globe.showWaterEffect = false;
      viewer.scene.mode = window.Cesium.SceneMode.SCENE3D;
      
      // Optimized tile rendering for seamless loading
      viewer.scene.globe.tileCacheSize = 5000; // Massive cache for instant access
      viewer.scene.globe.preloadAncestors = true; // Preload lower res for instant display
      viewer.scene.globe.preloadSiblings = true; // Preload adjacent tiles
      viewer.scene.globe.maximumScreenSpaceError = 0.5; // Ultra high quality
      viewer.scene.globe.loadingDescendantLimit = 50; // Aggressive loading
      viewer.scene.globe.skipLevelOfDetail = false; // Don't skip detail
      viewer.scene.globe.progressiveResolutionHeightFraction = 0.1; // Fast progressive loading
      
      // Performance optimizations for smooth rendering
      viewer.scene.fxaa = false;
      viewer.scene.postProcessStages.fxaa.enabled = false;
      viewer.scene.postProcessStages.removeAll(); // Remove all post-processing
      viewer.scene.globe.depthTestAgainstTerrain = false;
      viewer.scene.requestRenderMode = false; // Always render for smoother experience
      viewer.scene.maximumRenderTimeChange = 8; // 120fps target
      viewer.scene.logarithmicDepthBuffer = false; // Disable for performance
      
      // Enable multithreaded tile loading
      viewer.scene.globe.loadingDescendantLimit = 100;
      viewer.scene.globe.enableLighting = false;
      viewer.scene.globe.dynamicAtmosphereLighting = false;

      // Set initial camera position to show Earth
      viewer.camera.setView({
        destination: window.Cesium.Cartesian3.fromDegrees(0, 20, 15000000)
      });


      // Add double-click to return to Earth overview
      viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(() => {
        viewer.camera.flyTo({
          destination: window.Cesium.Cartesian3.fromDegrees(0, 20, 20000000),
          duration: 2.0
        });
      }, window.Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

      // Handle clicks for POI detection
      if (onClick) {
        viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(
          (event: any) => {
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

      // Add camera movement listeners for intelligent prefetching and building visibility
      let prefetchTimeout: NodeJS.Timeout;
      viewer.camera.moveEnd.addEventListener(() => {
        clearTimeout(prefetchTimeout);
        
        prefetchTimeout = setTimeout(async () => {
          const cartographic = viewer.camera.positionCartographic;
          const longitude = window.Cesium.Math.toDegrees(cartographic.longitude);
          const latitude = window.Cesium.Math.toDegrees(cartographic.latitude);
          const height = cartographic.height;
          
          const approximateZoom = Math.max(0, Math.min(18, 
            Math.log2(40075017 * Math.cos(latitude * Math.PI / 180) / height) + 8
          ));
          
          // Control building visibility based on zoom level
          if (buildingsRef.current && showBuildings) {
            const shouldShowBuildings = height < 200000; // Show buildings when closer than 200km
            buildingsRef.current.show = shouldShowBuildings;
          }
          
          if (cacheRef.current) {
            triggerIntelligentPrefetch(longitude, latitude, approximateZoom);
          }
        }, 1000);
      });

      viewerRef.current = viewer;


      return () => {
        if (viewerRef.current && !viewerRef.current.isDestroyed()) {
          viewerRef.current.destroy();
        }
      };
    } catch (error) {
      // Silent Cesium initialization errors
    }
  }, [isLoaded, onClick]);

  // Add OSM Buildings
  useEffect(() => {
    if (!viewerRef.current || !window.Cesium || !isLoaded) return;

    const viewer = viewerRef.current;

    if (showBuildings) {
      // Add OSM Buildings if not already added
      if (!buildingsRef.current) {
        window.Cesium.createOsmBuildingsAsync()
          .then((osmBuildings: any) => {
            buildingsRef.current = osmBuildings;
            viewer.scene.primitives.add(osmBuildings);
            
            // Mobile-optimized performance settings
            if (isMobile) {
              // More aggressive performance settings for mobile
              osmBuildings.maximumScreenSpaceError = 16; // Higher for better mobile performance
              osmBuildings.baseScreenSpaceError = 2048;
              osmBuildings.skipScreenSpaceErrorFactor = 32;
              osmBuildings.skipLevels = 2;
              osmBuildings.preloadWhenHidden = false;
              osmBuildings.preloadFlightDestinations = false;
              
              // Reduce building quality on mobile to maintain framerate
              osmBuildings.debugColorizeTiles = false;
              osmBuildings.showMemoryUsage = false;
            } else {
              // Desktop performance settings
              osmBuildings.maximumScreenSpaceError = 8;
              osmBuildings.baseScreenSpaceError = 1024;
              osmBuildings.skipScreenSpaceErrorFactor = 16;
              osmBuildings.skipLevels = 1;
              osmBuildings.preloadWhenHidden = true;
              osmBuildings.preloadFlightDestinations = true;
            }
            
            // Common optimizations for all devices
            osmBuildings.skipLevelOfDetail = true;
            osmBuildings.immediatelyLoadDesiredLevelOfDetail = false;
            osmBuildings.loadSiblings = false;
            osmBuildings.cullWithChildrenBounds = true;
            osmBuildings.cullRequestsWhileMoving = true;
            osmBuildings.cullRequestsWhileMovingMultiplier = 60;
            
            // Style buildings to render on global plane for non-terrain maps
            if (isDarkTheme) {
              osmBuildings.style = new window.Cesium.Cesium3DTileStyle({
                color: "color('#404040', 0.8)",
                show: "true",
                height: "0" // Render on global plane
              });
            } else {
              osmBuildings.style = new window.Cesium.Cesium3DTileStyle({
                color: "color('#ffffff', 0.9)",
                show: "true",
                height: "0" // Render on global plane
              });
            }
            
          })
          .catch((error: any) => {
            // Silent OSM Buildings loading errors
          });
      }
    } else {
      // Remove OSM Buildings if they exist
      if (buildingsRef.current) {
        viewer.scene.primitives.remove(buildingsRef.current);
        buildingsRef.current = null;
      }
    }

    return () => {
      if (buildingsRef.current) {
        try {
          viewer.scene.primitives.remove(buildingsRef.current);
          buildingsRef.current = null;
        } catch (error) {
          // Silent building removal errors
        }
      }
    };
  }, [showBuildings, isLoaded, isMobile]);

  // Update building styles when theme changes
  useEffect(() => {
    if (!buildingsRef.current || !window.Cesium || !isLoaded) return;

    const buildings = buildingsRef.current;
    
    if (isDarkTheme) {
      buildings.style = new window.Cesium.Cesium3DTileStyle({
        color: "color('#404040', 0.8)",
        show: "true",
        height: "0"
      });
    } else {
      buildings.style = new window.Cesium.Cesium3DTileStyle({
        color: "color('#ffffff', 0.9)", 
        show: "true",
        height: "0"
      });
    }
    
  }, [isDarkTheme, isLoaded, isMobile]);

  // Apply CSS filter for dark theme only (keep OSM always)
  useEffect(() => {
    if (!viewerRef.current || !window.Cesium || !isLoaded) return;

    const viewer = viewerRef.current;
    const cesiumCanvas = viewer.canvas;
    
    // Apply CSS filter only for dark theme
    if (isDarkTheme) {
      cesiumCanvas.style.filter = 'invert(1) hue-rotate(180deg) brightness(0.8) contrast(1.2)';
    } else {
      cesiumCanvas.style.filter = 'none';
    }
    
  }, [isDarkTheme, isLoaded]);

  // Add timezone lines
  useEffect(() => {
    if (!viewerRef.current || !window.Cesium || !isLoaded) return;

    const viewer = viewerRef.current;
    
    // Remove existing timezone entities
    const entitiesToRemove = viewer.entities.values.filter((entity: any) => 
      entity.name && (entity.name.includes('Timezone') || entity.name.includes('Meridian') || entity.name.includes('Date Line'))
    );
    entitiesToRemove.forEach((entity: any) => viewer.entities.remove(entity));

    // Add timezone lines
    for (let lng = -180; lng <= 180; lng += 15) {
      viewer.entities.add({
        name: `Timezone ${lng}°`,
        polyline: {
          positions: window.Cesium.Cartesian3.fromDegreesArray([lng, -85, lng, 85]),
          width: 1,
          material: isDarkTheme 
            ? window.Cesium.Color.fromCssColorString('#374151').withAlpha(0.3)
            : window.Cesium.Color.fromCssColorString('#9ca3af').withAlpha(0.3)
        }
      });
    }

    // Prime Meridian
    viewer.entities.add({
      name: 'Prime Meridian',
      polyline: {
        positions: window.Cesium.Cartesian3.fromDegreesArray([0, -85, 0, 85]),
        width: 2,
        material: window.Cesium.Color.fromCssColorString('#10b981').withAlpha(0.5)
      }
    });

    // International Date Line
    viewer.entities.add({
      name: 'International Date Line',
      polyline: {
        positions: window.Cesium.Cartesian3.fromDegreesArray([180, -85, 180, 85]),
        width: 2,
        material: window.Cesium.Color.fromCssColorString('#ef4444').withAlpha(0.5)
      }
    });
  }, [isDarkTheme, isLoaded]);

  // Update markers
  useEffect(() => {
    if (!viewerRef.current || !window.Cesium || !isLoaded) return;

    const viewer = viewerRef.current;

    // Clear existing markers and accuracy indicators
    const markerEntities = viewer.entities.values.filter((entity: any) => 
      entity.name && (entity.name.startsWith('marker-') || entity.name.startsWith('accuracy-'))
    );
    markerEntities.forEach((entity: any) => viewer.entities.remove(entity));

    // Add new markers
    markers.forEach(marker => {
      const isUserLocation = marker.id === 'user-location';
      
      if (isUserLocation) {
        // Create blue dot for user location
        viewer.entities.add({
          name: `marker-${marker.id}`,
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
        viewer.entities.add({
          name: `accuracy-${marker.id}`,
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
            font: '11pt sans-serif',
            pixelOffset: new window.Cesium.Cartesian2(0, -25),
            fillColor: window.Cesium.Color.WHITE,
            outlineColor: window.Cesium.Color.DODGERBLUE,
            outlineWidth: 2,
            horizontalOrigin: window.Cesium.HorizontalOrigin.CENTER
          } : undefined
        });
      } else {
        // Regular marker for other locations
        viewer.entities.add({
          name: `marker-${marker.id}`,
          position: window.Cesium.Cartesian3.fromDegrees(marker.position[1], marker.position[0]),
          point: {
            pixelSize: 10,
            color: window.Cesium.Color.YELLOW,
            outlineColor: window.Cesium.Color.BLACK,
            outlineWidth: 2
          },
          label: marker.popup ? {
            text: marker.popup,
            font: '12pt sans-serif',
            pixelOffset: new window.Cesium.Cartesian2(0, -50),
            fillColor: window.Cesium.Color.WHITE,
            outlineColor: window.Cesium.Color.BLACK,
            outlineWidth: 2
          } : undefined
        });
      }
    });
  }, [markers, isLoaded]);

  // Handle selected location highlighting
  useEffect(() => {
    if (!viewerRef.current || !window.Cesium || !isLoaded) return;
    
    const viewer = viewerRef.current;
    
    // Remove existing boundary highlights
    const boundaryEntities = viewer.entities.values.filter((entity: any) => 
      entity.name && entity.name.startsWith('boundary-')
    );
    boundaryEntities.forEach((entity: any) => viewer.entities.remove(entity));
    
    if (selectedLocation && selectedLocation.osm_id) {
      // Calculate extrusion height based on area type and size
      let extrudedHeight = 50000; // Default for medium areas
      
      // Scale based on type and class
      if (selectedLocation.type === 'country' || selectedLocation.class === 'boundary') {
        extrudedHeight = 200000; // Countries get tall extrusion
      } else if (selectedLocation.type === 'state' || selectedLocation.type === 'province') {
        extrudedHeight = 100000; // States get medium extrusion  
      } else if (selectedLocation.type === 'city' || selectedLocation.type === 'town') {
        extrudedHeight = 30000;  // Cities get lower extrusion
      } else if (selectedLocation.type === 'village' || selectedLocation.type === 'district') {
        extrudedHeight = 15000;  // Small areas get minimal extrusion
      }
      
      // Further scale based on bounding box if available
      if (selectedLocation.boundingbox && selectedLocation.boundingbox.length === 4) {
        const latDiff = Math.abs(parseFloat(selectedLocation.boundingbox[1]) - parseFloat(selectedLocation.boundingbox[0]));
        const lonDiff = Math.abs(parseFloat(selectedLocation.boundingbox[3]) - parseFloat(selectedLocation.boundingbox[2]));
        const maxDiff = Math.max(latDiff, lonDiff);
        
        if (maxDiff > 50) extrudedHeight = 300000;      // Very large areas (continents)
        else if (maxDiff > 20) extrudedHeight = 200000; // Large countries
        else if (maxDiff > 10) extrudedHeight = 100000; // Medium countries/states
        else if (maxDiff > 5) extrudedHeight = 50000;   // Small states
        else if (maxDiff > 2) extrudedHeight = 25000;   // Cities
        else if (maxDiff > 1) extrudedHeight = 15000;   // Small cities
        else if (maxDiff > 0.1) extrudedHeight = 8000;  // Districts
        else extrudedHeight = 5000;                     // Very small areas
      }
      
      
      // Fetch and display administrative boundary
      fetch(`https://nominatim.openstreetmap.org/lookup?osm_ids=${selectedLocation.osm_type?.charAt(0).toUpperCase()}${selectedLocation.osm_id}&format=geojson&polygon_geojson=1`)
        .then(response => response.json())
        .then(data => {
          if (data.features && data.features[0]) {
            const geometry = data.features[0].geometry;
            if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
              const coordinates = geometry.type === 'Polygon' 
                ? [geometry.coordinates] 
                : geometry.coordinates;
              
              coordinates.forEach((polygon: any, index: number) => {
                const positions = polygon[0].map((coord: number[]) => 
                  window.Cesium.Cartesian3.fromDegrees(coord[0], coord[1])
                );
                
                viewer.entities.add({
                  name: `boundary-${selectedLocation.osm_id}-${index}`,
                  polygon: {
                    hierarchy: positions,
                    material: window.Cesium.Color.YELLOW.withAlpha(0.3),
                    outline: true,
                    outlineColor: window.Cesium.Color.YELLOW,
                    height: 0,
                    extrudedHeight: extrudedHeight
                  }
                });
              });
            }
          }
        })
        .catch(error => {});
    }
  }, [selectedLocation, isLoaded]);

  // Update camera position when center/zoom changes
  useEffect(() => {
    if (!viewerRef.current || !window.Cesium || !isLoaded) return;

    // Calculate height based on zoom level - more precise for administrative areas
    let height;
    if (zoom <= 3) height = 20000000;      // Continental view
    else if (zoom <= 4) height = 10000000; // Large country view
    else if (zoom <= 5) height = 5000000;  // Country view
    else if (zoom <= 6) height = 2500000;  // State view
    else if (zoom <= 8) height = 1000000;  // Region view
    else if (zoom <= 10) height = 500000;  // City view
    else if (zoom <= 12) height = 200000;  // District view
    else height = Math.max(10000, 50000000 / Math.pow(2, zoom)); // Default calculation

    
    viewerRef.current.camera.flyTo({
      destination: window.Cesium.Cartesian3.fromDegrees(center[1], center[0], height),
      duration: 2.0
    });

    // Start intelligent prefetching after camera movement
    if (cacheRef.current) {
      setTimeout(() => {
        triggerIntelligentPrefetch(center[1], center[0], zoom);
      }, 3000); // Wait for initial load to complete
    }
  }, [center, zoom, isLoaded]);

  // Intelligent prefetching function
  const triggerIntelligentPrefetch = (lon: number, lat: number, zoomLevel: number) => {
    if (!cacheRef.current) return;

    // Run async operations without blocking React
    Promise.resolve().then(async () => {
      try {
        // Convert lat/lon to tile coordinates
        const z = Math.min(18, Math.max(0, Math.floor(zoomLevel)));
        const x = Math.floor((lon + 180) / 360 * Math.pow(2, z));
        const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
        
        if (cacheRef.current) {
          await cacheRef.current.prefetchTilesAroundArea('osm', z, x, y, 3, true);
        }
      } catch (error) {
        // Silent prefetch errors
      }
    });
  };


  if (!isMounted || !isLoaded) {
    return null; // Let the dynamic import loading screen handle this
  }

  return (
    <div className={`relative w-full h-full ${className}`} style={style}>
      <div 
        ref={containerRef}
        className="w-full h-full"
      />
    </div>
  );
}