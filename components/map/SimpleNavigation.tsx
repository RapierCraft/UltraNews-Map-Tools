'use client';

import { useState, useCallback, useEffect } from 'react';
import { Navigation, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import SearchBar from './SearchBar';

interface RoutePoint {
  lat: number;
  lon: number;
  name?: string;
}

interface NavigationRoute {
  total_distance_m: number;
  total_traffic_duration_s: number;
  segments: Array<{
    instructions: string;
    distance_m: number;
    traffic_duration_s: number;
  }>;
}

interface SimpleNavigationProps {
  onRouteSelect?: (route: NavigationRoute, origin?: RoutePoint, destination?: RoutePoint) => void;
  onNavigationStart?: (origin: RoutePoint, destination: RoutePoint) => void;
}

export default function SimpleNavigation({ onRouteSelect, onNavigationStart }: SimpleNavigationProps) {
  const [origin, setOrigin] = useState<RoutePoint | null>(null);
  const [destination, setDestination] = useState<RoutePoint | null>(null);
  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const calculateRoute = useCallback(async () => {
    if (!origin || !destination) return;

    setIsCalculating(true);
    try {
      const response = await fetch('http://localhost:8001/api/v1/routing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination,
          profile: 'driving-traffic',
          include_alternatives: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        const calculatedRoute = data.primary_route;
        setRoute(calculatedRoute);
        
        if (onRouteSelect) {
          onRouteSelect(calculatedRoute, origin, destination);
        }
      }
    } catch (error) {
      console.error('Route calculation failed:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [origin, destination, onRouteSelect]);

  const startNavigation = () => {
    if (origin && destination) {
      setIsNavigating(true);
      if (onNavigationStart) {
        onNavigationStart(origin, destination);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  useEffect(() => {
    if (origin && destination) {
      calculateRoute();
    }
  }, [origin, destination, calculateRoute]);

  if (isNavigating && route) {
    return (
      <Card className="p-4 space-y-3 bg-blue-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            <span className="font-semibold">Navigating</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNavigating(false)}
            className="text-blue-600 bg-white"
          >
            Exit
          </Button>
        </div>

        <div className="space-y-2">
          <div className="text-lg font-bold">
            {route.segments[0]?.instructions || 'Continue straight'}
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(route.total_traffic_duration_s)}
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {formatDistance(route.total_distance_m)}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Navigation className="h-5 w-5" />
        <span className="font-semibold">Navigation</span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-1 block">From</label>
          <SearchBar
            onLocationSelect={(result) => {
              setOrigin({
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                name: result.display_name.split(',')[0]
              });
            }}
            showModeSelector={false}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">To</label>
          <SearchBar
            onLocationSelect={(result) => {
              setDestination({
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                name: result.display_name.split(',')[0]
              });
            }}
            showModeSelector={false}
          />
        </div>
      </div>

      {route && (
        <div className="space-y-2 p-3 bg-muted rounded-md">
          <div className="flex justify-between items-center">
            <div className="font-medium">{formatDuration(route.total_traffic_duration_s)}</div>
            <div className="text-sm text-muted-foreground">{formatDistance(route.total_distance_m)}</div>
          </div>
          
          <Button 
            onClick={startNavigation}
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={!origin || !destination}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Start Navigation
          </Button>
        </div>
      )}

      {isCalculating && (
        <div className="text-center text-sm text-muted-foreground">
          <Clock className="h-4 w-4 animate-spin inline mr-1" />
          Calculating route...
        </div>
      )}
    </Card>
  );
}