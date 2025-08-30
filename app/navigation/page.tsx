'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigation, Clock, MapPin, Route, Zap, TrendingUp } from 'lucide-react';
import SimpleNavigation from '@/components/map/SimpleNavigation';

// Dynamic import for map to avoid SSR issues  
const BasicMap = dynamic(() => import('@/components/map/BasicMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
      <p className="text-gray-500">Loading navigation map...</p>
    </div>
  )
});

interface NavigationRoute {
  total_distance_m: number;
  total_duration_s: number;
  total_traffic_duration_s: number;
  segments: any[];
  overview_geometry: number[][];
  traffic_delay_s: number;
  confidence: number;
}

export default function NavigationPage() {
  const [selectedRoute, setSelectedRoute] = useState<NavigationRoute | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleRouteSelect = useCallback((route: NavigationRoute) => {
    setSelectedRoute(route);
  }, []);

  const handleNavigationStart = useCallback((origin: any, destination: any) => {
    setIsNavigating(true);
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
        navigationMode={true}
        onRouteRequest={handleRouteSelect}
        onNavigationStart={handleNavigationStart}
      />
    </div>
  );
}