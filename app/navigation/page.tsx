'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigation, Clock, MapPin, Route, Zap, TrendingUp } from 'lucide-react';
import SimpleNavigation from '@/components/map/SimpleNavigation';
import PreNavigationScreen from '@/components/map/PreNavigationScreen';

// Dynamic import for map to avoid SSR issues  
const BasicMap = dynamic(() => import('@/components/map/BasicMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
      <p className="text-gray-500">Loading navigation map...</p>
    </div>
  )
});

interface RouteStep {
  instructions: string;
  distance_m: number;
  duration_s: number;
  traffic_duration_s: number;
  maneuver?: {
    type: string;
    modifier?: string;
  };
  traffic_info?: {
    condition: string;
    delay_minutes: number;
    speed_kmh: number;
  };
  warnings?: string[];
  road_name?: string;
}

interface NavigationRoute {
  total_distance_m: number;
  total_duration_s: number;
  total_traffic_duration_s: number;
  segments: RouteStep[];
  overview_geometry: number[][];
  traffic_delay_s: number;
  confidence: number;
  warnings?: any[];
  tolls?: {
    amount: number;
    currency: string;
    locations: number;
  };
  fuel_consumption?: {
    liters: number;
    cost_estimate: number;
  };
  alternatives?: NavigationRoute[];
}

interface RoutePoint {
  lat: number;
  lon: number;
  name?: string;
}

export default function NavigationPage() {
  const [selectedRoute, setSelectedRoute] = useState<NavigationRoute | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showPreNavigation, setShowPreNavigation] = useState(false);
  const [origin, setOrigin] = useState<RoutePoint | null>(null);
  const [destination, setDestination] = useState<RoutePoint | null>(null);

  const handleRouteSelect = useCallback((route: NavigationRoute, routeOrigin?: RoutePoint, routeDestination?: RoutePoint) => {
    console.log('handleRouteSelect called with:', { 
      route: route.total_distance_m + 'm', 
      routeOrigin, 
      routeDestination 
    });
    setSelectedRoute(route);
    if (routeOrigin) setOrigin(routeOrigin);
    if (routeDestination) setDestination(routeDestination);
    setShowPreNavigation(true);
    console.log('showPreNavigation set to true');
  }, []);

  const handleNavigationStart = useCallback(() => {
    setShowPreNavigation(false);
    setIsNavigating(true);
  }, []);

  const handleNavigationCancel = useCallback(() => {
    setShowPreNavigation(false);
    setSelectedRoute(null);
  }, []);

  const handleAlternativeSelect = useCallback((route: NavigationRoute) => {
    setSelectedRoute(route);
  }, []);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  const getTrafficSeverity = (delaySeconds: number) => {
    if (delaySeconds < 300) return { level: 'light', color: 'bg-green-500' };
    if (delaySeconds < 900) return { level: 'moderate', color: 'bg-yellow-500' };
    if (delaySeconds < 1800) return { level: 'heavy', color: 'bg-orange-500' };
    return { level: 'severe', color: 'bg-red-500' };
  };

  return (
    <div className="relative w-full h-screen">
      {/* Full Globe Map with Navigation Overlay */}
      <BasicMap 
        navigationRoute={selectedRoute}
        showTrafficOverlay={true}
        navigationMode={isNavigating}
        onRouteRequest={handleRouteSelect}
        onNavigationStart={handleNavigationStart}
      />

      {/* Navigation Input Panel - only show when not navigating */}
      {!isNavigating && !showPreNavigation && (
        <div className="absolute top-4 left-4 z-[1000]">
          <SimpleNavigation 
            onRouteSelect={handleRouteSelect}
            onNavigationStart={handleNavigationStart}
          />
        </div>
      )}

      {/* Pre-Navigation Screen */}
      {showPreNavigation && selectedRoute && origin && destination && (
        <PreNavigationScreen
          route={selectedRoute}
          origin={origin}
          destination={destination}
          onStartNavigation={handleNavigationStart}
          onCancel={handleNavigationCancel}
          onSelectAlternative={handleAlternativeSelect}
        />
      )}
    </div>
  );
}