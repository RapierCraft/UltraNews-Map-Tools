'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ExternalLink, 
  MapPin, 
  Info, 
  Building2,
  Zap,
  DollarSign,
  Calendar,
  Users,
  Target,
  Gauge,
  ChevronDown,
  ChevronUp,
  ImageIcon
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import EnhancedWikipediaContent from './EnhancedWikipediaContent';

interface POIInfoPanelProps {
  poi: {
    id: string;
    position: [number, number];
    type: 'explosion' | 'facility' | 'economic' | 'military' | 'infrastructure';
    title: string;
    data: any;
    icon: string;
    color: string;
    priority: number;
    wikipediaTopics?: string[];
  };
  wikipediaData?: {[key: string]: any};
  onClose?: () => void;
}

const getTypeConfig = (isDark: boolean) => ({
  explosion: {
    icon: Target,
    label: 'Critical Event',
    color: isDark 
      ? 'bg-red-500/20 text-red-300 border-red-800/50' 
      : 'bg-red-500/10 text-red-700 border-red-200',
    bgGradient: isDark 
      ? 'from-red-900/30 to-orange-900/30' 
      : 'from-red-50 to-orange-50'
  },
  facility: {
    icon: Building2,
    label: 'Infrastructure',
    color: isDark 
      ? 'bg-blue-500/20 text-blue-300 border-blue-800/50' 
      : 'bg-blue-500/10 text-blue-700 border-blue-200',
    bgGradient: isDark 
      ? 'from-blue-900/30 to-cyan-900/30' 
      : 'from-blue-50 to-cyan-50'
  },
  economic: {
    icon: DollarSign,
    label: 'Economic Impact',
    color: isDark 
      ? 'bg-yellow-500/20 text-yellow-300 border-yellow-800/50' 
      : 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
    bgGradient: isDark 
      ? 'from-yellow-900/30 to-amber-900/30' 
      : 'from-yellow-50 to-amber-50'
  },
  military: {
    icon: Users,
    label: 'Strategic Position',
    color: isDark 
      ? 'bg-green-500/20 text-green-300 border-green-800/50' 
      : 'bg-green-500/10 text-green-700 border-green-200',
    bgGradient: isDark 
      ? 'from-green-900/30 to-emerald-900/30' 
      : 'from-green-50 to-emerald-50'
  },
  infrastructure: {
    icon: Zap,
    label: 'Infrastructure',
    color: isDark 
      ? 'bg-purple-500/20 text-purple-300 border-purple-800/50' 
      : 'bg-purple-500/10 text-purple-700 border-purple-200',
    bgGradient: isDark 
      ? 'from-purple-900/30 to-violet-900/30' 
      : 'from-purple-50 to-violet-50'
  }
});

const getDataIcon = (key: string) => {
  const iconMap: {[key: string]: any} = {
    capacity: Gauge,
    employees: Users,
    founded: Calendar,
    built: Calendar,
    operational: Calendar,
    deposits: DollarSign,
    assets: DollarSign,
    coordinates: MapPin,
    address: MapPin,
    significance: Info,
    status: Info
  };
  
  return iconMap[key] || Info;
};

const formatKey = (key: string): string => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

export default function POIInfoPanel({ poi, wikipediaData, onClose }: POIInfoPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const config = getTypeConfig(isDark)[poi.type];
  const IconComponent = config.icon;
  
  const cardBg = `bg-gradient-to-br ${config.bgGradient}`;
  const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const subtextColor = isDark ? 'text-gray-300' : 'text-gray-500';
  const cardItemBg = isDark ? 'bg-gray-800/60 backdrop-blur-sm' : 'bg-white/80';
  const borderColor = isDark ? 'border-gray-700/40' : 'border-gray-200/60';
  const tabsBg = isDark ? 'bg-gray-800/30' : 'bg-white/50';
  const wikiCardBg = isDark ? 'bg-gray-800/70 border-gray-700/40' : 'bg-white/90 border-gray-200/60';

  return (
    <Card className={`w-full h-full shadow-2xl border-0 ${cardBg} backdrop-blur-sm flex flex-col`}>
      {/* Header Section */}
      <CardHeader className="pb-1 space-y-1 flex-shrink-0 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${config.color} border`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${textColor} leading-tight`}>
                {poi.title}
              </h3>
              <Badge variant="secondary" className={`text-xs font-medium ${config.color} border-0 mt-0`}>
                {config.label}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className={`flex items-center gap-2 text-xs ${subtextColor}`}>
          <MapPin className="w-3 h-3" />
          <span className="font-mono">
            {poi.position[0].toFixed(4)}°N, {poi.position[1].toFixed(4)}°E
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 px-4 py-1">
        <Tabs defaultValue="details" className="w-full h-full flex flex-col">
          <TabsList className={`grid w-full grid-cols-2 ${tabsBg} flex-shrink-0`}>
            <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
            <TabsTrigger value="context" className="text-xs">Context</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-2 flex-1 overflow-y-auto">
            <div className="space-y-3 pr-2">
            {/* Key Information Cards */}
            <div className="grid gap-3">
              {Object.entries(poi.data)
                .filter(([_, value]) => value && String(value).length > 0)
                .slice(0, 4)
                .map(([key, value]) => {
                  const DataIcon = getDataIcon(key);
                  return (
                    <div key={key} className={`${cardItemBg} rounded-lg p-2.5 border ${borderColor}`}>
                      <div className="flex items-start gap-2.5">
                        <div className={`p-1 ${isDark ? 'bg-gray-700' : 'bg-gray-100'} rounded-md mt-0.5`}>
                          <DataIcon className={`w-3.5 h-3.5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium ${subtextColor} uppercase tracking-wide`}>
                            {formatKey(key)}
                          </p>
                          <p className={`text-sm font-semibold ${textColor} mt-0.5 break-words`}>
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Expandable Additional Details */}
            {Object.entries(poi.data).length > 4 && (
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-sm">
                    {isExpanded ? 'Show Less' : `Show ${Object.entries(poi.data).length - 4} More`}
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {Object.entries(poi.data)
                    .filter(([_, value]) => value && String(value).length > 0)
                    .slice(4)
                    .map(([key, value]) => {
                      const DataIcon = getDataIcon(key);
                      return (
                        <div key={key} className={`${cardItemBg} rounded-lg p-2.5 border ${borderColor}`}>
                          <div className="flex items-start gap-2.5">
                            <div className={`p-1 ${isDark ? 'bg-gray-700' : 'bg-gray-100'} rounded-md mt-0.5`}>
                              <DataIcon className={`w-3.5 h-3.5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium ${subtextColor} uppercase tracking-wide`}>
                                {formatKey(key)}
                              </p>
                              <p className={`text-sm font-semibold ${textColor} mt-0.5 break-words`}>
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </CollapsibleContent>
              </Collapsible>
            )}
            </div>
          </TabsContent>
          
          <TabsContent value="context" className="mt-2 flex-1 overflow-y-auto">
            <div className="space-y-3 pr-2">
            {/* Enhanced Wikipedia Integration */}
            {poi.wikipediaTopics && poi.wikipediaTopics.length > 0 && (
              <div className="space-y-4">
                {poi.wikipediaTopics.map(topic => {
                  const wikiData = wikipediaData?.[topic];
                  if (!wikiData) return null;
                  
                  return (
                    <EnhancedWikipediaContent
                      key={topic}
                      topic={topic}
                      wikiData={wikiData}
                    />
                  );
                })}
              </div>
            )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}