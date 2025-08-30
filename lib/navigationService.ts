// Navigation service for real-time GPS tracking and route progress monitoring

import { ProcessedRouteStep } from './routeInstructionProcessor';

export interface NavigationState {
  currentStepIndex: number;
  distanceToNextManeuver: number;
  distanceFromLastUpdate: number;
  totalDistanceTraveled: number;
  totalDistanceRemaining: number;
  estimatedTimeRemaining: number;
  currentSpeed: number;
  currentBearing: number;
  isOffRoute: boolean;
  lastKnownPosition: GeolocationPosition | null;
  navigationStartTime: number;
  currentInstruction: string;
  nextInstruction: string;
  upcomingInstruction: string;
}

export interface RouteProgress {
  currentPosition: [number, number];
  nearestPointOnRoute: [number, number];
  distanceFromRoute: number;
  progressAlongRoute: number;
  currentSegmentIndex: number;
}

export class NavigationService {
  private watchId: number | null = null;
  private route: ProcessedRouteStep[] = [];
  private routeCoordinates: [number, number][] = [];
  private navigationState: NavigationState;
  private updateCallbacks: Set<(state: NavigationState) => void> = new Set();
  private positionCallbacks: Set<(position: GeolocationPosition) => void> = new Set();
  private errorCallbacks: Set<(error: string) => void> = new Set();
  private lastUpdateTime: number = 0;
  private positionHistory: GeolocationPosition[] = [];
  
  constructor() {
    this.navigationState = this.getInitialState();
  }

  private getInitialState(): NavigationState {
    return {
      currentStepIndex: 0,
      distanceToNextManeuver: 0,
      distanceFromLastUpdate: 0,
      totalDistanceTraveled: 0,
      totalDistanceRemaining: 0,
      estimatedTimeRemaining: 0,
      currentSpeed: 0,
      currentBearing: 0,
      isOffRoute: false,
      lastKnownPosition: null,
      navigationStartTime: Date.now(),
      currentInstruction: '',
      nextInstruction: '',
      upcomingInstruction: ''
    };
  }

  startNavigation(
    route: ProcessedRouteStep[],
    routeCoordinates: [number, number][],
    onUpdate: (state: NavigationState) => void,
    onPosition?: (position: GeolocationPosition) => void,
    onError?: (error: string) => void
  ) {
    this.route = route;
    this.routeCoordinates = routeCoordinates;
    this.navigationState = this.getInitialState();
    this.navigationState.navigationStartTime = Date.now();
    
    if (onUpdate) this.updateCallbacks.add(onUpdate);
    if (onPosition) this.positionCallbacks.add(onPosition);
    if (onError) this.errorCallbacks.add(onError);

    // Set initial instructions
    this.updateInstructions();

    // Start GPS tracking
    this.startGPSTracking();
  }

  private startGPSTracking() {
    if (!navigator.geolocation) {
      this.notifyError('Geolocation is not supported by your browser');
      return;
    }

    // Request high accuracy GPS updates
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePositionUpdate(position),
      (error) => this.handlePositionError(error),
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }

  private handlePositionUpdate(position: GeolocationPosition) {
    // Notify position callbacks
    this.positionCallbacks.forEach(callback => callback(position));

    // Update position history
    this.positionHistory.push(position);
    if (this.positionHistory.length > 10) {
      this.positionHistory.shift();
    }

    // Calculate current speed and bearing
    const speed = position.coords.speed || this.calculateSpeed();
    const bearing = position.coords.heading || this.calculateBearing();

    // Find nearest point on route
    const progress = this.calculateRouteProgress(
      [position.coords.longitude, position.coords.latitude]
    );

    // Check if user is off route
    const isOffRoute = progress.distanceFromRoute > 50; // 50 meters threshold

    // Update navigation state
    this.navigationState = {
      ...this.navigationState,
      currentSpeed: speed || 0,
      currentBearing: bearing || 0,
      isOffRoute,
      lastKnownPosition: position,
      distanceFromLastUpdate: this.calculateDistanceFromLastUpdate(position),
      totalDistanceTraveled: this.navigationState.totalDistanceTraveled + 
        (this.navigationState.distanceFromLastUpdate || 0)
    };

    // Update current step based on position
    this.updateCurrentStep(progress);

    // Calculate distances
    this.updateDistances(position);

    // Update instructions based on current position
    this.updateInstructions();

    // Notify update callbacks
    this.notifyUpdate();

    this.lastUpdateTime = Date.now();
  }

