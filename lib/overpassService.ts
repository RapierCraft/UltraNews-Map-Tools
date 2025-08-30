interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface OSMElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  members?: Array<{
    type: string;
    ref: number;
    role: string;
  }>;
  tags?: Record<string, string>;
}

interface OverpassResponse {
  version: number;
  generator: string;
  elements: OSMElement[];
}

export class OverpassService {
  private baseUrl = 'https://overpass-api.de/api/interpreter';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private pendingRequests = new Map<string, Promise<any>>();

  private buildQuery(bbox: BoundingBox, zoom: number): string {
    const { south, west, north, east } = bbox;
    
    // Fetch ALL features like OSM does, with zoom-based filtering
    if (zoom < 10) {
      // Low zoom: only major features
      return `
        [out:json][timeout:25];
        (
          way["highway"~"^(motorway|trunk|primary)$"](${south},${west},${north},${east});
          way["natural"~"^(water|coastline)$"](${south},${west},${north},${east});
          relation["natural"="water"](${south},${west},${north},${east});
          way["waterway"~"^(river|canal)$"](${south},${west},${north},${east});
        );
        (._;>;);
        out geom;
      `;
    } else if (zoom < 13) {
      // Medium zoom: roads and major features
      return `
        [out:json][timeout:25];
        (
          way["highway"](${south},${west},${north},${east});
          way["railway"](${south},${west},${north},${east});
          way["natural"](${south},${west},${north},${east});
          way["waterway"](${south},${west},${north},${east});
          way["landuse"~"^(forest|residential|commercial|industrial)$"](${south},${west},${north},${east});
          relation["natural"="water"](${south},${west},${north},${east});
        );
        (._;>;);
        out geom;
      `;
    } else if (zoom < 16) {
      // High zoom: most features
      return `
        [out:json][timeout:25][bbox:${south},${west},${north},${east}];
        (
          way;
          node["amenity"];
          node["shop"];
          node["tourism"];
          node["historic"];
          node["place"];
        );
        (._;>;);
        out geom;
      `;
    } else {
      // Ultra high zoom: EVERYTHING
      return `
        [out:json][timeout:25][bbox:${south},${west},${north},${east}];
        (
          node;
          way;
          relation;
        );
        out geom;
      `;
    }
  }

  private nodeToGeoJSON(element: OSMElement): any {
    if (!element.lat || !element.lon) return null;
    
    return {
      type: 'Feature',
      id: `node/${element.id}`,
      geometry: {
        type: 'Point',
        coordinates: [element.lon, element.lat]
      },
      properties: {
        osm_type: 'node',
        osm_id: element.id,
        ...element.tags
      }
    };
  }

  private wayToGeoJSON(element: OSMElement, nodes: Map<number, OSMElement>): any {
    if (!element.nodes || element.nodes.length < 2) return null;
    
    const coordinates = element.nodes
      .map(nodeId => {
        const node = nodes.get(nodeId);
        return node && node.lat !== undefined && node.lon !== undefined 
          ? [node.lon, node.lat] 
          : null;
      })
      .filter(coord => coord !== null);
    
    if (coordinates.length < 2) return null;
    
    // Check if way is closed (building, area)
    const isClosed = element.nodes[0] === element.nodes[element.nodes.length - 1];
    const isArea = isClosed && (
      element.tags?.building ||
      element.tags?.landuse ||
      element.tags?.natural ||
      element.tags?.leisure ||
      element.tags?.amenity
    );
    
    return {
      type: 'Feature',
      id: `way/${element.id}`,
      geometry: {
        type: isArea ? 'Polygon' : 'LineString',
        coordinates: isArea ? [coordinates] : coordinates
      },
      properties: {
        osm_type: 'way',
        osm_id: element.id,
        is_area: isArea,
        ...element.tags
      }
    };
  }

  private elementsToGeoJSON(elements: OSMElement[]): any {
    // Create node lookup
    const nodeMap = new Map<number, OSMElement>();
    elements.filter(el => el.type === 'node').forEach(node => {
      nodeMap.set(node.id, node);
    });

    const features: any[] = [];
    
    // Convert nodes to points
    elements.filter(el => el.type === 'node' && el.tags && Object.keys(el.tags).length > 0)
      .forEach(node => {
        const feature = this.nodeToGeoJSON(node);
        if (feature) features.push(feature);
      });
    
    // Convert ways to lines/polygons
    elements.filter(el => el.type === 'way')
      .forEach(way => {
        const feature = this.wayToGeoJSON(way, nodeMap);
        if (feature) features.push(feature);
      });

    return {
      type: 'FeatureCollection',
      features
    };
  }

  async fetchOSMData(bbox: BoundingBox, zoom: number): Promise<any> {
    const cacheKey = `${bbox.south}-${bbox.west}-${bbox.north}-${bbox.east}-${zoom}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minute cache
      return cached.data;
    }

    // Check pending requests
    if (this.pendingRequests.has(cacheKey)) {
      return await this.pendingRequests.get(cacheKey);
    }

    const query = this.buildQuery(bbox, zoom);
    
    const requestPromise = this.executeQuery(query).then(data => {
      const geoJSON = this.elementsToGeoJSON(data.elements);
      
      // Cache result
      this.cache.set(cacheKey, {
        data: geoJSON,
        timestamp: Date.now()
      });
      
      // Clean up pending request
      this.pendingRequests.delete(cacheKey);
      
      return geoJSON;
    }).catch(error => {
      this.pendingRequests.delete(cacheKey);
      throw error;
    });

    this.pendingRequests.set(cacheKey, requestPromise);
    return await requestPromise;
  }

  private async executeQuery(query: string): Promise<OverpassResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      throw new Error(`Overpass query failed: ${response.status}`);
    }

    return await response.json();
  }

  // Calculate appropriate bounding box for current view
  getBoundingBox(center: [number, number], zoom: number): BoundingBox {
    const [lat, lng] = center;
    
    // Calculate meters per pixel at this latitude and zoom
    const metersPerPixel = (156543.03392 * Math.cos(lat * Math.PI / 180)) / Math.pow(2, zoom);
    
    // Assume 512x512 viewport
    const viewportSize = 512;
    const metersRadius = (viewportSize / 2) * metersPerPixel;
    
    // Convert to degrees (rough approximation)
    const latDelta = metersRadius / 111320; // meters per degree latitude
    const lngDelta = metersRadius / (111320 * Math.cos(lat * Math.PI / 180));
    
    return {
      north: lat + latDelta,
      south: lat - latDelta,
      east: lng + lngDelta,
      west: lng - lngDelta
    };
  }
}

export const overpassService = new OverpassService();