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
      
      // Check if this might be a click on an administrative boundary
      // (This is a heuristic since we can't detect actual rendered features with raster tiles)
      const isLikelyBoundaryClick = await checkForAdminBoundaryClick(latlng.lat, latlng.lng, zoom);
      
      if (isLikelyBoundaryClick) {
        targetFeatureType = 'admin_boundary';
      } else if (zoom <= 5) {
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
        console.log('Performing smart geocode with target type:', targetFeatureType);
        const result = await performSmartReverseGeocode(latlng.lat, latlng.lng, zoom, targetFeatureType);
        console.log('Smart geocode result:', result);
        
        if (result) {
          console.log('Calling onFeatureClick with result');
          onFeatureClick(result, zoom);
        } else {
          console.log('No result returned from smart geocode');
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

// Check if click might be on an administrative boundary by looking for nearby admin features
async function checkForAdminBoundaryClick(lat: number, lon: number, zoom: number): Promise<boolean> {
  // For very low zoom (country level), always try boundary detection
  if (zoom <= 5) return true;
  
  // Only check for boundaries at zoom levels where they're typically visible
  if (zoom < 6 || zoom > 16) return false;
  
  try {
    // Quick check: get a reverse geocoding result and see if we're near administrative boundaries
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      zoom: '10', // Medium zoom for admin detection
      format: 'json',
      addressdetails: '1',
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

    if (!response.ok) return false;
    
    const result = await response.json();
    
    // Heuristic: if we have rich administrative info, user might be clicking on boundaries
    const address = result.address || {};
    const hasMultipleAdminLevels = [
      address.country,
      address.state || address.region || address.province,
      address.county,
      address.city || address.town,
      address.suburb || address.district
    ].filter(Boolean).length;
    
    // If we have 3+ admin levels and zoom is in boundary-visible range, likely a boundary click
    return hasMultipleAdminLevels >= 3 && zoom >= 8 && zoom <= 15;
  } catch (error) {
    return false;
  }
}

// Smart reverse geocoding that tries to find the most relevant feature for the zoom level
async function performSmartReverseGeocode(lat: number, lon: number, zoom: number, targetType: string) {
  try {
    // For administrative boundaries, try multiple approaches
    if (targetType === 'admin_boundary') {
      return await detectAdminBoundary(lat, lon, zoom);
    }
    
    // Use different zoom levels for Nominatim based on what we're looking for
    const zoomMap = {
      'country': 3,
      'state': 5, 
      'city': 10,
      'road': 16,
      'building': 18
    };
    
    const nominatimZoom = zoomMap[targetType] || Math.floor(zoom);
    
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

// Special function to detect administrative boundaries
async function detectAdminBoundary(lat: number, lon: number, zoom: number) {
  try {
    // For very low zoom (country level), use a different approach
    if (zoom <= 5) {
      return await detectCountryBoundary(lat, lon);
    }
    
    // Query for administrative boundaries specifically
    const searchParams = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      format: 'json',
      addressdetails: '1',
      extratags: '1',
      limit: '10',
      featuretype: 'A', // Administrative features only
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${searchParams}`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'MapMap-Tools/1.0',
        }
      }
    );

    if (!response.ok) {
      return await fallbackBoundaryDetection(lat, lon, zoom);
    }

    const results = await response.json();
    
    // Filter for administrative areas and score by relevance
    const adminResults = results.filter((r: any) => 
      r.class === 'boundary' || 
      r.class === 'place' ||
      (r.type && ['state', 'county', 'province', 'region', 'administrative'].includes(r.type))
    );

    if (adminResults.length > 0) {
      // Score admin results by zoom appropriateness
      const scored = adminResults.map((r: any) => ({
        ...r,
        score: scoreAdminBoundary(r, zoom)
      }));
      
      scored.sort((a, b) => b.score - a.score);
      return adaptAdminResult(scored[0], zoom);
    }
    
    return await fallbackBoundaryDetection(lat, lon, zoom);
  } catch (error) {
    console.error('Admin boundary detection failed:', error);
    return await fallbackBoundaryDetection(lat, lon, zoom);
  }
}

// Special function to detect country boundaries at low zoom
async function detectCountryBoundary(lat: number, lon: number) {
  try {
    console.log('Detecting country boundary at:', lat, lon);
    
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      zoom: '3', // Low zoom for country detection
      format: 'json',
      addressdetails: '1',
      extratags: '1',
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
      console.error('Country detection request failed:', response.status);
      return null;
    }

    const result = await response.json();
    console.log('Country detection result:', result);
    
    if (result && result.address?.country) {
      // Force it to be a country boundary result
      const adapted = {
        ...result,
        name: result.address.country,
        display_name: result.address.country,
        type: 'country',
        class: 'boundary',
        admin_level: '2', // Country level
      };
      
      console.log('Adapted country result:', adapted);
      return adapted;
    }
    
    return result;
  } catch (error) {
    console.error('Country boundary detection failed:', error);
    return null;
  }
}

// Fallback to regular reverse geocoding but prioritize admin features
async function fallbackBoundaryDetection(lat: number, lon: number, zoom: number) {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    zoom: (zoom <= 10 ? Math.max(zoom - 2, 3) : Math.min(zoom, 14)).toString(),
    format: 'json',
    addressdetails: '1',
    extratags: '1',
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

  if (!response.ok) return null;
  
  const result = await response.json();
  return adaptAdminResult(result, zoom);
}

// Score administrative boundaries based on zoom appropriateness  
function scoreAdminBoundary(result: any, zoom: number): number {
  let score = 0;
  const type = result.type;
  
  // Different admin levels are appropriate at different zooms
  if (zoom >= 8 && zoom <= 12) {
    // Good zoom for states/provinces/counties
    if (type === 'state' || type === 'province' || type === 'region') score += 10;
    if (type === 'county' || type === 'administrative') score += 8;
  } else if (zoom >= 11 && zoom <= 15) {
    // Good zoom for counties/districts
    if (type === 'county' || type === 'district') score += 10;
    if (type === 'administrative') score += 8;
    if (type === 'state') score += 6; // Still relevant but less priority
  } else if (zoom >= 6 && zoom <= 10) {
    // State level boundaries
    if (type === 'state' || type === 'province') score += 10;
  }
  
  // Bonus for named boundaries
  if (result.name) score += 3;
  
  return score;
}

// Adapt admin results for display
function adaptAdminResult(result: any, zoom: number) {
  if (!result) return null;
  
  const adapted = { ...result };
  const address = result.address || {};
  
  // Force the result to show admin boundary information based on zoom level
  if (zoom <= 5 && address.country) {
    // Country level
    adapted.display_name = address.country;
    adapted.name = address.country;
    adapted.type = 'country';
    adapted.class = 'boundary';
    adapted.admin_level = '2'; // Country level
  } else if (zoom >= 6 && zoom <= 10 && address.state) {
    // State level  
    adapted.display_name = address.state;
    adapted.name = address.state;
    adapted.type = 'state';
    adapted.class = 'boundary';
    adapted.admin_level = '4'; // State level
  } else if (zoom >= 8 && zoom <= 15 && address.state) {
    adapted.display_name = address.state;
    adapted.name = address.state;
    adapted.type = 'state';
    adapted.class = 'boundary';
    adapted.admin_level = '4'; // State level
  } else if (zoom >= 11 && zoom <= 16 && address.county) {
    adapted.display_name = address.county;
    adapted.name = address.county;
    adapted.type = 'county';
    adapted.class = 'boundary';
    adapted.admin_level = '6'; // County level
  }
  
  return adapted;
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