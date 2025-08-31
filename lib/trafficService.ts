export interface TrafficCondition {
  condition: string;
  delay_minutes: number;
  speed_kmh: number;
  confidence: number;
}

export interface RouteTrafficUpdate {
  route_id: string;
  segments: TrafficCondition[];
  total_delay_minutes: number;
  last_updated: string;
}

export class TrafficService {
  private static instance: TrafficService;
  private updateCallbacks: Set<(update: RouteTrafficUpdate) => void> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;
  private currentRoutes: Map<string, any> = new Map();
  
  static getInstance(): TrafficService {
    if (!TrafficService.instance) {
      TrafficService.instance = new TrafficService();
    }
    return TrafficService.instance;
  }

  startRealTimeUpdates(intervalMs: number = 300000) { // 5 minutes default
    this.stopRealTimeUpdates();
    
    this.updateInterval = setInterval(async () => {
      await this.fetchTrafficUpdates();
    }, intervalMs);
  }

  stopRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  addRoute(routeId: string, route: any) {
    this.currentRoutes.set(routeId, route);
  }

  removeRoute(routeId: string) {
    this.currentRoutes.delete(routeId);
  }

  subscribeToUpdates(callback: (update: RouteTrafficUpdate) => void) {
    this.updateCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  private async fetchTrafficUpdates() {
    for (const [routeId, route] of this.currentRoutes) {
      try {
        const response = await fetch(`http://localhost:8002/api/v1/routing/traffic?lat=${route.overview_geometry[0][1]}&lon=${route.overview_geometry[0][0]}&radius_km=5`);
        
        if (response.ok) {
          const trafficData = await response.json();
          
          const update: RouteTrafficUpdate = {
            route_id: routeId,
            segments: [], // Would be populated with real traffic data
            total_delay_minutes: trafficData.traffic?.estimated_delay_minutes || 0,
            last_updated: new Date().toISOString()
          };

          // Notify all subscribers
          this.updateCallbacks.forEach(callback => {
            try {
              callback(update);
            } catch (error) {
              console.error('Error in traffic update callback:', error);
            }
          });
        }
      } catch (error) {
        console.error(`Error fetching traffic for route ${routeId}:`, error);
      }
    }
  }

  async getInstantTrafficInfo(lat: number, lon: number, radiusKm: number = 1): Promise<any> {
    try {
      const response = await fetch(`http://localhost:8002/api/v1/routing/traffic?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`);
      
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error('Error fetching instant traffic info:', error);
      return null;
    }
  }

  async calculateQuickETA(originLat: number, originLon: number, destLat: number, destLon: number, departureTime?: string): Promise<any> {
    try {
      const params = new URLSearchParams({
        origin_lat: originLat.toString(),
        origin_lon: originLon.toString(),
        dest_lat: destLat.toString(),
        dest_lon: destLon.toString()
      });
      
      if (departureTime) {
        params.append('departure_time', departureTime);
      }
      
      const response = await fetch(`http://localhost:8002/api/v1/routing/eta?${params}`);
      
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error('Error calculating ETA:', error);
      return null;
    }
  }

  // Utility method to format traffic conditions for display
  formatTrafficCondition(condition: string): { label: string; color: string; severity: number } {
    const conditions = {
      free_flow: { label: 'Free Flow', color: 'green', severity: 0 },
      light: { label: 'Light Traffic', color: 'yellow', severity: 1 },
      moderate: { label: 'Moderate Traffic', color: 'orange', severity: 2 },
      heavy: { label: 'Heavy Traffic', color: 'red', severity: 3 },
      severe: { label: 'Severe Traffic', color: 'dark-red', severity: 4 }
    };
    
    return conditions[condition as keyof typeof conditions] || { 
      label: 'Unknown', 
      color: 'gray', 
      severity: 0 
    };
  }

  // Predict traffic for future time
  predictTrafficForTime(hour: number, dayOfWeek: number): { condition: string; multiplier: number } {
    // 0 = Sunday, 1 = Monday, etc.
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    if (isWeekend) {
      if (hour >= 10 && hour <= 15) {
        return { condition: 'light', multiplier: 1.1 };
      }
      return { condition: 'free_flow', multiplier: 1.0 };
    }
    
    // Weekday patterns
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      return { condition: 'heavy', multiplier: 1.4 };
    } else if (hour >= 10 && hour <= 16) {
      return { condition: 'moderate', multiplier: 1.2 };
    } else if (hour >= 22 || hour <= 5) {
      return { condition: 'free_flow', multiplier: 0.9 };
    }
    
    return { condition: 'light', multiplier: 1.1 };
  }
}

// Export singleton instance
export const trafficService = TrafficService.getInstance();