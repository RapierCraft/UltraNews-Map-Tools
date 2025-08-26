'use client';

import { useEffect, useState } from 'react';
import { Polyline, Popup, useMap } from 'react-leaflet';
import ProfessionalMarker from './ProfessionalMarker';
import { 
  Factory, 
  Zap, 
  Building2, 
  AlertTriangle, 
  DollarSign, 
  Users,
  Target,
  Shield,
  Home,
  Plane,
  ExternalLink
} from 'lucide-react';
import { WikipediaAPI, WIKIPEDIA_TOPICS } from '@/lib/wikipedia';
import FlowLineInfo from './FlowLineInfo';
import { ModalStackProvider } from './ModalStack';
import NewsStoryOverlay from './NewsStoryOverlay';

interface NewsStory {
  id: string;
  headline: string;
  content: string;
  publishedAt: Date;
  source: string;
}

interface POIMarker {
  id: string;
  position: [number, number];
  type: 'explosion' | 'facility' | 'economic' | 'military' | 'infrastructure';
  title: string;
  data: any;
  icon: string;
  color: string;
  priority: number; // Higher = more prominent
  images?: string[];
  wikipediaTopics?: string[];
  wikipediaData?: {
    title: string;
    extract: string;
    images: string[];
    url: string;
  };
}

interface ProperNewsOverlayProps {
  story: NewsStory;
  enabled: boolean;
  timelinePosition: number;
}

// Enhanced global state management to prevent duplicate pipelines
let globalPipelineInstanceId: string | null = null;
let globalPipelineRendered: boolean = false;
let mountedInstances: Set<string> = new Set();

