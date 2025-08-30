'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Navigation, Clock, MapPin, AlertTriangle, 
  Zap, TrendingUp, Car, Fuel, DollarSign,
  AlertCircle, ChevronRight, Info, Shield,
  Activity, CloudRain, Construction, X,
  CheckCircle, XCircle, Timer, Route
} from 'lucide-react';
import { trafficService } from '@/lib/trafficService';

interface RouteStep {
  instructions: string;
  distance_m: number;
  duration_s: number;
  traffic_duration_s: number;
  maneuver?: {
    type: string;
    modifier?: string;
    bearing_after?: number;
    bearing_before?: number;
  };
  traffic_info?: {
    condition: string;
    delay_minutes: number;
    speed_kmh: number;
  };
  warnings?: string[];
  road_name?: string;
  exit_number?: string;
}

interface RouteWarning {
  type: 'traffic' | 'weather' | 'construction' | 'accident' | 'hazard';
  severity: 'low' | 'medium' | 'high';
  message: string;
  location?: {
    lat: number;
    lon: number;
  };
  affected_segments?: number[];
}

interface NavigationRoute {
  total_distance_m: number;
  total_duration_s: number;
  total_traffic_duration_s: number;
  segments: RouteStep[];
  overview_geometry: number[][];
  traffic_delay_s: number;
  confidence: number;
  warnings?: RouteWarning[];
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

interface PreNavigationScreenProps {
  route: NavigationRoute;
  origin: { lat: number; lon: number; name?: string };
  destination: { lat: number; lon: number; name?: string };
  onStartNavigation: () => void;
  onCancel: () => void;
  onSelectAlternative?: (route: NavigationRoute) => void;
}

export default function PreNavigationScreen({
  route,
  origin,
  destination,
  onStartNavigation,
  onCancel,
  onSelectAlternative
}: PreNavigationScreenProps) {
  const [currentTime] = useState(new Date());
  const [selectedTab, setSelectedTab] = useState('overview');
  const [trafficUpdates, setTrafficUpdates] = useState<any>(null);
  const [isLoadingTraffic, setIsLoadingTraffic] = useState(true);

  useEffect(() => {
    const fetchTrafficInfo = async () => {
      setIsLoadingTraffic(true);
      try {
        const trafficData = await trafficService.getInstantTrafficInfo(
          origin.lat,
          origin.lon,
          10
        );
        setTrafficUpdates(trafficData);
      } catch (error) {
        console.error('Failed to fetch traffic info:', error);
      } finally {
        setIsLoadingTraffic(false);
      }
    };

    fetchTrafficInfo();

    const unsubscribe = trafficService.subscribeToUpdates((update) => {
      if (update.route_id === 'current') {
        setTrafficUpdates(update);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [origin.lat, origin.lon]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
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
    const delayMinutes = route.traffic_delay_s / 60;
    if (delayMinutes < 5) return { level: 'light', color: 'bg-green-500', text: 'Light Traffic', icon: CheckCircle };
    if (delayMinutes < 15) return { level: 'moderate', color: 'bg-yellow-500', text: 'Moderate Traffic', icon: AlertCircle };
    if (delayMinutes < 30) return { level: 'heavy', color: 'bg-orange-500', text: 'Heavy Traffic', icon: AlertTriangle };
    return { level: 'severe', color: 'bg-red-500', text: 'Severe Delays', icon: XCircle };
  };

  const getManeuverIcon = (maneuver?: { type: string; modifier?: string }) => {
    if (!maneuver) return ChevronRight;
    
    const iconMap: { [key: string]: any } = {
      'turn': ChevronRight,
      'merge': TrendingUp,
      'exit': Route,
      'continue': ChevronRight,
      'roundabout': Activity
    };
    
    return iconMap[maneuver.type] || ChevronRight;
  };

  const trafficInfo = getTrafficSeverity();
  const TrafficIcon = trafficInfo.icon;

  const routeWarnings = useMemo(() => {
    const warnings: RouteWarning[] = [];
    
    if (route.traffic_delay_s > 1800) {
      warnings.push({
        type: 'traffic',
        severity: 'high',
        message: `Heavy traffic expected - ${Math.round(route.traffic_delay_s / 60)} minute delay`
      });
    }

    route.segments.forEach((segment, index) => {
      if (segment.warnings) {
        segment.warnings.forEach(warning => {
          warnings.push({
            type: 'hazard',
            severity: 'medium',
            message: warning,
            affected_segments: [index]
          });
        });
      }
      
      if (segment.traffic_info && segment.traffic_info.delay_minutes > 10) {
        warnings.push({
          type: 'traffic',
          severity: segment.traffic_info.delay_minutes > 20 ? 'high' : 'medium',
          message: `Traffic congestion on ${segment.road_name || 'route'}`,
          affected_segments: [index]
        });
      }
    });

    return warnings;
  }, [route]);

  const getWarningIcon = (type: string) => {
    const icons: { [key: string]: any } = {
      traffic: Car,
      weather: CloudRain,
      construction: Construction,
      accident: AlertTriangle,
      hazard: AlertCircle
    };
    return icons[type] || AlertCircle;
  };

  const getWarningColor = (severity: string) => {
    const colors: { [key: string]: string } = {
      low: 'text-yellow-600 bg-yellow-50',
      medium: 'text-orange-600 bg-orange-50',
      high: 'text-red-600 bg-red-50'
    };
    return colors[severity] || 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="fixed right-16 top-4 bottom-4 z-40 w-[460px] max-w-[38vw]">
      <Card className="w-full h-full flex flex-col shadow-xl border-l-2">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-blue-500" />
                  Route Preview
                </h2>
                <div className="text-sm text-muted-foreground">
                  {origin.name || 'Current Location'} → {destination.name || 'Destination'}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{formatDuration(route.total_traffic_duration_s)}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" />
                  Duration
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatDistance(route.total_distance_m)}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Distance
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{getArrivalTime()}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Timer className="h-3 w-3" />
                  Arrival
                </div>
              </div>
              <div className="text-center">
                <div className={`inline-flex items-center gap-1`}>
                  <TrafficIcon className={`h-5 w-5 ${trafficInfo.color.replace('bg-', 'text-')}`} />
                  <span className="text-lg font-semibold">{Math.round(route.confidence * 100)}%</span>
                </div>
                <div className="text-xs text-muted-foreground">Confidence</div>
              </div>
            </div>

            {/* Traffic Status Bar */}
            <div className={`mt-3 p-2 rounded-lg flex items-center justify-between ${
              route.traffic_delay_s > 0 ? 'bg-orange-50 dark:bg-orange-950' : 'bg-green-50 dark:bg-green-950'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full animate-pulse ${trafficInfo.color}`} />
                <span className="text-sm font-medium">{trafficInfo.text}</span>
              </div>
              {route.traffic_delay_s > 0 && (
                <Badge variant="destructive" className="text-xs">
                  +{Math.round(route.traffic_delay_s / 60)} min delay
                </Badge>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4 px-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="steps">Directions</TabsTrigger>
              <TabsTrigger value="warnings">
                Warnings
                {routeWarnings.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-4 px-1 text-xs">
                    {routeWarnings.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              {/* Overview Tab */}
              <TabsContent value="overview" className="h-full p-4 space-y-4">
                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Route className="h-4 w-4" />
                    Route Summary
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">Transport</div>
                        <div className="text-xs text-muted-foreground">Driving</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">Segments</div>
                        <div className="text-xs text-muted-foreground">{route.segments.length} turns</div>
                      </div>
                    </div>
                    
                    {route.tolls && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">Tolls</div>
                          <div className="text-xs text-muted-foreground">
                            ${route.tolls.amount.toFixed(2)} ({route.tolls.locations} locations)
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {route.fuel_consumption && (
                      <div className="flex items-center gap-2">
                        <Fuel className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">Fuel</div>
                          <div className="text-xs text-muted-foreground">
                            {route.fuel_consumption.liters.toFixed(1)}L (~${route.fuel_consumption.cost_estimate.toFixed(2)})
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Route Highlights</div>
                    <div className="space-y-1">
                      {route.route_highlights && route.route_highlights.length > 0 ? (
                        route.route_highlights.map((highlight, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <ChevronRight className="h-3 w-3" />
                            <span className="line-clamp-1">{highlight}</span>
                          </div>
                        ))
                      ) : route.segments && route.segments.length > 0 ? (
                        route.segments.slice(0, 3).map((segment, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <ChevronRight className="h-3 w-3" />
                            <span className="line-clamp-1">{segment.instructions}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>Direct route from {origin.name} to {destination.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Alternative Routes */}
                {route.alternatives && route.alternatives.length > 0 && (
                  <Card className="p-4 space-y-3">
                    <h3 className="font-semibold">Alternative Routes</h3>
                    <div className="space-y-2">
                      {route.alternatives.map((alt, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="w-full justify-between"
                          onClick={() => onSelectAlternative?.(alt)}
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary">Route {index + 2}</Badge>
                            <span className="text-sm">{formatDuration(alt.total_traffic_duration_s)}</span>
                            <span className="text-sm text-muted-foreground">
                              {formatDistance(alt.total_distance_m)}
                            </span>
                          </div>
                          {alt.traffic_delay_s < route.traffic_delay_s && (
                            <Badge variant="success" className="text-xs">
                              Faster
                            </Badge>
                          )}
                        </Button>
                      ))}
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* Directions Tab */}
              <TabsContent value="steps" className="h-full p-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-2">
                    {route.segments && route.segments.length > 0 ? (
                      route.segments.map((segment, index) => {
                        const ManeuverIcon = getManeuverIcon(segment.maneuver);
                        // Handle both OSRM format and our custom format
                        const instruction = segment.instructions || segment.instruction || `Continue for ${formatDistance(segment.distance_m || segment.distance || 0)}`;
                        const distance = segment.distance_m || segment.distance || 0;
                        const duration = segment.traffic_duration_s || segment.duration_s || segment.duration || 0;
                        
                        return (
                          <Card key={index} className="p-3">
                            <div className="flex items-start gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                                <span className="text-xs font-bold">{index + 1}</span>
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="font-medium text-sm">{instruction}</div>
                                {segment.road_name && (
                                  <div className="text-xs text-muted-foreground">
                                    on {segment.road_name}
                                  </div>
                                )}
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>{formatDistance(distance)}</span>
                                  <span>{formatDuration(duration)}</span>
                                  {segment.traffic_info && segment.traffic_info.delay_minutes > 0 && (
                                    <Badge variant="destructive" className="text-xs h-4">
                                      +{segment.traffic_info.delay_minutes}min
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center">
                        <div className="text-sm font-medium mb-2">Direct Route</div>
                        <div className="text-xs text-muted-foreground">
                          No detailed directions available. This is a direct route calculation.
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Warnings Tab */}
              <TabsContent value="warnings" className="h-full p-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-2">
                    {routeWarnings.length === 0 ? (
                      <Card className="p-8 text-center">
                        <Shield className="h-12 w-12 mx-auto text-green-500 mb-3" />
                        <p className="font-medium">No warnings for this route</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your route looks clear with normal traffic conditions
                        </p>
                      </Card>
                    ) : (
                      routeWarnings.map((warning, index) => {
                        const WarningIcon = getWarningIcon(warning.type);
                        return (
                          <Card key={index} className={`p-3 ${getWarningColor(warning.severity)}`}>
                            <div className="flex items-start gap-3">
                              <WarningIcon className="h-5 w-5 mt-0.5" />
                              <div className="flex-1">
                                <div className="font-medium text-sm">{warning.message}</div>
                                {warning.affected_segments && (
                                  <div className="text-xs mt-1">
                                    Affects step{warning.affected_segments.length > 1 ? 's' : ''}: {warning.affected_segments.join(', ')}
                                  </div>
                                )}
                              </div>
                              <Badge variant={warning.severity === 'high' ? 'destructive' : 'secondary'}>
                                {warning.severity}
                              </Badge>
                            </div>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="h-full p-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    <Card className="p-4 space-y-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Technical Details
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Route Points</span>
                          <span className="font-mono">{route.overview_geometry.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Segments</span>
                          <span className="font-mono">{route.segments.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Base Duration</span>
                          <span className="font-mono">{formatDuration(route.total_duration_s)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Traffic Adjusted</span>
                          <span className="font-mono">{formatDuration(route.total_traffic_duration_s)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Confidence Score</span>
                          <span className="font-mono">{(route.confidence * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </Card>

                    {!isLoadingTraffic && trafficUpdates && (
                      <Card className="p-4 space-y-3">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Live Traffic Data
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Last Updated</span>
                            <span className="font-mono">
                              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {trafficUpdates.traffic && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Area Condition</span>
                                <Badge variant="secondary">
                                  {trafficUpdates.traffic.condition || 'Normal'}
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Avg Speed</span>
                                <span className="font-mono">
                                  {trafficUpdates.traffic.average_speed_kmh || 'N/A'} km/h
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>

          {/* Action Buttons */}
          <div className="p-4 border-t space-y-2">
            <Button 
              onClick={onStartNavigation}
              className="w-full"
              size="lg"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Start Navigation
            </Button>
            <Button 
              onClick={onCancel}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Cancel
            </Button>
          </div>
        </Card>
    </div>
  );
}