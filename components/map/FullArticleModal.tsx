'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, 
  ExternalLink, 
  Globe,
  Loader2
} from 'lucide-react';
import { WikipediaAPI } from '@/lib/wikipedia';
import DefinitionCard from './DefinitionCard';
import DataVisualization from './DataVisualization';

interface FullArticleModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

// Enhanced terms for cascading hyperlinks
const ENHANCED_TERMS = {
  // Nuclear and Energy
  'nuclear reactor': 'Nuclear reactor',
  'nuclear power': 'Nuclear power',
  'uranium': 'Uranium',
  'enrichment': 'Uranium enrichment',
  'plutonium': 'Plutonium',
  'reactor core': 'Nuclear reactor core',
  'control rod': 'Control rod',
  'cooling system': 'Nuclear reactor coolant',
  'containment': 'Containment building',
  'meltdown': 'Nuclear meltdown',
  'radiation': 'Ionizing radiation',
  'Chernobyl': 'Chernobyl disaster',
  'Fukushima': 'Fukushima disaster',
  'nuclear waste': 'Radioactive waste',
  'fission': 'Nuclear fission',
  'fusion': 'Nuclear fusion',
  'radioactive': 'Radioactivity',
  'nuclear fuel': 'Nuclear fuel',
  
  // Geography and Places
  'city': 'City',
  'country': 'Country',
  'capital': 'Capital city',
  'province': 'Province',
  'state': 'Federated state',
  'continent': 'Continent',
  'ocean': 'Ocean',
  'sea': 'Sea',
  'river': 'River',
  'mountain': 'Mountain',
  'valley': 'Valley',
  'desert': 'Desert',
  'forest': 'Forest',
  'island': 'Island',
  'peninsula': 'Peninsula',
  'bay': 'Bay',
  'gulf': 'Gulf',
  'strait': 'Strait',
  'lake': 'Lake',
  'climate': 'Climate',
  'weather': 'Weather',
  'temperature': 'Temperature',
  'ecosystem': 'Ecosystem',
  'biodiversity': 'Biodiversity',
  
  // History and Culture
  'civilization': 'Civilization',
  'empire': 'Empire',
  'dynasty': 'Dynasty',
  'revolution': 'Revolution',
  'war': 'War',
  'battle': 'Battle',
  'treaty': 'Treaty',
  'constitution': 'Constitution',
  'democracy': 'Democracy',
  'republic': 'Republic',
  'monarchy': 'Monarchy',
  'parliament': 'Parliament',
  'government': 'Government',
  'politics': 'Politics',
  'economy': 'Economy',
  'trade': 'Trade',
  'commerce': 'Commerce',
  'industry': 'Industry',
  'agriculture': 'Agriculture',
  'technology': 'Technology',
  'innovation': 'Innovation',
  'science': 'Science',
  'university': 'University',
  'education': 'Education',
  'literature': 'Literature',
  'art': 'Art',
  'architecture': 'Architecture',
  'engineering': 'Engineering',
  'medicine': 'Medicine',
  'philosophy': 'Philosophy',
  'religion': 'Religion',
  'culture': 'Culture',
  'society': 'Society',
  'population': 'Population'
};

const extractKeyData = (extract: string) => {
  const keyData: { [key: string]: string } = {};
  
  // Extract population
  const populationMatch = extract.match(/population[^.]*?(\d+[\d,.\s]*(?:million|thousand|billion)?)/i);
  if (populationMatch) {
    keyData['Population'] = populationMatch[1].trim();
  }
  
  // Extract founded date
  const foundedMatch = extract.match(/(founded|established)[^.]*?(\d{4}|\d{1,2}th century)/i);
  if (foundedMatch) {
    keyData['Founded'] = foundedMatch[2];
  }
  
  // Extract area
  const areaMatch = extract.match(/(\d+[\d,.\s]*(?:km²|square kilometers))/i);
  if (areaMatch) {
    keyData['Area'] = areaMatch[1];
  }
  
  // Extract location
  const locationMatch = extract.match(/located[^.]*?in ([^.,]+)/i);
  if (locationMatch) {
    keyData['Location'] = locationMatch[1];
  }
  
  return keyData;
};

