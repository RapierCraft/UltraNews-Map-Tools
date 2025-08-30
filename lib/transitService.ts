/**
 * Transit Data Service using Transitland API v2
 * Free API for accessing global GTFS transit data
 */

// Transitland API base URL (no auth required for basic queries)
const TRANSITLAND_BASE_URL = 'https://transit.land/api/v2/rest';

// Types for transit data
export interface TransitStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  routes?: TransitRoute[];
  wheelchairAccessible?: boolean;
  platformCode?: string;
}

export interface TransitRoute {
  id: string;
  name: string;
  shortName?: string;
  type: TransitRouteType;
  color?: string;
  textColor?: string;
  operator?: string;
  geometry?: number[][];
}

export enum TransitRouteType {
  TRAM = 0,      // Tram, Streetcar, Light rail
  SUBWAY = 1,    // Subway, Metro
  RAIL = 2,      // Rail
  BUS = 3,       // Bus
  FERRY = 4,     // Ferry
  CABLE_CAR = 5, // Cable car
  GONDOLA = 6,   // Gondola
  FUNICULAR = 7, // Funicular
}

export interface TransitAgency {
  id: string;
  name: string;
  url?: string;
  timezone?: string;
  lang?: string;
}

export interface TransitDeparture {
  routeId: string;
  routeName: string;
  headsign: string;
  scheduledTime: Date;
  realtimeTime?: Date;
  delay?: number; // in seconds
  tripId: string;
}

export interface BoundingBox {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

class TransitService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Get transit stops within a bounding box
   */
  async getStopsInBounds(bounds: BoundingBox, limit = 100): Promise<TransitStop[]> {
    const cacheKey = `stops_${bounds.minLat}_${bounds.minLon}_${bounds.maxLat}_${bounds.maxLon}`;
    
    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const url = new URL(`${TRANSITLAND_BASE_URL}/stops`);
      url.searchParams.append('bbox', `${bounds.minLon},${bounds.minLat},${bounds.maxLon},${bounds.maxLat}`);
      url.searchParams.append('limit', limit.toString());
      url.searchParams.append('include_geometry', 'false');

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.error('Transit API error:', response.status);
        return [];
      }

      const data = await response.json();
      const stops: TransitStop[] = data.stops?.map((stop: any) => ({
        id: stop.id,
        name: stop.stop_name,
        lat: stop.geometry.coordinates[1],
        lon: stop.geometry.coordinates[0],
        wheelchairAccessible: stop.wheelchair_boarding === 1,
        platformCode: stop.platform_code
      })) || [];

