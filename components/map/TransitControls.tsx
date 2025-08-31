'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  Train, 
  Bus, 
  ChevronDown, 
  ChevronUp,
  MapPin,
  Route,
  Clock
} from 'lucide-react';

interface TransitSettings {
  enabled: boolean;
  showStops: boolean;
  showRoutes: boolean;
  showRealtime: boolean;
  types: {
    subway: boolean;
    bus: boolean;
    rail: boolean;
    ferry: boolean;
    tram: boolean;
  };
}

interface TransitControlsProps {
  settings: TransitSettings;
  onSettingsChange: (settings: TransitSettings) => void;
  className?: string;
}

export default function TransitControls({
  settings,
  onSettingsChange,
  className = ''
}: TransitControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateSettings = (updates: Partial<TransitSettings>) => {
    onSettingsChange({ ...settings, ...updates });
  };

  const updateTypes = (type: keyof TransitSettings['types'], enabled: boolean) => {
    onSettingsChange({
      ...settings,
      types: { ...settings.types, [type]: enabled }
    });
  };

  return (
    <Card className={`${className} bg-white/90 dark:bg-gray-800/90 backdrop-blur`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className="w-full justify-between px-3 py-2 h-auto"
          >
            <div className="flex items-center gap-2">
              <Train className="w-4 h-4" />
              <span className="text-sm font-medium">Metro</span>
              {settings.enabled && (
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </div>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="px-3 pb-3 space-y-3">
          {/* Main Transit Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="transit-enabled" className="text-sm">
              Show Metro Systems
            </Label>
            <Switch
              id="transit-enabled"
              checked={settings.enabled}
              onCheckedChange={(enabled) => updateSettings({ enabled })}
            />
          </div>

          {settings.enabled && (
            <>
              {/* Layer Options */}
              <div className="space-y-2 border-t pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    <Label htmlFor="show-stops" className="text-xs">
                      Metro Stations
                    </Label>
                  </div>
                  <Switch
                    id="show-stops"
                    checked={settings.showStops}
                    onCheckedChange={(showStops) => updateSettings({ showStops })}
                    size="sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Route className="w-3 h-3" />
                    <Label htmlFor="show-routes" className="text-xs">
                      Metro Lines
                    </Label>
                  </div>
                  <Switch
                    id="show-routes"
                    checked={settings.showRoutes}
                    onCheckedChange={(showRoutes) => updateSettings({ showRoutes })}
                    size="sm"
                  />
                </div>

                {/* Real-time not available with OSM data */}
                <div className="flex items-center justify-between opacity-50">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <Label htmlFor="show-realtime" className="text-xs">
                      Real-time (N/A)
                    </Label>
                  </div>
                  <Switch
                    id="show-realtime"
                    checked={false}
                    disabled={true}
                    size="sm"
                  />
                </div>
              </div>

              {/* Metro System Filters */}
              <div className="space-y-2 border-t pt-2">
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Metro Systems
                </Label>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span>Metro/Subway</span>
                    </div>
                    <Switch
                      checked={settings.types.subway}
                      onCheckedChange={(enabled) => updateTypes('subway', enabled)}
                      size="sm"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <span>Regional Rail</span>
                    </div>
                    <Switch
                      checked={settings.types.rail}
                      onCheckedChange={(enabled) => updateTypes('rail', enabled)}
                      size="sm"
                    />
                  </div>

                  {/* Disabled options for metro focus */}
                  <div className="flex items-center justify-between opacity-50">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span>Bus (Future)</span>
                    </div>
                    <Switch
                      checked={false}
                      disabled={true}
                      size="sm"
                    />
                  </div>

                  <div className="flex items-center justify-between opacity-50">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      <span>Tram (Future)</span>
                    </div>
                    <Switch
                      checked={false}
                      disabled={true}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Default transit settings - focused on local metro data
export const defaultTransitSettings: TransitSettings = {
  enabled: true, // Enabled by default - no API calls needed
  showStops: true,
  showRoutes: true,
  showRealtime: false, // Not available with local data
  types: {
    subway: true, // Primary focus on metro/subway
    bus: false, // Not available in local data yet
    rail: true, // Some metro systems include rail
    ferry: false, // Not available in local data yet
    tram: false // Not available in local data yet
  }
};