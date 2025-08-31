'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the original CesiumGlobe as fallback
const CesiumGlobe = dynamic(
  () => import('./CesiumGlobe'),
  { ssr: false }
);

// Dynamically import the simple vector version
const SimpleVectorGlobe = dynamic(
  () => import('./SimpleVectorGlobe'),
  { ssr: false }
);

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

interface VectorCesiumWrapperProps {
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
    boundingbox?: string[];
  };
  boundsToFit?: [[number, number], [number, number]];
  onClick?: (e: { position: { latitude: number; longitude: number }; screenPosition?: { x: number; y: number } }) => void;
  currentLayer?: string;
  isDarkTheme?: boolean;
  showBuildings?: boolean;
  useVectorTiles?: boolean;
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

export default function VectorCesiumWrapper(props: VectorCesiumWrapperProps) {
  const [hasError, setHasError] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Error boundary for vector tile implementation
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      if (error.message.includes('vector') || error.message.includes('MapLibre')) {
        console.warn('Vector tile error detected, falling back to raster:', error);
        setHasError(true);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (!isClient) {
    return (
      <div className={`w-full h-full bg-gray-100 dark:bg-gray-900 ${props.className}`}>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Loading map...</p>
        </div>
      </div>
    );
  }

  // Use simple vector version if enabled and no errors
  if (props.useVectorTiles && !hasError) {
    return <SimpleVectorGlobe {...props} />;
  }

  // Fallback to original CesiumGlobe - also pass new props for compatibility
  return <CesiumGlobe {...props} />;
}