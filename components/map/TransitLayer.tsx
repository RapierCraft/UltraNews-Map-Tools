'use client';

import { useState, useEffect, useCallback } from 'react';
import { transitService, TransitStop, TransitRoute, BoundingBox } from '@/lib/transitService';

interface TransitLayerProps {
  bounds?: BoundingBox;
  zoom: number;
  onStopClick?: (stop: TransitStop) => void;
  onRouteClick?: (route: TransitRoute) => void;
  showStops?: boolean;
  showRoutes?: boolean;
  className?: string;
}

export default function TransitLayer({
  bounds,
  zoom,
  onStopClick,
  onRouteClick,
  showStops = true,
  showRoutes = true,
  className = ''
}: TransitLayerProps) {
  const [stops, setStops] = useState<TransitStop[]>([]);
  const [routes, setRoutes] = useState<TransitRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load transit data when bounds change (with reduced frequency)
  useEffect(() => {
    if (!bounds || zoom < 14) return; // Only load at higher zoom levels (14+)

    const loadTransitData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Only load stops, skip routes to reduce API load
        const stopsData = showStops ? await transitService.getStopsInBounds(bounds, 50) : [];

        setStops(stopsData);
        setRoutes([]); // Disable routes to reduce API calls
      } catch (err) {
        console.error('Failed to load transit data:', err);
        setError('Failed to load transit data');
      } finally {
        setLoading(false);
      }
    };

    // Debounce API calls - only load after zoom/bounds have stabilized
    const timer = setTimeout(loadTransitData, 1000);
    return () => clearTimeout(timer);
  }, [bounds, zoom, showStops]);

  // Convert stops and routes to GeoJSON
  const stopsGeoJSON = transitService.stopsToGeoJSON(stops);
  const routesGeoJSON = transitService.routesToGeoJSON(routes);

  if (zoom < 14) {
    return null; // Don't show transit data at low zoom levels (increased from 12 to 14)
  }

  return (
    <div className={`transit-layer ${className}`}>
      {loading && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
          Loading transit...
        </div>
      )}
      
      {error && (
        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
          {error}
        </div>
      )}

      {/* This component provides data to parent map components */}
      {/* Actual rendering handled by map libraries (Cesium, Leaflet, etc.) */}
      <div 
        data-stops={JSON.stringify(stopsGeoJSON)}
        data-routes={JSON.stringify(routesGeoJSON)}
        className="hidden"
      />
    </div>
  );
}

// Hook for using transit data in map components
export function useTransitData(bounds?: BoundingBox, zoom: number = 14) {
  const [stops, setStops] = useState<TransitStop[]>([]);
  const [routes, setRoutes] = useState<TransitRoute[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!bounds || zoom < 14) {
      setStops([]);
      setRoutes([]);
      return;
    }

    setLoading(true);
    try {
      // Only load stops to reduce API calls
      const stopsData = await transitService.getStopsInBounds(bounds, 50);
      setStops(stopsData);
      setRoutes([]); // Disable routes
    } catch (error) {
      console.error('Failed to load transit data:', error);
    } finally {
      setLoading(false);
    }
  }, [bounds, zoom]);

  useEffect(() => {
    // Debounce the API calls
    const timer = setTimeout(loadData, 1500);
    return () => clearTimeout(timer);
  }, [loadData]);

  return {
    stops,
    routes,
    loading,
    stopsGeoJSON: transitService.stopsToGeoJSON(stops),
    routesGeoJSON: transitService.routesToGeoJSON(routes),
    refreshData: loadData
  };
}