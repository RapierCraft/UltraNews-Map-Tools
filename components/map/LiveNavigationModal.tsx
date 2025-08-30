'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Navigation, X, Volume2, VolumeX, RotateCcw, MapPin,
  AlertTriangle, Clock, TrendingUp, ChevronUp, ChevronDown,
  Car, Gauge, Route, Navigation2, AlertCircle, CheckCircle,
  Compass, Timer, Activity, Zap
} from 'lucide-react';
import { NavigationService, NavigationState } from '@/lib/navigationService';
import { ProcessedRouteStep } from '@/lib/routeInstructionProcessor';
import { formatDistance, formatDuration } from '@/lib/routeInstructionProcessor';

interface LiveNavigationModalProps {
  route: {
    total_distance_m: number;
    total_duration_s: number;
    segments: ProcessedRouteStep[];
    overview_geometry: number[][];
  };
  origin: { lat: number; lon: number; name?: string };
  destination: { lat: number; lon: number; name?: string };
  onEndNavigation: () => void;
  onRecalculate?: () => void;
}

export default function LiveNavigationModal({
  route,
  origin,
  destination,
  onEndNavigation,
  onRecalculate
}: LiveNavigationModalProps) {
  const [navigationState, setNavigationState] = useState<NavigationState | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<GeolocationPosition | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'good' | 'poor' | 'lost'>('searching');
  const navigationServiceRef = useRef<NavigationService | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    // Initialize navigation service
    const navService = new NavigationService();
    navigationServiceRef.current = navService;

    // Start navigation
    navService.startNavigation(
      route.segments,
      route.overview_geometry,
      (state) => {
        setNavigationState(state);
        
        // Update GPS status based on accuracy
        if (state.lastKnownPosition) {
          const accuracy = state.lastKnownPosition.coords.accuracy;
          if (accuracy < 10) setGpsStatus('good');
          else if (accuracy < 30) setGpsStatus('poor');
          else setGpsStatus('lost');
        }
      },
      (position) => {
        setCurrentPosition(position);
      },
      (error) => {
        console.error('Navigation error:', error);
        setGpsStatus('lost');
      }
    );

    // Start elapsed time counter
    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      clearInterval(timer);
      navService.stopNavigation();
    };
  }, [route]);

  const handleEndNavigation = useCallback(() => {
    if (navigationServiceRef.current) {
      navigationServiceRef.current.stopNavigation();
    }
    onEndNavigation();
  }, [onEndNavigation]);

  const getManeuverIcon = (type?: string) => {
    switch (type) {
      case 'turn':
        return TrendingUp;
      case 'merge':
        return Activity;
      case 'roundabout':
        return RotateCcw;
      default:
        return Navigation2;
    }
  };

  const getDistanceAlert = (distance: number) => {
    if (distance < 50) return { color: 'text-red-500', urgency: 'NOW' };
    if (distance < 200) return { color: 'text-orange-500', urgency: 'SOON' };
    if (distance < 500) return { color: 'text-yellow-500', urgency: '' };
    return { color: 'text-green-500', urgency: '' };
  };

  if (!navigationState) {
    return (
      <div className="fixed right-16 top-4 z-50 w-[460px]">
        <Card className="p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-pulse">
              <Navigation className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-sm font-medium">Starting Navigation...</p>
            <p className="text-xs text-muted-foreground">Acquiring GPS signal</p>
          </div>
        </Card>
      </div>
    );
  }

  const currentStep = route.segments[navigationState.currentStepIndex];
  const nextStep = route.segments[navigationState.currentStepIndex + 1];
  const distanceAlert = getDistanceAlert(navigationState.distanceToNextManeuver);
  const progressPercentage = ((route.total_distance_m - navigationState.totalDistanceRemaining) / route.total_distance_m) * 100;

  const CurrentManeuverIcon = currentStep ? getManeuverIcon(currentStep.maneuver?.type) : Navigation2;

  return (
    <div className={`fixed right-16 top-4 z-50 transition-all duration-300 ${
      isExpanded ? 'w-[460px] bottom-4' : 'w-[460px]'
    }`}>
      <Card className="h-full flex flex-col shadow-2xl border-2 border-primary/20 overflow-hidden">
        {/* GPS Status Bar */}
        <div className="px-4 py-2 bg-muted/50 border-b flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {gpsStatus === 'searching' && (
              <>
                <div className="animate-pulse">
                  <Navigation className="h-3 w-3" />
                </div>
                <span>Searching for GPS...</span>
              </>
            )}
            {gpsStatus === 'good' && (
              <>
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="text-green-600">GPS Signal Good</span>
              </>
            )}
            {gpsStatus === 'poor' && (
              <>
                <AlertCircle className="h-3 w-3 text-yellow-500" />
                <span className="text-yellow-600">Weak GPS Signal</span>
              </>
            )}
            {gpsStatus === 'lost' && (
              <>
                <AlertTriangle className="h-3 w-3 text-red-500" />
                <span className="text-red-600">GPS Signal Lost</span>
              </>
            )}
          </div>
          
          {currentPosition && (
            <span className="text-muted-foreground">
              ±{Math.round(currentPosition.coords.accuracy)}m
            </span>
          )}
        </div>

        {/* Main Navigation Display */}
        <div className="flex-1 flex flex-col">
          {/* Current Instruction - Primary */}
          <div className={`p-6 bg-gradient-to-b from-primary/10 to-background border-b-2`}>
            <div className="flex items-start gap-4">
              <div className={`flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground ${
                distanceAlert.urgency ? 'animate-pulse' : ''
              }`}>
                <CurrentManeuverIcon className="h-8 w-8" />
              </div>
              
              <div className="flex-1">
                <div className={`text-3xl font-bold mb-1 ${distanceAlert.color}`}>
                  {formatDistance(navigationState.distanceToNextManeuver)}
                </div>
                {distanceAlert.urgency && (
                  <Badge variant="destructive" className="mb-2 animate-pulse">
                    {distanceAlert.urgency}
                  </Badge>
                )}
                <div className="text-lg font-medium">
                  {navigationState.currentInstruction}
                </div>
                {currentStep?.road_name && (
                  <div className="text-sm text-muted-foreground mt-1">
                    on {currentStep.road_name}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Next Step Preview */}
          {nextStep && (
            <div className="p-4 bg-muted/30 border-b">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                  <ChevronUp className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Then: {navigationState.nextInstruction}</div>
                  <div className="text-xs text-muted-foreground">
                    in {formatDistance(nextStep.distance_m)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Speed and Progress Info */}
          <div className="p-4 space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <div className="flex justify-between text-xs">
                <span>{formatDistance(route.total_distance_m - navigationState.totalDistanceRemaining)} traveled</span>
                <span>{formatDistance(navigationState.totalDistanceRemaining)} remaining</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 bg-muted rounded">
                <Gauge className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-sm font-bold">
                  {Math.round(navigationState.currentSpeed * 3.6)} km/h
                </div>
                <div className="text-xs text-muted-foreground">Speed</div>
              </div>
              
              <div className="text-center p-2 bg-muted rounded">
                <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-sm font-bold">
                  {formatDuration(navigationState.estimatedTimeRemaining)}
                </div>
                <div className="text-xs text-muted-foreground">ETA</div>
              </div>
              
              <div className="text-center p-2 bg-muted rounded">
                <Timer className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-sm font-bold">
                  {formatDuration(elapsedTime)}
                </div>
                <div className="text-xs text-muted-foreground">Elapsed</div>
              </div>
            </div>

            {/* Arrival Info */}
            <div className="p-3 bg-primary/5 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Arriving at</span>
                </div>
                <span className="text-sm font-bold">
                  {new Date(Date.now() + navigationState.estimatedTimeRemaining * 1000).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {destination.name || 'Destination'}
              </div>
            </div>
          </div>

          {/* Off Route Warning */}
          {navigationState.isOffRoute && (
            <div className="p-4 bg-red-50 dark:bg-red-950 border-t border-red-200">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-red-700 dark:text-red-300">
                    Off Route - Recalculating...
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400">
                    Return to the highlighted route
                  </div>
                </div>
                {onRecalculate && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={onRecalculate}
                  >
                    Recalculate
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Expandable Steps List */}
          {isExpanded && (
            <div className="flex-1 overflow-y-auto border-t p-4 space-y-2">
              <div className="text-sm font-medium mb-2">Upcoming Steps</div>
              {route.segments.slice(navigationState.currentStepIndex + 1, navigationState.currentStepIndex + 6).map((step, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-muted/50 rounded text-sm">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background text-xs font-bold">
                    {navigationState.currentStepIndex + index + 2}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{step.instructions}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistance(step.distance_m)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="p-3 border-t bg-background flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                More Steps
              </>
            )}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            size="sm"
            variant="destructive"
            onClick={handleEndNavigation}
          >
            <X className="h-4 w-4 mr-1" />
            End
          </Button>
        </div>
      </Card>
    </div>
  );
}