'use client';

import { useEffect, useState } from 'react';
import { Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
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
import ProfessionalPopup from './ProfessionalPopup';
import FlowLineInfo from './FlowLineInfo';
import { ModalStackProvider } from './ModalStack';

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

export default function ProperNewsOverlay({ story, enabled, timelinePosition }: ProperNewsOverlayProps) {
  const [poiMarkers, setPOIMarkers] = useState<POIMarker[]>([]);
  const [flowLines, setFlowLines] = useState<any[]>([]);
  const [wikipediaData, setWikipediaData] = useState<{[key: string]: any}>({});
  const map = useMap();

  useEffect(() => {
    if (!enabled || !story) return;

    let poisData: POIMarker[] = [];

    if (story.id === 'nord-stream' || story.content.toLowerCase().includes('nord stream')) {
      poisData = generateNordStreamPOIs();
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

  const generateNordStreamPOIs = (): POIMarker[] => {
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

    // ONLY show operational pipeline route - no random alternative routes
    const actualPipelineRoute = [
      [60.1699, 27.7172], // Vyborg start
      [59.8944, 26.7811], // Gulf of Finland
      [59.3293, 24.7136], // Estonian EEZ
      [58.5953, 23.3379], // Latvian EEZ
      [57.7089, 21.1619], // Lithuanian EEZ
      [56.9496, 19.9456], // Polish EEZ
      [56.1612, 18.6435], // Gotland vicinity
      [55.6050, 17.7253], // Swedish EEZ
      [55.4400, 15.6000], // Explosion area
      [54.9167, 14.1167], // German EEZ
      [54.0776, 13.0878]  // Greifswald end
    ];

    setPOIMarkers(poisData);
    setFlowLines([
      {
        id: 'ns1-pipeline',
        coordinates: actualPipelineRoute,
        name: 'Nord Stream 1',
        specifications: {
          capacity: '55 billion m³/year',
          diameter: '1,153 mm (48 inches)',
          length: '1,224 km',
          cost: '€7.4 billion',
          operational: '2011-2022'
        },
        status: timelinePosition > 50 ? 'destroyed' : 'operational',
        color: timelinePosition > 50 ? '#FF4444' : '#2E86AB'
      }
      // NS2 ran parallel but was never operational - don't show to avoid confusion
    ]);

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

  const createPOIIcon = (marker: POIMarker) => {
    const iconMap = {
      explosion: '💥',
      facility: '🏭', 
      economic: '💰',
      military: '🛡️',
      infrastructure: '⚡',
      bank: '🏛️',
      tech: '💻',
      shield: '🛡️',
      target: '🎯',
      nuclear: '☢️'
    };

    // Enhanced colors for better visibility in dark mode
    const enhancedColor = marker.color === '#FF0000' ? '#FF4444' : 
                          marker.color === '#4A90E2' ? '#60A5FA' :
                          marker.color === '#F39C12' ? '#FBBF24' :
                          marker.color === '#3498DB' ? '#3B82F6' :
                          marker.color === '#2E86AB' ? '#0EA5E9' :
                          marker.color === '#E74C3C' ? '#EF4444' :
                          marker.color === '#2ECC71' ? '#10B981' : marker.color;

    const size = marker.priority >= 9 ? 44 : marker.priority >= 7 ? 38 : 32;
    const pulseClass = marker.priority >= 9 ? 'priority-high' : '';

    return L.divIcon({
      html: `
        <div class="poi-marker ${pulseClass}" style="
          background: linear-gradient(135deg, ${enhancedColor}, ${enhancedColor}dd); 
          border: 3px solid rgba(255,255,255,0.9);
          border-radius: 50%;
          width: ${size}px;
          height: ${size}px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${size * 0.4}px;
          box-shadow: 
            0 8px 25px rgba(0,0,0,0.3),
            0 3px 8px rgba(0,0,0,0.2),
            inset 0 1px 0 rgba(255,255,255,0.3);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(12px);
          position: relative;
          z-index: 1000;
        ">
          <div style="
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
            position: relative;
            z-index: 1001;
          ">
            ${iconMap[marker.icon as keyof typeof iconMap] || '📍'}
          </div>
        </div>
      `,
      className: 'poi-marker',
      iconSize: [size, size],
      iconAnchor: [size/2, size/2]
    });
  };

  if (!enabled) return null;

  return (
    <ModalStackProvider>
      {/* Flow Lines - Professional styling */}
      {flowLines.map((flow, index) => (
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
      ))}

      {/* POI Markers with professional popups */}
      {poiMarkers.map((marker) => (
        <Marker
          key={marker.id}
          position={marker.position}
          icon={createPOIIcon(marker)}
        >
          <ProfessionalPopup 
            poi={marker} 
            wikipediaData={wikipediaData}
          />
        </Marker>
      ))}
    </ModalStackProvider>
  );
}