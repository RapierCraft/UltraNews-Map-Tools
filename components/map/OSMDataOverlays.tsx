'use client';

import { TileLayer } from 'react-leaflet';

interface LayerState {
  roads: boolean;
  buildings: boolean;
  waterways: boolean;
  parks: boolean;
  labels: boolean;
  poi: boolean;
  transit: boolean;
  boundaries: boolean;
  landuse: boolean;
  hillshading: boolean;
}

interface OSMDataOverlaysProps {
  layers: LayerState;
  isDarkTheme?: boolean;
}

export default function OSMDataOverlays({ layers, isDarkTheme = false }: OSMDataOverlaysProps) {
  // Base URL patterns for different overlay types
  const overlayUrls = {
    // Roads overlay - separate roads layer
    roads: isDarkTheme
      ? 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    
    // Buildings overlay
    buildings: 'https://data.osmbuildings.org/0.2/anonymous/tile/{z}/{x}/{y}.json',
    
    // Waterways overlay
    waterways: isDarkTheme
      ? 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    
    // Parks and green areas
    parks: 'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png',
    
    // Labels overlay
    labels: isDarkTheme
      ? 'https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png'
      : 'https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png',
    
    // Points of Interest
    poi: 'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png',
    
    // Transit overlay
    transit: 'https://tile.memomaps.de/tilegen/{z}/{x}/{y}.png',
    
    // Administrative boundaries
    boundaries: 'https://tiles.stadiamaps.com/tiles/stamen_toner_lines/{z}/{x}/{y}{r}.png',
    
    // Land use overlay
    landuse: 'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png',
    
    // Hillshading/terrain
    hillshading: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png',
  };

  const overlayAttribution = {
    roads: '&copy; OpenStreetMap contributors',
    buildings: '&copy; OSM Buildings',
    waterways: '&copy; OpenStreetMap contributors',
    parks: '&copy; Stadia Maps &copy; OpenStreetMap contributors',
    labels: '&copy; Stadia Maps &copy; OpenStreetMap contributors',
    poi: '&copy; Stadia Maps &copy; OpenStreetMap contributors',
    transit: '&copy; MemoMaps &copy; OpenStreetMap contributors',
    boundaries: '&copy; Stadia Maps &copy; OpenStreetMap contributors',
    landuse: '&copy; Stadia Maps &copy; OpenStreetMap contributors',
    hillshading: '&copy; Stadia Maps &copy; OpenStreetMap contributors',
  };

  return (
    <>
      {/* Render overlay tile layers based on enabled layers */}
      {layers.hillshading && (
        <TileLayer
          key="hillshading-overlay"
          url={overlayUrls.hillshading}
          attribution={overlayAttribution.hillshading}
          opacity={0.6}
          zIndex={1}
        />
      )}
      
      {layers.landuse && (
        <TileLayer
          key="landuse-overlay"
          url={overlayUrls.landuse}
          attribution={overlayAttribution.landuse}
          opacity={0.7}
          zIndex={2}
        />
      )}
      
      {layers.waterways && (
        <TileLayer
          key="waterways-overlay"
          url={overlayUrls.waterways}
          attribution={overlayAttribution.waterways}
          opacity={0.8}
          zIndex={3}
        />
      )}
      
      {layers.parks && (
        <TileLayer
          key="parks-overlay"
          url={overlayUrls.parks}
          attribution={overlayAttribution.parks}
          opacity={0.6}
          zIndex={4}
        />
      )}
      
      {layers.buildings && (
        <TileLayer
          key="buildings-overlay"
          url={overlayUrls.buildings}
          attribution={overlayAttribution.buildings}
          opacity={0.8}
          zIndex={5}
        />
      )}
      
      {layers.roads && (
        <TileLayer
          key="roads-overlay"
          url={overlayUrls.roads}
          attribution={overlayAttribution.roads}
          opacity={1.0}
          zIndex={6}
        />
      )}
      
      {layers.boundaries && (
        <TileLayer
          key="boundaries-overlay"
          url={overlayUrls.boundaries}
          attribution={overlayAttribution.boundaries}
          opacity={0.5}
          zIndex={7}
        />
      )}
      
      {layers.transit && (
        <TileLayer
          key="transit-overlay"
          url={overlayUrls.transit}
          attribution={overlayAttribution.transit}
          opacity={0.8}
          zIndex={8}
        />
      )}
      
      {layers.poi && (
        <TileLayer
          key="poi-overlay"
          url={overlayUrls.poi}
          attribution={overlayAttribution.poi}
          opacity={0.7}
          zIndex={9}
        />
      )}
      
      {layers.labels && (
        <TileLayer
          key="labels-overlay"
          url={overlayUrls.labels}
          attribution={overlayAttribution.labels}
          opacity={1.0}
          zIndex={10}
        />
      )}
    </>
  );
}