const enhanceTextWithDefinitionCards = (text: string): React.ReactNode => {
  let result: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // Sort terms by length (longest first) to avoid partial matches
  const sortedTerms = Object.keys(ENHANCED_TERMS).sort((a, b) => b.length - a.length);
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
          target: ENHANCED_TERMS[term as keyof typeof ENHANCED_TERMS]
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
    
    // Add the linked term using DefinitionCard
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

export default function FullArticleModal({ title, isOpen, onClose }: FullArticleModalProps) {
  const [articleData, setArticleData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!isOpen || !title) return;

    const fetchFullArticle = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        // Try to get full article content first
        const fullArticle = await WikipediaAPI.getFullArticle(title);
        if (fullArticle && fullArticle.content) {
          // Parse HTML to extract structured content
          const parser = new DOMParser();
          const doc = parser.parseFromString(fullArticle.content, 'text/html');
          
          // Remove unwanted elements but keep tables and structured content
          const unwantedSelectors = [
            '.navbox', '.ambox', '.hatnote', '.dablink',
            '.coordinates', '.geo-dec', '.geo-dms', '.metadata',
            'table.navbox', 'div.navbox', '.sidebar', '.vertical-navbox',
            '.reflist', '.references', 'ol.references', '.reference',
            'sup.reference', '.citation', '.cite', '.noprint',
            'style', 'script', '.mw-editsection', '.edit-pencil'
          ];
          
          unwantedSelectors.forEach(selector => {
            doc.querySelectorAll(selector).forEach(el => el.remove());
          });
          
          // Get main content
          const content = doc.querySelector('.mw-parser-output') || doc.querySelector('body');
          
          // Extract structured content
          const structuredContent = {
            paragraphs: Array.from(content?.querySelectorAll('p') || []).map(p => p.textContent || '').filter(text => text.trim().length > 50),
            headings: Array.from(content?.querySelectorAll('h1, h2, h3, h4, h5, h6') || []).map(h => ({
              level: parseInt(h.tagName.charAt(1)),
              text: h.textContent || '',
              id: h.id || ''
            })),
            tables: Array.from(content?.querySelectorAll('table:not(.navbox)') || []).map(table => {
              const rows = Array.from(table.querySelectorAll('tr'));
              return {
                caption: table.querySelector('caption')?.textContent || '',
                headers: Array.from(rows[0]?.querySelectorAll('th') || []).map(th => th.textContent || ''),
                data: rows.slice(1).map(row => 
                  Array.from(row.querySelectorAll('td, th')).map(cell => cell.textContent || '')
                ).filter(row => row.length > 0)
              };
            }).filter(table => table.headers.length > 0 || table.data.length > 0),
            lists: Array.from(content?.querySelectorAll('ul, ol') || []).map(list => ({
              type: list.tagName.toLowerCase(),
              items: Array.from(list.querySelectorAll('li')).map(li => li.textContent || '').filter(text => text.trim())
            })).filter(list => list.items.length > 0)
          };
          
          // Get summary for images and metadata
          const summary = await WikipediaAPI.getPageSummary(title);
          
          setArticleData({
            title: fullArticle.title,
            extract: structuredContent.paragraphs.slice(0, 10).join('\n\n'), // First 10 paragraphs
            structured: structuredContent,
            url: fullArticle.url,
            images: summary?.images || [],
            isFullArticle: true
          });
        } else {
          // Fallback to summary if full article fails
          const summary = await WikipediaAPI.getPageSummary(title);
          if (summary) {
            setArticleData({
              ...summary,
              isFullArticle: false
            });
          } else {
            setError('Article not found');
          }
        }
      } catch (err) {
        console.error('Failed to fetch article:', err);
        setError('Failed to load article');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFullArticle();
  }, [title, isOpen]);

  if (!isOpen) return null;

  const keyData = articleData ? extractKeyData(articleData.extract) : {};

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
      <Card className={`w-full max-w-4xl h-[90vh] ${isDark ? 'bg-gray-900' : 'bg-white'} flex flex-col shadow-2xl`}>
        {/* Header */}
        <CardHeader className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <div>
                <h2 className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                  {title}
                </h2>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Full Article View
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 min-h-0 p-0">
          <ScrollArea className="h-full w-full">
            <div className="p-6 max-w-full overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Loading full article...
                    </p>
                  </div>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {error}
                  </p>
                </div>
              ) : (
                <div className="space-y-6 max-w-full overflow-hidden">
                  {/* Article Title */}
                  <h1 className={`text-3xl font-bold mb-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {articleData?.title}
                  </h1>

                  {/* Key Data Section */}
                  {Object.keys(keyData).length > 0 && (
                    <div className="mb-6">
                      <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        Quick Facts
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(keyData).map(([key, value]) => (
                          <div key={key} className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                            <div className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>
                              {key}
                            </div>
                            <div className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'} mt-1`}>
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Enhanced Article Content with Structure */}
                  <div className="space-y-6">
                    <div className="mb-4">
                      {articleData?.isFullArticle ? (
                        <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'}`}>
                          Full Article Content
                        </span>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                          Summary Content
                        </span>
                      )}
                    </div>

                    {/* Structured Content */}
                    {articleData?.structured ? (
                      <div className="space-y-8">
                        {/* Introduction */}
                        <div className={`text-base leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'} break-words max-w-full`}>
                          {enhanceTextWithDefinitionCards(articleData.structured.paragraphs.slice(0, 2).join('\n\n'))}
                        </div>

                        {/* Interactive Data Visualizations */}
                        {articleData.structured.tables.map((table: any, idx: number) => (
                          <DataVisualization
                            key={idx}
                            tableData={{
                              caption: table.caption,
                              headers: table.headers,
                              data: table.data
                            }}
                            index={idx}
                          />
                        ))}

                        {/* Content Sections with Headings */}
                        {articleData.structured.headings.map((heading: any, idx: number) => {
                          const sectionStart = idx;
                          const nextHeadingIdx = articleData.structured.headings.findIndex((h: any, i: number) => i > idx && h.level <= heading.level);
                          const sectionEnd = nextHeadingIdx === -1 ? articleData.structured.paragraphs.length : nextHeadingIdx + 5;
                          
                          const sectionParagraphs = articleData.structured.paragraphs.slice(sectionStart + 2, sectionEnd);
                          
                          if (heading.level <= 3 && sectionParagraphs.length > 0) {
                            return (
                              <div key={idx} className="space-y-4">
                                {/* Section Heading */}
                                {heading.level === 2 && (
                                  <h2 className={`text-2xl font-bold border-b-2 pb-2 ${isDark ? 'text-gray-100 border-blue-600' : 'text-gray-900 border-blue-400'}`}>
                                    {heading.text}
                                  </h2>
                                )}
                                {heading.level === 3 && (
                                  <h3 className={`text-xl font-semibold border-l-4 pl-3 ${isDark ? 'text-gray-200 border-blue-500' : 'text-gray-800 border-blue-400'}`}>
                                    {heading.text}
                                  </h3>
                                )}
                                {heading.level === 4 && (
                                  <h4 className={`text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {heading.text}
                                  </h4>
                                )}
                                
                                {/* Section Content */}
                                <div className={`text-base leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'} space-y-3 break-words max-w-full`}>
                                  {sectionParagraphs.slice(0, 3).map((paragraph, pIdx) => (
                                    <div key={pIdx}>
                                      {enhanceTextWithDefinitionCards(paragraph)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })}

                        {/* Lists */}
                        {articleData.structured.lists.slice(0, 3).map((list: any, idx: number) => (
                          <div key={idx} className="space-y-2">
                            {list.type === 'ul' ? (
                              <ul className={`list-disc list-inside space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-700'} border-l-2 ${isDark ? 'border-gray-600' : 'border-gray-300'} pl-4 break-words`}>
                                {list.items.slice(0, 5).map((item: string, itemIdx: number) => (
                                  <li key={itemIdx} className="text-sm break-words">
                                    {enhanceTextWithDefinitionCards(item)}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <ol className={`list-decimal list-inside space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-700'} border-l-2 ${isDark ? 'border-gray-600' : 'border-gray-300'} pl-4 break-words`}>
                                {list.items.slice(0, 5).map((item: string, itemIdx: number) => (
                                  <li key={itemIdx} className="text-sm break-words">
                                    {enhanceTextWithDefinitionCards(item)}
                                  </li>
                                ))}
                              </ol>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Fallback for summary content */
                      <div className={`text-base leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'} space-y-4 break-words max-w-full`}>
                        {enhanceTextWithDefinitionCards(articleData?.extract || 'No content available')}
                      </div>
                    )}
                  </div>
                  
                  {/* Images */}
                  {articleData?.images && articleData.images.length > 0 && (
                    <div className="mt-6">
                      <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        Images
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {articleData.images.slice(0, 6).map((img: string, idx: number) => (
                          <div key={idx} className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                            <img 
                              src={img}
                              alt={`${title} image ${idx + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Hover over highlighted terms for definitions with loading bars
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              asChild
            >
              <a 
                href={articleData?.url || `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                Open External
              </a>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}