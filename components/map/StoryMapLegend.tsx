'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info, Map, Target, Shield, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface StoryMapLegendProps {
  storyType: 'ukraine' | 'pipeline' | 'banking' | 'generic';
  className?: string;
}

const legendData = {
  ukraine: {
    title: 'Ukraine Conflict Map',
    sections: [
      {
        id: 'control',
        title: 'Territory Control',
        icon: <Shield className="h-4 w-4" />,
        items: [
          { color: '#0057B7', label: 'Ukrainian Controlled', fill: '#0057B7', description: 'Government controlled areas' },
          { color: '#D52B1E', label: 'Russian Controlled', fill: '#D52B1E', description: 'Occupied territories' }
        ]
      },
      {
        id: 'frontlines',
        title: 'Active Frontline',
        icon: <Target className="h-4 w-4" />,
        items: [
          { color: '#FF0000', label: 'Combat Zone', style: 'solid', width: 4, description: 'Current fighting positions' }
        ]
      },
      {
        id: 'cities',
        title: 'Key Cities',
        icon: <Map className="h-4 w-4" />,
        items: [
          { icon: '📍', label: 'Strategic Locations', description: 'Major cities and key points' }
        ]
      }
    ]
  },
  pipeline: {
    title: 'Infrastructure Impact Analysis',
    sections: [
      {
        id: 'infrastructure',
        title: 'Pipeline Network',
        icon: <Target className="h-4 w-4" />,
        items: [
          { color: '#00AA00', label: 'Active Pipeline', description: 'Operational gas pipeline' },
          { color: '#FF0000', label: 'Disrupted Pipeline', description: 'Damaged or non-operational' },
          { color: '#FF8800', label: 'Alternative Routes', description: 'Backup supply routes' }
        ]
      },
      {
        id: 'impact',
        title: 'Economic Impact',
        icon: <TrendingUp className="h-4 w-4" />,
        items: [
          { color: '#FF0000', label: 'High Impact', opacity: 0.3, description: '>50% supply disruption' },
          { color: '#FF8800', label: 'Medium Impact', opacity: 0.2, description: '20-50% disruption' },
          { color: '#FFAA00', label: 'Low Impact', opacity: 0.1, description: '<20% disruption' }
        ]
      }
    ]
  },
  banking: {
    title: 'Financial Contagion Analysis',
    sections: [
      {
        id: 'epicenter',
        title: 'Crisis Epicenter',
        icon: <Target className="h-4 w-4" />,
        items: [
          { color: '#FF0000', label: 'Primary Impact', description: 'Direct bank failure location' },
          { color: '#FF8800', label: 'Secondary Impact', description: 'Affected financial institutions' }
        ]
      },
      {
        id: 'spread',
        title: 'Contagion Spread',
        icon: <TrendingUp className="h-4 w-4" />,
        items: [
          { color: '#AA0000', label: 'Financial Connections', style: 'solid', description: 'Direct financial relationships' },
          { color: '#0066CC', label: 'Supply Chain Impact', style: 'dashed', description: 'Business relationship effects' }
        ]
      }
    ]
  },
  generic: {
    title: 'News Event Visualization',
    sections: [
      {
        id: 'zones',
        title: 'Impact Zones',
        icon: <Target className="h-4 w-4" />,
        items: [
          { color: '#FF0000', label: 'Primary Impact', description: 'Direct event location' },
          { color: '#FF8800', label: 'Secondary Impact', description: 'Indirect effects' },
          { color: '#0066CC', label: 'Economic Impact', description: 'Financial consequences' }
        ]
      }
    ]
  }
};

export default function StoryMapLegend({ storyType, className = '' }: StoryMapLegendProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['control', 'frontlines']));

  const data = legendData[storyType] || legendData.generic;

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <Card className={`absolute top-4 right-4 z-[1000] w-80 max-h-[80vh] overflow-y-auto ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-sm font-semibold">{data.title}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {data.sections.map((section) => (
              <div key={section.id} className="space-y-2">
                <Collapsible 
                  open={expandedSections.has(section.id)} 
                  onOpenChange={() => toggleSection(section.id)}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                      <div className="flex items-center gap-2">
                        {section.icon}
                        <span className="font-medium text-xs">{section.title}</span>
                        <ChevronDown className="h-3 w-3 ml-auto transition-transform duration-200" 
                                   style={{ 
                                     transform: expandedSections.has(section.id) ? 'rotate(180deg)' : 'rotate(0deg)' 
                                   }} />
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="space-y-2 pl-4">
                    {section.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <div className="flex-shrink-0">
                          {item.color && (
                            <div className="flex items-center gap-1">
                              {item.style === 'dashed' ? (
                                <div 
                                  className="w-4 h-0.5 border-t-2 border-dashed"
                                  style={{ borderColor: item.color, borderWidth: `${item.width || 2}px` }}
                                />
                              ) : item.shape === 'circle' ? (
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: item.color }}
                                />
                              ) : (
                                <div 
                                  className="w-4 h-3 border"
                                  style={{ 
                                    borderColor: item.color, 
                                    backgroundColor: item.fill || 'transparent',
                                    borderWidth: item.width ? `${item.width}px` : '2px',
                                    opacity: item.opacity || 1
                                  }}
                                />
                              )}
                            </div>
                          )}
                          {item.icon && <span className="text-sm">{item.icon}</span>}
                          {item.intensity && (
                            <Badge 
                              variant={item.intensity === 'High' ? 'destructive' : 
                                      item.intensity === 'Medium' ? 'secondary' : 'outline'}
                              className="text-xs px-1 py-0"
                            >
                              {item.intensity}
                            </Badge>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {item.label}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400 text-xs leading-tight">
                            {item.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}

            {data.timeline && (
              <div className="border-t pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-xs">{data.timeline.title}</span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {data.timeline.description}
                </div>
                <div className="mt-2">
                  <div className="text-xs font-medium mb-1">Shows changes over time:</div>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    {data.timeline.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-1">
                        <div className="w-1 h-1 bg-blue-600 rounded-full flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="border-t pt-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Click on map elements for detailed information
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}