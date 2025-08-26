'use client';

import { useEffect, useState } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';

interface BorderOverlayProps {
  location?: {
    lat: number;
    lon: number;
    name: string;
    osm_id?: number;
    osm_type?: string;
    boundingbox?: string[];
    geojson?: any;
    type?: string;
    class?: string;
  };
  enabled: boolean;
  borderTypes: {
    country: boolean;
    state: boolean;
    city: boolean;
    district: boolean;
  };
}

interface BoundaryData {
  type: string;
  geometry: any;
  properties: {
    name: string;
    admin_level: string;
    boundary: string;
    osm_id?: string;
  };
}

export default function BorderOverlay({ location, enabled, borderTypes }: BorderOverlayProps) {
  const [boundaries, setBoundaries] = useState<BoundaryData[]>([]);
  const [loading, setLoading] = useState(false);
  const map = useMap();

  const getAdminLevelFromType = (type: string): string => {
    // Map OSM place types to admin levels
    if (type === 'country' || type === 'nation') return '2';
    if (type === 'state' || type === 'province') return '4';
    if (type === 'county' || type === 'region') return '6';
    if (type === 'city' || type === 'town' || type === 'municipality') return '8';
    if (type === 'suburb' || type === 'district' || type === 'neighbourhood') return '10';
    return '8'; // Default
  };

  useEffect(() => {
    if (!location || !enabled) {
      setBoundaries([]);
      return;
    }

    // If the search result has geojson, use it directly
    if (location.geojson && location.osm_id) {
      const directBoundary: BoundaryData = {
        type: 'Feature',
        geometry: location.geojson,
        properties: {
          name: location.name,
          admin_level: getAdminLevelFromType(location.type || ''),
          boundary: 'administrative',
          osm_id: location.osm_id.toString()
        }
      };
      setBoundaries([directBoundary]);
      setLoading(false);
    } else {
      // Otherwise fetch boundaries based on OSM ID or location
      if (location.osm_id && location.osm_type) {
        fetchBoundaryBySearchResult(location);
      } else {
        fetchBoundaries(location.lat, location.lon);
      }
    }
  }, [location, enabled]);

  const fetchBoundaryBySearchResult = async (location: any) => {
    setLoading(true);
    setBoundaries([]);
    
    try {
      const osmType = location.osm_type === 'node' ? 'N' : 
                     location.osm_type === 'way' ? 'W' : 'R';
      const osmId = `${osmType}${location.osm_id}`;
      
      // Fetch the boundary using the OSM ID from the search result
      const response = await fetch(
        `https://nominatim.openstreetmap.org/lookup?format=geojson&osm_ids=${osmId}&polygon_geojson=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          const boundary: BoundaryData = {
            type: 'Feature',
            geometry: feature.geometry,
            properties: {
              name: location.name,
              admin_level: getAdminLevelFromType(location.type || ''),
              boundary: 'administrative',
              osm_id: osmId
            }
          };
          setBoundaries([boundary]);
        }
      }
    } catch (error) {
      console.error('Error fetching boundary by search result:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBoundaries = async (lat: number, lon: number) => {
    setLoading(true);
    setBoundaries([]); // Clear existing boundaries
    
    try {
      // First, get the OSM IDs for the location using reverse geocoding
      const reverseResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&extratags=1`
      );
      
      if (!reverseResponse.ok) throw new Error('Failed to fetch location details');
      
      const locationData = await reverseResponse.json();
      console.log('Location data:', locationData);
      
      const boundaryPromises = [];
      
      // Extract OSM IDs for different admin levels from the response
      if (locationData.address) {
        // Country
        if (locationData.address.country && borderTypes.country) {
          boundaryPromises.push(
            fetchBoundaryByName(locationData.address.country, 'country')
          );
        }
        
        // State/Province
        if (locationData.address.state && borderTypes.state) {
          boundaryPromises.push(
            fetchBoundaryByName(locationData.address.state, 'state')
          );
        }
        
        // City
        const cityName = locationData.address.city || 
                        locationData.address.town || 
                        locationData.address.village;
        if (cityName && borderTypes.city) {
          boundaryPromises.push(
            fetchBoundaryByName(cityName, 'city')
          );
        }
        
        // District/Suburb
        const districtName = locationData.address.suburb || 
                            locationData.address.district ||
                            locationData.address.neighbourhood;
        if (districtName && borderTypes.district) {
          boundaryPromises.push(
            fetchBoundaryByName(districtName, 'district')
          );
        }
      }
      
      // Also try to get the boundary polygon for the exact location
      if (locationData.osm_id && locationData.osm_type) {
        const osmType = locationData.osm_type === 'node' ? 'N' : 
                       locationData.osm_type === 'way' ? 'W' : 'R';
        boundaryPromises.push(
          fetchBoundaryByOSMId(`${osmType}${locationData.osm_id}`)
        );
      }
      
      const results = await Promise.all(boundaryPromises);
      const validBoundaries = results.filter(b => b !== null) as BoundaryData[];
      
      console.log('Fetched boundaries:', validBoundaries);
      setBoundaries(validBoundaries);
      
    } catch (error) {
      console.error('Error fetching boundaries:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchBoundaryByName = async (name: string, type: string): Promise<BoundaryData | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=geojson&q=${encodeURIComponent(name)}&polygon_geojson=1&limit=1`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        return {
          type: 'Feature',
          geometry: feature.geometry,
          properties: {
            name: name,
            admin_level: type === 'country' ? '2' : 
                        type === 'state' ? '4' : 
                        type === 'city' ? '8' : '10',
            boundary: 'administrative',
            osm_id: feature.properties?.osm_id
          }
        };
      }
    } catch (error) {
      console.error(`Error fetching boundary for ${name}:`, error);
    }
    return null;
  };
  
  const fetchBoundaryByOSMId = async (osmId: string): Promise<BoundaryData | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/lookup?format=geojson&osm_ids=${osmId}&polygon_geojson=1`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        return {
          type: 'Feature',
          geometry: feature.geometry,
          properties: {
            name: feature.properties?.display_name || 'Unknown',
            admin_level: feature.properties?.admin_level || '8',
            boundary: 'administrative',
            osm_id: osmId
          }
        };
      }
    } catch (error) {
      console.error(`Error fetching boundary for OSM ID ${osmId}:`, error);
    }
    return null;
  };


  const getBorderStyle = (adminLevel: string) => {
    const level = parseInt(adminLevel) || 8;
    
    // Style borders based on administrative level
    if (level <= 2) {
      // Country borders
      return {
        color: '#FF0000',
        weight: 3,
        opacity: 0.8,
        fillOpacity: 0.05,
        dashArray: undefined
      };
    } else if (level <= 4) {
      // State/Province borders
      return {
        color: '#0000FF',
        weight: 2.5,
        opacity: 0.7,
        fillOpacity: 0.03,
        dashArray: '10, 5'
      };
    } else if (level <= 6) {
      // County/Region borders
      return {
        color: '#00AA00',
        weight: 2,
        opacity: 0.6,
        fillOpacity: 0.02,
        dashArray: '5, 5'
      };
    } else if (level <= 8) {
      // City borders
      return {
        color: '#FF8800',
        weight: 1.5,
        opacity: 0.5,
        fillOpacity: 0.01,
        dashArray: '3, 3'
      };
    } else {
      // District/Neighborhood borders
      return {
        color: '#AA00AA',
        weight: 1,
        opacity: 0.4,
        fillOpacity: 0,
        dashArray: '2, 2'
      };
    }
  };

  const shouldShowBorder = (adminLevel: string) => {
    const level = parseInt(adminLevel) || 8;
    
    if (level <= 2 && borderTypes.country) return true;
    if (level <= 4 && level > 2 && borderTypes.state) return true;
    if (level <= 8 && level > 4 && borderTypes.city) return true;
    if (level > 8 && borderTypes.district) return true;
    
    return false;
  };

  if (!enabled || boundaries.length === 0) return null;

  return (
    <>
      {boundaries.map((boundary, index) => {
        if (!shouldShowBorder(boundary.properties.admin_level)) return null;
        
        return (
          <GeoJSON
            key={`boundary-${index}`}
            data={boundary}
            style={getBorderStyle(boundary.properties.admin_level)}
            onEachFeature={(feature, layer) => {
              layer.bindPopup(`
                <div>
                  <strong>${feature.properties.name}</strong><br/>
                  Admin Level: ${feature.properties.admin_level}<br/>
                  Type: ${feature.properties.boundary}
                </div>
              `);
            }}
          />
        );
      })}
    </>
  );
}