'use client';

import { useEffect, useState } from 'react';
import { Circle, Polygon, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { OSMBoundaryService, UKRAINE_FRONTLINE, UKRAINE_OBLASTS } from '@/lib/osmBoundaries';

// Types for news story analysis
interface NewsStory {
  id: string;
  headline: string;
  content: string;
  publishedAt: Date;
  source: string;
}

interface GeographicEntity {
  name: string;
  coordinates: [number, number];
  type: 'country' | 'city' | 'region' | 'landmark' | 'facility';
  confidence: number;
  context: string; // Why this location is relevant
}

interface StoryVisualization {
  primaryLocation: GeographicEntity;
  impactZones: {
    immediate: { center: [number, number]; radius: number; severity: 'low' | 'medium' | 'high' };
    secondary: { areas: [number, number][][]; type: string }[];
    economic: { regions: [number, number][][]; impact: number }[];
  };
  connections: {
    from: [number, number];
    to: [number, number];
    type: 'supply' | 'financial' | 'political' | 'information';
    strength: number;
    bidirectional?: boolean;
  }[];
  timeline: {
    timestamp: Date;
    location: [number, number];
    event: string;
    impact: number;
  }[];
  dataOverlays: {
    heatmaps: { points: [number, number, number][]; type: string }[];
    markers: { location: [number, number]; data: Record<string, unknown>; icon: string }[];
  };
  frontlines?: {
    coordinates: [number, number][];
    type: 'active_frontline' | 'ceasefire_line' | 'disputed_border';
    lastUpdated: Date;
    confidence: number;
  }[];
  areaControl?: {
    name: string;
    areas: [number, number][][];
    controlledBy: 'ukraine' | 'russia' | 'contested' | 'neutral';
    confidence: number;
  }[];
}

interface NewsStoryOverlayProps {
  story: NewsStory;
  enabled: boolean;
  timelinePosition?: number; // 0-100 for timeline scrubbing
}

export default function NewsStoryOverlay({ story, enabled, timelinePosition = 100 }: NewsStoryOverlayProps) {
  const [visualization, setVisualization] = useState<StoryVisualization | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [realBoundaries, setRealBoundaries] = useState<Array<{
    geometry: GeoJSON.Geometry;
    controlStatus: {
      name: string;
      osmId: string;
      controlledBy: 'ukraine' | 'russia' | 'contested';
      confidence: number;
      lastUpdated: string;
    };
  }>>([]);
  const [boundariesLoading, setBoundariesLoading] = useState(false);
  const map = useMap();

  // Load real OSM boundaries for Ukraine
  const loadRealBoundaries = async () => {
    if (boundariesLoading || realBoundaries.length > 0) return;
    
    setBoundariesLoading(true);
    try {
      const boundaries = await OSMBoundaryService.getUkrainianOblasts();
      setRealBoundaries(boundaries);
    } catch (error) {
      console.warn('Failed to load real boundaries:', error);
    } finally {
      setBoundariesLoading(false);
    }
  };

  // Mock story analyzer - in real implementation this would call AI service
  const analyzeStory = async (story: NewsStory): Promise<StoryVisualization> => {
    setIsAnalyzing(true);
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock analysis based on story content
    if (story.headline.toLowerCase().includes('pipeline') || story.content.toLowerCase().includes('nord stream')) {
      return generateNordStreamVisualization();
    } else if (story.headline.toLowerCase().includes('bank') || story.content.toLowerCase().includes('silicon valley bank')) {
      return generateSVBVisualization();
    } else if (story.content.toLowerCase().includes('ukraine') || story.content.toLowerCase().includes('war') || story.content.toLowerCase().includes('russia')) {
      return generateUkraineVisualization();
    } else {
      return generateGenericVisualization(story);
    }
  };

  const generateNordStreamVisualization = (): StoryVisualization => {
    return {
      primaryLocation: {
        name: 'Nord Stream Pipeline',
        coordinates: [55.4, 15.6],
        type: 'facility',
        confidence: 0.95,
        context: 'Pipeline explosion site'
      },
      impactZones: {
        immediate: { 
          center: [55.4, 15.6], 
          radius: 50000, // 50km exclusion zone
          severity: 'high' 
        },
        secondary: [
          { 
            areas: [
              [[54.5, 10.0], [54.5, 15.0], [56.0, 15.0], [56.0, 10.0], [54.5, 10.0]] // Baltic Sea area
            ], 
            type: 'Environmental impact zone' 
          }
        ],
        economic: [
          { 
            regions: [
              [[45.0, 5.0], [45.0, 15.0], [55.0, 15.0], [55.0, 5.0], [45.0, 5.0]] // Central Europe
            ], 
            impact: 85 // 85% gas supply disruption
          }
        ]
      },
      connections: [
        // All pipeline connections removed - now handled by ProperNewsOverlay with accurate OpenStreetMap data
      ],
      timeline: [
        {
          timestamp: new Date('2022-09-26T02:03:00Z'),
          location: [55.5163, 15.4738],
          event: 'NS1 Pipeline explosion',
          impact: 90
        },
        {
          timestamp: new Date('2022-09-26T19:03:00Z'),
          location: [55.3259, 15.6437],
          event: 'NS2 Pipeline explosion',
          impact: 95
        }
      ],
      dataOverlays: {
        heatmaps: [
          {
            points: [
              [51.1657, 10.4515, 55], // Germany - 55% gas import loss
              [51.9194, 19.1344, 12], // Poland - 12% import loss
              [52.1326, 5.2913, 8]   // Netherlands - 8% import loss
            ],
            type: 'Gas supply disruption'
          }
        ],
        markers: [
          {
            location: [55.5163, 15.4738],
            data: { depth: '70m', damage: 'Complete rupture', gasLeak: 'Active' },
            icon: 'explosion'
          }
        ]
      },
      frontlines: [],
      areaControl: []
    };
  };

  const generateSVBVisualization = (): StoryVisualization => {
    return {
      primaryLocation: {
        name: 'Silicon Valley Bank HQ',
        coordinates: [37.4419, -122.1430],
        type: 'facility',
        confidence: 0.98,
        context: 'Bank headquarters and epicenter of collapse'
      },
      impactZones: {
        immediate: { 
          center: [37.4419, -122.1430], 
          radius: 80000, // 80km radius covering Bay Area
          severity: 'high' 
        },
        secondary: [
          { 
            areas: [
              [[32.0, -125.0], [32.0, -114.0], [42.0, -114.0], [42.0, -125.0], [32.0, -125.0]] // California
            ], 
            type: 'Tech ecosystem disruption' 
          },
          { 
            areas: [
              [[41.0, -73.0], [41.0, -69.0], [43.0, -69.0], [43.0, -73.0], [41.0, -73.0]] // Boston area
            ], 
            type: 'Secondary tech hub impact' 
          }
        ],
        economic: [
          { 
            regions: [
              [[37.0, -123.0], [37.0, -121.5], [38.0, -121.5], [38.0, -123.0], [37.0, -123.0]] // Bay Area
            ], 
            impact: 75 // 75% of local startup funding affected
          }
        ]
      },
      connections: [
        {
          from: [37.4419, -122.1430], // SVB HQ
          to: [40.7128, -74.0060], // Signature Bank NYC
          type: 'financial',
          strength: 0.8, // Contagion effect
          bidirectional: false
        },
        {
          from: [37.4419, -122.1430], // SVB
          to: [47.3769, 8.5417], // Credit Suisse, Switzerland
          type: 'financial',
          strength: 0.6,
          bidirectional: false
        }
      ],
      timeline: [
        {
          timestamp: new Date('2023-03-08T09:00:00Z'),
          location: [37.4419, -122.1430],
          event: 'Initial bank run begins',
          impact: 20
        },
        {
          timestamp: new Date('2023-03-09T17:00:00Z'),
          location: [37.4419, -122.1430],
          event: 'Bank closure announced',
          impact: 100
        }
      ],
      dataOverlays: {
        heatmaps: [
          {
            points: [
              [37.4419, -122.1430, 100], // SVB epicenter
              [37.7749, -122.4194, 85],  // SF impact
              [42.3601, -71.0589, 45],   // Boston impact
              [47.6062, -122.3321, 25]   // Seattle impact
            ],
            type: 'Startup funding disruption'
          }
        ],
        markers: [
          {
            location: [37.4419, -122.1430],
            data: { 
              deposits: '$175B', 
              clientsAffected: '3,200 companies',
              withdrawalsDay1: '$42B'
            },
            icon: 'bank'
          }
        ]
      },
      frontlines: [],
      areaControl: []
    };
  };

  const generateUkraineVisualization = (): StoryVisualization => {
    // Trigger loading of real boundaries
    loadRealBoundaries();

    // Real frontline coordinates based on ISW reports
    const frontlineCoordinates: [number, number][] = UKRAINE_FRONTLINE.map(point => [point.lat, point.lng]);
    
    // Key cities with real conflict status
    const keyCities = [
      { location: [50.4501, 30.5234], name: 'Kyiv', status: 'Ukrainian controlled', population: '2.8M', strategic: 'Capital' },
      { location: [49.9935, 36.2304], name: 'Kharkiv', status: 'Ukrainian controlled', population: '1.4M', strategic: 'Regional center' },
      { location: [46.6354, 32.6169], name: 'Kherson', status: 'Ukrainian controlled (liberated)', population: '280k', strategic: 'Dnipro crossing' },
      { location: [46.4825, 30.7233], name: 'Odesa', status: 'Ukrainian controlled', population: '1M', strategic: 'Major port' },
      { location: [48.0159, 37.8029], name: 'Donetsk', status: 'Russian occupied', population: '900k', strategic: 'Regional center' },
      { location: [48.5683, 38.2003], name: 'Bakhmut', status: 'Contested/Russian', population: '70k', strategic: 'Transport hub' }
    ];

    // Create area control based on real oblast data
    const ukrainianControlledAreas = UKRAINE_OBLASTS
      .filter(oblast => oblast.controlledBy === 'ukraine')
      .map(oblast => oblast.name);

    const russianControlledAreas = UKRAINE_OBLASTS
      .filter(oblast => oblast.controlledBy === 'russia')
      .map(oblast => oblast.name);

    return {
      primaryLocation: {
        name: 'Ukraine Conflict',
        coordinates: [49.0, 32.0], // Geographic center of Ukraine
        type: 'country',
        confidence: 0.98,
        context: 'Real administrative boundaries and frontline positions'
      },
      impactZones: {
        immediate: { center: [49.0, 32.0], radius: 500000, severity: 'high' },
        secondary: [],
        economic: []
      },
      connections: [],
      timeline: [
        { timestamp: new Date('2022-02-24'), location: [49.0, 32.0], event: 'Conflict begins', impact: 100 }
      ],
      dataOverlays: {
        heatmaps: [
          {
            points: UKRAINE_FRONTLINE.map(point => [point.lat, point.lng, 95] as [number, number, number]),
            type: 'Frontline intensity'
          }
        ],
        markers: keyCities.map(city => ({
          location: city.location as [number, number],
          data: {
            status: city.status,
            population: city.population,
            strategic: city.strategic
          },
          icon: city.status.includes('controlled') ? 'city' : 'contested'
        }))
      },
      frontlines: [
        {
          coordinates: frontlineCoordinates,
          type: 'active_frontline' as const,
          lastUpdated: new Date('2024-01-15'),
          confidence: 0.85
        }
      ],
      areaControl: [] // Will be populated with real OSM boundaries when they load
    };
  };

  const generateGenericVisualization = (story: NewsStory): StoryVisualization => {
    // Generic fallback visualization
    return {
      primaryLocation: {
        name: 'Global Impact',
        coordinates: [40.0, 0.0],
        type: 'region',
        confidence: 0.5,
        context: 'General geographic relevance'
      },
      impactZones: {
        immediate: { center: [40.0, 0.0], radius: 1000000, severity: 'medium' },
        secondary: [],
        economic: []
      },
      connections: [],
      timeline: [],
      dataOverlays: { heatmaps: [], markers: [] },
      frontlines: [],
      areaControl: []
    };
  };

  useEffect(() => {
    if (enabled && story) {
      analyzeStory(story).then(result => {
        setVisualization(result);
        setIsAnalyzing(false);
        
        // Auto-zoom to primary location
        if (result.primaryLocation) {
          map.setView(result.primaryLocation.coordinates, 6);
        }
      });
    } else {
      setVisualization(null);
    }
  }, [story, enabled, map]);

  if (!enabled || !visualization) return null;

  // Filter timeline events based on timelinePosition
  const currentTimestamp = visualization.timeline.length > 0 ? 
    new Date(visualization.timeline[0].timestamp.getTime() + 
    (timelinePosition / 100) * (Date.now() - visualization.timeline[0].timestamp.getTime())) : 
    new Date();

  const activeTimelineEvents = visualization.timeline.filter(event => 
    event.timestamp <= currentTimestamp
  );

  // Render based on story type
  if (story.content.toLowerCase().includes('ukraine') || story.content.toLowerCase().includes('russia')) {
    return (
      <>
        {/* UKRAINE VISUALIZATION - Real OSM Boundaries */}
        
        {/* 1. Real OSM Administrative Boundaries with Control Status */}
        {realBoundaries.map((boundary, index) => {
          if (!boundary.geometry || !boundary.controlStatus) return null;
          
          const controlStatus = boundary.controlStatus;
          const isUkrainian = controlStatus.controlledBy === 'ukraine';
          
          return (
            <Polygon
              key={`oblast-${index}`}
              positions={boundary.geometry.type === 'Polygon' 
                ? (boundary.geometry.coordinates as number[][][]).map(ring => 
                    ring.map(coord => [coord[1], coord[0]]) // GeoJSON is [lng, lat], Leaflet needs [lat, lng]
                  )
                : []
              }
              pathOptions={{
                color: isUkrainian ? '#0057B7' : '#D52B1E', // Ukrainian blue vs Russian red
                weight: 2,
                opacity: 0.7,
                fillOpacity: Math.max(0.1, (1 - controlStatus.confidence) * 0.3), // Less confident = more transparent
                fillColor: isUkrainian ? '#0057B7' : '#D52B1E'
              }}
            >
              <Popup>
                <div>
                  <strong>{controlStatus.name}</strong><br/>
                  Control: {isUkrainian ? 'Ukrainian Government' : 'Russian Forces'}<br/>
                  Confidence: {Math.round(controlStatus.confidence * 100)}%<br/>
                  <small>Last updated: {controlStatus.lastUpdated}</small>
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* Loading indicator for boundaries */}
        {boundariesLoading && (
          <div className="absolute top-20 right-4 z-[1001] bg-white/90 dark:bg-gray-800/90 px-3 py-2 rounded-md">
            <div className="text-sm">Loading real administrative boundaries...</div>
          </div>
        )}

        {/* 2. Active Frontline - Bold and Clear */}
        {visualization.frontlines?.map((frontline, index) => (
          <Polyline
            key={`frontline-${index}`}
            positions={frontline.coordinates}
            pathOptions={{
              color: '#FF0000',
              weight: 4,
              opacity: 1.0
            }}
          >
            <Popup>
              <div>
                <strong>Active Frontline</strong><br/>
                Last Updated: Jan 15, 2024<br/>
                <small>Current battle positions</small>
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* 3. Key Cities Only - Major Strategic Points */}
        {visualization.dataOverlays.markers
          .filter(marker => ['capital', 'city', 'port'].includes(marker.icon))
          .map((marker, index) => (
            <Marker
              key={`key-city-${index}`}
              position={marker.location}
            >
              <Popup>
                <div>
                  <strong>Strategic Location</strong><br/>
                  Status: {marker.data.status}<br/>
                  Population: {marker.data.population}<br/>
                  {marker.data.strategic && <div>Role: {marker.data.strategic}</div>}
                </div>
              </Popup>
            </Marker>
        ))}
      </>
    );
  }

  // For OTHER STORIES (Nord Stream, SVB, etc.) - Use Standard Visualization
  return (
    <>
      {/* Standard story visualization for non-Ukraine stories */}
      
      {/* Primary impact zone */}
      {visualization.impactZones.immediate && (
        <Circle
          center={visualization.impactZones.immediate.center}
          radius={visualization.impactZones.immediate.radius}
          pathOptions={{
            color: visualization.impactZones.immediate.severity === 'high' ? '#FF0000' :
                   visualization.impactZones.immediate.severity === 'medium' ? '#FF8800' : '#FFAA00',
            weight: 2,
            opacity: 0.7,
            fillOpacity: 0.1
          }}
        >
          <Popup>
            <div>
              <strong>Primary Impact Zone</strong><br/>
              Severity: {visualization.impactZones.immediate.severity}
            </div>
          </Popup>
        </Circle>
      )}

      {/* Connection lines - DISABLED: Using accurate OpenStreetMap pipeline data in ProperNewsOverlay instead */}

      {/* Data markers */}
      {visualization.dataOverlays.markers.map((marker, index) => (
        <Marker
          key={`marker-${index}`}
          position={marker.location}
        >
          <Popup>
            <div>
              <strong>{marker.icon === 'explosion' ? 'Incident Location' : 'Key Location'}</strong><br/>
              {Object.entries(marker.data).map(([key, value]) => (
                <div key={key}>{key}: {String(value)}</div>
              ))}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Economic impact zones for banking stories */}
      {visualization.impactZones.economic.map((zone, index) => 
        zone.regions.map((region, regionIndex) => (
          <Polygon
            key={`economic-${index}-${regionIndex}`}
            positions={region}
            pathOptions={{
              color: '#FF6600',
              weight: 1,
              opacity: 0.6,
              fillOpacity: zone.impact / 100 * 0.2,
              dashArray: '5, 5'
            }}
          >
            <Popup>
              <div>
                <strong>Economic Impact</strong><br/>
                Impact Level: {zone.impact}%
              </div>
            </Popup>
          </Polygon>
        ))
      )}

      {/* Primary location marker */}
      <Marker position={visualization.primaryLocation.coordinates}>
        <Popup>
          <div>
            <strong>{visualization.primaryLocation.name}</strong><br/>
            Type: {visualization.primaryLocation.type}<br/>
            Context: {visualization.primaryLocation.context}
          </div>
        </Popup>
      </Marker>
    </>
  );
}