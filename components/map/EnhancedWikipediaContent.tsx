'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Calendar,
  MapPin,
  Building2,
  Zap,
  Globe,
  Users,
  DollarSign,
  Activity
} from 'lucide-react';
import DefinitionCard from './DefinitionCard';

interface WikipediaData {
  title: string;
  extract: string;
  images: string[];
  url: string;
}

interface EnhancedWikipediaContentProps {
  topic: string;
  wikiData: WikipediaData;
}

// Terms that should have definition cards
const LINKABLE_TERMS = {
  // Infrastructure
  'nuclear reactor': 'Nuclear reactor',
  'VVER': 'VVER',
  'compressor station': 'Natural gas compressor station',
  'LNG terminal': 'Liquefied natural gas terminal',
  'pipeline': 'Pipeline transport',
  'hydroelectric': 'Hydroelectricity',
  
  // Financial
  'Federal Reserve': 'Federal Reserve System',
  'FDIC': 'Federal Deposit Insurance Corporation',
  'venture capital': 'Venture capital',
  'bank run': 'Bank run',
  'Silicon Valley': 'Silicon Valley',
  
  // Geographic
  'Baltic Sea': 'Baltic Sea',
  'Black Sea': 'Black Sea',
  'Kyiv': 'Kyiv',
  'Mariupol': 'Mariupol',
  'Zaporizhzhia': 'Zaporizhzhia',
  'Gazprom': 'Gazprom',
  
  // Technical
  'methane': 'Methane',
  'natural gas': 'Natural gas',
  'seismic': 'Seismology',
  'exclusion zone': 'Exclusion zone'
};

const enhanceTextWithLinks = (text: string): React.ReactNode => {
  let result: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // Sort terms by length (longest first) to avoid partial matches
  const sortedTerms = Object.keys(LINKABLE_TERMS).sort((a, b) => b.length - a.length);
  
  const replacements: { start: number; end: number; term: string; target: string }[] = [];
  
  // Find all matches
  sortedTerms.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      // Check if this position is already covered by another replacement
      const overlap = replacements.some(r => 
        (match.index >= r.start && match.index < r.end) ||
        (match.index + match[0].length > r.start && match.index + match[0].length <= r.end)
      );
      
      if (!overlap) {
        replacements.push({
          start: match.index,
          end: match.index + match[0].length,
          term: match[0],
          target: LINKABLE_TERMS[term as keyof typeof LINKABLE_TERMS]
        });
      }
    }
  });
  
  // Sort replacements by position
  replacements.sort((a, b) => a.start - b.start);
  
  // Build the result
  replacements.forEach((replacement, index) => {
    // Add text before this replacement
    if (replacement.start > lastIndex) {
      result.push(text.substring(lastIndex, replacement.start));
    }
    
    // Add the linked term
    result.push(
      <DefinitionCard key={`${replacement.target}-${index}`} term={replacement.target}>
        {replacement.term}
      </DefinitionCard>
    );
    
    lastIndex = replacement.end;
  });
  
  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex));
  }
  
  return result;
};

const extractStructuredInfo = (extract: string, topic: string) => {
  const sections = {
    overview: '',
    specifications: [] as string[],
    history: [] as string[],
    impact: [] as string[]
  };
  
  const sentences = extract.split(/(?<=[.!?])\s+/);
  
  // First 2 sentences as overview
  sections.overview = sentences.slice(0, 2).join(' ');
  
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    
    // Specifications (numbers, capacities, technical details)
    if (/\d+.*?(mw|bcm|billion|million|km|meters|tonnes|capacity|diameter)/.test(lowerSentence)) {
      sections.specifications.push(sentence);
    }
    
    // History (dates, established, built, founded)
    else if (/\b(19|20)\d{2}\b|built|established|founded|constructed|opened/.test(lowerSentence)) {
      sections.history.push(sentence);
    }
    
    // Impact (economic, social, environmental)
    else if (/impact|effect|consequence|significant|important|critical/.test(lowerSentence)) {
      sections.impact.push(sentence);
    }
  });
  
  return sections;
};

