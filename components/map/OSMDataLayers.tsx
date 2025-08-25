'use client';

import { TileLayer } from 'react-leaflet';
import { useEffect } from 'react';

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

interface OSMDataLayersProps {
  layers: LayerState;
  isDarkTheme?: boolean;
}

export default function OSMDataLayers({ layers, isDarkTheme = false }: OSMDataLayersProps) {
  useEffect(() => {
    console.log('OSM Data Layers updated:', layers);
  }, [layers]);

  // Individual overlay URLs for different OSM data types
  const overlayUrls = {
    // Roads - OpenStreetMap roads-only overlay
    roads: isDarkTheme 
      ? 'https://tiles.stadiamaps.com/tiles/stamen_toner_lines/{z}/{x}/{y}{r}.png'
      : 'https://tiles.stadiamaps.com/tiles/stamen_toner_lines/{z}/{x}/{y}{r}.png',
    
    // Buildings - 3D buildings overlay
    buildings: 'https://data.osmbuildings.org/0.2/anonymous/tile/{z}/{x}/{y}.json',
    
    // Waterways - Water features overlay
    waterways: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg',
    
    // Parks and forests - Green areas
    parks: isDarkTheme
      ? 'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png'
      : 'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png',
    
    // Labels - Text overlay
    labels: isDarkTheme
      ? 'https://tiles.stadiamaps.com/tiles/stamen_toner_labels/{z}/{x}/{y}{r}.png'
      : 'https://tiles.stadiamaps.com/tiles/stamen_toner_labels/{z}/{x}/{y}{r}.png',
    
    // POI - Points of interest
    poi: 'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png',
    
    // Transit - Public transportation
    transit: 'https://tile.memomaps.de/tilegen/{z}/{x}/{y}.png',
    
    // Boundaries - Administrative lines
    boundaries: 'https://tiles.stadiamaps.com/tiles/stamen_toner_lines/{z}/{x}/{y}{r}.png',
    
    // Land use - Different area types
    landuse: 'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png',
    
    // Hillshading - Terrain relief
    hillshading: 'https://tiles.stadiamaps.com/tiles/stamen_terrain_background/{z}/{x}/{y}{r}.png',
  };

  const overlayAttribution = '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <>
      {/* Render only enabled layers */}
      
      {/* Base terrain/hillshading - render first */}
      {layers.hillshading && (
        <TileLayer
          key="hillshading-layer"
          url={overlayUrls.hillshading}
          attribution={overlayAttribution}
          opacity={0.4}
          zIndex={100}
        />
      )}
      
      {/* Land use areas */}
      {layers.landuse && (
        <TileLayer
          key="landuse-layer"
          url={overlayUrls.landuse}
          attribution={overlayAttribution}
          opacity={0.3}
          zIndex={200}
        />
      )}
      
      {/* Water features */}
      {layers.waterways && (
        <TileLayer
          key="waterways-layer"
          url="https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg"
          attribution={overlayAttribution}
          opacity={0.6}
          zIndex={300}
        />
      )}
      
      {/* Parks and green areas */}
      {layers.parks && (
        <TileLayer
          key="parks-layer"
          url="https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png"
          attribution={overlayAttribution}
          opacity={0.4}
          zIndex={400}
        />
      )}
      
      {/* Roads */}
      {layers.roads && (
        <TileLayer
          key="roads-layer"
          url="https://tiles.stadiamaps.com/tiles/stamen_toner_lines/{z}/{x}/{y}{r}.png"
          attribution={overlayAttribution}
          opacity={0.8}
          zIndex={500}
        />
      )}
      
      {/* Administrative boundaries */}
      {layers.boundaries && (
        <TileLayer
          key="boundaries-layer"
          url="https://tiles.stadiamaps.com/tiles/stamen_toner_lines/{z}/{x}/{y}{r}.png"
          attribution={overlayAttribution}
          opacity={0.3}
          zIndex={600}
        />
      )}
      
      {/* Transit lines */}
      {layers.transit && (
        <TileLayer
          key="transit-layer"
          url="https://tile.memomaps.de/tilegen/{z}/{x}/{y}.png"
          attribution="&copy; MemoMaps &copy; OpenStreetMap contributors"
          opacity={0.7}
          zIndex={700}
        />
      )}
      
      {/* Points of Interest */}
      {layers.poi && (
        <TileLayer
          key="poi-layer"
          url="https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png"
          attribution={overlayAttribution}
          opacity={0.5}
          zIndex={800}
        />
      )}
      
      {/* Text labels - render on top */}
      {layers.labels && (
        <TileLayer
          key="labels-layer"
          url={isDarkTheme 
            ? "https://tiles.stadiamaps.com/tiles/stamen_toner_labels/{z}/{x}/{y}{r}.png"
            : "https://tiles.stadiamaps.com/tiles/stamen_toner_labels/{z}/{x}/{y}{r}.png"
          }
          attribution={overlayAttribution}
          opacity={1.0}
          zIndex={900}
        />
      )}
    </>
  );
}