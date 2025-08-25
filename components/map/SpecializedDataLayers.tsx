'use client';

import { TileLayer } from 'react-leaflet';
import SimpleBuildingOverlay from './SimpleBuildingOverlay';

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

interface SpecializedDataLayersProps {
  layers: LayerState;
  isDarkTheme?: boolean;
}

export default function SpecializedDataLayers({ layers, isDarkTheme = false }: SpecializedDataLayersProps) {
  // Use specialized tile servers that provide individual OSM data types
  
  return (
    <>
      {/* Roads only layer */}
      {layers.roads && (
        <TileLayer
          key="roads-only"
          url="https://b.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/">Humanitarian OpenStreetMap Team</a>'
          opacity={0.8}
          zIndex={500}
        />
      )}

      {/* Waterways layer */}
      {layers.waterways && (
        <TileLayer
          key="water-features"
          url="https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg"
          attribution='&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          opacity={0.6}
          zIndex={300}
        />
      )}

      {/* Parks and green spaces */}
      {layers.parks && (
        <TileLayer
          key="green-areas"
          url="https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          opacity={0.5}
          zIndex={400}
        />
      )}

      {/* Public transit */}
      {layers.transit && (
        <TileLayer
          key="transit-layer"
          url="https://tile.memomaps.de/tilegen/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://memomaps.de/">MemoMaps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          opacity={0.7}
          zIndex={700}
        />
      )}

      {/* Administrative boundaries */}
      {layers.boundaries && (
        <TileLayer
          key="boundaries-layer"
          url="https://tiles.stadiamaps.com/tiles/stamen_toner_lines/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          opacity={0.4}
          zIndex={600}
        />
      )}

      {/* Hillshading/terrain */}
      {layers.hillshading && (
        <TileLayer
          key="terrain-relief"
          url="https://tiles.stadiamaps.com/tiles/stamen_terrain_background/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          opacity={0.4}
          zIndex={100}
        />
      )}

      {/* Labels overlay */}
      {layers.labels && (
        <TileLayer
          key="text-labels"
          url={isDarkTheme 
            ? "https://tiles.stadiamaps.com/tiles/stamen_toner_labels/{z}/{x}/{y}{r}.png"
            : "https://tiles.stadiamaps.com/tiles/stamen_toner_labels/{z}/{x}/{y}{r}.png"
          }
          attribution='&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          opacity={1.0}
          zIndex={900}
        />
      )}

      {/* Building overlay component */}
      <SimpleBuildingOverlay 
        enabled={layers.buildings} 
        isDarkTheme={isDarkTheme}
        opacity={0.6}
      />

      {/* POI and land use - show visual feedback when toggled */}
      {layers.poi && (
        <div style={{ 
          position: 'absolute', 
          top: '100px', 
          left: '10px', 
          zIndex: 1000, 
          backgroundColor: 'rgba(0,128,0,0.8)', 
          color: 'white', 
          padding: '4px 8px', 
          borderRadius: '4px',
          fontSize: '12px',
          pointerEvents: 'none'
        }}>
          POI Layer Active
        </div>
      )}

      {layers.landuse && (
        <div style={{ 
          position: 'absolute', 
          top: '160px', 
          left: '10px', 
          zIndex: 1000, 
          backgroundColor: 'rgba(0,0,128,0.8)', 
          color: 'white', 
          padding: '4px 8px', 
          borderRadius: '4px',
          fontSize: '12px',
          pointerEvents: 'none'
        }}>
          Land Use Layer Active
        </div>
      )}
    </>
  );
}