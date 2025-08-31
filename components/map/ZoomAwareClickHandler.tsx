'use client';

import { useMapEvents, useMap } from 'react-leaflet';
import { useCallback, useState } from 'react';

interface ClickInfo {
  lat: number;
  lon: number;
  zoom: number;
  type: 'country' | 'state' | 'city' | 'district' | 'building' | 'poi';
  data?: any;
}

interface ZoomAwareClickHandlerProps {
  onLocationClick: (info: ClickInfo) => void;
}

export default function ZoomAwareClickHandler({ onLocationClick }: ZoomAwareClickHandlerProps) {
  const map = useMap();
  const [isQuerying, setIsQuerying] = useState(false);

  const getLocationTypeByZoom = (zoom: number): ClickInfo['type'] => {
    if (zoom <= 5) return 'country';
    if (zoom <= 7) return 'state';
    if (zoom <= 11) return 'city';
    if (zoom <= 14) return 'district';
    if (zoom <= 17) return 'building';
    return 'poi';
  };

  // Get appropriate feature using multiple zoom levels to find best match
  const getAppropriateFeature = async (lat: number, lon: number, zoom: number) => {
    const zoomLevel = Math.floor(zoom);
    
    try {
      // Try multiple zoom levels to get the most appropriate result
      const zoomLevels = [zoomLevel];
      
      // For low zoom, also try slightly higher zoom to get better results
      if (zoom <= 8) {
        zoomLevels.push(Math.min(zoom + 2, 10));
      }
      
      let bestResult = null;
      let bestScore = -1;
      
      for (const testZoom of zoomLevels) {
        const params = new URLSearchParams({
          lat: lat.toString(),
          lon: lon.toString(),
          zoom: testZoom.toString(),
          format: 'json',
          addressdetails: '1',
          extratags: '1',
          namedetails: '1',
          'polygon_geojson': '1',
        });

        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?${params}`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'MapMap-Tools/1.0',
            }
          }
        );

        if (!response.ok) continue;
        
        const result = await response.json();
        const score = scoreFeatureForZoom(result, zoom);
        
        if (score > bestScore) {
          bestScore = score;
          bestResult = result;
        }
      }
      
      return bestResult;
    } catch (error) {
      console.error('Feature detection failed:', error);
      return null;
    }
  };

  // Score a feature based on how appropriate it is for the current zoom level
  const scoreFeatureForZoom = (result: any, zoom: number) => {
    if (!result) return 0;
    
    let score = 0;
    const type = result.type;
    const classification = result.class;
    
    // Base scores for different feature types at different zoom levels
    if (zoom <= 5) {
      // Country level
      if (type === 'country' || classification === 'place') score += 10;
      if (result.address?.country) score += 5;
    } else if (zoom <= 8) {
      // State/Region level  
      if (type === 'state' || type === 'region' || classification === 'place') score += 10;
      if (result.address?.state) score += 5;
    } else if (zoom <= 12) {
      // City level
      if (type === 'city' || type === 'town' || type === 'village') score += 10;
      if (classification === 'place') score += 8;
      if (result.address?.city || result.address?.town) score += 5;
    } else if (zoom <= 15) {
      // Neighborhood/District level
      if (type === 'suburb' || type === 'neighbourhood' || type === 'district') score += 10;
      if (classification === 'highway' && result.name) score += 8; // Named roads
      if (result.address?.suburb || result.address?.neighbourhood) score += 5;
    } else {
      // Building/POI level
      if (classification === 'highway' || classification === 'railway') score += 9;
      if (classification === 'building') score += 8;
      if (classification === 'amenity') score += 7;
      if (result.name) score += 5; // Named features are better
    }
    
    // Penalty for overly specific results at low zoom
    if (zoom <= 10 && (classification === 'building' || type === 'house')) {
      score -= 8;
    }
    
    // Bonus for having a name
    if (result.name && zoom >= 8) {
      score += 3;
    }
    
    return score;
  };


  const handleMapClick = useCallback(async (e: any) => {
    if (isQuerying) return;
    
    const { lat, lng } = e.latlng;
    const zoom = map.getZoom();
    const locationType = getLocationTypeByZoom(zoom);
    
    setIsQuerying(true);
    
    try {
      const featureData = await getAppropriateFeature(lat, lng, zoom);
      
      if (!featureData) {
        console.log('No feature data found for this location');
        return;
      }
      
      const clickInfo: ClickInfo = {
        lat,
        lon: lng,
        zoom,
        type: locationType,
        data: featureData
      };
      
      console.log('Click info:', clickInfo); // Debug log
      onLocationClick(clickInfo);
    } catch (error) {
      console.error('Error handling map click:', error);
    } finally {
      setIsQuerying(false);
    }
  }, [map, onLocationClick, isQuerying]);

  useMapEvents({
    click: handleMapClick
  });

  return null;
}