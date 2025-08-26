'use client';

import { useState } from 'react';
import { Settings2, Eye, EyeOff } from 'lucide-react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

interface LayerState {
  roads: boolean;
  buildings: boolean;
  waterways: boolean;
  parks: boolean;
  labels: boolean;
  poi: boolean; // Points of Interest
  transit: boolean;
  boundaries: boolean;
  landuse: boolean;
  hillshading: boolean;
}

interface LayerControlsProps {
  onLayerChange?: (layers: LayerState) => void;
  isDarkTheme?: boolean;
}

const defaultLayers: LayerState = {
  roads: true,
  buildings: true,
  waterways: true,
  parks: true,
  labels: true,
  poi: true,
  transit: true,
  boundaries: true,
  landuse: true,
  hillshading: false,
};

export default function LayerControls({ onLayerChange, isDarkTheme = false }: LayerControlsProps) {
  const [layers, setLayers] = useState<LayerState>(defaultLayers);
  const [isOpen, setIsOpen] = useState(false);

  const handleLayerToggle = (layerName: keyof LayerState) => {
    const newLayers = {
      ...layers,
      [layerName]: !layers[layerName],
    };
    setLayers(newLayers);
    onLayerChange?.(newLayers);
    logger.mapEvent('layer_toggled', { layer: layerName, enabled: newLayers[layerName] });
  };

  const resetToDefaults = () => {
    setLayers(defaultLayers);
    onLayerChange?.(defaultLayers);
  };

  const toggleAll = (enabled: boolean) => {
    const newLayers = Object.keys(layers).reduce((acc, key) => ({
      ...acc,
      [key]: enabled
    }), {} as LayerState);
    setLayers(newLayers);
    onLayerChange?.(newLayers);
  };

  const layerDefinitions = [
    { key: 'roads', label: 'Roads & Streets', description: 'All road types, highways, and pathways' },
    { key: 'buildings', label: 'Buildings', description: 'Building footprints and structures' },
    { key: 'waterways', label: 'Water Features', description: 'Rivers, lakes, coastlines, and water bodies' },
    { key: 'parks', label: 'Parks & Green Areas', description: 'Parks, forests, and recreational areas' },
    { key: 'labels', label: 'Labels & Names', description: 'Street names, place names, and text labels' },
    { key: 'poi', label: 'Points of Interest', description: 'Shops, restaurants, landmarks, and services' },
    { key: 'transit', label: 'Public Transit', description: 'Bus stops, train stations, and transit routes' },
    { key: 'boundaries', label: 'Administrative Boundaries', description: 'Country, state, and city boundaries' },
    { key: 'landuse', label: 'Land Use', description: 'Residential, commercial, and industrial areas' },
    { key: 'hillshading', label: 'Terrain & Elevation', description: 'Hillshading and topographic features' },
  ] as const;

  const enabledCount = Object.values(layers).filter(Boolean).length;
  const totalCount = Object.keys(layers).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 h-10 w-10 relative shadow-lg border-2"
          title="Layer Controls"
        >
          <Settings2 className="h-5 w-5" />
          {enabledCount < totalCount && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full text-[8px] text-white flex items-center justify-center">
              {enabledCount}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="left" align="end" className="w-80 max-h-[500px] overflow-y-auto z-[1001]">
        <Card className="border-none shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              OSM Data Layers
            </CardTitle>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{enabledCount} of {totalCount} layers enabled</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAll(true)}
                  className="h-6 px-2 text-xs"
                >
                  All On
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAll(false)}
                  className="h-6 px-2 text-xs"
                >
                  All Off
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetToDefaults}
                  className="h-6 px-2 text-xs"
                >
                  Reset
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {layerDefinitions.map(({ key, label, description }) => (
              <div key={key} className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {layers[key as keyof LayerState] ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    )}
                    <Label 
                      htmlFor={key}
                      className={`font-medium text-sm cursor-pointer ${
                        layers[key as keyof LayerState] ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {label}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 pl-6">
                    {description}
                  </p>
                </div>
                <Switch
                  id={key}
                  checked={layers[key as keyof LayerState]}
                  onCheckedChange={() => handleLayerToggle(key as keyof LayerState)}
                  className="shrink-0"
                />
              </div>
            ))}
            
            <Separator className="my-4" />
            
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Theme: {isDarkTheme ? 'Dark' : 'Light'}</p>
              <p>Layer visibility applies to the current theme. Switch themes to configure layers for each mode separately.</p>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}