export default function EnhancedWikipediaContent({ topic, wikiData }: EnhancedWikipediaContentProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const sections = extractStructuredInfo(wikiData.extract, topic);
  
  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };
  
  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'overview': return Info;
      case 'specifications': return Activity;
      case 'history': return Calendar;
      case 'impact': return Zap;
      default: return Info;
    }
  };

  return (
    <Card className={`${isDark ? 'bg-gray-800/70 border-gray-700/40' : 'bg-white/90 border-gray-200/60'} shadow-sm`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <CardTitle className={`font-semibold text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            {topic}
          </CardTitle>
        </div>
        <Badge variant="secondary" className="w-fit text-xs">
          <Globe className="w-3 h-3 mr-1" />
          Enhanced Content
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Images Grid - Responsive */}
        {wikiData.images && wikiData.images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {wikiData.images.slice(0, 6).map((img: string, idx: number) => (
              <div key={idx} className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden group">
                <img 
                  src={img}
                  alt={`${topic} image ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.parentElement!.innerHTML = `
                      <div class="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                        <div class="text-center text-gray-400 dark:text-gray-500">
                          <svg class="w-6 h-6 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                          </svg>
                          <p class="text-xs">Image unavailable</p>
                        </div>
                      </div>
                    `;
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Structured Content Sections */}
        <div className="space-y-3">
          {/* Overview */}
          {sections.overview && (
            <Collapsible 
              open={expandedSections.has('overview')} 
              onOpenChange={() => toggleSection('overview')}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                      Overview
                    </span>
                  </div>
                  {expandedSections.has('overview') ? 
                    <ChevronUp className="w-4 h-4" /> : 
                    <ChevronDown className="w-4 h-4" />
                  }
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                  {enhanceTextWithLinks(sections.overview)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Specifications */}
          {sections.specifications.length > 0 && (
            <>
              <Separator className={isDark ? 'bg-gray-700' : 'bg-gray-200'} />
              <Collapsible 
                open={expandedSections.has('specifications')} 
                onOpenChange={() => toggleSection('specifications')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                        Specifications ({sections.specifications.length})
                      </span>
                    </div>
                    {expandedSections.has('specifications') ? 
                      <ChevronUp className="w-4 h-4" /> : 
                      <ChevronDown className="w-4 h-4" />
                    }
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {sections.specifications.slice(0, 3).map((spec, idx) => (
                    <div key={idx} className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} p-2 rounded bg-green-50 dark:bg-green-900/20`}>
                      {enhanceTextWithLinks(spec)}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {/* History */}
          {sections.history.length > 0 && (
            <>
              <Separator className={isDark ? 'bg-gray-700' : 'bg-gray-200'} />
              <Collapsible 
                open={expandedSections.has('history')} 
                onOpenChange={() => toggleSection('history')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                        History ({sections.history.length})
                      </span>
                    </div>
                    {expandedSections.has('history') ? 
                      <ChevronUp className="w-4 h-4" /> : 
                      <ChevronDown className="w-4 h-4" />
                    }
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {sections.history.slice(0, 3).map((hist, idx) => (
                    <div key={idx} className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} p-2 rounded bg-purple-50 dark:bg-purple-900/20`}>
                      {enhanceTextWithLinks(hist)}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {/* Impact */}
          {sections.impact.length > 0 && (
            <>
              <Separator className={isDark ? 'bg-gray-700' : 'bg-gray-200'} />
              <Collapsible 
                open={expandedSections.has('impact')} 
                onOpenChange={() => toggleSection('impact')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                        Impact ({sections.impact.length})
                      </span>
                    </div>
                    {expandedSections.has('impact') ? 
                      <ChevronUp className="w-4 h-4" /> : 
                      <ChevronDown className="w-4 h-4" />
                    }
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {sections.impact.slice(0, 3).map((imp, idx) => (
                    <div key={idx} className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} p-2 rounded bg-orange-50 dark:bg-orange-900/20`}>
                      {enhanceTextWithLinks(imp)}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </div>

        {/* Footer with source link */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} flex items-center justify-between`}>
            <span>Hover over highlighted terms for definitions</span>
            <a 
              href={wikiData.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Source
              <Globe className="w-3 h-3" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}