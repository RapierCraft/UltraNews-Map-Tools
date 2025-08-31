'use client';

import { useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';

interface VectorFeatureClickHandlerProps {
  onFeatureClick: (feature: any, zoom: number) => void;
}

export default function VectorFeatureClickHandler({ onFeatureClick }: VectorFeatureClickHandlerProps) {
  const map = useMap();
  const handlerRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    const handleClick = async (e: any) => {
      const zoom = map.getZoom();
      const point = e.containerPoint;
      const latlng = e.latlng;
      
      // Try to detect what's actually visible at this zoom level by looking at the tile layers
      // Since we're using raster tiles, we need to simulate feature detection based on zoom
      
      console.log('Map click at zoom:', zoom, 'point:', latlng);
      
      // Determine what type of feature should be prioritized at this zoom level
      let targetFeatureType = '';
      if (zoom <= 5) {
        targetFeatureType = 'country';
      } else if (zoom <= 8) {
        targetFeatureType = 'state';
      } else if (zoom <= 12) {
        targetFeatureType = 'city';
      } else if (zoom <= 15) {
        targetFeatureType = 'road';
      } else {
        targetFeatureType = 'building';
      }

      // Since we can't query vector features from raster tiles, 
      // we'll use a smarter reverse geocoding approach
      try {
        const result = await performSmartReverseGeocode(latlng.lat, latlng.lng, zoom, targetFeatureType);
        if (result) {
          onFeatureClick(result, zoom);
        }
      } catch (error) {
        console.error('Feature click detection failed:', error);
      }
    };

    // Add click handler
    map.on('click', handleClick);
    handlerRef.current = handleClick;

    return () => {
      if (handlerRef.current) {
        map.off('click', handlerRef.current);
      }
    };
  }, [map, onFeatureClick]);

  return null;
}

// Smart reverse geocoding that tries to find the most relevant feature for the zoom level
async function performSmartReverseGeocode(lat: number, lon: number, zoom: number, targetType: string) {
  // Use different zoom levels for Nominatim based on what we're looking for
  const zoomMap = {
    'country': 3,
    'state': 5, 
    'city': 10,
    'road': 16,
    'building': 18
  };
  
  const nominatimZoom = zoomMap[targetType] || Math.floor(zoom);
  
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      zoom: nominatimZoom.toString(),
      format: 'json',
      addressdetails: '1',
      extratags: '1',
      namedetails: '1',
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

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Post-process the result to match what should be visible at this zoom
    return adaptResultForZoom(result, zoom, targetType);
  } catch (error) {
    console.error('Smart reverse geocoding failed:', error);
    return null;
  }
}

// Adapt the geocoding result to show the most appropriate information for the zoom level
function adaptResultForZoom(result: any, zoom: number, targetType: string) {
  if (!result) return null;
  
  const adapted = { ...result };
  
  // Force the display name and type to match the zoom level expectation
  if (targetType === 'country' && result.address?.country) {
    adapted.display_name = result.address.country;
    adapted.name = result.address.country;
    adapted.type = 'country';
    adapted.class = 'place';
  } else if (targetType === 'state' && result.address?.state) {
    adapted.display_name = result.address.state;
    adapted.name = result.address.state;
    adapted.type = 'state';
    adapted.class = 'place';
  } else if (targetType === 'city' && (result.address?.city || result.address?.town)) {
    const cityName = result.address.city || result.address.town;
    adapted.display_name = cityName;
    adapted.name = cityName;
    adapted.type = result.address.city ? 'city' : 'town';
    adapted.class = 'place';
  } else if (targetType === 'road' && result.address?.road) {
    adapted.display_name = result.address.road;
    adapted.name = result.address.road;
    adapted.type = 'highway'; 
    adapted.class = 'highway';
  }
  
  return adapted;
}