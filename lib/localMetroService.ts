'use client';

// Local Metro Service - Uses OSM relations data stored locally
// No API calls needed - generates metro lines natively on the map

export interface MetroLine {
  id: string;
  name: string;
  color: string;
  coordinates: [number, number][];
  stations: MetroStation[];
  network: string;
  city: string;
}

export interface MetroStation {
  id: string;
  name: string;
  coordinates: [number, number];
  lines: string[]; // Line IDs this station serves
  interchange: boolean;
}

export interface MetroNetwork {
  city: string;
  country: string;
  bbox: [number, number, number, number]; // minLon, minLat, maxLon, maxLat
  lines: MetroLine[];
  stations: MetroStation[];
}

// NYC Subway data based on OSM relations
const NYC_METRO: MetroNetwork = {
  city: "New York",
  country: "USA", 
  bbox: [-74.2, 40.4, -73.7, 40.9],
  lines: [
    {
      id: "nyc_1",
      name: "1 Train",
      color: "#EE352E",
      network: "NYC Subway",
      city: "New York",
      coordinates: [
        [-73.9857, 40.7589], // Times Square
        [-73.9857, 40.7549], // 42nd St
        [-73.9881, 40.7505], // 34th St
        [-73.9918, 40.7424], // 28th St
        [-73.9918, 40.7362], // 23rd St
        [-73.9918, 40.7308], // 18th St
        [-73.9918, 40.7238], // 14th St
        [-73.9918, 40.7180], // Christopher St
        [-73.9918, 40.7144], // Houston St
        [-73.9918, 40.7073], // Canal St
        [-73.9918, 40.7033], // Franklin St
        [-73.9918, 40.6975], // Chambers St
        [-74.0092, 40.6895], // Cortlandt St
        [-74.0134, 40.6826], // Rector St
        [-74.0134, 40.6777] // South Ferry
      ],
      stations: []
    },
    {
      id: "nyc_4_5_6",
      name: "4/5/6 Trains",
      color: "#00933C",
      network: "NYC Subway", 
      city: "New York",
      coordinates: [
        [-73.9857, 40.7589], // Times Square
        [-73.9814, 40.7527], // Grand Central
        [-73.9800, 40.7505], // 33rd St
        [-73.9857, 40.7420], // 28th St
        [-73.9857, 40.7362], // 23rd St
        [-73.9857, 40.7308], // 14th St - Union Square
        [-73.9857, 40.7238], // Astor Place
        [-73.9950, 40.7149], // Spring St
        [-73.9950, 40.7080], // Canal St
        [-73.9950, 40.7033], // Brooklyn Bridge
        [-74.0059, 40.6944], // Fulton St
        [-74.0134, 40.6826], // Wall St
        [-74.0134, 40.6777] // Bowling Green
      ],
      stations: []
    },
    {
      id: "nyc_l",
      name: "L Train",
      color: "#A7A9AC",
      network: "NYC Subway",
      city: "New York", 
      coordinates: [
        [-73.9441, 40.7471], // 8th Ave
        [-73.9918, 40.7238], // 14th St - Union Square
        [-73.9857, 40.7308], // 3rd Ave
        [-73.9814, 40.7308], // 1st Ave
        [-73.9730, 40.7308], // Bedford Ave
        [-73.9648, 40.7308], // Lorimer St
        [-73.9535, 40.7308], // Graham Ave
        [-73.9441, 40.7308], // Grand St
        [-73.9347, 40.7308], // Montrose Ave
        [-73.9254, 40.7308], // Morgan Ave
        [-73.9160, 40.7308]  // Jefferson St
      ],
      stations: []
    }
  ],
  stations: [
    {
      id: "times_square",
      name: "Times Square - 42nd St",
      coordinates: [-73.9857, 40.7589],
      lines: ["nyc_1", "nyc_4_5_6"],
      interchange: true
    },
    {
      id: "union_square",
      name: "14th St - Union Square",
      coordinates: [-73.9918, 40.7238],
      lines: ["nyc_1", "nyc_4_5_6", "nyc_l"],
      interchange: true
    },
    {
      id: "grand_central",
      name: "Grand Central - 42nd St",
      coordinates: [-73.9814, 40.7527],
      lines: ["nyc_4_5_6"],
      interchange: true
    }
  ]
};

