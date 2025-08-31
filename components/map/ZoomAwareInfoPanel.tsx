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
    if (!clickInfo.data) return <MapPin className="h-5 w-5" />;
    
    const data = clickInfo.data;
    
    // Special handling for administrative boundaries
    if (data.class === 'boundary' || data.admin_level) {
      if (data.type === 'state' || data.admin_level === '4') return <Flag className="h-5 w-5" />;
      if (data.type === 'county' || data.admin_level === '6') return <Map className="h-5 w-5" />;
      return <Globe className="h-5 w-5" />;
    }
    
    // Icon based on zoom level and data type
    if (clickInfo.zoom <= 5) {
      return <Globe className="h-5 w-5" />;  // Country level
    } else if (clickInfo.zoom <= 7) {
      return <Flag className="h-5 w-5" />;   // State level
    } else if (clickInfo.zoom <= 11) {
      return <Building2 className="h-5 w-5" />; // City level
    } else if (clickInfo.zoom <= 14) {
      return <Map className="h-5 w-5" />;    // District level
    } else {
      // For higher zoom, use more specific icons based on OSM class
      if (data.class === 'highway') return <Navigation className="h-5 w-5" />;
      if (data.class === 'building') return <Home className="h-5 w-5" />;
      if (data.class === 'amenity') return <Landmark className="h-5 w-5" />;
      return <MapPin className="h-5 w-5" />;
    }
  };

  const getTitle = () => {
    if (!clickInfo.data) return 'Location Information';
    
    const data = clickInfo.data;
    const address = data.address || {};
    
    // Use the actual OSM type and class from the response to determine what was clicked
    const osmType = data.type;
    const osmClass = data.class;
    
    // Special handling for administrative boundaries
    if (osmClass === 'boundary' || data.admin_level) {
      if (data.name) return data.name;
      if (osmType === 'state' && address.state) return address.state;
      if (osmType === 'county' && address.county) return address.county;
      if (address.state) return address.state;
      if (address.county) return address.county;
    }
    
    // For very low zoom (country level)
    if (clickInfo.zoom <= 5) {
      return address.country || data.display_name?.split(',')[0] || 'Country';
    }
    
    // For low zoom (state level)  
    if (clickInfo.zoom <= 7) {
      return address.state || address.region || address.province || 
             address.country || data.display_name?.split(',')[0] || 'Region';
    }
    
    // For medium zoom (city level)
    if (clickInfo.zoom <= 11) {
      return address.city || address.town || address.village || address.municipality ||
             address.county || data.display_name?.split(',')[0] || 'City';
    }
    
    // For higher zoom (district/neighborhood)
    if (clickInfo.zoom <= 14) {
      return address.suburb || address.district || address.neighbourhood || 
             address.city || address.town || data.display_name?.split(',')[0] || 'District';
    }
    
    // For building level
    if (clickInfo.zoom <= 17) {
      if (osmClass === 'highway' || osmClass === 'railway') {
        return data.name || `${osmType} ${osmClass}`.replace('_', ' ');
      }
      return address.house_number && address.road 
        ? `${address.house_number} ${address.road}`
        : data.name || data.display_name?.split(',')[0] || 'Building';
    }
    
    // For POI level
    return data.name || address.amenity || address.shop || 
           data.display_name?.split(',')[0] || 'Point of Interest';
  };

  const getZoomLevelInfo = () => {
    const zoom = Math.floor(clickInfo.zoom);
    
    if (zoom <= 5) return `Zoom ${zoom}: Country level view`;
    if (zoom <= 7) return `Zoom ${zoom}: State/Province level view`;
    if (zoom <= 11) return `Zoom ${zoom}: City level view`;
    if (zoom <= 14) return `Zoom ${zoom}: District/Neighborhood level view`;
    if (zoom <= 17) return `Zoom ${zoom}: Building/Road level view`;
    return `Zoom ${zoom}: Point of Interest level view`;
  };

  const getRelevantInfo = () => {
    if (!clickInfo.data) return null;
    
    const data = clickInfo.data;
    const address = data.address || {};
    const info: any = {};
    
    // Special handling for administrative boundaries
    if (data.class === 'boundary' || data.admin_level) {
      info.Name = data.name || data.display_name?.split(',')[0];
      info.Type = data.type ? data.type.replace(/_/g, ' ').toUpperCase() : 'Administrative Boundary';
      if (data.admin_level) info['Admin Level'] = data.admin_level;
      info.Country = address.country;
      if (address.state) info.State = address.state;
      if (address.county) info.County = address.county;
      if (data.extratags?.ISO3166_1) info['ISO Code'] = data.extratags.ISO3166_1;
      if (data.extratags?.population) info.Population = data.extratags.population;
      if (data.extratags?.area) info.Area = data.extratags.area;
    }
    // Show information based on actual zoom level, not inferred type
    else if (clickInfo.zoom <= 5) {
      // Country level
      info.Country = address.country;
      if (address.continent) info.Continent = address.continent;
      if (address.country_code) info['ISO Code'] = address.country_code.toUpperCase();
      if (data.type) info.Type = data.type.replace(/_/g, ' ');
    } else if (clickInfo.zoom <= 7) {
      // State/Region level
      info.Region = address.state || address.region || address.province;
      info.Country = address.country;
      if (data.type) info.Type = data.type.replace(/_/g, ' ');
      if (data.class) info.Class = data.class.replace(/_/g, ' ');
    } else if (clickInfo.zoom <= 11) {
      // City level
      info.City = address.city || address.town || address.village || address.municipality;
      info.State = address.state || address.region;
      info.Country = address.country;
      if (address.county) info.County = address.county;
      if (address.postcode) info['Postal Code'] = address.postcode;
      if (data.type) info.Type = data.type.replace(/_/g, ' ');
    } else if (clickInfo.zoom <= 14) {
      // District/Neighborhood level
      info.District = address.suburb || address.district || address.neighbourhood;
      info.City = address.city || address.town;
      info.State = address.state;
      if (address.postcode) info['Postal Code'] = address.postcode;
      if (data.type) info.Type = data.type.replace(/_/g, ' ');
    } else if (clickInfo.zoom <= 17) {
      // Building/Road level
      if (data.class === 'highway' || data.class === 'railway') {
        info.Name = data.name;
        info.Type = `${data.type} ${data.class}`.replace(/_/g, ' ');
        info.Surface = data.extratags?.surface;
        info.Lanes = data.extratags?.lanes;
        info.Maxspeed = data.extratags?.maxspeed;
      } else {
        info.Address = data.display_name?.split(',')[0];
        if (address.house_number) info['House Number'] = address.house_number;
        if (address.road) info.Street = address.road;
        info.District = address.suburb || address.neighbourhood;
        info.City = address.city || address.town;
        if (address.postcode) info['Postal Code'] = address.postcode;
        if (data.type) info.Type = data.type.replace(/_/g, ' ');
      }
    } else {
      // POI level
      info.Name = data.name;
      if (data.type) info.Type = data.type.replace(/_/g, ' ');
      if (data.class) info.Category = data.class.replace(/_/g, ' ');
      info.Address = data.display_name?.split(',').slice(0, 3).join(', ');
      if (data.extratags) {
        if (data.extratags.website) info.Website = data.extratags.website;
        if (data.extratags.phone) info.Phone = data.extratags.phone;
        if (data.extratags.opening_hours) info['Opening Hours'] = data.extratags.opening_hours;
        if (data.extratags.cuisine) info.Cuisine = data.extratags.cuisine;
        if (data.extratags.wheelchair) info.Wheelchair = data.extratags.wheelchair;
      }
    }
    
    info.Coordinates = `${clickInfo.lat.toFixed(6)}, ${clickInfo.lon.toFixed(6)}`;
    info['Current Zoom'] = Math.floor(clickInfo.zoom);
    if (data.osm_id) info['OSM ID'] = `${data.osm_type}/${data.osm_id}`;
    
    return info;
  };

  useEffect(() => {
    const fetchWikipediaData = async () => {
      const title = getTitle();
      if (!title || title === 'Location Information') return;
      
      setIsLoading(true);
      try {
        let searchTerm = title;
        
        // Only add type suffix for broader geographic areas
        if (clickInfo.zoom <= 11) {
          if (clickInfo.zoom <= 5) searchTerm = `${title} country`;
          else if (clickInfo.zoom <= 7) searchTerm = `${title}`;
          else if (clickInfo.zoom <= 11) searchTerm = `${title} city`;
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

    // Only fetch Wikipedia for broader areas (country, state, city level)
    if (clickInfo.zoom <= 11) {
      fetchWikipediaData();
    } else {
      setWikiData(null);
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
        {wikiData && clickInfo.zoom <= 11 && (
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