'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Calendar,
  MapPin,
  Building2,
  Globe,
  Users,
  X,
  ExternalLink
} from 'lucide-react';
import DefinitionCard from './DefinitionCard';
import { WikipediaAPI } from '@/lib/wikipedia';

interface LocationData {
  lat: number;
  lon: number;
  name: string;
  osm_id?: number;
  osm_type?: string;
  type?: string;
  class?: string;
}

interface WikipediaData {
  title: string;
  extract: string;
  images: string[];
  url: string;
}

interface LocationInfoPanelProps {
  location: LocationData;
  onClose: () => void;
}

// Geographic and location-related terms for definition cards
const LOCATION_TERMS = {
  // Geographic features
  'metropolitan area': 'Metropolitan area',
  'urban area': 'Urban area',
  'municipality': 'Municipality',
  'county': 'County',
  'province': 'Province',
  'state': 'U.S. state',
  'city': 'City',
  'town': 'Town',
  'village': 'Village',
  'neighborhood': 'Neighbourhood',
  'district': 'District',
  'borough': 'Borough',
  'suburb': 'Suburb',
  
  // Infrastructure
  'airport': 'Airport',
  'seaport': 'Port',
  'railway station': 'Train station',
  'university': 'University',
  'hospital': 'Hospital',
  'cathedral': 'Cathedral',
  'museum': 'Museum',
  'park': 'Park',
  'river': 'River',
  'lake': 'Lake',
  'mountain': 'Mountain',
  'bridge': 'Bridge',
  
  // Administrative
  'capital': 'Capital city',
  'prefecture': 'Prefecture',
  'region': 'Region',
  'territory': 'Territory',
  'commonwealth': 'Commonwealth'
};

export default function LocationInfoPanel({ location, onClose }: LocationInfoPanelProps) {
  const [wikiData, setWikiData] = useState<WikipediaData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({});
  const [definitionCard, setDefinitionCard] = useState<{ term: string; title: string } | null>(null);

  useEffect(() => {
    const fetchWikipediaData = async () => {
      setIsLoading(true);
      try {
        // Try to get Wikipedia data for the location
        let searchTerm = location.name.split(',')[0].trim(); // Take first part before comma
        
        // For specific location types, enhance search term
        if (location.type === 'city' || location.class === 'place') {
          searchTerm = `${searchTerm} ${location.type || 'city'}`;
        }
        
        const data = await WikipediaAPI.getPageSummary(searchTerm);
        setWikiData(data);
      } catch (error) {
        console.error('Failed to fetch Wikipedia data:', error);
        setWikiData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWikipediaData();
  }, [location]);

  const toggleSection = (section: string) => {
    setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const showDefinition = (term: string, title: string) => {
    setDefinitionCard({ term, title });
  };

  const enhanceTextWithLinks = (text: string) => {
    let enhanced = text;
    
    Object.entries(LOCATION_TERMS).forEach(([term, wikipediaTitle]) => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      enhanced = enhanced.replace(regex, (match) => 
        `<button class="location-term-link" data-term="${match}" data-title="${wikipediaTitle}">${match}</button>`
      );
    });
    
    return enhanced;
  };

  const handleTermClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('location-term-link')) {
      const term = target.getAttribute('data-term');
      const title = target.getAttribute('data-title');
      if (term && title) {
        showDefinition(term, title);
      }
    }
  };

  const getLocationIcon = () => {
    switch (location.type || location.class) {
      case 'city':
      case 'town':
      case 'village':
        return <Building2 className="h-5 w-5" />;
      case 'country':
      case 'state':
      case 'province':
        return <Globe className="h-5 w-5" />;
      case 'university':
      case 'school':
        return <Users className="h-5 w-5" />;
      default:
        return <MapPin className="h-5 w-5" />;
    }
  };

  return (
    <>
      <Card className="absolute top-4 right-4 z-[1000] w-96 max-h-[80vh] overflow-hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center space-x-2">
            {getLocationIcon()}
            <CardTitle className="text-lg">Location Info</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Basic Location Info */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {location.name.split(',')[0]}
            </h3>
            
            {location.type && (
              <Badge variant="outline" className="text-xs">
                {location.type.charAt(0).toUpperCase() + location.type.slice(1)}
              </Badge>
            )}
            
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <div>Coordinates: {location.lat.toFixed(6)}, {location.lon.toFixed(6)}</div>
              {location.osm_id && (
                <div>OSM ID: {location.osm_type}/{location.osm_id}</div>
              )}
            </div>
          </div>

          <Separator />

          {/* Wikipedia Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-sm text-gray-600">Loading information...</span>
            </div>
          ) : wikiData ? (
            <div className="space-y-3">
              <Collapsible open={sectionsOpen.overview} onOpenChange={() => toggleSection('overview')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Overview
                  </h4>
                  {sectionsOpen.overview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-2">
                  {wikiData.images.length > 0 && (
                    <img 
                      src={wikiData.images[0]} 
                      alt={wikiData.title}
                      className="w-full h-32 object-cover rounded-md"
                    />
                  )}
                  
                  <div 
                    className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: enhanceTextWithLinks(wikiData.extract) }}
                    onClick={handleTermClick}
                  />
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Globe className="h-3 w-3" />
                      Wikipedia
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      asChild
                      className="text-xs h-6 px-2"
                    >
                      <a href={wikiData.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Read more
                      </a>
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-400 italic">
              No additional information available for this location.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Definition Card Overlay */}
      {definitionCard && (
        <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center p-4">
          <div className="relative">
            <DefinitionCard
              term={definitionCard.term}
              wikipediaTitle={definitionCard.title}
              onClose={() => setDefinitionCard(null)}
            />
          </div>
        </div>
      )}

    </>
  );
}