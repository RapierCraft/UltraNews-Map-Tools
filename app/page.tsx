'use client';

import { useState, useCallback } from 'react';
import BasicMap from '@/components/map/BasicMap';
import PreNavigationScreen from '@/components/map/PreNavigationScreen';

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

export default function Home() {
  const [selectedRoute, setSelectedRoute] = useState<NavigationRoute | null>(null);
  const [showPreNavigation, setShowPreNavigation] = useState(false);
  const [origin, setOrigin] = useState<RoutePoint | null>(null);
  const [destination, setDestination] = useState<RoutePoint | null>(null);

  const handleRouteSelect = useCallback((route: NavigationRoute, routeOrigin?: RoutePoint, routeDestination?: RoutePoint) => {
    console.log('Home page: handleRouteSelect called with:', { 
      route: route.total_distance_m + 'm', 
      routeOrigin, 
      routeDestination 
    });
    setSelectedRoute(route);
    if (routeOrigin) setOrigin(routeOrigin);
    if (routeDestination) setDestination(routeDestination);
    setShowPreNavigation(true);
    console.log('Home page: showPreNavigation set to true');
  }, []);

  const handleNavigationStart = useCallback(() => {
    setShowPreNavigation(false);
    // Navigate to navigation page or start navigation mode
    window.location.href = '/navigation';
  }, []);

  const handleNavigationCancel = useCallback(() => {
    setShowPreNavigation(false);
    setSelectedRoute(null);
    setOrigin(null);
    setDestination(null);
  }, []);

  const handleAlternativeSelect = useCallback((route: NavigationRoute) => {
    setSelectedRoute(route);
  }, []);

  return (
    <div className="w-screen h-screen relative">
      <BasicMap 
        onRouteRequest={handleRouteSelect}
      />

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
