'use client';

import { useState, useCallback } from 'react';
import { Navigation, Clock, Route, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import SearchBar from './SearchBar';

interface RoutePoint {
  lat: number;
  lon: number;
  name?: string;
}

interface TrafficInfo {
  condition: string;
  delay_minutes: number;
  speed_kmh: number;
  confidence: number;
}

interface RouteSegment {
  distance_m: number;
  duration_s: number;
  traffic_duration_s: number;
  geometry: number[][];
  instructions: string;
  traffic_info?: TrafficInfo;
}

interface NavigationRoute {
  total_distance_m: number;
  total_duration_s: number;
  total_traffic_duration_s: number;
  segments: RouteSegment[];
  overview_geometry: number[][];
  traffic_delay_s: number;
  confidence: number;
}

interface NavigationPanelProps {
  onRouteSelect?: (route: NavigationRoute) => void;
  className?: string;
}

const trafficColors = {
  'heavy': 'bg-red-500',
  'moderate': 'bg-yellow-500',
  'light': 'bg-green-500',
  'free_flow': 'bg-blue-500'
};

const trafficLabels = {
  'heavy': 'Heavy',
  'moderate': 'Moderate', 
  'light': 'Light',
  'free_flow': 'Clear'
};

export default function NavigationPanel({ onRouteSelect, className = '' }: NavigationPanelProps) {
  const [origin, setOrigin] = useState<RoutePoint | null>(null);
  const [destination, setDestination] = useState<RoutePoint | null>(null);
  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [waypoints, setWaypoints] = useState<RoutePoint[]>([]);
  const [includeTraffic, setIncludeTraffic] = useState(true);
  const [departureTime, setDepartureTime] = useState('');
  const [routes, setRoutes] = useState<{primary: NavigationRoute | null, alternatives: NavigationRoute[]}>({primary: null, alternatives: []});
  const [selectedRoute, setSelectedRoute] = useState<NavigationRoute | null>(null);

  const calculateRoute = useCallback(async () => {
    if (!origin || !destination) return;

    setIsCalculating(true);
    try {
      const payload = {
        origin,
        destination,
        waypoints: waypoints.length > 0 ? waypoints : undefined,
        profile: includeTraffic ? 'driving-traffic' : 'driving',
        departure_time: departureTime || undefined,
        include_alternatives: true,
        max_alternatives: 2
      };

      const response = await fetch('http://localhost:8001/api/v1/routing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        setRoutes({
          primary: data.primary_route,
          alternatives: data.alternatives || []
        });
        setSelectedRoute(data.primary_route);
        
        if (onRouteSelect && data.primary_route) {
          onRouteSelect(data.primary_route);
        }
      } else {
        console.error('Route calculation failed:', response.status);
      }
    } catch (error) {
      console.error('Route calculation error:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [origin, destination, waypoints, departureTime, includeTraffic, onRouteSelect]);

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

  const getTrafficBadge = (condition: string, delay: number) => {
    const colorClass = trafficColors[condition as keyof typeof trafficColors] || 'bg-gray-500';
    const label = trafficLabels[condition as keyof typeof trafficLabels] || 'Unknown';
    
    return (
      <Badge className={`${colorClass} text-white`}>
        {label} {delay > 0 && `+${delay}min`}
      </Badge>
    );
  };

  useEffect(() => {
    if (origin && destination) {
      calculateRoute();
    }
  }, [origin, destination, calculateRoute]);

  return (
    <Card className={`p-4 space-y-4 ${className}`}>
      <div className="flex items-center gap-2">
        <Navigation className="h-5 w-5" />
        <h3 className="font-semibold">Navigation with Traffic</h3>
      </div>

      {/* Origin/Destination Selection */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-1 block">From</label>
          <SearchBar
            onLocationSelect={(result) => {
              setOrigin({
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                name: result.display_name
              });
            }}
            className="w-full"
            showModeSelector={false}
          />
          {origin && (
            <p className="text-xs text-muted-foreground mt-1">
              📍 {origin.name || `${origin.lat.toFixed(4)}, ${origin.lon.toFixed(4)}`}
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">To</label>
          <SearchBar
            onLocationSelect={(result) => {
              setDestination({
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                name: result.display_name
              });
            }}
            className="w-full"
            showModeSelector={false}
          />
          {destination && (
            <p className="text-xs text-muted-foreground mt-1">
              📍 {destination.name || `${destination.lat.toFixed(4)}, ${destination.lon.toFixed(4)}`}
            </p>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="include-traffic"
            checked={includeTraffic}
            onChange={(e) => setIncludeTraffic(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="include-traffic" className="text-sm">Include traffic data</label>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Departure time (optional)</label>
          <input
            type="datetime-local"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border rounded-md"
          />
        </div>
      </div>

      {/* Calculate Button */}
      <Button 
        onClick={calculateRoute}
        disabled={!origin || !destination || isCalculating}
        className="w-full"
      >
        {isCalculating ? (
          <>
            <Clock className="h-4 w-4 mr-2 animate-spin" />
            Calculating...
          </>
        ) : (
          <>
            <Route className="h-4 w-4 mr-2" />
            Calculate Route
          </>
        )}
      </Button>

      {/* Route Results */}
      {routes.primary && (
        <div className="space-y-3">
          <Separator />
          
          {/* Primary Route */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Recommended Route</h4>
              {routes.primary.traffic_delay_s > 0 && (
                <Badge variant="outline" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  +{Math.round(routes.primary.traffic_delay_s / 60)}min delay
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Distance:</span>
                <br />
                <span className="font-medium">{formatDistance(routes.primary.total_distance_m)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {includeTraffic ? 'Time (with traffic):' : 'Time:'}
                </span>
                <br />
                <span className="font-medium">
                  {formatDuration(includeTraffic ? routes.primary.total_traffic_duration_s : routes.primary.total_duration_s)}
                </span>
              </div>
            </div>

            {includeTraffic && routes.primary.segments.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Traffic Conditions:</span>
                <div className="flex flex-wrap gap-1">
                  {routes.primary.segments
                    .filter(seg => seg.traffic_info)
                    .slice(0, 3)
                    .map((seg, idx) => (
                      <div key={idx}>
                        {getTrafficBadge(seg.traffic_info!.condition, seg.traffic_info!.delay_minutes)}
                      </div>
                    ))}
                </div>
              </div>
            )}

            <Button
              variant={selectedRoute === routes.primary ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedRoute(routes.primary);
                if (onRouteSelect) onRouteSelect(routes.primary!);
              }}
              className="w-full"
            >
              Use This Route
            </Button>
          </div>

          {/* Alternative Routes */}
          {routes.alternatives.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Alternative Routes</h4>
              {routes.alternatives.map((alt, index) => (
                <div key={index} className="p-2 border rounded-md space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Route {index + 2}</span>
                    <div className="text-xs text-muted-foreground">
                      {formatDistance(alt.total_distance_m)} • {formatDuration(alt.total_traffic_duration_s)}
                    </div>
                  </div>
                  
                  {alt.traffic_delay_s > 0 && (
                    <div className="text-xs text-orange-600">
                      +{Math.round(alt.traffic_delay_s / 60)}min traffic delay
                    </div>
                  )}
                  
                  <Button
                    variant={selectedRoute === alt ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedRoute(alt);
                      if (onRouteSelect) onRouteSelect(alt);
                    }}
                    className="w-full text-xs"
                  >
                    Use Alternative
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Route Details */}
          {selectedRoute && (
            <div className="space-y-2">
              <Separator />
              <h4 className="font-medium text-sm">Route Details</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedRoute.segments.slice(0, 5).map((segment, index) => (
                  <div key={index} className="text-xs p-2 bg-muted rounded">
                    <div className="font-medium">{segment.instructions}</div>
                    <div className="text-muted-foreground">
                      {formatDistance(segment.distance_m)} • {formatDuration(segment.traffic_duration_s)}
                      {segment.traffic_info && segment.traffic_info.delay_minutes > 0 && (
                        <span className="text-orange-600 ml-1">
                          (+{segment.traffic_info.delay_minutes}min)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {selectedRoute.segments.length > 5 && (
                  <div className="text-xs text-muted-foreground text-center py-1">
                    ... and {selectedRoute.segments.length - 5} more steps
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Traffic Status */}
      <div className="space-y-2">
        <Separator />
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          <span className="text-sm font-medium">Live Traffic Status</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Traffic data updated every 5 minutes
        </div>
      </div>
    </Card>
  );
}