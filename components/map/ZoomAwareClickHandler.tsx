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

  const reverseGeocode = async (lat: number, lon: number, zoom: number) => {
    const zoomLevel = Math.floor(zoom);
    
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        zoom: zoomLevel.toString(),
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return null;
    }
  };

  const handleMapClick = useCallback(async (e: any) => {
    if (isQuerying) return;
    
    const { lat, lng } = e.latlng;
    const zoom = map.getZoom();
    const locationType = getLocationTypeByZoom(zoom);
    
    setIsQuerying(true);
    
    try {
      const geocodeData = await reverseGeocode(lat, lng, zoom);
      
      const clickInfo: ClickInfo = {
        lat,
        lon: lng,
        zoom,
        type: locationType,
        data: geocodeData
      };
      
      onLocationClick(clickInfo);
    } finally {
      setIsQuerying(false);
    }
  }, [map, onLocationClick, isQuerying]);

  useMapEvents({
    click: handleMapClick
  });

  return null;
}