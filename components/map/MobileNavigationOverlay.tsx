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
  Compass, Timer, Activity, Zap, Phone, MoreVertical
} from 'lucide-react';
import { NavigationService, NavigationState } from '@/lib/navigationService';
import { ProcessedRouteStep } from '@/lib/routeInstructionProcessor';
import { formatDistance, formatDuration } from '@/lib/routeInstructionProcessor';

interface MobileNavigationOverlayProps {
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

export default function MobileNavigationOverlay({
  route,
  origin,
  destination,
  onEndNavigation,
  onRecalculate
}: MobileNavigationOverlayProps) {
  const [navigationState, setNavigationState] = useState<NavigationState | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<GeolocationPosition | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'good' | 'poor' | 'lost'>('searching');
  const navigationServiceRef = useRef<NavigationService | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

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
    if (distance < 50) return { color: 'text-red-500', bgColor: 'bg-red-50', urgency: 'NOW' };
    if (distance < 200) return { color: 'text-orange-500', bgColor: 'bg-orange-50', urgency: 'SOON' };
    if (distance < 500) return { color: 'text-yellow-500', bgColor: 'bg-yellow-50', urgency: '' };
    return { color: 'text-blue-500', bgColor: 'bg-blue-50', urgency: '' };
  };

  if (!navigationState) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-pulse">
            <Navigation className="h-8 w-8 text-blue-500" />
          </div>
          <p className="text-lg font-medium">Starting Navigation...</p>
          <p className="text-sm text-muted-foreground">Acquiring GPS signal</p>
        </div>
      </div>
    );
  }

  const currentStep = route.segments[navigationState.currentStepIndex];
  const nextStep = route.segments[navigationState.currentStepIndex + 1];
  const distanceAlert = getDistanceAlert(navigationState.distanceToNextManeuver);
  const progressPercentage = ((route.total_distance_m - navigationState.totalDistanceRemaining) / route.total_distance_m) * 100;

  const CurrentManeuverIcon = currentStep ? getManeuverIcon(currentStep.maneuver?.type) : Navigation2;
  
  const arrivalTime = new Date(Date.now() + navigationState.estimatedTimeRemaining * 1000);

  return (
    <div className="fixed inset-0 z-50">
      {/* Top Instruction Bar - Google Maps Style */}
      <div className={`fixed top-0 left-0 right-0 z-50 ${distanceAlert.bgColor} border-b shadow-lg`}>
        {/* GPS Status Strip */}
        <div className="px-4 py-1 bg-muted/50 border-b flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {gpsStatus === 'searching' && (
              <>
                <div className="animate-pulse">
                  <Navigation className="h-3 w-3" />
                </div>
                <span>Searching GPS...</span>
              </>
            )}
            {gpsStatus === 'good' && (
              <>
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="text-green-600">GPS Good</span>
              </>
            )}
            {gpsStatus === 'poor' && (
              <>
                <AlertCircle className="h-3 w-3 text-yellow-500" />
                <span className="text-yellow-600">Weak Signal</span>
              </>
            )}
            {gpsStatus === 'lost' && (
              <>
                <AlertTriangle className="h-3 w-3 text-red-500" />
                <span className="text-red-600">No GPS</span>
              </>
            )}
          </div>
          
          {currentPosition && (
            <span className="text-muted-foreground">
              ±{Math.round(currentPosition.coords.accuracy)}m
            </span>
          )}
        </div>

        {/* Main Instruction */}
        <div className="p-4">
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-md ${
              distanceAlert.urgency ? 'animate-pulse' : ''
            }`}>
              <CurrentManeuverIcon className={`h-8 w-8 ${distanceAlert.color}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <div className={`text-2xl font-bold ${distanceAlert.color}`}>
                  {formatDistance(navigationState.distanceToNextManeuver)}
                </div>
                {distanceAlert.urgency && (
                  <Badge variant="destructive" className="animate-pulse text-xs">
                    {distanceAlert.urgency}
                  </Badge>
                )}
              </div>
              <div className="text-lg font-medium text-gray-900 line-clamp-2">
                {navigationState.currentInstruction}
              </div>
              {currentStep?.road_name && (
                <div className="text-sm text-gray-600 truncate mt-1">
                  on {currentStep.road_name}
                </div>
              )}
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowMenu(!showMenu)}
              className="p-2"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>

          {/* Next Step Preview */}
          {nextStep && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-700 truncate">
                    Then: {navigationState.nextInstruction}
                  </div>
                  <div className="text-xs text-gray-500">
                    in {formatDistance(nextStep.distance_m)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mt-4">
            <Progress value={progressPercentage} className="h-1" />
          </div>
        </div>

        {/* Off Route Warning */}
        {navigationState.isOffRoute && (
          <div className="px-4 py-3 bg-red-50 border-t border-red-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-red-700">
                  Off Route - Recalculating...
                </div>
                <div className="text-xs text-red-600">
                  Return to the highlighted route
                </div>
              </div>
              {onRecalculate && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onRecalculate}
                >
                  Fix
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar - Google Maps Style */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg">
        <div className="px-4 py-3">
          {/* Main Stats Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatDuration(navigationState.estimatedTimeRemaining)}
              </div>
              <div className="text-xs text-gray-500">ETA</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {arrivalTime.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <div className="text-xs text-gray-500">Arrival</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatDistance(navigationState.totalDistanceRemaining)}
              </div>
              <div className="text-xs text-gray-500">Remaining</div>
            </div>
          </div>

          {/* Secondary Stats Row */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Gauge className="h-3 w-3" />
              <span>{Math.round(navigationState.currentSpeed * 3.6)} km/h</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Timer className="h-3 w-3" />
              <span>{formatDuration(elapsedTime)} elapsed</span>
            </div>
            
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{Math.round(progressPercentage)}% complete</span>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMuted(!isMuted)}
              className="flex-1"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 mr-2" />
              ) : (
                <Volume2 className="h-4 w-4 mr-2" />
              )}
              {isMuted ? 'Unmute' : 'Mute'}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleEndNavigation}
              className="px-6"
            >
              <X className="h-4 w-4 mr-2" />
              End
            </Button>
          </div>
        </div>
      </div>

      {/* Slide-up Menu */}
      {showMenu && (
        <div className="fixed bottom-0 left-0 right-0 z-60 bg-white border-t shadow-lg transform transition-transform duration-300">
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Navigation Options</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowMenu(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Upcoming Steps</h4>
              {route.segments.slice(navigationState.currentStepIndex + 1, navigationState.currentStepIndex + 5).map((step, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded text-sm">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-xs font-bold">
                    {navigationState.currentStepIndex + index + 2}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium line-clamp-2">{step.instructions}</div>
                    <div className="text-xs text-gray-500">
                      {formatDistance(step.distance_m)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}