  private calculateRouteProgress(currentPosition: [number, number]): RouteProgress {
    let minDistance = Infinity;
    let nearestPoint: [number, number] = [0, 0];
    let nearestSegmentIndex = 0;
    let progressDistance = 0;

    // Find nearest point on route
    for (let i = 0; i < this.routeCoordinates.length - 1; i++) {
      const segmentStart = this.routeCoordinates[i];
      const segmentEnd = this.routeCoordinates[i + 1];
      
      const nearest = this.nearestPointOnSegment(
        currentPosition,
        segmentStart,
        segmentEnd
      );
      
      const distance = this.calculateDistance(currentPosition, nearest);
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = nearest;
        nearestSegmentIndex = i;
      }
    }

    // Calculate progress along route
    for (let i = 0; i < nearestSegmentIndex; i++) {
      progressDistance += this.calculateDistance(
        this.routeCoordinates[i],
        this.routeCoordinates[i + 1]
      );
    }
    progressDistance += this.calculateDistance(
      this.routeCoordinates[nearestSegmentIndex],
      nearestPoint
    );

    return {
      currentPosition,
      nearestPointOnRoute: nearestPoint,
      distanceFromRoute: minDistance,
      progressAlongRoute: progressDistance,
      currentSegmentIndex: nearestSegmentIndex
    };
  }

  private nearestPointOnSegment(
    point: [number, number],
    segmentStart: [number, number],
    segmentEnd: [number, number]
  ): [number, number] {
    const [px, py] = point;
    const [sx, sy] = segmentStart;
    const [ex, ey] = segmentEnd;

    const dx = ex - sx;
    const dy = ey - sy;

    if (dx === 0 && dy === 0) {
      return segmentStart;
    }

    const t = Math.max(0, Math.min(1, ((px - sx) * dx + (py - sy) * dy) / (dx * dx + dy * dy)));
    
    return [sx + t * dx, sy + t * dy];
  }

  private calculateDistance(point1: [number, number], point2: [number, number]): number {
    const [lon1, lat1] = point1;
    const [lon2, lat2] = point2;
    
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private calculateSpeed(): number {
    if (this.positionHistory.length < 2) return 0;

    const recent = this.positionHistory[this.positionHistory.length - 1];
    const previous = this.positionHistory[this.positionHistory.length - 2];

    const distance = this.calculateDistance(
      [previous.coords.longitude, previous.coords.latitude],
      [recent.coords.longitude, recent.coords.latitude]
    );

    const timeDiff = (recent.timestamp - previous.timestamp) / 1000; // seconds

    return distance / timeDiff; // m/s
  }

  private calculateBearing(): number {
    if (this.positionHistory.length < 2) return 0;

    const recent = this.positionHistory[this.positionHistory.length - 1];
    const previous = this.positionHistory[this.positionHistory.length - 2];

    const lat1 = previous.coords.latitude * Math.PI / 180;
    const lat2 = recent.coords.latitude * Math.PI / 180;
    const Δλ = (recent.coords.longitude - previous.coords.longitude) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(Δλ);

    const bearing = Math.atan2(y, x) * 180 / Math.PI;

    return (bearing + 360) % 360;
  }

  private updateCurrentStep(progress: RouteProgress) {
    // Calculate cumulative distances for each step
    let cumulativeDistance = 0;
    let currentStepIndex = 0;

    for (let i = 0; i < this.route.length; i++) {
      cumulativeDistance += this.route[i].distance_m;
      
      if (progress.progressAlongRoute < cumulativeDistance) {
        currentStepIndex = i;
        break;
      }
    }

    // Update if step changed
    if (currentStepIndex !== this.navigationState.currentStepIndex) {
      this.navigationState.currentStepIndex = currentStepIndex;
      
      // Trigger haptic feedback or sound for new instruction
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
    }
  }

  private updateDistances(position: GeolocationPosition) {
    const currentStep = this.route[this.navigationState.currentStepIndex];
    if (!currentStep) return;

    // Calculate distance to next maneuver
    let distanceToNext = 0;
    for (let i = this.navigationState.currentStepIndex; i < this.route.length; i++) {
      if (i === this.navigationState.currentStepIndex) {
        // Partial distance for current segment
        // This is simplified - in production you'd calculate actual distance along route
        distanceToNext = currentStep.distance_m * 0.5; // Placeholder
      } else {
        break;
      }
    }

    // Calculate total remaining distance
    let totalRemaining = distanceToNext;
    for (let i = this.navigationState.currentStepIndex + 1; i < this.route.length; i++) {
      totalRemaining += this.route[i].distance_m;
    }

    // Estimate time remaining based on current speed or average speed
    const avgSpeed = this.navigationState.currentSpeed || 10; // m/s default
    const timeRemaining = totalRemaining / avgSpeed;

    this.navigationState.distanceToNextManeuver = distanceToNext;
    this.navigationState.totalDistanceRemaining = totalRemaining;
    this.navigationState.estimatedTimeRemaining = timeRemaining;
  }

  private calculateDistanceFromLastUpdate(position: GeolocationPosition): number {
    if (!this.navigationState.lastKnownPosition) return 0;

    return this.calculateDistance(
      [
        this.navigationState.lastKnownPosition.coords.longitude,
        this.navigationState.lastKnownPosition.coords.latitude
      ],
      [position.coords.longitude, position.coords.latitude]
    );
  }

  private updateInstructions() {
    const currentStep = this.route[this.navigationState.currentStepIndex];
    const nextStep = this.route[this.navigationState.currentStepIndex + 1];
    const upcomingStep = this.route[this.navigationState.currentStepIndex + 2];

    this.navigationState.currentInstruction = currentStep?.instructions || 'Continue on route';
    this.navigationState.nextInstruction = nextStep?.instructions || '';
    this.navigationState.upcomingInstruction = upcomingStep?.instructions || '';
  }

  private handlePositionError(error: GeolocationPositionError) {
    let errorMessage = 'Unable to get your location';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied. Please enable location services.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable. Check GPS signal.';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out. Retrying...';
        break;
    }

    this.notifyError(errorMessage);
  }

  private notifyUpdate() {
    this.updateCallbacks.forEach(callback => callback(this.navigationState));
  }

  private notifyError(error: string) {
    this.errorCallbacks.forEach(callback => callback(error));
  }

  stopNavigation() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.updateCallbacks.clear();
    this.positionCallbacks.clear();
    this.errorCallbacks.clear();
    this.positionHistory = [];
    this.navigationState = this.getInitialState();
  }

  // Simulate navigation for testing
  simulateNavigation(simulatedRoute: [number, number][]) {
    let currentIndex = 0;
    
    const simulateInterval = setInterval(() => {
      if (currentIndex >= simulatedRoute.length) {
        clearInterval(simulateInterval);
        return;
      }

      const [lon, lat] = simulatedRoute[currentIndex];
      const mockPosition: GeolocationPosition = {
        coords: {
          latitude: lat,
          longitude: lon,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: 10 + Math.random() * 5
        },
        timestamp: Date.now()
      };

      this.handlePositionUpdate(mockPosition);
      currentIndex++;
    }, 1000);

    return () => clearInterval(simulateInterval);
  }
}