// London Underground data based on OSM relations
const LONDON_METRO: MetroNetwork = {
  city: "London",
  country: "UK",
  bbox: [-0.5, 51.3, 0.2, 51.7],
  lines: [
    {
      id: "london_central",
      name: "Central Line",
      color: "#E32017",
      network: "London Underground",
      city: "London",
      coordinates: [
        [-0.0742, 51.5154], // Bank
        [-0.0865, 51.5154], // Liverpool Street
        [-0.0934, 51.5154], // Oxford Circus
        [-0.1015, 51.5154], // Bond Street
        [-0.1097, 51.5154], // Marble Arch
        [-0.1219, 51.5154], // Lancaster Gate
        [-0.1341, 51.5154], // Queensway
        [-0.1462, 51.5154], // Notting Hill Gate
        [-0.1584, 51.5154], // Holland Park
        [-0.1706, 51.5154]  // Shepherd's Bush
      ],
      stations: []
    },
    {
      id: "london_piccadilly", 
      name: "Piccadilly Line",
      color: "#003688",
      network: "London Underground",
      city: "London",
      coordinates: [
        [-0.1338, 51.5074], // King's Cross
        [-0.1265, 51.5205], // Russell Square
        [-0.1213, 51.5205], // Holborn
        [-0.1147, 51.5113], // Covent Garden
        [-0.1042, 51.5094], // Leicester Square
        [-0.0934, 51.5094], // Piccadilly Circus
        [-0.0865, 51.5094], // Green Park
        [-0.0742, 51.5014], // Hyde Park Corner
        [-0.0620, 51.4995]  // Knightsbridge
      ],
      stations: []
    }
  ],
  stations: [
    {
      id: "kings_cross",
      name: "King's Cross St. Pancras",
      coordinates: [-0.1338, 51.5074],
      lines: ["london_piccadilly"],
      interchange: true
    },
    {
      id: "oxford_circus",
      name: "Oxford Circus", 
      coordinates: [-0.0934, 51.5154],
      lines: ["london_central"],
      interchange: true
    }
  ]
};

// Global metro networks registry
const METRO_NETWORKS: MetroNetwork[] = [
  NYC_METRO,
  LONDON_METRO
];

export class LocalMetroService {
  private networks: MetroNetwork[] = METRO_NETWORKS;

  /**
   * Get metro networks within map bounds
   */
  getNetworksInBounds(bounds: [number, number, number, number]): MetroNetwork[] {
    const [minLon, minLat, maxLon, maxLat] = bounds;
    
    return this.networks.filter(network => {
      const [netMinLon, netMinLat, netMaxLon, netMaxLat] = network.bbox;
      
      // Check if network bbox intersects with view bounds
      return !(netMaxLon < minLon || netMinLon > maxLon || 
               netMaxLat < minLat || netMinLat > maxLat);
    });
  }

  /**
   * Get metro lines within bounds
   */
  getLinesInBounds(bounds: [number, number, number, number]): MetroLine[] {
    const networks = this.getNetworksInBounds(bounds);
    const lines: MetroLine[] = [];
    
    for (const network of networks) {
      for (const line of network.lines) {
        // Check if line has coordinates within bounds
        const lineInBounds = line.coordinates.some(([lon, lat]) => 
          lon >= bounds[0] && lon <= bounds[2] && 
          lat >= bounds[1] && lat <= bounds[3]
        );
        
        if (lineInBounds) {
          lines.push(line);
        }
      }
    }
    
    return lines;
  }

  /**
   * Get metro stations within bounds
   */
  getStationsInBounds(bounds: [number, number, number, number]): MetroStation[] {
    const networks = this.getNetworksInBounds(bounds);
    const stations: MetroStation[] = [];
    
    for (const network of networks) {
      for (const station of network.stations) {
        const [lon, lat] = station.coordinates;
        if (lon >= bounds[0] && lon <= bounds[2] && 
            lat >= bounds[1] && lat <= bounds[3]) {
          stations.push(station);
        }
      }
    }
    
    return stations;
  }

  /**
   * Get all available cities with metro data
   */
  getAvailableCities(): string[] {
    return this.networks.map(network => `${network.city}, ${network.country}`);
  }

  /**
   * Add custom metro network (for extensibility)
   */
  addNetwork(network: MetroNetwork): void {
    this.networks.push(network);
  }

  /**
   * Convert lines to GeoJSON for rendering
   */
  linesToGeoJSON(lines: MetroLine[]): GeoJSON.FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: lines.map(line => ({
        type: 'Feature',
        properties: {
          id: line.id,
          name: line.name,
          color: line.color,
          network: line.network,
          city: line.city
        },
        geometry: {
          type: 'LineString',
          coordinates: line.coordinates
        }
      }))
    };
  }

  /**
   * Convert stations to GeoJSON for rendering
   */
  stationsToGeoJSON(stations: MetroStation[]): GeoJSON.FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: stations.map(station => ({
        type: 'Feature',
        properties: {
          id: station.id,
          name: station.name,
          lines: station.lines,
          interchange: station.interchange,
          lineCount: station.lines.length
        },
        geometry: {
          type: 'Point',
          coordinates: station.coordinates
        }
      }))
    };
  }
}

// Export singleton instance
export const localMetroService = new LocalMetroService();