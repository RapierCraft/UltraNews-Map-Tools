'use client';

import { TileLayer } from 'react-leaflet';
import { useEffect } from 'react';
import { logger } from '@/lib/logger';

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

interface FilterableOSMTilesProps {
  layers: LayerState;
  isDarkTheme?: boolean;
  tileLayer: string;
}

export default function FilterableOSMTiles({ layers, isDarkTheme = false, tileLayer }: FilterableOSMTilesProps) {
  
  // Create a custom tile URL based on what layers are enabled
  const getFilteredTileUrl = () => {
    // Count enabled layers
    const enabledLayers = Object.values(layers).filter(Boolean).length;
    const totalLayers = Object.keys(layers).length;
    
    logger.debug(`Layers enabled: ${enabledLayers}/${totalLayers}`, layers);
    
    // Use base layers without buildings when buildings are disabled
    if (!layers.buildings) {
      if (isDarkTheme) {
        // Use dark base layer without buildings
        return 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark_nolabels/{z}/{x}/{y}{r}.png';
      } else {
        // Use light base layer without buildings  
        return 'https://tiles.stadiamaps.com/tiles/osm_bright_nolabels/{z}/{x}/{y}{r}.png';
      }
    }
    
    if (!layers.labels) {
      // Use OpenStreetMap.fr which has a no-labels variant
      return 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png';
    }
    
    // Default to standard OSM (free, no limits)
    return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  };

  const generateCSSFilter = () => {
    let filters: string[] = [];
    
    // Dark theme base filter
    if (isDarkTheme) {
      filters.push('invert(1)'); // Invert colors for dark theme
      filters.push('hue-rotate(180deg)'); // Adjust hue after inversion
      filters.push('brightness(0.8)'); // Reduce brightness for dark theme
      filters.push('contrast(1.2)'); // Increase contrast
    }
    
    // Apply filters based on disabled layers
    if (!layers.waterways) {
      filters.push('sepia(0.3)'); // Reduce blue tones
    }
    
    if (!layers.parks) {
      filters.push('hue-rotate(30deg)'); // Shift green tones
    }
    
    // Buildings are now handled by base layer selection, no CSS filter needed
    
    if (!layers.roads) {
      filters.push('contrast(0.7)'); // Reduce road contrast
    }
    
    // If most layers disabled, apply strong desaturation
    const enabledCount = Object.values(layers).filter(Boolean).length;
    if (enabledCount < 5) {
      filters.push('saturate(0.5)');
    }
    
    if (enabledCount < 3) {
      filters.push('grayscale(0.5)');
    }
    
    return filters.join(' ');
  };

  const tileUrl = getFilteredTileUrl();
  const cssFilter = generateCSSFilter();
  const layerKey = `${tileLayer}-${JSON.stringify(layers)}`;

  useEffect(() => {
    logger.debug('Tile URL changed', { url: tileUrl });
    logger.debug('CSS Filter applied', { filter: cssFilter });
  }, [tileUrl, cssFilter]);

  return (
    <>
      <TileLayer
        key={layerKey}
        url={tileUrl}
        attribution={!layers.buildings 
          ? '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }
        maxZoom={19}
        zIndex={1}
        className="filterable-tiles"
      />
      
      {/* Apply CSS filters via style injection */}
      <style jsx global>{`
        .filterable-tiles {
          filter: ${cssFilter};
          transition: filter 0.5s ease-in-out;
        }
        
        /* Hide specific map elements when layers are disabled */
        ${!layers.labels ? `
        .leaflet-overlay-pane .leaflet-marker-pane {
          opacity: 0.3;
        }
        ` : ''}
        
        ${!layers.roads ? `
        .leaflet-tile {
          filter: ${cssFilter} blur(0.5px);
        }
        ` : ''}
      `}</style>
      
      {/* Visual feedback overlays */}
      {Object.values(layers).filter(Boolean).length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 'bold',
          pointerEvents: 'none'
        }}>
          All OSM Data Layers Disabled
        </div>
      )}
      
      {Object.values(layers).every(Boolean) && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          backgroundColor: 'rgba(0,128,0,0.8)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 'bold',
          pointerEvents: 'none'
        }}>
          All OSM Data Layers Enabled
        </div>
      )}
    </>
  );
}