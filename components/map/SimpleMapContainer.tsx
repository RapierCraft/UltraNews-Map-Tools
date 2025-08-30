'use client';

import { MapContainer as LeafletMapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import ZoomControl from './ZoomControl';
import MapController from './MapController';
import BorderOverlay from './BorderOverlay';
import TimezoneOverlay from './TimezoneOverlay';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});


interface SimpleMapContainerProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    popup?: string;
    id: string;
  }>;
  className?: string;
  style?: React.CSSProperties;
  tileLayer?: string;
  isDarkTheme?: boolean;
  selectedLocation?: {
    lat: number;
    lon: number;
    name: string;
    osm_id?: number;
    osm_type?: string;
    boundingbox?: string[];
    geojson?: object;
    type?: string;
    class?: string;
  };
  borderSettings?: {
    enabled: boolean;
    types: {
      country: boolean;
      state: boolean;
      city: boolean;
      district: boolean;
    };
  };
  boundsToFit?: [[number, number], [number, number]];
  onClick?: (e: { latlng: { lat: number; lng: number } }) => void;
}

const tileLayers: Record<string, { url: string; attribution: string; maxZoom?: number }> = {
  'osm-standard': {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  'cartodb-light': {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  'cartodb-dark': {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  'cartodb-voyager': {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  'esri-worldimagery': {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
};

// Component to handle map clicks
function MapClickHandler({ onClick }: { onClick?: (e: { latlng: { lat: number; lng: number } }) => void }) {
  useMapEvents({
    click: (e) => {
      if (onClick) {
        onClick(e);
      }
    },
  });
  return null;
}

export default function SimpleMapContainer({
  center = [51.505, -0.09],
  zoom = 13,
  markers = [],
  className = '',
  style = {},
  tileLayer = 'osm-standard',
  isDarkTheme = false,
  selectedLocation,
  borderSettings = {
    enabled: true,
    types: {
      country: true,
      state: true,
      city: true,
      district: false
    }
  },
  boundsToFit,
  onClick
}: SimpleMapContainerProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className={`w-full h-full bg-gray-100 animate-pulse ${className}`} style={style}>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Loading map...</p>
        </div>
      </div>
    );
  }

  // Always use OSM standard and apply CSS filters for theming
  const selectedLayer = tileLayers['osm-standard'];

  return (
    <LeafletMapContainer
      center={center}
      zoom={zoom}
      className={`w-full h-full ${className} ${isDarkTheme ? 'dark-map' : ''}`}
      style={{ ...style }}
      maxZoom={selectedLayer.maxZoom || 19}
      minZoom={3}
      maxBounds={[[-85, -180], [85, 180]]}
      maxBoundsViscosity={1.0}
      zoomControl={false}
    >
      <MapController center={center} zoom={zoom} boundsToFit={boundsToFit} />
      <ZoomControl position="topright" />
      <MapClickHandler onClick={onClick} />
      
      {/* Tile Layer with CSS filters for dark theme */}
      <TileLayer
        key={`osm-standard-${isDarkTheme ? 'dark' : 'light'}`}
        attribution={selectedLayer.attribution}
        url={selectedLayer.url}
        maxZoom={selectedLayer.maxZoom || 19}
      />
      
      {/* Timezone overlay */}
      <TimezoneOverlay enabled={true} isDarkTheme={isDarkTheme} />
      
      {/* Border overlay */}
      {borderSettings.enabled && selectedLocation && (
        <BorderOverlay 
          location={selectedLocation}
          enabled={borderSettings.enabled}
          borderTypes={borderSettings.types}
        />
      )}
      
      {/* Markers */}
      {markers.map((marker) => (
        <Marker key={marker.id} position={marker.position}>
          {marker.popup && <Popup>{marker.popup}</Popup>}
        </Marker>
      ))}
    </LeafletMapContainer>
  );
}