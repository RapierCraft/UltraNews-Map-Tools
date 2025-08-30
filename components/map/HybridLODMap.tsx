'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import LoadingScreen from './LoadingScreen';

const CesiumGlobe = dynamic(
  () => import('./CesiumGlobe'),
  { 
    ssr: false,
    loading: () => <LoadingScreen />
  }
);

const VectorMap = dynamic(
  () => import('./VectorMap'),
  { 
    ssr: false,
    loading: () => <LoadingScreen />
  }
);


interface HybridLODMapProps {
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
}

type RenderMode = '3d' | 'vector';

export default function HybridLODMap({
  center = [40.7128, -74.0060],
  zoom = 8,
  markers = [],
  className = '',
  style = {},
  selectedLocation,
  onClick,
  currentLayer = 'osm-standard',
  isDarkTheme = false,
  showBuildings = true
}: HybridLODMapProps) {
  const [currentRenderMode, setCurrentRenderMode] = useState<RenderMode>('3d');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousZoom = useRef(zoom);
  const transitionTimeout = useRef<NodeJS.Timeout | null>(null);

  // Determine optimal render mode based on zoom level
  const getOptimalRenderMode = useCallback((zoomLevel: number): RenderMode => {
    if (zoomLevel <= 10) {
      return '3d';        // Global/continental view - 3D globe for context
    } else {
      return 'vector';    // City/street level - MapTiler vectors for performance and detail
    }
  }, []);

  // Handle zoom changes with intelligent switching and predictive loading
  useEffect(() => {
    const optimalMode = getOptimalRenderMode(zoom);
    
    if (optimalMode !== currentRenderMode) {
      // Clear any existing transition timeout
      if (transitionTimeout.current) {
        clearTimeout(transitionTimeout.current);
      }

      // Predictive loading: preload next mode if approaching threshold
      const zoomDelta = zoom - previousZoom.current;
      const isZoomingIn = zoomDelta > 0;
      const isZoomingOut = zoomDelta < 0;
      
      // Smart debouncing based on zoom direction and speed
      let debounceTime = 300;
      if (Math.abs(zoomDelta) > 2) {
        debounceTime = 150; // Fast zoom changes get quicker switching
      } else if (Math.abs(zoomDelta) < 0.5) {
        debounceTime = 500; // Slow zoom changes get more debounce
      }

      setIsTransitioning(true);
      transitionTimeout.current = setTimeout(() => {
        setCurrentRenderMode(optimalMode);
        setIsTransitioning(false);
        
        // Performance logging
        console.log(`LOD Switch: zoom ${previousZoom.current}→${zoom}, mode ${currentRenderMode}→${optimalMode}`);
      }, debounceTime);
    }

    previousZoom.current = zoom;
  }, [zoom, currentRenderMode, getOptimalRenderMode]);

  // Handle smooth transitions between render modes
  const handleZoomChange = useCallback((newZoom: number) => {
    const currentMode = getOptimalRenderMode(previousZoom.current);
    const newMode = getOptimalRenderMode(newZoom);
    
    if (currentMode !== newMode) {
      setIsTransitioning(true);
    }
  }, [getOptimalRenderMode]);

  // Enhanced click handler that maintains context across modes
  const handleMapClick = useCallback((e: { position: { latitude: number; longitude: number }; screenPosition?: { x: number; y: number } }) => {
    if (onClick) {
      onClick(e);
    }
  }, [onClick]);

  // Performance monitoring for mode switching decisions
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderTime: 0,
    frameRate: 0,
    memoryUsage: 0
  });

  // Memory management and cache cleanup
  const [componentCache] = useState(() => new Map());

  // Advanced performance monitoring
  useEffect(() => {
    const startTime = performance.now();
    let frameCount = 0;
    let lastFrameTime = startTime;
    
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.entryType === 'measure') {
          setPerformanceMetrics(prev => ({
            ...prev,
            renderTime: entry.duration
          }));
        }
      });
    });

    observer.observe({ entryTypes: ['measure'] });

    // FPS monitoring
    const fpsInterval = setInterval(() => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastFrameTime;
      const fps = 1000 / deltaTime;
      
      setPerformanceMetrics(prev => ({
        ...prev,
        frameRate: fps
      }));
      
      lastFrameTime = currentTime;
    }, 1000);

    // Memory monitoring
    const memoryInterval = setInterval(() => {
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        setPerformanceMetrics(prev => ({
          ...prev,
          memoryUsage: memInfo.usedJSHeapSize / 1024 / 1024 // MB
        }));
      }
    }, 5000);

    return () => {
      observer.disconnect();
      clearInterval(fpsInterval);
      clearInterval(memoryInterval);
    };
  }, [currentRenderMode]);

  // Cleanup unused components to free memory
  useEffect(() => {
    return () => {
      if (transitionTimeout.current) {
        clearTimeout(transitionTimeout.current);
      }
      // Clear component cache on unmount
      componentCache.clear();
    };
  }, []);

  return (
    <div className={`relative w-full h-full ${className}`} style={style}>
      {/* Performance-based transition overlay */}
      {isTransitioning && (
        <div className="absolute inset-0 z-[2000] bg-black/20 flex items-center justify-center">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Switching to {getOptimalRenderMode(zoom) === '3d' ? '3D Globe' : 
                           getOptimalRenderMode(zoom) === 'vector' ? 'Vector Tiles' : 
                           'Infinite Vectors'} (zoom {zoom})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Unified rendering with intelligent switching */}
      <div className="w-full h-full">
        {currentRenderMode === '3d' && (
          <CesiumGlobe
            center={center}
            zoom={zoom}
            markers={markers}
            selectedLocation={selectedLocation}
            className="w-full h-full"
            onClick={handleMapClick}
            currentLayer={currentLayer}
            isDarkTheme={isDarkTheme}
            showBuildings={showBuildings}
          />
        )}
        
        {currentRenderMode === 'vector' && (
          <VectorMap
            center={center}
            zoom={zoom}
            markers={markers}
            selectedLocation={selectedLocation}
            className="w-full h-full"
            onClick={handleMapClick}
            currentLayer={currentLayer}
            isDarkTheme={isDarkTheme}
            showBuildings={showBuildings}
          />
        )}
        
      </div>

      {/* Enhanced LOD Status Indicator with Performance Metrics */}
      <div className="absolute bottom-4 right-4 z-[1000]">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur px-3 py-2 rounded-lg shadow-lg text-xs">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              currentRenderMode === '3d' ? 'bg-blue-500' : 'bg-green-500'
            } ${isTransitioning ? 'animate-pulse' : ''}`}></div>
            <span className="text-gray-700 dark:text-gray-300">
              LOD: {currentRenderMode === '3d' ? 'Globe (z≤10)' : 'Vector Tiles (z>10)'}
            </span>
          </div>
          <div className="text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
            <div>Zoom: {zoom.toFixed(1)} | Mode: {currentRenderMode}</div>
            {performanceMetrics.frameRate > 0 && (
              <div className="flex justify-between">
                <span>FPS: {performanceMetrics.frameRate.toFixed(0)}</span>
                {performanceMetrics.memoryUsage > 0 && (
                  <span>Mem: {performanceMetrics.memoryUsage.toFixed(1)}MB</span>
                )}
              </div>
            )}
          </div>
          {/* Zoom threshold indicators */}
          <div className="flex gap-1 mt-1">
            <div className={`w-1 h-1 rounded-full ${zoom <= 10 ? 'bg-blue-500' : 'bg-gray-300'}`} title="3D Globe Zone"></div>
            <div className={`w-1 h-1 rounded-full ${zoom > 10 ? 'bg-green-500' : 'bg-gray-300'}`} title="Vector Tiles Zone"></div>
          </div>
        </div>
      </div>
    </div>
  );
}