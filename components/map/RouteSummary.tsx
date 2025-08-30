'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, AlertTriangle, Navigation, Zap } from 'lucide-react';

interface NavigationRoute {
  total_distance_m: number;
  total_duration_s: number;
  total_traffic_duration_s: number;
  segments: any[];
  overview_geometry: number[][];
  traffic_delay_s: number;
  confidence: number;
}

interface RouteSummaryProps {
  route: NavigationRoute;
  onStartNavigation?: () => void;
  showDetails?: boolean;
  className?: string;
}

export default function RouteSummary({ 
  route, 
  onStartNavigation, 
  showDetails = false,
  className = '' 
}: RouteSummaryProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
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

  const getArrivalTime = () => {
    const arrival = new Date(currentTime.getTime() + route.total_traffic_duration_s * 1000);
    return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTrafficSeverity = () => {
    if (route.traffic_delay_s < 300) return { level: 'light', color: 'bg-green-500', text: 'Good' };
    if (route.traffic_delay_s < 900) return { level: 'moderate', color: 'bg-yellow-500', text: 'Moderate' };
    if (route.traffic_delay_s < 1800) return { level: 'heavy', color: 'bg-orange-500', text: 'Heavy' };
    return { level: 'severe', color: 'bg-red-500', text: 'Severe' };
  };

  const trafficInfo = getTrafficSeverity();

  return (
    <Card className={`p-4 space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold">Route Summary</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {Math.round(route.confidence * 100)}% confidence
        </Badge>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <MapPin className="h-3 w-3" />
            <span className="text-xs">Distance</span>
          </div>
          <div className="font-semibold">{formatDistance(route.total_distance_m)}</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Clock className="h-3 w-3" />
            <span className="text-xs">Duration</span>
          </div>
          <div className="font-semibold">{formatDuration(route.total_traffic_duration_s)}</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Zap className="h-3 w-3" />
            <span className="text-xs">Arrival</span>
          </div>
          <div className="font-semibold">{getArrivalTime()}</div>
        </div>
      </div>

      {/* Traffic Status */}
      {route.traffic_delay_s > 0 && (
        <div className="flex items-center justify-between p-2 bg-muted rounded-md">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${trafficInfo.color}`} />
            <span className="text-sm font-medium">{trafficInfo.text} Traffic</span>
          </div>
          <Badge variant="destructive" className="text-xs">
            +{Math.round(route.traffic_delay_s / 60)}min delay
          </Badge>
        </div>
      )}

      {route.traffic_delay_s === 0 && (
        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded-md">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">Clear Roads</span>
        </div>
      )}

      {/* Detailed Steps */}
      {showDetails && route.segments.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Turn-by-Turn Directions</h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {route.segments.slice(0, 8).map((segment, index) => (
              <div key={index} className="flex items-start gap-2 p-2 bg-muted rounded text-xs">
                <div className="text-muted-foreground font-mono mt-0.5">{index + 1}</div>
                <div className="flex-1">
                  <div className="font-medium">{segment.instructions}</div>
                  <div className="text-muted-foreground">
                    {formatDistance(segment.distance_m)} • {formatDuration(segment.traffic_duration_s)}
                    {segment.traffic_info?.delay_minutes > 0 && (
                      <span className="text-orange-600 ml-1">
                        (+{segment.traffic_info.delay_minutes}min)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {route.segments.length > 8 && (
              <div className="text-center text-muted-foreground text-xs py-1">
                ... and {route.segments.length - 8} more steps
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Button */}
      <Button 
        onClick={onStartNavigation}
        className="w-full"
        size="lg"
      >
        <Navigation className="h-4 w-4 mr-2" />
        Start Navigation
      </Button>

      {/* Last Updated */}
      <div className="text-xs text-muted-foreground text-center">
        Traffic data as of {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </Card>
  );
}