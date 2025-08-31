/**
 * Transit Data Service using free OpenStreetMap Overpass API
 * No authentication required - uses OpenStreetMap transit data
 */

// Free transit data sources
const OVERPASS_BASE_URL = 'https://overpass-api.de/api/interpreter';

// Types for transit data
export interface TransitStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  routes?: TransitRoute[];
  wheelchairAccessible?: boolean;
  platformCode?: string;
  operator?: string;
  network?: string;
  transitType?: string;
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
  network?: string;
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

export interface BoundingBox {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

class TransitService {
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private cacheTimeout = 10 * 60 * 1000; // 10 minutes (longer cache)
  private requestQueue: Map<string, Promise<unknown>> = new Map();
  private lastRequestTime = 0;
  private minRequestInterval = 2000; // 2 seconds between requests

  /**
   * Rate limited request wrapper
   */
  private async makeRateLimitedRequest(cacheKey: string, requestFn: () => Promise<unknown>): Promise<unknown> {
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    // Check if request is already in progress
    if (this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey)!;
    }
    
    // Rate limiting - ensure minimum interval between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
    }
    
    // Make the request
    const requestPromise = requestFn();
    this.requestQueue.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      this.setCache(cacheKey, result);
      this.lastRequestTime = Date.now();
      return result;
    } finally {
      this.requestQueue.delete(cacheKey);
    }
  }

  /**
   * Get transit stops within a bounding box using OpenStreetMap data
   */
  async getStopsInBounds(bounds: BoundingBox, limit = 100): Promise<TransitStop[]> {
    // Use rounded coordinates to improve cache hit rates
    const roundedBounds = {
      minLat: Math.round(bounds.minLat * 1000) / 1000,
      minLon: Math.round(bounds.minLon * 1000) / 1000,
      maxLat: Math.round(bounds.maxLat * 1000) / 1000,
      maxLon: Math.round(bounds.maxLon * 1000) / 1000
    };
    
    const cacheKey = `stops_${roundedBounds.minLat}_${roundedBounds.minLon}_${roundedBounds.maxLat}_${roundedBounds.maxLon}`;
    
    return this.makeRateLimitedRequest(cacheKey, async () => {
      return this.fetchStopsFromOverpass(roundedBounds, limit);
    }) as Promise<TransitStop[]>;
  }

  /**
   * Actual Overpass API call for stops (prioritizing metro/subway)
   */
  private async fetchStopsFromOverpass(bounds: BoundingBox, limit: number): Promise<TransitStop[]> {
    try {
      // Focus on metro/subway stations first, then major rail
      const query = `
        [out:json][timeout:15];
        (
          node[railway=station][station~"subway|metro"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
          node[railway=station][public_transport=station](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
          node[public_transport=station](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
          node[railway=station](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
        );
        out geom ${Math.min(limit, 100)};
      `;

      const response = await fetch(OVERPASS_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query)
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Overpass API rate limit exceeded, returning cached data');
          return [];
        }
        console.error('Overpass API error:', response.status);
        return [];
      }

      const data = await response.json();
      const stops: TransitStop[] = (data.elements || [])
        .filter((element: Record<string, unknown>) => element.lat && element.lon)
        .slice(0, limit)
        .map((element: Record<string, unknown>) => {
          const tags = element.tags as Record<string, string> || {};
          
          return {
            id: `osm_${element.type}_${element.id}`,
            name: tags.name || tags.ref || this.getStopTypeFromTags(tags) || 'Transit Stop',
            lat: element.lat as number,
            lon: element.lon as number,
            wheelchairAccessible: tags.wheelchair === 'yes',
            platformCode: tags.local_ref || tags.ref,
            operator: tags.operator,
            network: tags.network,
            transitType: this.getStopTypeFromTags(tags)
          };
        });

      return stops;
    } catch (error) {
      console.error('Failed to fetch transit stops:', error);
      return [];
    }
  }

  /**
   * Get metro/subway routes for a specific area using OpenStreetMap data
   */
  async getRoutesInBounds(bounds: BoundingBox, limit = 20): Promise<TransitRoute[]> {
    const roundedBounds = {
      minLat: Math.round(bounds.minLat * 1000) / 1000,
      minLon: Math.round(bounds.minLon * 1000) / 1000,
      maxLat: Math.round(bounds.maxLat * 1000) / 1000,
      maxLon: Math.round(bounds.maxLon * 1000) / 1000
    };
    
    const cacheKey = `routes_${roundedBounds.minLat}_${roundedBounds.minLon}_${roundedBounds.maxLat}_${roundedBounds.maxLon}`;
    
    return this.makeRateLimitedRequest(cacheKey, async () => {
      return this.fetchMetroRoutesFromOverpass(roundedBounds, limit);
    }) as Promise<TransitRoute[]>;
  }

  /**
   * Fetch metro/subway routes from Overpass API
   */
  private async fetchMetroRoutesFromOverpass(bounds: BoundingBox, limit: number): Promise<TransitRoute[]> {
    try {
      // Focus on metro/subway routes only
      const query = `
        [out:json][timeout:20];
        (
          relation[type=route][route=subway](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
          relation[type=route][route=train][service=subway](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
          relation[type=route][route=light_rail][service~"subway|metro"](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
        );
        out geom ${Math.min(limit, 30)};
      `;

      const response = await fetch(OVERPASS_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query)
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Overpass API rate limit exceeded for metro routes');
          return [];
        }
        console.error('Metro routes API error:', response.status);
        return [];
      }

      const data = await response.json();
      const routes: TransitRoute[] = (data.elements || [])
        .slice(0, limit)
        .map((element: Record<string, unknown>) => {
          const tags = element.tags as Record<string, string> || {};
          
          return {
            id: `osm_${element.id}`,
            name: tags.name || tags.ref || 'Metro Line',
            shortName: tags.ref || tags.route_ref,
            type: TransitRouteType.SUBWAY,
            color: this.parseRouteColor(tags.colour) || this.getDefaultColor(TransitRouteType.SUBWAY),
            textColor: this.parseRouteColor(tags.colour_text) || '#FFFFFF',
            operator: tags.operator,
            network: tags.network,
            geometry: this.extractRouteGeometry(element)
          };
        });

      return routes;
    } catch (error) {
      console.error('Failed to fetch metro routes:', error);
      return [];
    }
  }

  /**
   * Parse color from OSM tags (handle various formats)
   */
  private parseRouteColor(color?: string): string | undefined {
    if (!color) return undefined;
    
    // Handle hex colors with or without #
    if (color.match(/^[0-9A-Fa-f]{6}$/)) return `#${color}`;
    if (color.match(/^#[0-9A-Fa-f]{6}$/)) return color;
    
    // Handle common color names
    const colorMap: Record<string, string> = {
      'red': '#FF0000',
      'blue': '#0000FF', 
      'green': '#00AA00',
      'yellow': '#FFFF00',
      'orange': '#FF9900',
      'purple': '#663399',
      'brown': '#8B4513',
      'pink': '#FFC0CB',
      'gray': '#808080',
      'grey': '#808080'
    };
    
    return colorMap[color.toLowerCase()] || color;
  }

  /**
   * Get nearby transit stops from a point using OpenStreetMap data
   */
  async getNearbyStops(lat: number, lon: number, radius = 500, limit = 20): Promise<TransitStop[]> {
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLon = Math.round(lon * 1000) / 1000;
    const cacheKey = `nearby_${roundedLat}_${roundedLon}_${radius}`;
    
    return this.makeRateLimitedRequest(cacheKey, async () => {
      return this.fetchNearbyStopsFromOverpass(roundedLat, roundedLon, radius, limit);
    }) as Promise<TransitStop[]>;
  }

  /**
   * Actual Overpass API call for nearby stops (prioritizing metro/subway)
   */
  private async fetchNearbyStopsFromOverpass(lat: number, lon: number, radius: number, limit: number): Promise<TransitStop[]> {
    try {
      const query = `
        [out:json][timeout:15];
        (
          node[railway=station][station~"subway|metro"](around:${radius},${lat},${lon});
          node[railway=station][public_transport=station](around:${radius},${lat},${lon});
          node[public_transport=station](around:${radius},${lat},${lon});
          node[railway=station](around:${radius},${lat},${lon});
        );
        out geom ${Math.min(limit, 30)};
      `;

      const response = await fetch(OVERPASS_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query)
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Overpass API rate limit exceeded for nearby stops');
          return [];
        }
        console.error('Nearby stops API error:', response.status);
        return [];
      }

      const data = await response.json();
      const stops: TransitStop[] = (data.elements || [])
        .slice(0, limit)
        .map((element: Record<string, unknown>) => {
          const tags = element.tags as Record<string, string> || {};
          
          return {
            id: `osm_${element.type}_${element.id}`,
            name: tags.name || tags.ref || this.getStopTypeFromTags(tags) || 'Transit Stop',
            lat: element.lat as number,
            lon: element.lon as number,
            wheelchairAccessible: tags.wheelchair === 'yes',
            platformCode: tags.local_ref || tags.ref,
            operator: tags.operator,
            network: tags.network,
            transitType: this.getStopTypeFromTags(tags)
          };
        });

      return stops;
    } catch (error) {
      console.error('Failed to fetch nearby stops:', error);
      return [];
    }
  }

  /**
   * Since we're using OpenStreetMap data, real-time departures aren't available
   * This would need integration with specific transit agency APIs
   */
  async getStopDepartures(stopId: string): Promise<[]> {
    console.log('Real-time departures not available with OpenStreetMap data source:', stopId);
    return [];
  }

  /**
   * Get transit agencies/operators in an area
   */
  async getAgenciesInBounds(bounds: BoundingBox): Promise<TransitAgency[]> {
    const cacheKey = `agencies_${bounds.minLat}_${bounds.minLon}_${bounds.maxLat}_${bounds.maxLon}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached as TransitAgency[];

    try {
      const query = `
        [out:json][timeout:25];
        (
          relation[type=route][route~"^(bus|tram|train|subway|light_rail|monorail|ferry)$"][operator](${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon});
        );
        out tags;
      `;

      const response = await fetch(OVERPASS_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query)
      });

      if (!response.ok) {
        console.error('Agencies API error:', response.status);
        return [];
      }

      const data = await response.json();
      const operatorsSet = new Set<string>();
      
      (data.elements || []).forEach((element: Record<string, unknown>) => {
        const tags = element.tags as Record<string, string> || {};
        if (tags.operator) {
          operatorsSet.add(tags.operator);
        }
      });

      const agencies: TransitAgency[] = Array.from(operatorsSet).map(operator => ({
        id: `operator_${operator.replace(/\s+/g, '_').toLowerCase()}`,
        name: operator
      }));

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
        .filter(route => route.geometry && route.geometry.length > 0)
        .map(route => ({
          type: 'Feature',
          properties: {
            id: route.id,
            name: route.name,
            shortName: route.shortName,
            type: route.type,
            color: route.color || this.getDefaultColor(route.type),
            textColor: route.textColor || '#FFFFFF',
            operator: route.operator,
            network: route.network
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
          platformCode: stop.platformCode,
          operator: stop.operator,
          network: stop.network,
          transitType: stop.transitType
        },
        geometry: {
          type: 'Point',
          coordinates: [stop.lon, stop.lat]
        }
      }))
    };
  }

  /**
   * Determine stop type from OpenStreetMap tags (prioritizing metro identification)
   */
  private getStopTypeFromTags(tags: Record<string, string>): string {
    // Check for metro/subway specific tags first
    if (tags.station === 'subway' || tags.station === 'metro') return 'Metro Station';
    if (tags.railway === 'station' && (tags.public_transport === 'station' || tags.subway === 'yes')) return 'Metro Station';
    if (tags.public_transport === 'station' && tags.railway === 'station') return 'Metro Station';
    
    // Other transit types
    if (tags.railway === 'station') return 'Railway Station';
    if (tags.railway === 'halt') return 'Railway Halt';
    if (tags.railway === 'tram_stop') return 'Tram Stop';
    if (tags.public_transport === 'platform') return 'Platform';
    if (tags.public_transport === 'stop_position') return 'Stop Position';
    if (tags.highway === 'bus_stop') return 'Bus Stop';
    if (tags.amenity === 'ferry_terminal') return 'Ferry Terminal';
    
    return 'Transit Station';
  }

  /**
   * Convert OpenStreetMap route type to TransitRouteType enum
   */
  private getRouteTypeFromTags(tags: Record<string, string>): TransitRouteType {
    const routeType = tags.route || '';
    
    switch (routeType) {
      case 'subway':
        return TransitRouteType.SUBWAY;
      case 'train':
        return TransitRouteType.RAIL;
      case 'bus':
        return TransitRouteType.BUS;
      case 'ferry':
        return TransitRouteType.FERRY;
      case 'tram':
      case 'light_rail':
        return TransitRouteType.TRAM;
      case 'monorail':
        return TransitRouteType.RAIL;
      default:
        return TransitRouteType.BUS;
    }
  }

  /**
   * Extract geometry from Overpass route relation
   */
  private extractRouteGeometry(element: Record<string, unknown>): number[][] | undefined {
    const geometry = element.geometry as Record<string, unknown>[];
    if (!geometry) return undefined;
    
    return geometry
      .filter(g => g.lat && g.lon)
      .map(g => [g.lon as number, g.lat as number]);
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
  private getFromCache(key: string): unknown {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: unknown): void {
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