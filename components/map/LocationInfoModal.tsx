'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ExternalLink, 
  MapPin, 
  Globe,
  Expand
} from 'lucide-react';
import EnhancedWikipediaContent from './EnhancedWikipediaContent';
import FullArticleModal from './FullArticleModal';
import { WikipediaAPI } from '@/lib/wikipedia';

interface LocationData {
  lat: number;
  lon: number;
  name: string;
  osm_id?: number;
  osm_type?: string;
  type?: string;
  class?: string;
  tags?: { [key: string]: string };
}

interface WikipediaData {
  title: string;
  extract: string;
  images: string[];
  url: string;
}

interface LocationInfoModalProps {
  location: LocationData;
  onClose?: () => void;
  onExpand?: () => void;
}

const getLocationTypeConfig = (isDark: boolean, locationType?: string) => {
  const type = locationType || 'place';
  
  const configs = {
    city: {
      icon: Globe,
      label: 'City',
      color: isDark 
        ? 'bg-blue-500/20 text-blue-300 border-blue-800/50' 
        : 'bg-blue-500/10 text-blue-700 border-blue-200',
      bgGradient: isDark 
        ? 'from-blue-900/30 to-cyan-900/30' 
        : 'from-blue-50 to-cyan-50'
    },
    country: {
      icon: Globe,
      label: 'Country',
      color: isDark 
        ? 'bg-green-500/20 text-green-300 border-green-800/50' 
        : 'bg-green-500/10 text-green-700 border-green-200',
      bgGradient: isDark 
        ? 'from-green-900/30 to-emerald-900/30' 
        : 'from-green-50 to-emerald-50'
    },
    state: {
      icon: Globe,
      label: 'State/Province',
      color: isDark 
        ? 'bg-purple-500/20 text-purple-300 border-purple-800/50' 
        : 'bg-purple-500/10 text-purple-700 border-purple-200',
      bgGradient: isDark 
        ? 'from-purple-900/30 to-violet-900/30' 
        : 'from-purple-50 to-violet-50'
    },
    place: {
      icon: MapPin,
      label: 'Place',
      color: isDark 
        ? 'bg-gray-500/20 text-gray-300 border-gray-800/50' 
        : 'bg-gray-500/10 text-gray-700 border-gray-200',
      bgGradient: isDark 
        ? 'from-gray-900/30 to-slate-900/30' 
        : 'from-gray-50 to-slate-50'
    }
  };

  return configs[type as keyof typeof configs] || configs.place;
};

export default function LocationInfoModal({ location, onClose, onExpand }: LocationInfoModalProps) {
  const [wikiData, setWikiData] = useState<WikipediaData | null>(null);
  const [isLoadingWiki, setIsLoadingWiki] = useState(true);
  const [showFullArticle, setShowFullArticle] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const config = getLocationTypeConfig(isDark, location.type);
  const IconComponent = config.icon;
  
  const cardBg = `bg-gradient-to-br ${config.bgGradient}`;
  const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const subtextColor = isDark ? 'text-gray-300' : 'text-gray-500';

  // Fetch enriched data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingWiki(true);
      try {
        let searchTerm = location.name.split(',')[0].trim();
        
        if (location.type === 'city' || location.class === 'place') {
          searchTerm = `${searchTerm}`;
        }
        
        const data = await WikipediaAPI.getPageSummary(searchTerm);
        setWikiData(data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setWikiData(null);
      } finally {
        setIsLoadingWiki(false);
      }
    };

    fetchData();
  }, [location]);

  // Handle expand from parent modal
  useEffect(() => {
    if (onExpand && wikiData) {
      // Override the expand behavior to show full article
      const originalOnExpand = onExpand;
      // We'll trigger full article when parent modal is maximized
    }
  }, [onExpand, wikiData]);

  return (
    <Card className={`w-full h-full shadow-2xl border-0 ${cardBg} flex flex-col`}>
      {/* Header Section */}
      <CardHeader className="pb-1 space-y-1 flex-shrink-0 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.color} border`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${textColor} leading-tight`}>
                {location.name.split(',')[0]}
              </h3>
              <Badge variant="secondary" className={`text-xs font-medium ${config.color} border-0 mt-1`}>
                {config.label}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className={`flex items-center gap-2 text-xs ${subtextColor}`}>
          <MapPin className="w-3 h-3" />
          <span className="font-mono">
            {location.lat.toFixed(4)}°N, {location.lon.toFixed(4)}°E
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 px-4 py-1">
        <div className="w-full h-full flex flex-col mt-2">
          <div className="space-y-3 pr-2 overflow-y-auto max-h-full">
            {/* POI Information */}
            {location.tags && Object.keys(location.tags).length > 0 && (
              <div className="space-y-2 mb-4">
                <h4 className={`font-semibold text-sm ${textColor}`}>POI Information</h4>
                <div className="grid gap-2">
                  {Object.entries(location.tags)
                    .filter(([key, value]) => key !== 'name' && value && value.trim() !== '')
                    .slice(0, 6)
                    .map(([key, value]) => (
                      <div key={key} className={`text-xs p-2 rounded ${isDark ? 'bg-gray-800/60' : 'bg-white/80'} border ${isDark ? 'border-gray-700/40' : 'border-gray-200/60'}`}>
                        <span className={`font-medium ${subtextColor} uppercase`}>
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <span className={`ml-2 ${textColor}`}>{value}</span>
                      </div>
                    ))}
                </div>
                <Separator />
              </div>
            )}
            
            {/* Enhanced Content */}
            {isLoadingWiki ? (
              <div className="space-y-3">
                <div className={`h-6 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                <div className={`h-32 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                <div className="space-y-2">
                  <div className={`h-4 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                  <div className={`h-4 w-4/5 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                  <div className={`h-4 w-3/5 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                </div>
              </div>
            ) : wikiData ? (
              <div className="space-y-4">
                <h4 className={`font-semibold text-sm flex items-center gap-2 ${textColor}`}>
                  <Globe className="w-4 h-4" />
                  About {wikiData.title}
                </h4>
                
                <EnhancedWikipediaContent
                  topic={wikiData.title}
                  wikiData={wikiData}
                />
                
              </div>
            ) : (
              <div className={`text-sm text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                No additional information available for this location.
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Full Article Modal */}
      {showFullArticle && wikiData && (
        <FullArticleModal
          title={wikiData.title}
          isOpen={showFullArticle}
          onClose={() => setShowFullArticle(false)}
        />
      )}
    </Card>
  );
}