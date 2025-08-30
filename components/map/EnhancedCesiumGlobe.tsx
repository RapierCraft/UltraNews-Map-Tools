'use client';

import { useEffect, useRef, useState } from 'react';
import { CesiumVectorTileProvider } from '@/lib/cesiumVectorProvider';
import { HybridVectorProvider, createHybridVectorProvider } from '@/lib/hybridVectorProvider';
import { generateDynamicStyle, VECTOR_STYLES } from '@/lib/vectorStyles';
import VectorStoryOverlay, { fitViewToStory } from './VectorStoryOverlay';
import { getVectorCache } from '@/lib/vectorCache';

interface NewsStory {
  id: string;
  headline: string;
  content: string;
  publishedAt: Date;
  source: string;
}

interface EnhancedCesiumGlobeProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    popup?: string;
    id: string;
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
  useVectorTiles?: boolean;
  dataLayers?: {
    roads: boolean;
    buildings: boolean;
    waterways: boolean;
    parks: boolean;
    labels: boolean;
    poi: boolean;
  };
  newsStory?: NewsStory;
  timelinePosition?: number;
}

declare global {
  interface Window {
    Cesium: any;
  }
}

export default function EnhancedCesiumGlobe({
  center = [40.7128, -74.0060],
  zoom = 12,
  markers = [],
  className = '',
  style = {},
  selectedLocation,
  onClick,
  currentLayer = 'osm-standard',
  isDarkTheme = false,
  showBuildings = true,
  useVectorTiles = true,
  dataLayers = {
    roads: true,
    buildings: true,
    waterways: true,
    parks: true,
    labels: true,
    poi: true
  },
  newsStory,
  timelinePosition = 100
}: EnhancedCesiumGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const vectorProviderRef = useRef<HybridVectorProvider | null>(null);
  const vectorLayerRef = useRef<any>(null);
  const buildingsRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
    
    // Register service worker for vector tile caching
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered for vector tile caching');
        })
        .catch(error => {
          console.warn('SW registration failed:', error);
        });
    }
  }, []);

  // Load Cesium
  useEffect(() => {
    if (!isMounted) return;
    
    if (window.Cesium) {
      setIsLoaded(true);
      return;
    }

    // Load Cesium CSS
    const link = document.createElement('link');
    link.href = '/cesium/Widgets/widgets.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    // Load Cesium script
    const script = document.createElement('script');
    script.src = '/cesium/Cesium.js';
    script.onload = () => {
      if (window.Cesium) {
        window.Cesium.buildModuleUrl.setBaseUrl('/cesium/');
        setIsLoaded(true);
      }
    };
    script.onerror = (error) => {
      console.error('Failed to load Cesium:', error);
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [isMounted]);

  // Initialize Cesium viewer with vector tiles
  useEffect(() => {
    if (!isLoaded || !containerRef.current || !window.Cesium) return;

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
        shouldAnimate: false,
        requestRenderMode: false,
        maximumRenderTimeChange: undefined
      });

      viewerRef.current = viewer;

      // Configure scene
      viewer.scene.skyBox.show = false;
      viewer.scene.backgroundColor = window.Cesium.Color.fromCssColorString(
        isDarkTheme ? '#1a1a1a' : '#f8f8f8'
      );
      viewer.scene.skyAtmosphere.show = false;
      
      // Set zoom limits
      viewer.scene.screenSpaceCameraController.maximumZoomDistance = 20000000;
      viewer.scene.screenSpaceCameraController.minimumZoomDistance = 1;
      
      // Remove default imagery layers
      viewer.imageryLayers.removeAll();

      // Initialize vector tiles if enabled
      if (useVectorTiles) {
        initializeVectorTiles(viewer);
      } else {
        // Fallback to raster tiles
        initializeRasterTiles(viewer);
      }

      // Setup globe optimizations
      viewer.scene.globe.enableLighting = false;
      viewer.scene.globe.showWaterEffect = false;
      viewer.scene.globe.tileCacheSize = 1000;
      viewer.scene.globe.preloadAncestors = true;
      viewer.scene.globe.preloadSiblings = true;

      // Set initial camera position
      const cartesian = window.Cesium.Cartesian3.fromDegrees(center[1], center[0], 15000000);
      viewer.camera.setView({ destination: cartesian });

      // Handle clicks
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

    } catch (error) {
      console.error('Failed to initialize Cesium:', error);
    }

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [isLoaded, useVectorTiles]);

  // Initialize hybrid vector tiles
  const initializeVectorTiles = async (viewer: any) => {
    try {
      const storyType = newsStory?.id.includes('ukraine') ? 'ukraine' :
                       newsStory?.id.includes('pipeline') ? 'pipeline' :
                       newsStory?.id.includes('svb') ? 'banking' : undefined;
      
      const provider = createHybridVectorProvider(isDarkTheme, storyType);
      vectorProviderRef.current = provider;

      const imageryProvider = await provider.createCesiumImageryProvider();
      const layer = viewer.imageryLayers.addImageryProvider(imageryProvider);
      vectorLayerRef.current = layer;
      
      console.log('Hybrid vector tiles initialized successfully');
    } catch (error) {
      console.error('Failed to initialize hybrid vector tiles:', error);
      // Fallback to raster tiles
      initializeRasterTiles(viewer);
    }
  };

  // Fallback raster tiles
  const initializeRasterTiles = (viewer: any) => {
    const url = isDarkTheme 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const provider = new window.Cesium.UrlTemplateImageryProvider({
      url,
      credit: '© OpenStreetMap contributors',
      maximumLevel: 18
    });

    viewer.imageryLayers.addImageryProvider(provider);
  };

  // Update vector style when theme or layers change
  useEffect(() => {
    if (!vectorProviderRef.current || !useVectorTiles) return;

    const storyType = newsStory?.id.includes('ukraine') ? 'ukraine' :
                     newsStory?.id.includes('pipeline') ? 'pipeline' :
                     newsStory?.id.includes('svb') ? 'banking' : undefined;

    const newProvider = createHybridVectorProvider(isDarkTheme, storyType);
    
    // Apply story-specific highlights
    if (newsStory) {
      if (newsStory.id.includes('ukraine')) {
        newProvider.highlightCountries(['Ukraine', 'Russia'], '#ff6b6b');
      } else if (newsStory.id.includes('pipeline')) {
        newProvider.highlightRegions([
          { name: 'Baltic Sea', color: '#ffa502' },
          { name: 'Nord Stream', color: '#ff6348' }
        ]);
      } else if (newsStory.id.includes('svb')) {
        newProvider.highlightRegions([
          { name: 'Silicon Valley', color: '#3742fa' }
        ]);
      }
    }

    vectorProviderRef.current = newProvider;
  }, [isDarkTheme, dataLayers, useVectorTiles, newsStory]);

  // Update camera position when center changes
  useEffect(() => {
    if (!viewerRef.current) return;

    const cartesian = window.Cesium.Cartesian3.fromDegrees(
      center[1], 
      center[0], 
      Math.max(1000, 20000000 - (zoom * 1000000))
    );
    
    viewerRef.current.camera.flyTo({
      destination: cartesian,
      duration: 1.5
    });
  }, [center, zoom]);

  // Handle news story visualization
  useEffect(() => {
    if (!newsStory || !viewerRef.current) return;

    // Fit camera to story
    fitViewToStory(viewerRef.current, newsStory);
  }, [newsStory]);

  // Add markers
  useEffect(() => {
    if (!viewerRef.current || !window.Cesium) return;

    // Clear existing markers
    viewerRef.current.entities.removeAll();

    // Add new markers
    markers.forEach(marker => {
      viewerRef.current.entities.add({
        position: window.Cesium.Cartesian3.fromDegrees(marker.position[1], marker.position[0]),
        billboard: {
          image: '/leaflet/marker-icon.png',
          scale: 0.5,
          verticalOrigin: window.Cesium.VerticalOrigin.BOTTOM,
          heightReference: window.Cesium.HeightReference.CLAMP_TO_GROUND
        },
        label: marker.popup ? {
          text: marker.popup,
          font: '12pt Arial',
          fillColor: window.Cesium.Color.WHITE,
          outlineColor: window.Cesium.Color.BLACK,
          outlineWidth: 2,
          style: window.Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new window.Cesium.Cartesian2(0, -50),
          show: false // Show on hover
        } : undefined
      });
    });
  }, [markers]);

  // Handle feature clicking for vector stories
  const handleStoryFeatureClick = (feature: any) => {
    if (feature.type === 'story-location') {
      console.log('Story location clicked:', feature.data);
      // You can emit events or show modals here
    }
  };

  if (!isMounted) {
    return (
      <div className={`w-full h-full bg-gray-100 dark:bg-gray-900 ${className}`} style={style}>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Initializing 3D globe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`} style={style}>
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Vector Story Overlay for news visualization */}
      {newsStory && viewerRef.current && useVectorTiles && (
        <VectorStoryOverlay
          story={newsStory}
          viewer={viewerRef.current}
          isDarkTheme={isDarkTheme}
          timelinePosition={timelinePosition}
          onFeatureClick={handleStoryFeatureClick}
        />
      )}
    </div>
  );
}