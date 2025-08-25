'use client';

import { TileLayer } from 'react-leaflet';
import { useEffect, useState } from 'react';

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

interface CustomTileLayerProps {
  baseLayer: string;
  layers: LayerState;
  isDarkTheme?: boolean;
  attribution: string;
  url: string;
  maxZoom?: number;
}

export default function CustomTileLayer({ 
  baseLayer, 
  layers, 
  isDarkTheme = false, 
  attribution, 
  url, 
  maxZoom = 19 
}: CustomTileLayerProps) {
  const [tileUrl, setTileUrl] = useState(url);
  const [cssFilter, setCssFilter] = useState('');

  useEffect(() => {
    // Generate CSS filters based on enabled layers
    let filters: string[] = [];
    
    // If certain layers are disabled, apply filters to hide them
    if (!layers.roads) {
      // Reduce road visibility
      filters.push('contrast(0.3)');
    }
    
    if (!layers.buildings) {
      // Reduce building visibility
      filters.push('brightness(1.2)');
    }
    
    if (!layers.waterways) {
      // Desaturate water features
      filters.push('saturate(0.5)');
    }
    
    if (!layers.parks) {
      // Desaturate green areas
      filters.push('hue-rotate(180deg)');
    }
    
    if (!layers.labels) {
      // This would require a different approach as CSS can't hide text
      // We'll handle this by switching to a tiles-only version
    }
    
    if (!layers.landuse) {
      filters.push('grayscale(0.5)');
    }
    
    // Combine all filters
    setCssFilter(filters.length > 0 ? filters.join(' ') : '');
    
    // Choose appropriate tile URL based on layer requirements
    if (!layers.labels && baseLayer === 'osm-standard') {
      // Switch to a version without labels if available
      setTileUrl('https://tiles.stadiamaps.com/tiles/osm_bright_nolabels/{z}/{x}/{y}{r}.png');
    } else if (!layers.labels && baseLayer === 'osm-dark') {
      setTileUrl('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark_nolabels/{z}/{x}/{y}{r}.png');
    } else {
      setTileUrl(url);
    }
  }, [layers, baseLayer, url]);

  return (
    <>
      <TileLayer
        key={`${baseLayer}-${Object.values(layers).join('-')}`}
        attribution={attribution}
        url={tileUrl}
        maxZoom={maxZoom}
        className="custom-tile-layer"
        style={{
          filter: cssFilter,
          transition: 'filter 0.3s ease-in-out'
        } as any}
      />
      
      {/* Add style tag for CSS filters */}
      <style jsx>{`
        .custom-tile-layer {
          filter: ${cssFilter};
          transition: filter 0.3s ease-in-out;
        }
      `}</style>
    </>
  );
}