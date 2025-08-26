export interface PipelineCoordinate {
  lat: number;
  lng: number;
  description?: string;
  type?: 'waypoint' | 'compressor' | 'terminal' | 'crossing' | 'explosion';
}

export interface PipelineRoute {
  id: string;
  name: string;
  coordinates: PipelineCoordinate[];
  metadata: {
    length: string;
    diameter: string;
    capacity: string;
    operator: string;
    startPoint: string;
    endPoint: string;
    constructionYear?: string;
    status: 'operational' | 'damaged' | 'decommissioned';
  };
}

export const NORD_STREAM_ACCURATE_ROUTES: PipelineRoute[] = [
  {
    id: 'nord-stream-1',
    name: 'Nord Stream 1',
    coordinates: [
      // Starting point - Vyborg, Russia (Portovaya Bay)
      { lat: 60.7578, lng: 28.6061, description: 'Portovaya Bay Compressor Station', type: 'compressor' },
      
      // Russian territorial waters
      { lat: 60.5000, lng: 28.0000, description: 'Russian waters entry' },
      { lat: 60.2500, lng: 27.5000 },
      { lat: 60.0000, lng: 27.0000 },
      
      // Finnish EEZ
      { lat: 59.9000, lng: 26.5000, description: 'Finnish EEZ' },
      { lat: 59.7500, lng: 26.0000 },
      { lat: 59.6000, lng: 25.5000 },
      { lat: 59.4500, lng: 25.0000 },
      { lat: 59.3000, lng: 24.5000 },
      { lat: 59.1500, lng: 24.0000 },
      { lat: 59.0000, lng: 23.5000 },
      
      // Swedish EEZ (longest section)
      { lat: 58.8500, lng: 23.0000, description: 'Swedish EEZ entry' },
      { lat: 58.7000, lng: 22.5000 },
      { lat: 58.5500, lng: 22.0000 },
      { lat: 58.4000, lng: 21.5000 },
      { lat: 58.2500, lng: 21.0000 },
      { lat: 58.1000, lng: 20.5000 },
      { lat: 57.9500, lng: 20.0000 },
      { lat: 57.8000, lng: 19.5000 },
      { lat: 57.6500, lng: 19.0000 },
      { lat: 57.5000, lng: 18.5000 },
      { lat: 57.3500, lng: 18.0000, description: 'Gotland passage' },
      { lat: 57.2000, lng: 17.5000 },
      { lat: 57.0500, lng: 17.0000 },
      { lat: 56.9000, lng: 16.5000 },
      { lat: 56.7500, lng: 16.0000 },
      { lat: 56.6000, lng: 15.5000 },
      { lat: 56.4500, lng: 15.0000 },
      { lat: 56.3000, lng: 14.5000 },
      
      // Danish waters (Bornholm area)
      { lat: 56.1500, lng: 14.0000, description: 'Danish waters entry' },
      { lat: 56.0000, lng: 13.8000 },
      { lat: 55.8500, lng: 13.6000 },
      { lat: 55.7000, lng: 13.4000 },
      { lat: 55.5500, lng: 13.2000 },
      
      // Explosion site area (September 2022)
      { lat: 55.5400, lng: 15.7000, description: 'NS1 Explosion Site (26 Sept 2022)', type: 'explosion' },
      
      // German waters approach
      { lat: 55.4000, lng: 13.0000, description: 'German EEZ entry' },
      { lat: 55.2500, lng: 12.8000 },
      { lat: 55.1000, lng: 12.6000 },
      { lat: 54.9500, lng: 12.4000 },
      { lat: 54.8000, lng: 12.2000 },
      { lat: 54.6500, lng: 12.0000 },
      { lat: 54.5000, lng: 11.8000 },
      { lat: 54.3500, lng: 11.6000 },
      { lat: 54.2000, lng: 11.4000, description: 'German territorial waters' },
      
      // Landing point - Lubmin, Germany
      { lat: 54.1426, lng: 13.6776, description: 'Lubmin Terminal, Germany', type: 'terminal' }
    ],
    metadata: {
      length: '1,224 km',
      diameter: '1.153 m',
      capacity: '27.5 BCM/year per line',
      operator: 'Nord Stream AG',
      startPoint: 'Vyborg, Russia',
      endPoint: 'Lubmin, Germany',
      constructionYear: '2010-2011',
      status: 'damaged'
    }
  },
  {
    id: 'nord-stream-2',
    name: 'Nord Stream 2',
    coordinates: [
      // Starting point - Ust-Luga, Russia
      { lat: 59.6784, lng: 28.3967, description: 'Ust-Luga Compressor Station', type: 'compressor' },
      
      // Russian territorial waters
      { lat: 59.6000, lng: 28.2000, description: 'Russian waters entry' },
      { lat: 59.5000, lng: 28.0000 },
      { lat: 59.4000, lng: 27.8000 },
      { lat: 59.3000, lng: 27.6000 },
      
      // Following similar but slightly southern route
      { lat: 59.2000, lng: 27.4000, description: 'Finnish EEZ' },
      { lat: 59.1000, lng: 27.2000 },
      { lat: 59.0000, lng: 27.0000 },
      { lat: 58.9000, lng: 26.8000 },
      { lat: 58.8000, lng: 26.6000 },
      { lat: 58.7000, lng: 26.4000 },
      { lat: 58.6000, lng: 26.2000 },
      { lat: 58.5000, lng: 26.0000 },
      
      // Swedish EEZ
      { lat: 58.4000, lng: 25.5000, description: 'Swedish EEZ' },
      { lat: 58.3000, lng: 25.0000 },
      { lat: 58.2000, lng: 24.5000 },
      { lat: 58.1000, lng: 24.0000 },
      { lat: 58.0000, lng: 23.5000 },
      { lat: 57.9000, lng: 23.0000 },
      { lat: 57.8000, lng: 22.5000 },
      { lat: 57.7000, lng: 22.0000 },
      { lat: 57.6000, lng: 21.5000 },
      { lat: 57.5000, lng: 21.0000 },
      { lat: 57.4000, lng: 20.5000 },
      { lat: 57.3000, lng: 20.0000 },
      { lat: 57.2000, lng: 19.5000 },
      { lat: 57.1000, lng: 19.0000, description: 'South of Gotland' },
      { lat: 57.0000, lng: 18.5000 },
      { lat: 56.9000, lng: 18.0000 },
      { lat: 56.8000, lng: 17.5000 },
      { lat: 56.7000, lng: 17.0000 },
      { lat: 56.6000, lng: 16.5000 },
      { lat: 56.5000, lng: 16.0000 },
      { lat: 56.4000, lng: 15.5000 },
      { lat: 56.3000, lng: 15.0000 },
      { lat: 56.2000, lng: 14.5000 },
      
      // Danish waters
      { lat: 56.1000, lng: 14.0000, description: 'Danish waters' },
      { lat: 56.0000, lng: 13.8000 },
      { lat: 55.9000, lng: 13.6000 },
      { lat: 55.8000, lng: 13.4000 },
      { lat: 55.7000, lng: 13.2000 },
      { lat: 55.6000, lng: 13.0000 },
      
      // NS2 Explosion sites
      { lat: 55.5300, lng: 15.4200, description: 'NS2-A Explosion Site', type: 'explosion' },
      { lat: 55.5200, lng: 15.7900, description: 'NS2-B Explosion Site', type: 'explosion' },
      
      // German approach
      { lat: 55.4000, lng: 12.8000, description: 'German EEZ' },
      { lat: 55.2000, lng: 12.6000 },
      { lat: 55.0000, lng: 12.4000 },
      { lat: 54.8000, lng: 12.2000 },
      { lat: 54.6000, lng: 12.0000 },
      { lat: 54.4000, lng: 11.8000 },
      { lat: 54.2000, lng: 11.6000 },
      
      // Landing point - Lubmin, Germany (same as NS1)
      { lat: 54.1426, lng: 13.6776, description: 'Lubmin Terminal, Germany', type: 'terminal' }
    ],
    metadata: {
      length: '1,234 km',
      diameter: '1.153 m',
      capacity: '27.5 BCM/year per line',
      operator: 'Nord Stream 2 AG',
      startPoint: 'Ust-Luga, Russia',
      endPoint: 'Lubmin, Germany',
      constructionYear: '2018-2021',
      status: 'damaged'
    }
  }
];