export default function ProperNewsOverlay({ story, enabled, timelinePosition }: ProperNewsOverlayProps) {
  const [poiMarkers, setPOIMarkers] = useState<POIMarker[]>([]);
  const [flowLines, setFlowLines] = useState<any[]>([]);
  const [wikipediaData, setWikipediaData] = useState<{[key: string]: any}>({});
  const [instanceId] = useState(() => Math.random().toString(36).substr(2, 9));
  const map = useMap();

  // Component mount/unmount tracking
  useEffect(() => {
    mountedInstances.add(instanceId);
    console.log(`Instance ${instanceId}: Mounted. Total instances: ${mountedInstances.size}`);
    
    return () => {
      mountedInstances.delete(instanceId);
      if (globalPipelineInstanceId === instanceId) {
        globalPipelineInstanceId = null;
        globalPipelineRendered = false;
        console.log(`Instance ${instanceId}: Released pipeline control on unmount`);
      }
      console.log(`Instance ${instanceId}: Unmounted. Remaining instances: ${mountedInstances.size}`);
    };
  }, [instanceId]);

  useEffect(() => {
    if (!enabled || !story) {
      setFlowLines([]); // Clear lines when disabled
      return;
    }

    // If pipeline already rendered, skip entirely
    if (globalPipelineRendered && globalPipelineInstanceId !== instanceId) {
      console.log(`Instance ${instanceId}: Pipeline already rendered by another instance, skipping`);
      return;
    }

    // Only allow first instance to render pipelines
    if (!globalPipelineInstanceId) {
      globalPipelineInstanceId = instanceId;
      console.log(`Instance ${instanceId}: First instance, taking control of pipeline rendering`);
    } else if (globalPipelineInstanceId !== instanceId) {
      console.log(`Instance ${instanceId}: Another instance ${globalPipelineInstanceId} is active, skipping`);
      return;
    }

    const loadStoryData = async () => {
      let poisData: POIMarker[] = [];

      // Clear any existing flow lines first to prevent duplicates
      setFlowLines([]);
      console.log(`Instance ${instanceId}: Cleared existing flow lines`);

      if (story.id === 'nord-stream' || story.content.toLowerCase().includes('nord stream')) {
        poisData = await generateNordStreamPOIs();
        fetchWikipediaData('nord-stream');
      } else if (story.id === 'svb-collapse' || story.content.toLowerCase().includes('silicon valley bank')) {
        poisData = generateSVBPOIs();
        fetchWikipediaData('svb-collapse');
      } else if (story.id === 'ukraine-conflict' || story.content.toLowerCase().includes('ukraine')) {
        poisData = generateUkrainePOIs();
        fetchWikipediaData('ukraine-conflict');
      }

      // Auto-zoom to fit all POIs with padding
      if (poisData.length > 0) {
        const bounds = L.latLngBounds(poisData.map(poi => poi.position));
        map.fitBounds(bounds, { 
          padding: [50, 50], // Add padding around the bounds
          maxZoom: 10 // Don't zoom in too close
        });
      }
    };

    loadStoryData().catch(error => {
      console.error(`Instance ${componentId}: Error loading story data:`, error);
    });

    // Cleanup function to remove this instance's flow lines
    return () => {
      if (globalPipelineInstanceId === instanceId) {
        console.log(`Instance ${instanceId}: Cleaning up and releasing control...`);
        globalPipelineInstanceId = null;
        setFlowLines([]);
      } else {
        console.log(`Instance ${instanceId}: Cleaning up (was not controlling)...`);
      }
    };
  }, [story, enabled, timelinePosition, map]);

  const fetchWikipediaData = async (storyType: keyof typeof WIKIPEDIA_TOPICS) => {
    const topicsMap = WIKIPEDIA_TOPICS[storyType];
    if (!topicsMap) return;

    const wikiData: {[key: string]: any} = {};
    
    // Fetch all unique topics
    const uniqueTopics = new Set(Object.values(topicsMap));
    
    for (const topic of uniqueTopics) {
      try {
        const data = await WikipediaAPI.getPageSummary(topic);
        if (data) {
          wikiData[topic] = data;
        }
      } catch (error) {
        console.error(`Error fetching Wikipedia data for ${topic}:`, error);
      }
    }
    
    setWikipediaData(wikiData);
  };

  const generateNordStreamPOIs = async (): Promise<POIMarker[]> => {
    const poisData: POIMarker[] = [
      // Explosion Sites - HIGH PRIORITY
      {
        id: 'ns1-explosion',
        position: [55.5163, 15.4738],
        type: 'explosion',
        title: 'NS1 Pipeline Explosion',
        icon: 'explosion',
        color: '#FF0000',
        priority: 10,
        data: {
          time: 'September 26, 2022 - 02:03 UTC',
          seismicMagnitude: '2.3 Richter',
          gasLeaked: '115,000 tonnes methane',
          waterDepth: '70 meters',
          exclusionZone: '5 nautical miles',
          investigationStatus: 'International investigation ongoing',
          environmentalImpact: 'Largest methane leak in history',
          coordinates: '55°30\'59"N 15°28\'27"E'
        },
        wikipediaTopics: ['Nord Stream', 'Methane emissions']
      },
      {
        id: 'ns2-explosion',
        position: [55.3259, 15.6437],
        type: 'explosion', 
        title: 'NS2 Pipeline Explosion',
        icon: 'explosion',
        color: '#FF0000',
        priority: 10,
        data: {
          time: 'September 26, 2022 - 19:03 UTC',
          seismicMagnitude: '2.1 Richter',
          gasLeaked: '95,000 tonnes methane',
          waterDepth: '70 meters',
          timeDifference: '17 hours after first blast'
        },
        wikipediaTopics: ['Nord Stream', 'Baltic Sea']
      },

      // Critical Infrastructure
      {
        id: 'vyborg-station',
        position: [60.1699, 27.7172],
        type: 'facility',
        title: 'Vyborg Compressor Station',
        icon: 'facility',
        color: '#4A90E2',
        priority: 8,
        data: {
          operator: 'Gazprom',
          capacity: '55 billion m³/year',
          status: 'Shut down post-explosion',
          built: '2012',
          significance: 'Primary gas export facility to Europe',
          employees: '~200 personnel'
        },
        wikipediaTopics: ['Natural gas compressor station', 'Gazprom']
      },
      {
        id: 'greifswald-terminal',
        position: [54.0776, 13.0878],
        type: 'facility',
        title: 'Greifswald Reception Terminal',
        icon: 'facility',
        color: '#4A90E2', 
        priority: 8,
        data: {
          operator: 'Nord Stream AG',
          capacity: '55 billion m³/year',
          status: 'Inactive since explosion',
          built: '2011',
          significance: 'European gas distribution hub',
          connectedTo: 'OPAL and NEL pipelines'
        },
        wikipediaTopics: ['Liquefied natural gas terminal']
      },

      // Economic Impact Centers
      {
        id: 'germany-impact',
        position: [51.1657, 10.4515],
        type: 'economic',
        title: 'Germany - Primary Impact',
        icon: 'economic',
        color: '#F39C12',
        priority: 7,
        data: {
          gasSupplyLoss: '55 billion m³/year (40% of Russian imports)',
          priceIncrease: '+47% wholesale gas prices',
          industrialImpact: '847 major facilities affected',
          householdImpact: '+€1,200 annual heating costs',
          lngResponse: '6 floating LNG terminals constructed',
          strategicReserves: 'Gas storage at 95% capacity'
        },
        wikipediaTopics: ['Natural gas', 'Energy security']
      },
      
      // Additional Infrastructure POIs
      {
        id: 'baltic-pipe',
        position: [55.7558, 12.5451],
        type: 'infrastructure',
        title: 'Baltic Pipe Alternative',
        icon: 'facility',
        color: '#2ECC71',
        priority: 6,
        data: {
          type: 'Alternative gas supply',
          route: 'Norway → Denmark → Poland',
          capacity: '10 billion m³/year',
          operational: 'Since October 2022',
          significance: 'Reduces Russian gas dependence'
        },
        wikipediaTopics: ['Baltic Pipe', 'Natural gas pipeline']
      },
      {
        id: 'lng-wilhelmshaven',
        position: [53.5709, 8.1209],
        type: 'infrastructure',
        title: 'Wilhelmshaven LNG Terminal',
        icon: 'facility',
        color: '#3498DB',
        priority: 7,
        data: {
          type: 'Floating LNG terminal',
          capacity: '7.5 billion m³/year',
          operational: 'Since December 2022',
          vessel: 'FSRU Höegh Esperanza',
          significance: 'First German LNG import terminal'
        },
        wikipediaTopics: ['Liquefied natural gas terminal', 'Wilhelmshaven']
      }
    ];

    // Fetch real pipeline coordinates from OpenStreetMap
    console.log('ProperNewsOverlay: Fetching real Nord Stream coordinates...');
    
    const { fetchNordStreamCoordinates } = await import('@/lib/pipelineData');
    const pipelineCoords = await fetchNordStreamCoordinates();
    
    console.log('ProperNewsOverlay: OpenStreetMap data received:', {
      ns1Points: pipelineCoords.ns1.length,
      ns2Points: pipelineCoords.ns2.length
    });
    
    // Use only Nord Stream 1 coordinates for a single clean pipeline visualization
    const actualPipelineRoute = pipelineCoords.ns1.length > 0 
      ? pipelineCoords.ns1.map(coord => [coord.lat, coord.lng])
      : []; // Empty array if no OSM data - prevents rendering incorrect routes
    
    console.log('Rendering single pipeline with', actualPipelineRoute.length, 'coordinate points');
    
    if (actualPipelineRoute.length > 0) {
      console.log('Pipeline route start:', actualPipelineRoute[0]);
      console.log('Pipeline route end:', actualPipelineRoute[actualPipelineRoute.length - 1]);
    }

    setPOIMarkers(poisData);
    
    // Only render pipeline if we have real OSM coordinates
    const flowLinesToRender = [];
    if (actualPipelineRoute.length > 0) {
      const uniqueId = `ns1-pipeline-${Date.now()}`;
      console.log(`Creating flow line with unique ID: ${uniqueId}`);
      
      flowLinesToRender.push({
        id: uniqueId,
        coordinates: actualPipelineRoute,
        name: 'Nord Stream 1 (OSM)',
        specifications: {
          capacity: '55 billion m³/year',
          diameter: '1,153 mm (48 inches)',
          length: '1,224 km',
          cost: '€7.4 billion',
          operational: '2011-2022',
          dataSource: 'OpenStreetMap Relation 2006544'
        },
        status: timelinePosition > 50 ? 'destroyed' : 'operational',
        color: '#00FF00' // Bright green to distinguish our line
      });
    }
    
    // Re-enable flow lines but add validation to catch incorrect ones
    console.log('Flow lines to render:', flowLinesToRender.length);
    
    // Validate each flow line before rendering
    const validatedFlowLines = flowLinesToRender.filter((flow, index) => {
      const firstPoint = flow.coordinates[0];
      const lastPoint = flow.coordinates[flow.coordinates.length - 1];
      
      console.log(`Flow line ${index}:`, {
        id: flow.id,
        coordinateCount: flow.coordinates.length,
        firstPoint: firstPoint,
        lastPoint: lastPoint
      });
      
      // Check if this looks like the straight Russia-Germany line
      if (firstPoint && lastPoint) {
        const isVyborgToGreifswald = 
          (Math.abs(firstPoint[0] - 60.1699) < 0.1 && Math.abs(firstPoint[1] - 27.7172) < 0.1) ||
          (Math.abs(lastPoint[0] - 54.0776) < 0.1 && Math.abs(lastPoint[1] - 13.0878) < 0.1);
          
        if (isVyborgToGreifswald && flow.coordinates.length < 50) {
          console.warn(`REMOVING: Flow line ${flow.id} appears to be the straight Vyborg-Greifswald line`);
          return false; // Remove the straight line
        }
      }
      
      // Check if this is a suspicious straight line (too few coordinates)
      if (flow.coordinates.length < 10) {
        console.warn(`SUSPICIOUS: Flow line ${flow.id} has only ${flow.coordinates.length} coordinates - might be a straight line`);
        return false; // Filter out suspicious straight lines
      }
      
      return true;
    });
    
    console.log(`Rendering ${validatedFlowLines.length} validated flow lines`);
    setFlowLines(validatedFlowLines);
    
    // Mark pipeline as successfully rendered
    globalPipelineRendered = true;
    console.log(`Instance ${instanceId}: Pipeline successfully rendered and marked as complete`);

    setPOIMarkers(poisData);
    return poisData;
  };

  const generateSVBPOIs = (): POIMarker[] => {
    const poisData: POIMarker[] = [
      {
        id: 'svb-headquarters',
        position: [37.4419, -122.1430],
        type: 'facility',
        title: 'Silicon Valley Bank HQ',
        icon: 'bank',
        color: '#E74C3C',
        priority: 10,
        data: {
          address: '3003 Tasman Drive, Santa Clara, CA',
          totalAssets: '$209 billion',
          deposits: '$175 billion',
          employees: '8,500',
          founded: '1983',
          closure: 'March 10, 2023',
          fdic: 'Second-largest bank failure in US history',
          clientBase: '3,200+ tech companies'
        },
        wikipediaTopics: ['Silicon Valley Bank', 'Santa Clara, California']
      },
      {
        id: 'first-republic-contagion',
        position: [37.7749, -122.4194],
        type: 'economic',
        title: 'First Republic Bank - Contagion',
        icon: 'economic',
        color: '#FF8C00',
        priority: 7,
        data: {
          stockDrop: '-62% in single day',
          marketCapLoss: '$4.6B → $1.8B',
          deposits: '$213 billion at risk',
          emergencyFunding: '$70 billion from Fed',
          clientProfile: 'High-net-worth individuals',
          eventualOutcome: 'Sold to JPMorgan Chase (May 2023)'
        },
        wikipediaTopics: ['First Republic Bank']
      },
      {
        id: 'tech-ecosystem-impact',
        position: [37.4419, -122.1430],
        type: 'economic',
        title: 'Tech Ecosystem Disruption',
        icon: 'tech',
        color: '#9B59B6',
        priority: 8,
        data: {
          affectedCompanies: '3,200 startups and tech companies',
          payrollRisk: '65% of clients at risk of missing payroll',
          fundingDelayed: '$2.1 billion in VC funding delayed',
          majorClients: ['Roblox', 'Roku', 'Circle', 'Rippling', 'Brex'],
          vcExposure: 'Andreessen Horowitz: $240M, Sequoia: $180M',
          governmentResponse: 'Emergency FDIC guarantee for all deposits'
        },
        wikipediaTopics: ['Silicon Valley', 'Venture capital', 'Federal Deposit Insurance Corporation']
      },
      
      // Additional Banking Infrastructure
      {
        id: 'federal-reserve-sf',
        position: [37.7952, -122.3994],
        type: 'facility',
        title: 'Federal Reserve Bank of San Francisco',
        icon: 'bank',
        color: '#3498DB',
        priority: 7,
        data: {
          role: 'Banking supervision and regulation',
          district: '12th Federal Reserve District',
          coverage: '9 western states',
          svbResponse: 'Emergency lending facilities activated',
          significance: 'Primary regulator for SVB'
        },
        wikipediaTopics: ['Federal Reserve Bank of San Francisco', 'Federal Reserve System']
      },
      {
        id: 'nasdaq-exchange',
        position: [40.7489, -73.9442],
        type: 'economic',
        title: 'NASDAQ Exchange Impact',
        icon: 'economic',
        color: '#8E44AD',
        priority: 6,
        data: {
          sectorImpact: 'Regional banking index -28%',
          tradingVolume: '4x normal volume',
          circuitBreakers: 'Triggered twice',
          marketCap: '$1.9 trillion lost in banking sector'
        },
        wikipediaTopics: ['Nasdaq', 'Stock market circuit breaker']
      }
    ];

    setPOIMarkers(poisData);
    setFlowLines([]); // No flow lines needed for bank collapse
    return poisData;
  };

  const generateUkrainePOIs = (): POIMarker[] => {
    const poisData: POIMarker[] = [
      {
        id: 'kyiv-capital',
        position: [50.4501, 30.5234],
        type: 'military',
        title: 'Kyiv - Capital Under Siege',
        icon: 'shield',
        color: '#3498DB',
        priority: 10,
        data: {
          preWarPopulation: '2.9 million',
          currentPopulation: '~2.0 million',
          infrastructureDamage: '35% of critical infrastructure',
          powerGrid: '70% operational',
          defenseStatus: 'Successfully defended',
          airDefense: 'NATO-supplied systems active',
          symbolism: 'Symbol of Ukrainian resistance'
        },
        wikipediaTopics: ['Kyiv']
      },
      {
        id: 'mariupol-siege',
        position: [47.0971, 37.5407],
        type: 'military',
        title: 'Mariupol - Destroyed City',
        icon: 'target',
        color: '#E74C3C',
        priority: 9,
        data: {
          preWarPopulation: '431,000',
          currentPopulation: '~120,000',
          infrastructureDamage: '95% of buildings destroyed',
          siegeDuration: 'February 24 - May 20, 2022',
          steelplant: 'Azovstal Steel Works - final stronghold',
          civilianCasualties: 'Estimated 25,000+ deaths',
          currentStatus: 'Russian-occupied'
        },
        wikipediaTopics: ['Mariupol', 'Azovstal iron and steel works']
      },
      {
        id: 'zaporizhzhia-npp',
        position: [47.5152, 34.5853],
        type: 'infrastructure',
        title: 'Zaporizhzhia Nuclear Plant',
        icon: 'nuclear',
        color: '#F39C12',
        priority: 9,
        data: {
          significance: 'Largest nuclear plant in Europe',
          reactors: '6 VVER-1000 reactors',
          capacity: '5,700 MW electrical',
          occupationDate: 'March 4, 2022',
          iaeaConcern: 'International safety inspections',
          powerStatus: 'Reduced to cold shutdown',
          riskLevel: 'IAEA red alert status'
        },
        wikipediaTopics: ['Zaporizhzhia Nuclear Power Plant', 'VVER']
      },
      
      // Additional Infrastructure POIs
      {
        id: 'dnipro-hydroelectric',
        position: [47.8667, 35.0833],
        type: 'infrastructure',
        title: 'DniproHES Hydroelectric Station',
        icon: 'facility',
        color: '#3498DB',
        priority: 7,
        data: {
          type: 'Hydroelectric power station',
          capacity: '1,569 MW',
          built: '1927-1939',
          significance: 'Critical Ukrainian power infrastructure',
          warDamage: 'Targeted multiple times'
        },
        wikipediaTopics: ['Dnieper Hydroelectric Station', 'Hydroelectricity']
      },
      {
        id: 'odesa-port',
        position: [46.4825, 30.7233],
        type: 'infrastructure',
        title: 'Port of Odesa',
        icon: 'facility',
        color: '#2E86AB',
        priority: 8,
        data: {
          type: 'Major seaport',
          preWarThroughput: '25 million tonnes grain/year',
          grainDealRole: 'Black Sea Grain Initiative hub',
          currentStatus: 'Partially operational',
          globalImpact: '10% of world grain exports'
        },
        wikipediaTopics: ['Port of Odesa', 'Black Sea Grain Initiative']
      },
      {
        id: 'chernobyl-exclusion',
        position: [51.3890, 30.0992],
        type: 'infrastructure',
        title: 'Chernobyl Exclusion Zone',
        icon: 'nuclear',
        color: '#E74C3C',
        priority: 6,
        data: {
          occupied: 'February 24 - March 31, 2022',
          concerns: 'Radiation monitoring disrupted',
          staffHeld: '210 personnel held for 25 days',
          powerCut: 'External power lost temporarily'
        },
        wikipediaTopics: ['Chernobyl Exclusion Zone', 'Chernobyl disaster']
      }
    ];

    setPOIMarkers(poisData);
    setFlowLines([
      // Refugee flow lines
      {
        id: 'refugee-poland',
        coordinates: [[50.4501, 30.5234], [52.2297, 21.0122]], // Kyiv to Warsaw
        name: 'Refugee Flow to Poland',
        refugeeCount: '1.2 million',
        route: 'Primary western corridor',
        color: '#E67E22'
      }
    ]);

    setPOIMarkers(poisData);
    return poisData;
  };

  if (!enabled) return null;

  return (
    <ModalStackProvider>
      {/* Flow Lines - COMPLETELY DISABLED FOR DEBUGGING - ALL PIPELINE RENDERING OFF */}
      {/* {(globalPipelineInstanceId === instanceId) && flowLines.map((flow, index) => (
        <Polyline
          key={`flow-${index}`}
          positions={flow.coordinates}
          pathOptions={{
            color: flow.color,
            weight: 6,
            opacity: flow.status === 'destroyed' ? 0.6 : 0.9,
            dashArray: flow.status === 'destroyed' ? '15, 10' : flow.animated ? '20, 15' : undefined,
            lineCap: 'round',
            lineJoin: 'round'
          }}
          className={flow.animated ? 'animated-flow' : ''}
        >
          <Popup 
            maxWidth={350}
            className="professional-popup"
            closeButton={false}
            autoPan={true}
          >
            <div className="p-0 m-0">
              <FlowLineInfo flow={flow} />
            </div>
          </Popup>
        </Polyline>
      ))} */}
      
      {/* DEBUG: Log what's happening */}
      {console.log('ProperNewsOverlay DEBUG:', {
        instanceId,
        enabled,
        flowLinesCount: flowLines.length,
        globalPipelineInstanceId,
        storyId: story?.id
      })}

      {/* POI Markers with draggable modals */}
      {poiMarkers.map((marker) => (
          <ProfessionalMarker
            key={marker.id}
            poi={marker}
            wikipediaData={wikipediaData}
          />
      ))}

      {/* Enhanced News Story Visualization - DISABLED FOR DEBUGGING */}
      {/* <NewsStoryOverlay
        story={story}
        enabled={enabled}
        timelinePosition={timelinePosition}
      /> */}
    </ModalStackProvider>
  );
}