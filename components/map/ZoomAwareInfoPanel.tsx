'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronDown, 
  ChevronUp, 
  Info, 
  MapPin,
  Building2,
  Globe,
  Map,
  Home,
  Landmark,
  X,
  ExternalLink,
  Flag,
  Navigation
} from 'lucide-react';
import { WikipediaAPI } from '@/lib/wikipedia';

interface ClickInfo {
  lat: number;
  lon: number;
  zoom: number;
  type: 'country' | 'state' | 'city' | 'district' | 'building' | 'poi';
  data?: any;
}

interface ZoomAwareInfoPanelProps {
  clickInfo: ClickInfo;
  onClose: () => void;
}

export default function ZoomAwareInfoPanel({ clickInfo, onClose }: ZoomAwareInfoPanelProps) {
  const [wikiData, setWikiData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const getIcon = () => {
    switch (clickInfo.type) {
      case 'country':
        return <Globe className="h-5 w-5" />;
      case 'state':
        return <Flag className="h-5 w-5" />;
      case 'city':
        return <Building2 className="h-5 w-5" />;
      case 'district':
        return <Map className="h-5 w-5" />;
      case 'building':
        return <Home className="h-5 w-5" />;
      case 'poi':
        return <Landmark className="h-5 w-5" />;
      default:
        return <MapPin className="h-5 w-5" />;
    }
  };

  const getTitle = () => {
    if (!clickInfo.data) return 'Location Information';
    
    const data = clickInfo.data;
    const address = data.address || {};
    
    switch (clickInfo.type) {
      case 'country':
        return address.country || data.display_name?.split(',')[0] || 'Country';
      case 'state':
        return address.state || address.region || address.province || 'State/Province';
      case 'city':
        return address.city || address.town || address.village || address.municipality || 'City';
      case 'district':
        return address.suburb || address.district || address.neighbourhood || 'District';
      case 'building':
        return address.house_number && address.road 
          ? `${address.house_number} ${address.road}`
          : data.name || 'Building';
      case 'poi':
        return data.name || address.amenity || address.shop || 'Point of Interest';
      default:
        return 'Location';
    }
  };

  const getZoomLevelInfo = () => {
    const zoomRanges = {
      'country': 'Zoom 1-5: Country level view',
      'state': 'Zoom 6-7: State/Province level view',
      'city': 'Zoom 8-11: City level view',
      'district': 'Zoom 12-14: District/Neighborhood level view',
      'building': 'Zoom 15-17: Building level view',
      'poi': 'Zoom 18+: Point of Interest level view'
    };
    
    return zoomRanges[clickInfo.type];
  };

  const getRelevantInfo = () => {
    if (!clickInfo.data) return null;
    
    const data = clickInfo.data;
    const address = data.address || {};
    const info: any = {};
    
    switch (clickInfo.type) {
      case 'country':
        info.Country = address.country;
        info.Continent = address.continent;
        info['ISO Code'] = address.country_code?.toUpperCase();
        break;
      
      case 'state':
        info.State = address.state || address.region || address.province;
        info.Country = address.country;
        info.Type = data.type?.replace(/_/g, ' ');
        break;
      
      case 'city':
        info.City = address.city || address.town || address.village;
        info.State = address.state || address.region;
        info.Country = address.country;
        info.County = address.county;
        info['Postal Code'] = address.postcode;
        break;
      
      case 'district':
        info.District = address.suburb || address.district || address.neighbourhood;
        info.City = address.city || address.town;
        info.State = address.state;
        info['Postal Code'] = address.postcode;
        break;
      
      case 'building':
        info.Address = data.display_name?.split(',')[0];
        info.Street = address.road;
        info.Number = address.house_number;
        info.District = address.suburb || address.neighbourhood;
        info.City = address.city || address.town;
        info['Postal Code'] = address.postcode;
        info.Type = data.type?.replace(/_/g, ' ');
        break;
      
      case 'poi':
        info.Name = data.name;
        info.Type = data.type?.replace(/_/g, ' ');
        info.Category = data.category?.replace(/_/g, ' ');
        info.Address = data.display_name?.split(',').slice(0, 3).join(', ');
        if (data.extratags) {
          if (data.extratags.website) info.Website = data.extratags.website;
          if (data.extratags.phone) info.Phone = data.extratags.phone;
          if (data.extratags.opening_hours) info['Opening Hours'] = data.extratags.opening_hours;
        }
        break;
    }
    
    info.Coordinates = `${clickInfo.lat.toFixed(6)}, ${clickInfo.lon.toFixed(6)}`;
    info['Current Zoom'] = Math.floor(clickInfo.zoom);
    
    return info;
  };

  useEffect(() => {
    const fetchWikipediaData = async () => {
      const title = getTitle();
      if (!title || title === 'Location Information') return;
      
      setIsLoading(true);
      try {
        let searchTerm = title;
        
        if (clickInfo.type === 'country' || clickInfo.type === 'state' || clickInfo.type === 'city') {
          searchTerm = `${title} ${clickInfo.type}`;
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

    if (clickInfo.type !== 'building' && clickInfo.type !== 'poi') {
      fetchWikipediaData();
    }
  }, [clickInfo]);

  const relevantInfo = getRelevantInfo();

  return (
    <Card className="absolute top-4 right-4 z-[1000] w-96 max-h-[80vh] overflow-hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center space-x-2">
          {getIcon()}
          <CardTitle className="text-lg">{getTitle()}</CardTitle>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4 overflow-y-auto max-h-[60vh]">
        {/* Zoom Level Indicator */}
        <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {getZoomLevelInfo()}
            </span>
          </div>
        </div>

        {/* Location Type Badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">
            {clickInfo.type}
          </Badge>
          {clickInfo.data?.type && (
            <Badge variant="secondary" className="text-xs">
              {clickInfo.data.type.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>

        <Separator />

        {/* Relevant Information */}
        {relevantInfo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Info className="h-4 w-4" />
                Details
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 px-2"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            
            {isExpanded && (
              <div className="space-y-1 text-sm">
                {Object.entries(relevantInfo).map(([key, value]) => {
                  if (!value) return null;
                  
                  if (key === 'Website') {
                    return (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">{key}:</span>
                        <a 
                          href={value as string} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1"
                        >
                          <span className="truncate max-w-[200px]">{value as string}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{key}:</span>
                      <span className="font-medium text-right max-w-[60%] truncate">{value as string}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Wikipedia Content for larger areas */}
        {wikiData && (clickInfo.type === 'country' || clickInfo.type === 'state' || clickInfo.type === 'city') && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Wikipedia
              </h4>
              
              {wikiData.images?.length > 0 && (
                <img 
                  src={wikiData.images[0]} 
                  alt={wikiData.title}
                  className="w-full h-32 object-cover rounded-md"
                />
              )}
              
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-4">
                {wikiData.extract}
              </p>
              
              <Button 
                variant="ghost" 
                size="sm" 
                asChild
                className="text-xs h-6 px-2 w-full"
              >
                <a href={wikiData.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Read more on Wikipedia
                </a>
              </Button>
            </div>
          </>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Loading information...</span>
          </div>
        )}

        {/* Zoom hint */}
        <div className="mt-4 p-2 bg-gray-50 dark:bg-gray-900/50 rounded text-xs text-gray-600 dark:text-gray-400">
          💡 Tip: Zoom in for more detailed information, zoom out for broader context
        </div>
      </CardContent>
    </Card>
  );
}