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
    buildings: false, // Buildings off by default until user enables them
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
  const buildingLoadingRef = useRef<boolean>(false);
  const buildingCacheRef = useRef<Map<string, any>>(new Map()); // Pre-loaded building data cache
  const renderedTilesRef = useRef<Set<string>>(new Set()); // Track what's currently rendered

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Convert screen coordinates to tile coordinates
  const lonLatToTile = (lon: number, lat: number, zoom: number) => {
    const x = Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    return { x, y, z: zoom };
  };

  // Pre-load building data in background for instant rendering
  const preloadBuildingData = async (centerLat: number, centerLon: number, radius: number = 3) => {
    const zoomLevel = 13;
    const centerTileX = Math.floor((centerLon + 180) / 360 * Math.pow(2, zoomLevel));
    const centerTileY = Math.floor((1 - Math.log(Math.tan(centerLat * Math.PI / 180) + 1 / Math.cos(centerLat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoomLevel));
    
    const tilesToPreload = [];
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        tilesToPreload.push([centerTileX + dx, centerTileY + dy]);
      }
    }
    
    console.log(`🏢 Pre-loading ${tilesToPreload.length} tiles around [${centerLat.toFixed(3)}, ${centerLon.toFixed(3)}]`);
    
    // Load all tiles in parallel for instant access
    const promises = tilesToPreload.map(async ([x, y]) => {
      const tileKey = `${zoomLevel}/${x}/${y}`;
      
      if (buildingCacheRef.current.has(tileKey)) {
        return; // Already cached
      }
      
      try {
        const response = await fetch(`http://localhost:8002/api/v1/tiles/buildings/${zoomLevel}/${x}/${y}.json`);
        if (response.ok) {
          const data = await response.json();
          buildingCacheRef.current.set(tileKey, data);
          console.log(`🏢 Cached ${data?.features?.length || 0} buildings for tile ${tileKey}`);
        }
      } catch (error) {
        buildingCacheRef.current.set(tileKey, null); // Cache empty result
      }
    });
    
    await Promise.all(promises);
    console.log(`🏢 Pre-loading complete - ${buildingCacheRef.current.size} tiles cached`);
  };

  // Load building data using efficient Cesium primitives
  const loadBuildingsForView = async (viewer: any, forceReload: boolean = false) => {
    if (!buildingsRef.current || !viewer || !dataLayers.buildings) {
      return;
    }
    
    if (buildingLoadingRef.current && !forceReload) {
      return;
    }
    
    buildingLoadingRef.current = true;
    
    try {
      // Get current camera position
      const camera = viewer.camera;
      const cartographic = camera.positionCartographic;
      const longitude = window.Cesium.Math.toDegrees(cartographic.longitude);
      const latitude = window.Cesium.Math.toDegrees(cartographic.latitude);
      
      const zoomLevel = 13;
      console.log(`🏢 Camera center: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      
      // Get tile for camera center
      const centerTileX = Math.floor((longitude + 180) / 360 * Math.pow(2, zoomLevel));
      const centerTileY = Math.floor((1 - Math.log(Math.tan(latitude * Math.PI / 180) + 1 / Math.cos(latitude * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoomLevel));
      
      // Calculate which tiles are currently needed
      const tileRadius = currentZoomLevel >= 15 ? 1 : currentZoomLevel >= 12 ? 2 : 3;
      const neededTiles = new Set<string>();
      
      for (let dx = -tileRadius; dx <= tileRadius; dx++) {
        for (let dy = -tileRadius; dy <= tileRadius; dy++) {
          const tileKey = `${zoomLevel}/${centerTileX + dx}/${centerTileY + dy}`;
          neededTiles.add(tileKey);
        }
      }
      
      // Only remove distant tiles, keep nearby ones for better performance
      const currentlyLoaded = Array.from(buildingsRef.current.loadedTiles);
      const tilesToRemove = currentlyLoaded.filter(tileKey => {
        if (neededTiles.has(tileKey)) return false;
        
        // Calculate distance from center tile
        const [zStr, xStr, yStr] = tileKey.split('/');
        const tileX = parseInt(xStr);
        const tileY = parseInt(yStr);
        const distance = Math.max(Math.abs(tileX - centerTileX), Math.abs(tileY - centerTileY));
        
        // Only remove tiles that are far away (more than 5 tiles from center)
        return distance > 5;
      });
      
      for (const tileKey of tilesToRemove) {
        // Remove primitives for this tile
        const tilePrimitives = buildingsRef.current.entities.get(tileKey);
        if (tilePrimitives) {
          tilePrimitives.forEach((primitive: any) => {
            viewer.scene.primitives.remove(primitive);
          });
          buildingsRef.current.entities.delete(tileKey);
        }
        buildingsRef.current.loadedTiles.delete(tileKey);
        console.log(`🗑️ Removed buildings for tile ${tileKey} (out of view)`);
      }
      
      // Load new tiles that aren't already loaded
      const tilesToLoad = Array.from(neededTiles).filter(tileKey => 
        !buildingsRef.current.loadedTiles.has(tileKey)
      );
      
      console.log(`🏢 Loading ${tilesToLoad.length} new tiles around center [${centerTileX},${centerTileY}]`);
      
      // Load each new tile
      for (const tileKey of tilesToLoad) {
        const [zStr, xStr, yStr] = tileKey.split('/');
        const x = parseInt(xStr);
        const y = parseInt(yStr);
          
          let buildingData = null;
          
          // Try to get from cache first for instant rendering
          if (buildingCacheRef.current.has(tileKey)) {
            buildingData = buildingCacheRef.current.get(tileKey);
            console.log(`🏢 Using cached data for tile ${tileKey} (${buildingData?.features?.length || 0} buildings)`);
          } else {
            // Fallback to network request if not cached
            try {
              console.log(`🏢 Loading tile ${tileKey} from network`);
              const response = await fetch(`http://localhost:8002/api/v1/tiles/buildings/${zoomLevel}/${x}/${y}.json`);
              
              if (!response.ok) {
                buildingsRef.current.loadedTiles.add(tileKey);
                continue;
              }
              
              buildingData = await response.json();
              // Cache for future use
              buildingCacheRef.current.set(tileKey, buildingData);
            } catch (error) {
              console.error(`🏢 Error loading tile ${tileKey}:`, error);
              buildingsRef.current.loadedTiles.add(tileKey);
              continue;
            }
          }
          
          if (!buildingData?.features?.length) {
            buildingsRef.current.loadedTiles.add(tileKey);
            continue;
          }
            
            console.log(`🏢 Processing ${buildingData.features.length} buildings from tile ${tileKey}`);
            
            // PROPER Google Maps-style rendering using Cesium Primitives (NOT individual entities)
            const buildings = buildingData.features;
            const primitives: any[] = [];
            
            // Create batched geometry instances for massive performance boost
            const geometryInstances: any[] = [];
            
            buildings.forEach((feature: any, i: number) => {
              if (feature.geometry?.type === 'Polygon' && feature.geometry.coordinates?.[0]) {
                try {
                  const coords = feature.geometry.coordinates[0];
                  const polygonHierarchy = new window.Cesium.PolygonHierarchy(
                    coords.map((coord: number[]) => 
                      window.Cesium.Cartesian3.fromDegrees(coord[0], coord[1])
                    )
                  );
                  
                  const height = Math.max(feature.properties?.height || 20, 15);
                  
                  // Create geometry instance (much more efficient than entities)
                  const geometryInstance = new window.Cesium.GeometryInstance({
                    geometry: new window.Cesium.PolygonGeometry({
                      polygonHierarchy: polygonHierarchy,
                      height: 0,
                      extrudedHeight: height,
                      vertexFormat: window.Cesium.PerInstanceColorAppearance.VERTEX_FORMAT
                    }),
                    attributes: {
                      color: window.Cesium.ColorGeometryInstanceAttribute.fromColor(
                        window.Cesium.Color.DARKGRAY.withAlpha(0.8)
                      )
                    },
                    id: `Building-${tileKey}-${i}`
                  });
                  
                  geometryInstances.push(geometryInstance);
                  
                } catch (error) {
                  // Skip invalid buildings
                }
              }
            });
            
            // Create single primitive for ALL buildings in this tile (massive performance boost)
            if (geometryInstances.length > 0) {
              const primitive = new window.Cesium.Primitive({
                geometryInstances: geometryInstances,
                appearance: new window.Cesium.PerInstanceColorAppearance({
                  closed: false,
                  translucent: true
                }),
                show: buildingsRef.current?.show || false,
                asynchronous: true // Non-blocking rendering
              });
              
              viewer.scene.primitives.add(primitive);
              primitives.push(primitive);
              
              console.log(`🏢 Created 1 primitive with ${geometryInstances.length} buildings for tile ${tileKey}`);
            }
            
            // Store primitives instead of entities
            buildingsRef.current.entities.set(tileKey, primitives);
            
            
            buildingsRef.current.loadedTiles.add(tileKey);
        }
      
      // Force visibility update after loading all tiles
      if (buildingsRef.current.entities && buildingsRef.current.show) {
        toggleBuildingVisibility(true);
        console.log('🏢 Forced visibility update after loading all tiles');
      }
      
    } catch (error) {
      console.error('🏢 Error loading buildings:', error);
    } finally {
      buildingLoadingRef.current = false;
    }
  };

  // Toggle building visibility
  const toggleBuildingVisibility = (show: boolean) => {
    if (!buildingsRef.current) return;
    
    buildingsRef.current.show = show;
    console.log(`🏢 toggleBuildingVisibility called with show=${show}, total tiles: ${buildingsRef.current.entities?.size || 0}`);
    
    // Update all building primitives (not entities - for performance)
    let totalPrimitives = 0;
    if (buildingsRef.current.entities) {
      buildingsRef.current.entities.forEach((primitives: any[]) => {
        totalPrimitives += primitives.length;
        primitives.forEach((primitive: any) => {
          if (primitive && primitive.show !== undefined) {
            primitive.show = show;
          }
        });
      });
    }
    console.log(`🏢 Updated visibility for ${totalPrimitives} building primitives (MUCH faster than entities)`);
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
          selectionIndicator: false,
          // Performance optimizations for Google Maps-style rendering
          requestRenderMode: true, // Only render when scene changes
          maximumRenderTimeChange: undefined // Allow longer render times for smoother experience
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
        
        // Google Maps-style performance optimizations
        viewer.scene.globe.tileCacheSize = 1000; // Increase tile cache for better performance
        viewer.scene.requestRenderMode = true; // Only render when needed
        viewer.scene.maximumRenderTimeChange = 2.0; // Allow slightly longer render times
        viewer.cesiumWidget.targetFrameRate = 60; // Target 60 FPS
        
        // Optimize globe rendering for buildings
        viewer.scene.globe.preloadSiblings = true; // Preload adjacent tiles
        viewer.scene.globe.preloadAncestors = true; // Preload parent tiles
        
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
        if (useVectorTiles) {
          buildingsRef.current = {
            show: dataLayers.buildings,
            entities: new Map(), // Track building entities by tile
            loadedTiles: new Set() // Track loaded tiles
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

        // Track last loaded position to detect significant movement
        let lastLoadedPosition = { lat: center[0], lon: center[1] }; // Initialize with center position
        let lastLoadTime = 0;
        
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
          
          // Show buildings when zoomed in (zoom >= 8) AND buildings layer is enabled
          if (buildingsRef.current) {
            const shouldShowBuildings = zoomLevel >= 8 && dataLayers.buildings;
            if (buildingsRef.current.show !== shouldShowBuildings) {
              toggleBuildingVisibility(shouldShowBuildings);
              console.log(`🏢 Buildings ${shouldShowBuildings ? 'SHOWN' : 'HIDDEN'} at zoom level ${Math.round(zoomLevel * 10) / 10} (buildings layer: ${dataLayers.buildings})`);
              
              // Load building data when showing (force reload to ensure buildings are visible)
              // Double-check that both the ref state and layer state agree before loading
              if (shouldShowBuildings && buildingsRef.current.show && dataLayers.buildings) {
                await loadBuildingsForView(viewer, true);
                
                // Also start pre-loading for seamless experience (smaller radius to reduce load)
                const position = viewer.camera.positionCartographic;
                const longitude = window.Cesium.Math.toDegrees(position.longitude);
                const latitude = window.Cesium.Math.toDegrees(position.latitude);
                lastLoadedPosition = { lat: latitude, lon: longitude };
                console.log('🏢 Starting initial pre-loading for seamless experience...');
                preloadBuildingData(latitude, longitude, 2); // Pre-load 5x5 grid initially
              }
            }
          }
        };

        // Load buildings dynamically as camera moves
        const checkAndLoadBuildings = async () => {
          // Get current zoom level from camera height
          const height = viewer.camera.positionCartographic.height;
          const currentZoom = getZoomFromHeight(height);
          
          if (!buildingsRef.current) {
            console.log('🏢 Check skipped - buildingsRef not initialized');
            return;
          }
          
          if (!buildingsRef.current.show || currentZoom < 8 || !dataLayers.buildings) {
            console.log(`🏢 Check skipped - show:${buildingsRef.current.show}, zoom:${currentZoom.toFixed(1)}, layer:${dataLayers.buildings}`);
            return;
          }
          
          const position = viewer.camera.positionCartographic;
          const longitude = window.Cesium.Math.toDegrees(position.longitude);
          const latitude = window.Cesium.Math.toDegrees(position.latitude);
          
          // Calculate distance moved in tile units (at zoom 13)
          const zoomLevel = 13;
          const tileSize = 360 / Math.pow(2, zoomLevel);
          const latDiff = Math.abs(latitude - lastLoadedPosition.lat);
          const lonDiff = Math.abs(longitude - lastLoadedPosition.lon);
          const tileMoved = Math.max(latDiff / tileSize, lonDiff / tileSize);
          
          console.log(`🏢 Movement check: moved ${tileMoved.toFixed(2)} tiles from last position`);
          
          // Load new tiles if moved more than 1 tile or after 2 seconds
          const now = Date.now();
          if (tileMoved > 1 || (now - lastLoadTime > 2000 && tileMoved > 0.5)) {
            console.log(`🏢 Camera moved ${tileMoved.toFixed(2)} tiles - loading new buildings`);
            lastLoadedPosition = { lat: latitude, lon: longitude };
            lastLoadTime = now;
            await loadBuildingsForView(viewer);
            
            // Pre-load nearby tiles
            preloadBuildingData(latitude, longitude, 2);
          }
        };

        viewer.camera.moveEnd.addEventListener(updateCameraState);
        viewer.camera.changed.addEventListener(updateCameraState);
        
        // Check for building loading on camera movement end
        viewer.camera.moveEnd.addEventListener(checkAndLoadBuildings);
        
        // Also check periodically during camera movement for smooth loading
        let moveCheckInterval: any = null;
        viewer.camera.moveStart.addEventListener(() => {
          console.log('🏢 Camera movement started - enabling continuous check');
          if (moveCheckInterval) clearInterval(moveCheckInterval);
          moveCheckInterval = setInterval(checkAndLoadBuildings, 500); // Check every 500ms during movement
        });
        
        viewer.camera.moveEnd.addEventListener(() => {
          console.log('🏢 Camera movement ended - stopping continuous check');
          if (moveCheckInterval) {
            clearInterval(moveCheckInterval);
            moveCheckInterval = null;
          }
          // Also do a final check when movement stops
          checkAndLoadBuildings();
        });

        // Handle double-clicks to open information modal
        if (onClick) {
          viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(
            (event: any) => {
              // Handle map double-clicks
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
            window.Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
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
    
    const updateLayers = async () => {
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
        // Load building data first if enabling and at appropriate zoom
        if (dataLayers.buildings && currentZoomLevel >= 8) {
          await loadBuildingsForView(viewer);
        }
        
        toggleBuildingVisibility(dataLayers.buildings);
        console.log(`🏢 Buildings layer toggled: ${dataLayers.buildings ? 'ENABLED' : 'DISABLED'}`);
      }
      
      console.log(`✅ ${currentLayer} tiles updated with labels:`, dataLayers?.labels);
      console.log('Current theme state:', { currentLayer, isDarkTheme, useVectorTiles });
    };
    
    updateLayers();
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