      this.setCache(cacheKey, stops);
      return stops;
    } catch (error) {
      console.error('Failed to fetch transit stops:', error);
      return [];
    }
  }

  /**
   * Get transit routes for a specific area
   */
  async getRoutesInBounds(bounds: BoundingBox, limit = 50): Promise<TransitRoute[]> {
    const cacheKey = `routes_${bounds.minLat}_${bounds.minLon}_${bounds.maxLat}_${bounds.maxLon}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const url = new URL(`${TRANSITLAND_BASE_URL}/routes`);
      url.searchParams.append('bbox', `${bounds.minLon},${bounds.minLat},${bounds.maxLon},${bounds.maxLat}`);
      url.searchParams.append('limit', limit.toString());
      url.searchParams.append('include_geometry', 'true');

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.error('Transit routes API error:', response.status);
        return [];
      }

      const data = await response.json();
      const routes: TransitRoute[] = data.routes?.map((route: any) => ({
        id: route.id,
        name: route.route_long_name || route.route_short_name,
        shortName: route.route_short_name,
        type: route.route_type,
        color: route.route_color ? `#${route.route_color}` : undefined,
        textColor: route.route_text_color ? `#${route.route_text_color}` : undefined,
        operator: route.agency?.agency_name,
        geometry: route.geometry?.coordinates
      })) || [];

      this.setCache(cacheKey, routes);
      return routes;
    } catch (error) {
      console.error('Failed to fetch transit routes:', error);
      return [];
    }
  }

  /**
   * Get nearby transit stops from a point
   */
  async getNearbyStops(lat: number, lon: number, radius = 500, limit = 20): Promise<TransitStop[]> {
    const cacheKey = `nearby_${lat}_${lon}_${radius}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const url = new URL(`${TRANSITLAND_BASE_URL}/stops`);
      url.searchParams.append('lat', lat.toString());
      url.searchParams.append('lon', lon.toString());
      url.searchParams.append('radius', radius.toString());
      url.searchParams.append('limit', limit.toString());

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.error('Nearby stops API error:', response.status);
        return [];
      }

      const data = await response.json();
      const stops: TransitStop[] = data.stops?.map((stop: any) => ({
        id: stop.id,
        name: stop.stop_name,
        lat: stop.geometry.coordinates[1],
        lon: stop.geometry.coordinates[0],
        wheelchairAccessible: stop.wheelchair_boarding === 1,
        platformCode: stop.platform_code
      })) || [];

      this.setCache(cacheKey, stops);
      return stops;
    } catch (error) {
      console.error('Failed to fetch nearby stops:', error);
      return [];
    }
  }

  /**
   * Get departures for a specific stop
   */
  async getStopDepartures(stopId: string, startTime?: Date, endTime?: Date): Promise<TransitDeparture[]> {
    const cacheKey = `departures_${stopId}_${startTime?.getTime()}_${endTime?.getTime()}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const url = new URL(`${TRANSITLAND_BASE_URL}/stops/${stopId}/departures`);
      
      if (startTime) {
        url.searchParams.append('start_time', startTime.toISOString());
      }
      if (endTime) {
        url.searchParams.append('end_time', endTime.toISOString());
      }

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.error('Departures API error:', response.status);
        return [];
      }

      const data = await response.json();
      const departures: TransitDeparture[] = data.departures?.map((dep: any) => ({
        routeId: dep.trip?.route?.id,
        routeName: dep.trip?.route?.route_long_name || dep.trip?.route?.route_short_name,
        headsign: dep.trip?.trip_headsign,
        scheduledTime: new Date(dep.scheduled_departure_time),
        realtimeTime: dep.realtime_departure_time ? new Date(dep.realtime_departure_time) : undefined,
        delay: dep.delay,
        tripId: dep.trip?.id
      })) || [];

      this.setCache(cacheKey, departures);
      return departures;
    } catch (error) {
      console.error('Failed to fetch departures:', error);
      return [];
    }
  }

  /**
   * Search for transit agencies in an area
   */
  async getAgenciesInBounds(bounds: BoundingBox): Promise<TransitAgency[]> {
    const cacheKey = `agencies_${bounds.minLat}_${bounds.minLon}_${bounds.maxLat}_${bounds.maxLon}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const url = new URL(`${TRANSITLAND_BASE_URL}/agencies`);
      url.searchParams.append('bbox', `${bounds.minLon},${bounds.minLat},${bounds.maxLon},${bounds.maxLat}`);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.error('Agencies API error:', response.status);
        return [];
      }

      const data = await response.json();
      const agencies: TransitAgency[] = data.agencies?.map((agency: any) => ({
        id: agency.id,
        name: agency.agency_name,
        url: agency.agency_url,
        timezone: agency.agency_timezone,
        lang: agency.agency_lang
      })) || [];

      this.setCache(cacheKey, agencies);
      return agencies;
    } catch (error) {
      console.error('Failed to fetch agencies:', error);
      return [];
    }
  }

  /**
   * Convert transit routes to GeoJSON for map display
   */
  routesToGeoJSON(routes: TransitRoute[]): GeoJSON.FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: routes
        .filter(route => route.geometry)
        .map(route => ({
          type: 'Feature',
          properties: {
            id: route.id,
            name: route.name,
            shortName: route.shortName,
            type: route.type,
            color: route.color || this.getDefaultColor(route.type),
            textColor: route.textColor || '#FFFFFF',
            operator: route.operator
          },
          geometry: {
            type: 'LineString',
            coordinates: route.geometry!
          }
        }))
    };
  }

  /**
   * Convert transit stops to GeoJSON for map display
   */
  stopsToGeoJSON(stops: TransitStop[]): GeoJSON.FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: stops.map(stop => ({
        type: 'Feature',
        properties: {
          id: stop.id,
          name: stop.name,
          wheelchairAccessible: stop.wheelchairAccessible,
          platformCode: stop.platformCode
        },
        geometry: {
          type: 'Point',
          coordinates: [stop.lon, stop.lat]
        }
      }))
    };
  }

  /**
   * Get default color for transit route type
   */
  private getDefaultColor(type: TransitRouteType): string {
    switch (type) {
      case TransitRouteType.SUBWAY:
        return '#0000FF'; // Blue for subway
      case TransitRouteType.RAIL:
        return '#FF0000'; // Red for rail
      case TransitRouteType.BUS:
        return '#00AA00'; // Green for bus
      case TransitRouteType.FERRY:
        return '#00AAFF'; // Light blue for ferry
      case TransitRouteType.TRAM:
        return '#FF9900'; // Orange for tram
      case TransitRouteType.CABLE_CAR:
        return '#663399'; // Purple for cable car
      default:
        return '#666666'; // Gray for unknown
    }
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
    
    // Clean old cache entries
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      this.cache.delete(entries[0][0]);
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const transitService = new TransitService();