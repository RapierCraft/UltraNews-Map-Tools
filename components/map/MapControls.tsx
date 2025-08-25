'use client';

import { Button } from '@/components/ui/button';
import { Locate, Layers } from 'lucide-react';
import LayerControls from './LayerControls';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

interface MapControlsProps {
  onLocate?: () => void;
  onLayerChange?: (layer: string) => void;
  onDataLayersChange?: (layers: LayerState) => void;
  currentLayer?: string;
  isDarkTheme?: boolean;
}

const layers = [
  { id: 'osm-standard', name: 'OpenStreetMap Standard' },
  { id: 'osm-de', name: 'OpenStreetMap DE' },
  { id: 'osm-fr', name: 'OpenStreetMap France' },
  { id: 'osm-hot', name: 'Humanitarian' },
  { id: 'osm-topo', name: 'OpenTopoMap' },
  { id: 'cyclosm', name: 'CyclOSM (Cycling)' },
  { id: 'cartodb-light', name: 'CartoDB Light' },
  { id: 'cartodb-dark', name: 'CartoDB Dark' },
  { id: 'cartodb-voyager', name: 'CartoDB Voyager' },
  { id: 'stamen-toner', name: 'Stamen Toner' },
  { id: 'stamen-terrain', name: 'Stamen Terrain' },
  { id: 'stamen-watercolor', name: 'Stamen Watercolor' },
  { id: 'esri-worldimagery', name: 'ESRI World Imagery' },
  { id: 'esri-worldstreet', name: 'ESRI World Street' },
  { id: 'esri-topo', name: 'ESRI Topographic' },
  { id: 'osm-dark', name: 'OpenStreetMap Dark' },
];

export default function MapControls({
  onLocate,
  onLayerChange,
  onDataLayersChange,
  currentLayer = 'osm-standard',
  isDarkTheme = false
}: MapControlsProps) {
  return (
    <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
      <Button
        size="icon"
        variant="outline"
        onClick={onLocate}
        title="My Location"
        className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 h-10 w-10 shadow-lg border-2"
      >
        <Locate className="h-5 w-5" />
      </Button>

      {/* OSM Data Layer Controls */}
      <LayerControls 
        onLayerChange={onDataLayersChange}
        isDarkTheme={isDarkTheme}
      />

      {/* Base Tile Layer Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            size="icon" 
            variant="outline" 
            title="Base Map Style" 
            className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 h-10 w-10 shadow-lg border-2"
          >
            <Layers className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="left" className="w-56 max-h-[400px] overflow-y-auto z-[1001]">
          <DropdownMenuLabel>Base Map Style</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {layers.map((layer) => (
            <DropdownMenuItem 
              key={layer.id} 
              onClick={() => onLayerChange?.(layer.id)}
              className={currentLayer === layer.id ? 'bg-accent text-accent-foreground' : ''}
            >
              {layer.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}