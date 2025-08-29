'use client';

import { useState, useEffect } from 'react';
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
  Activity,
  Table,
  List
} from 'lucide-react';
import DefinitionCard from './DefinitionCard';
import { WikipediaAPI } from '@/lib/wikipedia';

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

interface StructuredContent {
  headings: { level: number; text: string; id: string }[];
  tables: { headers: string[]; rows: string[][] }[];
  lists: { type: 'ordered' | 'unordered'; items: string[] }[];
  paragraphs: string[];
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

const parseStructuredContent = (htmlContent: string): StructuredContent => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const content = doc.querySelector('.mw-parser-output');
  
  if (!content) {
    return { headings: [], tables: [], lists: [], paragraphs: [] };
  }

  // Extract headings
  const headingElements = Array.from(content.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  const headings = headingElements.map((h, index) => ({
    level: parseInt(h.tagName.charAt(1)),
    text: h.textContent?.trim() || '',
    id: `heading-${index}`
  })).filter(h => h.text);

  // Extract tables (excluding navboxes)
  const tableElements = Array.from(content.querySelectorAll('table:not(.navbox):not(.infobox):not(.ambox)'));
  const tables = tableElements.map(table => {
    const headerRow = table.querySelector('thead tr, tr:first-child');
    const headers = headerRow ? Array.from(headerRow.querySelectorAll('th, td')).map(th => th.textContent?.trim() || '') : [];
    
    const bodyRows = Array.from(table.querySelectorAll('tbody tr, tr:not(:first-child)'));
    const rows = bodyRows.slice(0, 10).map(row => 
      Array.from(row.querySelectorAll('td, th')).map(cell => cell.textContent?.trim() || '')
    ).filter(row => row.some(cell => cell));
    
    return { headers, rows };
  }).filter(t => t.rows.length > 0);

  // Extract lists
  const listElements = Array.from(content.querySelectorAll('ul:not(.navbox ul):not(.infobox ul), ol:not(.navbox ol):not(.infobox ol)'));
  const lists = listElements.slice(0, 3).map(list => ({
    type: list.tagName.toLowerCase() === 'ol' ? 'ordered' as const : 'unordered' as const,
    items: Array.from(list.querySelectorAll('li')).slice(0, 8).map(li => li.textContent?.trim() || '').filter(Boolean)
  })).filter(l => l.items.length > 0);

  // Extract paragraphs
  const paragraphElements = Array.from(content.querySelectorAll('p'));
  const paragraphs = paragraphElements
    .map(p => p.textContent?.trim() || '')
    .filter(p => p.length > 50)
    .slice(0, 5);

  return { headings, tables, lists, paragraphs };
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
  const [structuredContent, setStructuredContent] = useState<StructuredContent | null>(null);
  const [isLoadingStructured, setIsLoadingStructured] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const sections = extractStructuredInfo(wikiData.extract, topic);
  
  // Check if we should fetch structured content
  useEffect(() => {
    const shouldFetchStructured = () => {
      const extractLength = wikiData.extract.length;
      const hasComplexContent = /\d+.*?(population|area|elevation|established|founded|built)/.test(wikiData.extract.toLowerCase());
      return extractLength > 500 && hasComplexContent;
    };
    
    if (shouldFetchStructured()) {
      const fetchStructuredContent = async () => {
        setIsLoadingStructured(true);
        try {
          const fullArticle = await WikipediaAPI.getFullArticle(topic);
          if (fullArticle) {
            const parsed = parseStructuredContent(fullArticle.content);
            if (parsed.tables.length > 0 || parsed.headings.length > 3) {
              setStructuredContent(parsed);
            }
          }
        } catch (error) {
          console.error('Failed to fetch structured content:', error);
        } finally {
          setIsLoadingStructured(false);
        }
      };
      
      fetchStructuredContent();
    }
  }, [topic, wikiData.extract]);
  
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

        {/* Structured Content - Tables and Additional Info */}
        {isLoadingStructured && (
          <div className="space-y-2">
            <Separator className={isDark ? 'bg-gray-700' : 'bg-gray-200'} />
            <div className={`h-4 w-32 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
            <div className={`h-20 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
          </div>
        )}
        
        {structuredContent && (
          <div className="space-y-3">
            <Separator className={isDark ? 'bg-gray-700' : 'bg-gray-200'} />
            
            {/* Tables */}
            {structuredContent.tables.length > 0 && (
              <Collapsible 
                open={expandedSections.has('tables')} 
                onOpenChange={() => toggleSection('tables')}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                    <div className="flex items-center gap-2">
                      <Table className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                        Data Tables ({structuredContent.tables.length})
                      </span>
                    </div>
                    {expandedSections.has('tables') ? 
                      <ChevronUp className="w-4 h-4" /> : 
                      <ChevronDown className="w-4 h-4" />
                    }
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-3">
                  {structuredContent.tables.slice(0, 2).map((table, idx) => (
                    <div key={idx} className={`overflow-x-auto rounded border ${isDark ? 'border-gray-700' : 'border-gray-200'} max-w-full`}>
                      <table className="w-full text-xs table-fixed">
                        {table.headers.length > 0 && (
                          <thead className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                            <tr>
                              {table.headers.map((header, hidx) => (
                                <th key={hidx} className={`px-2 py-1 text-left font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'} break-words`}>
                                  {enhanceTextWithLinks(header)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                        )}
                        <tbody>
                          {table.rows.slice(0, 5).map((row, ridx) => (
                            <tr key={ridx} className={`${ridx % 2 === 0 ? (isDark ? 'bg-gray-900/20' : 'bg-white') : (isDark ? 'bg-gray-800/40' : 'bg-gray-50/50')}`}>
                              {row.map((cell, cidx) => (
                                <td key={cidx} className={`px-2 py-1 ${isDark ? 'text-gray-300' : 'text-gray-700'} break-words`}>
                                  {enhanceTextWithLinks(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
            
            {/* Lists */}
            {structuredContent.lists.length > 0 && (
              <>
                <Separator className={isDark ? 'bg-gray-700' : 'bg-gray-200'} />
                <Collapsible 
                  open={expandedSections.has('lists')} 
                  onOpenChange={() => toggleSection('lists')}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                      <div className="flex items-center gap-2">
                        <List className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                          Key Information ({structuredContent.lists.length})
                        </span>
                      </div>
                      {expandedSections.has('lists') ? 
                        <ChevronUp className="w-4 h-4" /> : 
                        <ChevronDown className="w-4 h-4" />
                      }
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {structuredContent.lists.slice(0, 2).map((list, idx) => (
                      <div key={idx} className={`p-2 rounded ${isDark ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
                        {list.type === 'ordered' ? (
                          <ol className="text-sm space-y-1 list-decimal list-inside">
                            {list.items.map((item, iidx) => (
                              <li key={iidx} className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                                {enhanceTextWithLinks(item)}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <ul className="text-sm space-y-1 list-disc list-inside">
                            {list.items.map((item, iidx) => (
                              <li key={iidx} className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                                {enhanceTextWithLinks(item)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
          </div>
        )}

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