'use client';

import { useEffect, useState } from 'react';
import { Circle, Polygon, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

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
    markers: { location: [number, number]; data: any; icon: string }[];
  };
}

interface NewsStoryOverlayProps {
  story: NewsStory;
  enabled: boolean;
  timelinePosition?: number; // 0-100 for timeline scrubbing
}

export default function NewsStoryOverlay({ story, enabled, timelinePosition = 100 }: NewsStoryOverlayProps) {
  const [visualization, setVisualization] = useState<StoryVisualization | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const map = useMap();

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
    } else if (story.content.toLowerCase().includes('ukraine') || story.content.toLowerCase().includes('war')) {
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
        {
          from: [60.1699, 27.7172], // Vyborg, Russia
          to: [54.0776, 13.0878], // Greifswald, Germany
          type: 'supply',
          strength: 0, // Disrupted
          bidirectional: false
        },
        {
          from: [62.4720, 5.9301], // Norway
          to: [52.1326, 5.2913], // Netherlands
          type: 'supply',
          strength: 1, // Increased capacity
          bidirectional: false
        }
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
      }
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
      }
    };
  };

  const generateUkraineVisualization = (): StoryVisualization => {
    return {
      primaryLocation: {
        name: 'Ukraine',
        coordinates: [48.3794, 31.1656],
        type: 'country',
        confidence: 0.95,
        context: 'Conflict zone'
      },
      impactZones: {
        immediate: { 
          center: [48.3794, 31.1656], 
          radius: 500000, // 500km impact zone
          severity: 'high' 
        },
        secondary: [
          { 
            areas: [
              [[44.0, 20.0], [44.0, 40.0], [60.0, 40.0], [60.0, 20.0], [44.0, 20.0]] // Eastern Europe
            ], 
            type: 'Refugee crisis region' 
          }
        ],
        economic: [
          { 
            regions: [
              [[35.0, -10.0], [35.0, 50.0], [70.0, 50.0], [70.0, -10.0], [35.0, -10.0]] // Europe
            ], 
            impact: 40 // 40% energy supply disruption
          }
        ]
      },
      connections: [
        {
          from: [50.4501, 30.5234], // Kyiv
          to: [52.2297, 21.0122], // Warsaw (refugee flow)
          type: 'information',
          strength: 0.9,
          bidirectional: false
        },
        {
          from: [55.7558, 37.6173], // Moscow
          to: [48.3794, 31.1656], // Ukraine center
          type: 'political',
          strength: 1.0,
          bidirectional: false
        }
      ],
      timeline: [
        {
          timestamp: new Date('2022-02-24T05:00:00Z'),
          location: [50.4501, 30.5234],
          event: 'Conflict begins',
          impact: 80
        }
      ],
      dataOverlays: {
        heatmaps: [
          {
            points: [
              [50.4501, 30.5234, 95], // Kyiv
              [49.9935, 36.2304, 90], // Kharkiv
              [46.4825, 30.7233, 85]  // Odesa
            ],
            type: 'Conflict intensity'
          }
        ],
        markers: []
      }
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
      dataOverlays: { heatmaps: [], markers: [] }
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

  return (
    <>
      {/* Primary impact zone */}
      {visualization.impactZones.immediate && (
        <Circle
          center={visualization.impactZones.immediate.center}
          radius={visualization.impactZones.immediate.radius}
          pathOptions={{
            color: visualization.impactZones.immediate.severity === 'high' ? '#FF0000' :
                   visualization.impactZones.immediate.severity === 'medium' ? '#FF8800' : '#FFAA00',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.1
          }}
        />
      )}

      {/* Secondary impact areas */}
      {visualization.impactZones.secondary.map((zone, index) => 
        zone.areas.map((area, areaIndex) => (
          <Polygon
            key={`secondary-${index}-${areaIndex}`}
            positions={area}
            pathOptions={{
              color: '#0066CC',
              weight: 2,
              opacity: 0.6,
              fillOpacity: 0.05,
              dashArray: '10, 10'
            }}
          >
            <Popup>
              <div>
                <strong>{zone.type}</strong>
              </div>
            </Popup>
          </Polygon>
        ))
      )}

      {/* Economic impact zones */}
      {visualization.impactZones.economic.map((zone, index) => 
        zone.regions.map((region, regionIndex) => (
          <Polygon
            key={`economic-${index}-${regionIndex}`}
            positions={region}
            pathOptions={{
              color: '#FF6600',
              weight: 1,
              opacity: 0.7,
              fillOpacity: zone.impact / 100 * 0.3,
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

      {/* Connection lines */}
      {visualization.connections.map((connection, index) => (
        <Polyline
          key={`connection-${index}`}
          positions={[connection.from, connection.to]}
          pathOptions={{
            color: connection.type === 'supply' ? '#00AA00' :
                   connection.type === 'financial' ? '#AA0000' :
                   connection.type === 'political' ? '#0000AA' : '#AAAAAA',
            weight: Math.max(1, connection.strength * 4),
            opacity: connection.strength,
            dashArray: connection.strength === 0 ? '10, 10' : undefined
          }}
        >
          <Popup>
            <div>
              <strong>{connection.type.charAt(0).toUpperCase() + connection.type.slice(1)} Connection</strong><br/>
              Strength: {Math.round(connection.strength * 100)}%
            </div>
          </Popup>
        </Polyline>
      ))}

      {/* Timeline event markers */}
      {activeTimelineEvents.map((event, index) => (
        <Circle
          key={`timeline-${index}`}
          center={event.location}
          radius={event.impact * 1000}
          pathOptions={{
            color: '#FF0000',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.3
          }}
        >
          <Popup>
            <div>
              <strong>{event.event}</strong><br/>
              Time: {event.timestamp.toLocaleString()}<br/>
              Impact: {event.impact}%
            </div>
          </Popup>
        </Circle>
      ))}

      {/* Data markers */}
      {visualization.dataOverlays.markers.map((marker, index) => (
        <Marker
          key={`marker-${index}`}
          position={marker.location}
        >
          <Popup>
            <div>
              <strong>Event Data</strong><br/>
              {Object.entries(marker.data).map(([key, value]) => (
                <div key={key}>{key}: {value}</div>
              ))}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Primary location marker */}
      <Marker position={visualization.primaryLocation.coordinates}>
        <Popup>
          <div>
            <strong>{visualization.primaryLocation.name}</strong><br/>
            Type: {visualization.primaryLocation.type}<br/>
            Context: {visualization.primaryLocation.context}<br/>
            Confidence: {Math.round(visualization.primaryLocation.confidence * 100)}%
          </div>
        </Popup>
      </Marker>
    </>
  );
}