export const EXPLOSION_SITES = [
  {
    id: 'ns1-explosion',
    position: [55.5400, 15.7000] as [number, number],
    pipeline: 'Nord Stream 1',
    date: '2022-09-26T02:03:24Z',
    seismicMagnitude: 2.3,
    depth: 70,
    description: 'First explosion detected by seismic stations'
  },
  {
    id: 'ns2a-explosion',
    position: [55.5300, 15.4200] as [number, number],
    pipeline: 'Nord Stream 2 Line A',
    date: '2022-09-26T00:03:00Z',
    seismicMagnitude: 1.9,
    depth: 80,
    description: 'Explosion on NS2 Line A'
  },
  {
    id: 'ns2b-explosion',
    position: [55.5200, 15.7900] as [number, number],
    pipeline: 'Nord Stream 2 Line B',
    date: '2022-09-26T17:03:50Z',
    seismicMagnitude: 2.3,
    depth: 70,
    description: 'Second major explosion'
  }
];

// OpenStreetMap relation IDs for Nord Stream pipelines
export const OSM_RELATIONS = {
  NORD_STREAM_1: '2006544',
  NORD_STREAM_2: '16489915'
};

export async function fetchOpenStreetMapData(relationId: string): Promise<any> {
  try {
    // Use Overpass API which is more reliable for complex queries
    const overpassQuery = `
      [out:json][timeout:25];
      (
        relation(${relationId});
      );
      out geom;
    `;
    
    const response = await fetch(
      'https://overpass-api.de/api/interpreter',
      {
        method: 'POST',
        body: overpassQuery,
        headers: {
          'Content-Type': 'text/plain'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch OSM data: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching OpenStreetMap data:', error);
    // Fallback to direct API
    try {
      const fallbackResponse = await fetch(
        `https://api.openstreetmap.org/api/0.6/relation/${relationId}/full.json`
      );
      
      if (fallbackResponse.ok) {
        return await fallbackResponse.json();
      }
    } catch (fallbackError) {
      console.error('Fallback API also failed:', fallbackError);
    }
    return null;
  }
}

export function extractCoordinatesFromOSM(osmData: any): PipelineCoordinate[] {
  if (!osmData || !osmData.elements) return [];
  
  // Collect all way geometries separately
  const waySegments: PipelineCoordinate[][] = [];
  
  osmData.elements.forEach((element: any) => {
    if (element.type === 'relation') {
      console.log(`Processing relation ${element.id} with ${element.members?.length} members`);
      // Process relation members
      if (element.members) {
        element.members.forEach((member: any, index: number) => {
          if (member.type === 'way' && member.geometry) {
            console.log(`Member ${index}: way with ${member.geometry.length} points`);
            const wayCoords: PipelineCoordinate[] = [];
            member.geometry.forEach((point: any) => {
              if (point.lat && point.lon) {
                wayCoords.push({
                  lat: point.lat,
                  lng: point.lon
                });
              }
            });
            if (wayCoords.length > 0) {
              waySegments.push(wayCoords);
            }
          }
        });
      }
    }
  });
  
  console.log(`Found ${waySegments.length} way segments`);
  
  if (waySegments.length === 0) return [];
  
  // Simple approach: concatenate all segments into one continuous path
  // This ensures we get one Polyline instead of multiple separate lines
  console.log('Concatenating all way segments into single pipeline path...');
  
  const allCoordinates: PipelineCoordinate[] = [];
  waySegments.forEach((segment, index) => {
    console.log(`Adding segment ${index} with ${segment.length} points`);
    allCoordinates.push(...segment);
  });
  
  console.log(`Final path has ${allCoordinates.length} total coordinates`);
  return allCoordinates;
}

// Helper function to check if two points are close (within ~100 meters)
function arePointsClose(point1: PipelineCoordinate, point2: PipelineCoordinate): boolean {
  const latDiff = Math.abs(point1.lat - point2.lat);
  const lngDiff = Math.abs(point1.lng - point2.lng);
  
  // Rough approximation: 0.001 degrees ≈ 100 meters
  return latDiff < 0.001 && lngDiff < 0.001;
}

// Function to fetch Nord Stream pipeline coordinates from OSM
export async function fetchNordStreamCoordinates(): Promise<{
  ns1: PipelineCoordinate[];
  ns2: PipelineCoordinate[];
}> {
  const result = { ns1: [], ns2: [] };
  
  try {
    // Fetch only Nord Stream 1 data for clean single pipeline visualization
    const ns1Data = await fetchOpenStreetMapData(OSM_RELATIONS.NORD_STREAM_1);
    if (ns1Data) {
      result.ns1 = extractCoordinatesFromOSM(ns1Data);
      console.log(`Fetched ${result.ns1.length} coordinates for Nord Stream 1`);
    }
    
    // Skip NS2 to avoid multiple overlapping pipelines
    // const ns2Data = await fetchOpenStreetMapData(OSM_RELATIONS.NORD_STREAM_2);
    // if (ns2Data) {
    //   result.ns2 = extractCoordinatesFromOSM(ns2Data);
    //   console.log(`Fetched ${result.ns2.length} coordinates for Nord Stream 2`);
    // }
  } catch (error) {
    console.error('Error fetching Nord Stream coordinates:', error);
  }
  
  return result;
}