'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Train, 
  Bus, 
  ChevronDown, 
  ChevronUp,
  MapPin,
  Route,
  Eye,
  EyeOff,
  Ship,
  TramFront
} from 'lucide-react';

interface TransitSettings {
  enabled: boolean;
  showStations: boolean;
  showLines: boolean;
  routeTypes: {
    metro: boolean;
    bus: boolean;
    rail: boolean;
    ferry: boolean;
    tram: boolean;
  };
}

interface NativeTransitControlsProps {
  settings: TransitSettings;
  onSettingsChange: (settings: TransitSettings) => void;
  className?: string;
  isDarkMode?: boolean;
}

export default function NativeTransitControls({
  settings,
  onSettingsChange,
  className = '',
  isDarkMode = false
}: NativeTransitControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateSettings = (updates: Partial<TransitSettings>) => {
    onSettingsChange({ ...settings, ...updates });
  };

  const updateRouteTypes = (type: keyof TransitSettings['routeTypes'], enabled: boolean) => {
    onSettingsChange({
      ...settings,
      routeTypes: { ...settings.routeTypes, [type]: enabled }
    });
  };

  const toggleAll = () => {
    updateSettings({ enabled: !settings.enabled });
  };

  // Count active route types
  const activeCount = Object.values(settings.routeTypes).filter(v => v).length;

  return (
    <Card className={`${className} ${isDarkMode ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-sm shadow-lg border-0`}>
      {/* Main Toggle */}
      <div className="p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleAll}
          className={`w-full justify-between h-9 px-3 ${settings.enabled ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
        >
          <div className="flex items-center gap-2">
            <Train className={`w-4 h-4 ${settings.enabled ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} />
            <span className="text-sm font-medium">Transit</span>
            {settings.enabled && activeCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full">
                {activeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {settings.enabled ? (
              <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-gray-400" />
            )}
          </div>
        </Button>
      </div>

      {/* Expanded Options */}
      {settings.enabled && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Quick Toggles */}
          <div className="p-2 flex gap-1">
            <Button
              size="sm"
              variant={settings.showStations ? "default" : "outline"}
              onClick={() => updateSettings({ showStations: !settings.showStations })}
              className="flex-1 h-7 text-xs"
            >
              <MapPin className="w-3 h-3 mr-1" />
              Stations
            </Button>
            <Button
              size="sm"
              variant={settings.showLines ? "default" : "outline"}
              onClick={() => updateSettings({ showLines: !settings.showLines })}
              className="flex-1 h-7 text-xs"
            >
              <Route className="w-3 h-3 mr-1" />
              Lines
            </Button>
          </div>

          {/* Route Type Filters */}
          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              <span className="font-medium">Filter by Type</span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {isExpanded && (
              <div className="mt-2 space-y-1">
                {/* Metro/Subway - Primary */}
                <label className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <span className="text-xs font-medium">Metro/Subway</span>
                  </div>
                  <Switch
                    checked={settings.routeTypes.metro}
                    onCheckedChange={(enabled) => updateRouteTypes('metro', enabled)}
                    className="scale-75"
                  />
                </label>

                {/* Regional Rail */}
                <label className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full" />
                    <span className="text-xs font-medium">Regional Rail</span>
                  </div>
                  <Switch
                    checked={settings.routeTypes.rail}
                    onCheckedChange={(enabled) => updateRouteTypes('rail', enabled)}
                    className="scale-75"
                  />
                </label>

                {/* Light Rail/Tram */}
                <label className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <TramFront className="w-3 h-3 text-orange-500" />
                    <span className="text-xs font-medium">Light Rail</span>
                  </div>
                  <Switch
                    checked={settings.routeTypes.tram}
                    onCheckedChange={(enabled) => updateRouteTypes('tram', enabled)}
                    className="scale-75"
                  />
                </label>

                {/* Bus - Hidden by default */}
                <label className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Bus className="w-3 h-3 text-green-500" />
                    <span className="text-xs font-medium">Bus</span>
                  </div>
                  <Switch
                    checked={settings.routeTypes.bus}
                    onCheckedChange={(enabled) => updateRouteTypes('bus', enabled)}
                    className="scale-75"
                  />
                </label>

                {/* Ferry - Hidden by default */}
                <label className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Ship className="w-3 h-3 text-blue-500" />
                    <span className="text-xs font-medium">Ferry</span>
                  </div>
                  <Switch
                    checked={settings.routeTypes.ferry}
                    onCheckedChange={(enabled) => updateRouteTypes('ferry', enabled)}
                    className="scale-75"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// Native-looking default settings
export const nativeTransitSettings: TransitSettings = {
  enabled: false, // Off by default, user can enable when needed
  showStations: true,
  showLines: true,
  routeTypes: {
    metro: true, // Metro/subway visible when enabled
    rail: true, // Regional rail visible
    tram: false, // Light rail hidden by default
    bus: false, // Bus hidden for cleaner look
    ferry: false // Ferry hidden by default
  }
};