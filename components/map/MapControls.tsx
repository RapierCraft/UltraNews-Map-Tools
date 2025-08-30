'use client';

import { Button } from '@/components/ui/button';
import { Locate, Layers, Map, Building, Navigation, Sun, Moon, Satellite } from 'lucide-react';
import LayerControls from './LayerControls';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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

interface BorderSettings {
  enabled: boolean;
  types: {
    country: boolean;
    state: boolean;
    city: boolean;
    district: boolean;
  };
}

interface MapControlsProps {
  onLocate?: () => void;
  onLayerChange?: (layer: string) => void;
  onDataLayersChange?: (layers: LayerState) => void;
  onBorderSettingsChange?: (settings: BorderSettings) => void;
  onBuildingsToggle?: (enabled: boolean) => void;
  onCompassClick?: () => void;
  currentLayer?: string;
  isDarkTheme?: boolean;
  borderSettings?: BorderSettings;
  showBuildings?: boolean;
  mapHeading?: number;
}

const mapStyles = [
  { id: 'osm-standard', name: 'Light', icon: Sun },
  { id: 'osm-dark', name: 'Dark', icon: Moon },
  { id: 'esri-worldimagery', name: 'Satellite', icon: Satellite },
];

export default function MapControls({
  onLocate,
  onLayerChange,
  onDataLayersChange,
  onBorderSettingsChange,
  onBuildingsToggle,
  onCompassClick,
  currentLayer = 'osm-standard',
  isDarkTheme = false,
  borderSettings = {
    enabled: false,
    types: {
      country: true,
      state: true,
      city: true,
      district: false
    }
  },
  showBuildings = true,
  mapHeading = 0
}: MapControlsProps) {
  const isMapRotated = Math.abs(mapHeading) > 1;
  
  // Find current style and get next one for cycling
  const currentStyleIndex = mapStyles.findIndex(style => style.id === currentLayer);
  const currentStyle = mapStyles[currentStyleIndex] || mapStyles[0];
  
  const handleMapStyleCycle = () => {
    const nextIndex = (currentStyleIndex + 1) % mapStyles.length;
    const nextStyle = mapStyles[nextIndex];
    onLayerChange?.(nextStyle.id);
  };

  return (
    <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
      {/* Compass Control - Google Maps style */}
      {isMapRotated && (
        <div className="relative">
          <Button
            size="icon"
            variant="outline"
            onClick={onCompassClick}
            title="Reset bearing to north"
            className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 h-10 w-10 shadow-lg border-2 relative overflow-hidden"
            style={{ transform: `rotate(${-mapHeading}deg)` }}
          >
            <div className="absolute inset-1 rounded-full border border-gray-300 dark:border-gray-600">
              {/* North indicator (red) */}
              <div 
                className="absolute w-0.5 h-2 bg-red-500"
                style={{ 
                  top: '1px', 
                  left: '50%', 
                  transform: 'translateX(-50%)' 
                }}
              />
              {/* Other cardinal directions */}
              <div 
                className="absolute w-2 h-0.5 bg-gray-400"
                style={{ 
                  top: '50%', 
                  right: '1px', 
                  transform: 'translateY(-50%)' 
                }}
              />
              <div 
                className="absolute w-0.5 h-2 bg-gray-400"
                style={{ 
                  bottom: '1px', 
                  left: '50%', 
                  transform: 'translateX(-50%)' 
                }}
              />
              <div 
                className="absolute w-2 h-0.5 bg-gray-400"
                style={{ 
                  top: '50%', 
                  left: '1px', 
                  transform: 'translateY(-50%)' 
                }}
              />
              {/* Center dot */}
              <div className="absolute top-1/2 left-1/2 w-0.5 h-0.5 bg-gray-600 dark:bg-gray-300 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
            </div>
          </Button>
          {/* N label */}
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 -translate-y-full pointer-events-none">
            <span className={`text-xs font-bold ${isDarkTheme ? 'text-red-400' : 'text-red-600'}`}>
              N
            </span>
          </div>
        </div>
      )}


      {/* OSM Data Layer Controls */}
      <LayerControls 
        onLayerChange={onDataLayersChange}
        isDarkTheme={isDarkTheme}
      />

      {/* Border Controls */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            size="icon" 
            variant="outline" 
            title="Border Settings" 
            className={`bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 h-10 w-10 shadow-lg border-2 ${borderSettings.enabled ? 'ring-2 ring-blue-500' : ''}`}
          >
            <Map className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="left" className="w-56 z-[1001]">
          <DropdownMenuLabel>Administrative Borders</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={borderSettings.enabled}
            onCheckedChange={(checked) => 
              onBorderSettingsChange?.({
                ...borderSettings,
                enabled: checked
              })
            }
          >
            Show Borders
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={!borderSettings.enabled}>
              Border Types
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuCheckboxItem
                checked={borderSettings.types.country}
                onCheckedChange={(checked) => 
                  onBorderSettingsChange?.({
                    ...borderSettings,
                    types: { ...borderSettings.types, country: checked }
                  })
                }
                disabled={!borderSettings.enabled}
              >
                Country
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={borderSettings.types.state}
                onCheckedChange={(checked) => 
                  onBorderSettingsChange?.({
                    ...borderSettings,
                    types: { ...borderSettings.types, state: checked }
                  })
                }
                disabled={!borderSettings.enabled}
              >
                State/Province
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={borderSettings.types.city}
                onCheckedChange={(checked) => 
                  onBorderSettingsChange?.({
                    ...borderSettings,
                    types: { ...borderSettings.types, city: checked }
                  })
                }
                disabled={!borderSettings.enabled}
              >
                City
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={borderSettings.types.district}
                onCheckedChange={(checked) => 
                  onBorderSettingsChange?.({
                    ...borderSettings,
                    types: { ...borderSettings.types, district: checked }
                  })
                }
                disabled={!borderSettings.enabled}
              >
                District
              </DropdownMenuCheckboxItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Locate User Button */}
      <Button
        size="icon"
        variant="outline"
        onClick={onLocate}
        title="Find my location"
        className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 h-10 w-10 shadow-lg border-2"
      >
        <Locate className="h-5 w-5" />
      </Button>

      {/* Map Style Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="outline"
            title={`Map Styles (currently ${currentStyle.name})`}
            className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 h-10 w-10 shadow-lg border-2"
          >
            <Layers className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="left" className="w-56 z-[1001]">
          <DropdownMenuLabel>Map Styles</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {mapStyles.map((style) => (
            <DropdownMenuItem 
              key={style.id} 
              onClick={() => onLayerChange?.(style.id)}
              className={currentLayer === style.id ? 'bg-accent text-accent-foreground' : ''}
            >
              <style.icon className="h-4 w-4 mr-2" />
              {style.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}