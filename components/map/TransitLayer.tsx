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

  // Load transit data when bounds change
  useEffect(() => {
    if (!bounds || zoom < 12) return; // Only load at high zoom levels

    const loadTransitData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [stopsData, routesData] = await Promise.all([
          showStops ? transitService.getStopsInBounds(bounds, 100) : Promise.resolve([]),
          showRoutes ? transitService.getRoutesInBounds(bounds, 50) : Promise.resolve([])
        ]);

        setStops(stopsData);
        setRoutes(routesData);
      } catch (err) {
        console.error('Failed to load transit data:', err);
        setError('Failed to load transit data');
      } finally {
        setLoading(false);
      }
    };

    loadTransitData();
  }, [bounds, zoom, showStops, showRoutes]);

  // Convert stops and routes to GeoJSON
  const stopsGeoJSON = transitService.stopsToGeoJSON(stops);
  const routesGeoJSON = transitService.routesToGeoJSON(routes);

  if (zoom < 12) {
    return null; // Don't show transit data at low zoom levels
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
export function useTransitData(bounds?: BoundingBox, zoom: number = 12) {
  const [stops, setStops] = useState<TransitStop[]>([]);
  const [routes, setRoutes] = useState<TransitRoute[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!bounds || zoom < 12) return;

    setLoading(true);
    try {
      const [stopsData, routesData] = await Promise.all([
        transitService.getStopsInBounds(bounds, 100),
        transitService.getRoutesInBounds(bounds, 50)
      ]);

      setStops(stopsData);
      setRoutes(routesData);
    } catch (error) {
      console.error('Failed to load transit data:', error);
    } finally {
      setLoading(false);
    }
  }, [bounds, zoom]);

  useEffect(() => {
    loadData();
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