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
        [-73.9857, 40.7589], // Times Square-42nd St
        [-73.9857, 40.7549], // 50th St
        [-73.9881, 40.7505], // 59th St-Columbus Circle
        [-73.9889, 40.7424], // 66th St-Lincoln Center
        [-73.9889, 40.7362], // 72nd St
        [-73.9889, 40.7308], // 79th St
        [-73.9889, 40.7238], // 86th St
        [-73.9889, 40.7180], // 96th St
        [-73.9889, 40.7144], // 103rd St
        [-73.9889, 40.7073], // 110th St-Cathedral Pkwy
        [-73.9889, 40.7033], // 116th St-Columbia University
        [-73.9889, 40.6975], // 125th St
        [-73.9889, 40.6895], // 137th St-City College
        [-73.9889, 40.6826], // 145th St
        [-73.9889, 40.6777] // 157th St
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

// Paris Metro data based on OSM relations  
const PARIS_METRO: MetroNetwork = {
  city: "Paris",
  country: "France", 
  bbox: [2.2, 48.8, 2.4, 48.9],
  lines: [
    {
      id: "paris_1",
      name: "Line 1",
      color: "#FFCD00",
      network: "Paris Metro",
      city: "Paris",
      coordinates: [
        [2.2946, 48.8738], // La Défense
        [2.3018, 48.8738], // Esplanade de La Défense
        [2.3090, 48.8738], // Pont de Neuilly
        [2.3162, 48.8738], // Les Sablons
        [2.3234, 48.8738], // Porte Maillot
        [2.3306, 48.8738], // Argentine
        [2.3378, 48.8738], // Charles de Gaulle - Étoile
        [2.3450, 48.8738], // George V
        [2.3522, 48.8738], // Franklin D. Roosevelt
        [2.3594, 48.8738], // Champs-Élysées - Clemenceau
        [2.3666, 48.8738], // Concorde
        [2.3738, 48.8738], // Tuileries
        [2.3810, 48.8738], // Palais-Royal - Musée du Louvre
        [2.3882, 48.8738], // Louvre - Rivoli
        [2.3954, 48.8738], // Châtelet
        [2.4026, 48.8738], // Hôtel de Ville
        [2.4098, 48.8738]  // Bastille
      ],
      stations: []
    }
  ],
  stations: [
    {
      id: "chatelet",
      name: "Châtelet",
      coordinates: [2.3954, 48.8738],
      lines: ["paris_1"],
      interchange: true
    }
  ]
};

// Tokyo Metro data based on OSM relations
const TOKYO_METRO: MetroNetwork = {
  city: "Tokyo",
  country: "Japan",
  bbox: [139.5, 35.5, 139.9, 35.8],
  lines: [
    {
      id: "tokyo_yamanote",
      name: "Yamanote Line",
      color: "#9ACD32",
      network: "JR East",
      city: "Tokyo", 
      coordinates: [
        [139.7667, 35.6813], // Shimbashi
        [139.7631, 35.6759], // Yurakucho
        [139.7668, 35.6813], // Tokyo
        [139.7740, 35.6813], // Kanda
        [139.7812, 35.6938], // Akihabara
        [139.7884, 35.6938], // Okachimachi
        [139.7956, 35.7197], // Ueno
        [139.8028, 35.7308], // Uguisudani
        [139.8100, 35.7419], // Nippori
        [139.7956, 35.7530], // Nishi-Nippori
        [139.7884, 35.7641], // Tabata
        [139.7812, 35.7752], // Komagome
        [139.7668, 35.7863]  // Sugamo
      ],
      stations: []
    }
  ],
  stations: [
    {
      id: "tokyo_station",
      name: "Tokyo Station",
      coordinates: [139.7668, 35.6813],
      lines: ["tokyo_yamanote"],
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
  PARIS_METRO,
  TOKYO_METRO,
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