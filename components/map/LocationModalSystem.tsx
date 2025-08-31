'use client';

import React, { createContext, useContext, useState, ReactNode, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { X, ArrowLeft, Globe, Info, MapPin, Building2, Users } from 'lucide-react';
import { WikipediaAPI } from '@/lib/wikipedia';

interface LocationModalItem {
  id: string;
  title: string;
  content: ReactNode;
  term?: string;
  sourcePosition?: { x: number; y: number };
}

interface LocationModalContextType {
  modals: LocationModalItem[];
  openModal: (modal: Omit<LocationModalItem, 'id'>) => void;
  closeModal: (id?: string) => void;
  closeAllModals: () => void;
  isTermOpen: (term: string) => boolean;
  usedTerms: Set<string>;
  markTermAsUsed: (term: string) => void;
}

const LocationModalContext = createContext<LocationModalContextType | null>(null);

export const useLocationModal = () => {
  const context = useContext(LocationModalContext);
  if (!context) {
    throw new Error('useLocationModal must be used within a LocationModalProvider');
  }
  return context;
};

interface LocationModalProviderProps {
  children: ReactNode;
}

export function LocationModalProvider({ children }: LocationModalProviderProps) {
  const [modals, setModals] = useState<LocationModalItem[]>([]);
  const [usedTerms, setUsedTerms] = useState<Set<string>>(new Set());

  const openModal = (modal: Omit<LocationModalItem, 'id'>) => {
    if (modal.term && isTermOpen(modal.term)) {
      return;
    }
    const id = `modal-${Date.now()}-${Math.random()}`;
    setModals(prev => [...prev, { ...modal, id }]);
    
    if (modal.term) {
      markTermAsUsed(modal.term);
    }
  };

  const closeModal = (id?: string) => {
    if (id) {
      setModals(prev => prev.filter(modal => modal.id !== id));
    } else {
      setModals(prev => prev.slice(0, -1));
    }
  };

  const closeAllModals = () => {
    setModals([]);
    setUsedTerms(new Set());
  };

  const isTermOpen = (term: string) => {
    return modals.some(modal => modal.term === term);
  };

  const markTermAsUsed = (term: string) => {
    setUsedTerms(prev => new Set([...prev, term]));
  };

  return (
    <LocationModalContext.Provider value={{ modals, openModal, closeModal, closeAllModals, isTermOpen, usedTerms, markTermAsUsed }}>
      {children}
      <LocationModalRenderer modals={modals} closeModal={closeModal} />
    </LocationModalContext.Provider>
  );
}

interface LocationModalRendererProps {
  modals: LocationModalItem[];
  closeModal: (id?: string) => void;
}

function LocationModalRenderer({ modals, closeModal }: LocationModalRendererProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [dragStates, setDragStates] = useState<{[key: string]: {x: number, y: number, isDragging: boolean}}>({});

  if (modals.length === 0) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000]">
      {modals.map((modal, index) => {
        const zIndex = 10000 + index;
        const isTopmost = index === modals.length - 1;
        
        const offsetX = index * 25;
        const offsetY = index * 20;
        
        const dragState = dragStates[modal.id] || { x: offsetX, y: offsetY, isDragging: false };
        
        const handleMouseDown = (e: React.MouseEvent) => {
          e.preventDefault();
          const startX = e.clientX - dragState.x;
          const startY = e.clientY - dragState.y;
          
          setDragStates(prev => ({ ...prev, [modal.id]: { ...dragState, isDragging: true } }));
          
          const handleMouseMove = (e: MouseEvent) => {
            const newX = e.clientX - startX;
            const newY = e.clientY - startY;
            setDragStates(prev => ({ ...prev, [modal.id]: { x: newX, y: newY, isDragging: true } }));
          };
          
          const handleMouseUp = () => {
            setDragStates(prev => ({ ...prev, [modal.id]: { ...prev[modal.id], isDragging: false } }));
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };
          
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        };
        
        const getModalIcon = () => {
          if (index === 0) {
            return <MapPin className="w-4 h-4" />;
          }
          return <Info className="w-4 h-4" />;
        };
        
        const getBadgeText = () => {
          if (index === 0) return 'Location';
          return `Definition #${index}`;
        };
        
        return (
          <div
            key={modal.id}
            className="fixed inset-0"
            style={{ zIndex }}
          >
            {isTopmost && (
              <div 
                className="absolute inset-0 bg-black/20 animate-in fade-in-0 duration-200"
                onClick={() => closeModal()}
              />
            )}
            
            <div
              className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${index === 0 ? 'animate-in zoom-in-95 fade-in-0 duration-200' : ''}`}
              style={{
                transform: `translate(-50%, -50%) translate(${dragState.x}px, ${dragState.y}px)`,
                maxHeight: 'calc(100vh - 100px)',
                maxWidth: 'calc(100vw - 40px)',
                width: '520px',
                cursor: dragState.isDragging ? 'grabbing' : 'default'
              }}
            >
              <Card className={`
                shadow-2xl border-0 select-none
                ${isDark 
                  ? 'bg-gray-900/95 backdrop-blur-xl' 
                  : 'bg-white/95 backdrop-blur-xl'
                }
              `}>
                <CardHeader 
                  className="pb-2 space-y-1 flex-shrink-0 px-4 py-3 cursor-grab active:cursor-grabbing"
                  onMouseDown={handleMouseDown}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                        {getModalIcon()}
                      </div>
                      <div>
                        <CardTitle className={`text-base font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                          {modal.title}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs mt-1">
                          <Globe className="w-3 h-3 mr-1" />
                          {getBadgeText()}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {modals.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => closeModal()}
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => closeModal(modal.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 min-h-0 px-4 py-2 overflow-y-auto max-h-[70vh]">
                  {modal.content}
                </CardContent>
              </Card>
            </div>
          </div>
        );
      })}
    </div>,
    document.body
  );
}

// Location Definition Modal Content Component
interface LocationDefinitionContentProps {
  term: string;
}

export function LocationDefinitionContent({ term }: LocationDefinitionContentProps) {
  const [definition, setDefinition] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const fetchDefinition = async () => {
    try {
      const wikiData = await WikipediaAPI.getPageSummary(term);
      if (wikiData) {
        setDefinition(wikiData);
      }
    } catch (error) {
      console.error('Failed to fetch definition:', error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDefinition();
  }, [term]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className={`h-4 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
        <div className={`h-4 w-3/4 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
        <div className={`h-24 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
        <div className={`h-4 w-1/2 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
      </div>
    );
  }

  if (!definition) {
    return (
      <div className={`text-sm text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Failed to load information for "{term}"
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {definition.images && definition.images.length > 0 && (
        <div className="relative h-40 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
          <img
            src={definition.images[0]}
            alt={definition.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="space-y-3">
        <LocationEnhancedContent content={definition.extract} />
      </div>

      <Separator className={isDark ? 'bg-gray-700' : 'bg-gray-200'} />
      
      <div className={`text-xs text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Hover over highlighted terms to explore further
      </div>
      
      <Button 
        variant="outline" 
        size="sm" 
        asChild
        className="w-full"
      >
        <a href={definition.url} target="_blank" rel="noopener noreferrer">
          <Globe className="h-3 w-3 mr-2" />
          Read full Wikipedia article
        </a>
      </Button>
    </div>
  );
}

// Enhanced content with location-specific clickable terms
interface LocationEnhancedContentProps {
  content: string;
}

function LocationEnhancedContent({ content }: LocationEnhancedContentProps) {
  const { openModal, isTermOpen, usedTerms } = useLocationModal();
  const [hoveredTerm, setHoveredTerm] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [completedTerms, setCompletedTerms] = useState<Set<string>>(new Set());
  const timeoutRef = useRef<NodeJS.Timeout>();
  const progressTimeoutRef = useRef<NodeJS.Timeout>();

  const LOCATION_CLICKABLE_TERMS = {
    // Geographic features
    'metropolitan area': 'Metropolitan area',
    'urban area': 'Urban area',
    'municipality': 'Municipality',
    'county': 'County',
    'province': 'Province',
    'state': 'U.S. state',
    'city': 'City',
    'town': 'Town',
    'village': 'Village',
    'neighborhood': 'Neighbourhood',
    'district': 'District',
    'borough': 'Borough',
    'suburb': 'Suburb',
    'downtown': 'Downtown',
    'capital': 'Capital city',
    'port': 'Port',
    'harbor': 'Harbor',
    
    // Infrastructure
    'airport': 'Airport',
    'seaport': 'Port',
    'railway': 'Railway transport',
    'subway': 'Rapid transit',
    'university': 'University',
    'hospital': 'Hospital',
    'cathedral': 'Cathedral',
    'museum': 'Museum',
    'park': 'Park',
    'river': 'River',
    'lake': 'Lake',
    'mountain': 'Mountain',
    'bridge': 'Bridge',
    'highway': 'Highway',
    'boulevard': 'Boulevard',
    'avenue': 'Avenue',
    
    // Administrative
    'prefecture': 'Prefecture',
    'region': 'Region',
    'territory': 'Territory',
    'commonwealth': 'Commonwealth',
    'federation': 'Federation',
    'republic': 'Republic',
    'kingdom': 'Kingdom',
    'empire': 'Empire',
    
    // Economic/Social
    'GDP': 'Gross domestic product',
    'population': 'Population',
    'demographics': 'Demographics',
    'economy': 'Economy',
    'industry': 'Industry',
    'commerce': 'Commerce',
    'tourism': 'Tourism'
  };

  const startProgressIndicator = (term: string) => {
    setLoadingProgress(0);
    const totalDuration = 1200; // 1.2 seconds
    const steps = 25;
    let step = 0;
    
    const updateProgress = () => {
      step += 1;
      const normalizedStep = step / steps;
      const easedProgress = normalizedStep < 0.5 
        ? 2 * normalizedStep * normalizedStep 
        : 1 - Math.pow(-2 * normalizedStep + 2, 2) / 2;
      
      const progress = Math.min(100, easedProgress * 100);
      setLoadingProgress(progress);
      
      if (step < steps) {
        const nextInterval = totalDuration / steps;
        progressTimeoutRef.current = setTimeout(updateProgress, nextInterval);
      } else {
        setCompletedTerms(prev => new Set([...prev, term]));
      }
    };
    
    updateProgress();
  };

  const handleTermMouseEnter = (term: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
    
    setHoveredTerm(term);
    startProgressIndicator(term);
    
    timeoutRef.current = setTimeout(() => {
      handleTermClick(term, term);
    }, 1200);
  };

  const handleTermMouseLeave = (term: string) => {
    if (!completedTerms.has(term)) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
      
      setHoveredTerm(null);
      setLoadingProgress(0);
    }
  };

  const handleTermClick = (term: string, displayTerm: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
    
    openModal({
      title: displayTerm,
      content: <LocationDefinitionContent term={term} />,
      term
    });
  };

  const enhanceText = (text: string): React.ReactNode => {
    let result: React.ReactNode[] = [];
    let lastIndex = 0;
    
    const sortedTerms = Object.keys(LOCATION_CLICKABLE_TERMS).sort((a, b) => b.length - a.length);
    const replacements: { start: number; end: number; term: string; target: string }[] = [];
    const processedTermsInThisContent = new Set<string>();
    
    sortedTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        const overlap = replacements.some(r => 
          (match.index >= r.start && match.index < r.end) ||
          (match.index + match[0].length > r.start && match.index + match[0].length <= r.end)
        );
        
        const targetTerm = LOCATION_CLICKABLE_TERMS[term as keyof typeof LOCATION_CLICKABLE_TERMS];
        
        if (!overlap && !processedTermsInThisContent.has(targetTerm)) {
          replacements.push({
            start: match.index,
            end: match.index + match[0].length,
            term: match[0],
            target: targetTerm
          });
          processedTermsInThisContent.add(targetTerm);
        }
      }
    });
    
    replacements.sort((a, b) => a.start - b.start);
    
    replacements.forEach((replacement, index) => {
      if (replacement.start > lastIndex) {
        result.push(text.substring(lastIndex, replacement.start));
      }
      
      const isOpen = isTermOpen(replacement.target);
      const hasBeenUsed = usedTerms.has(replacement.target);
      
      if (isOpen || hasBeenUsed) {
        result.push(
          <span key={`${replacement.target}-${index}`} className="text-gray-600 dark:text-gray-400 font-medium">
            {replacement.term}
          </span>
        );
      } else {
        result.push(
          <span key={`${replacement.target}-${index}`} className="relative inline-block">
            <button
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline cursor-pointer font-medium transition-colors"
              onMouseEnter={() => handleTermMouseEnter(replacement.target)}
              onMouseLeave={() => handleTermMouseLeave(replacement.target)}
              onClick={() => handleTermClick(replacement.target, replacement.term)}
            >
              {replacement.term}
            </button>
            
            {/* Loading progress indicator */}
            {hoveredTerm === replacement.target && (
              <div className="absolute -top-2 -left-1 w-4 h-4 bg-blue-500 dark:bg-blue-400 rounded-full flex items-center justify-center animate-pulse">
                <div 
                  className="w-2 h-2 bg-white rounded-full transition-all duration-75"
                  style={{ 
                    transform: `scale(${loadingProgress / 100})`,
                    opacity: loadingProgress / 100
                  }}
                />
              </div>
            )}
            
            {/* Completed indicator */}
            {completedTerms.has(replacement.target) && hoveredTerm !== replacement.target && (
              <div className="absolute -top-2 -left-1 w-4 h-4 bg-green-500 dark:bg-green-400 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            )}
          </span>
        );
      }
      
      lastIndex = replacement.end;
    });
    
    if (lastIndex < text.length) {
      result.push(text.substring(lastIndex));
    }
    
    return result;
  };

  return <div className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{enhanceText(content)}</div>;
}

// Main Location Information Modal Content
interface LocationInfoContentProps {
  location: {
    lat: number;
    lon: number;
    name: string;
    osm_id?: number;
    osm_type?: string;
    type?: string;
    class?: string;
  };
}

export function LocationInfoContent({ location }: LocationInfoContentProps) {
  const [wikiData, setWikiData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  React.useEffect(() => {
    const fetchWikipediaData = async () => {
      setIsLoading(true);
      try {
        let searchTerm = location.name.split(',')[0].trim();
        
        if (location.type === 'city' || location.class === 'place') {
          searchTerm = `${searchTerm}`;
        }
        
        const data = await WikipediaAPI.getPageSummary(searchTerm, { lat: location.lat, lon: location.lon });
        setWikiData(data);
      } catch (error) {
        console.error('Failed to fetch Wikipedia data:', error);
        setWikiData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWikipediaData();
  }, [location]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className={`h-6 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
        <div className={`h-32 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
        <div className="space-y-2">
          <div className={`h-4 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
          <div className={`h-4 w-4/5 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
          <div className={`h-4 w-3/5 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Location Details */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Location Details</h3>
          {location.type && (
            <Badge variant="outline" className="text-xs">
              {location.type.charAt(0).toUpperCase() + location.type.slice(1)}
            </Badge>
          )}
        </div>
        
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <div><span className="font-medium">Coordinates:</span> {location.lat.toFixed(6)}, {location.lon.toFixed(6)}</div>
          {location.osm_id && (
            <div><span className="font-medium">OSM:</span> {location.osm_type}/{location.osm_id}</div>
          )}
        </div>
      </div>

      <Separator />

      {/* Wikipedia Content */}
      {wikiData ? (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Globe className="h-4 w-4" />
            About {wikiData.title}
          </h3>
          
          {wikiData.images && wikiData.images.length > 0 && (
            <div className="relative h-40 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              <img
                src={wikiData.images[0]}
                alt={wikiData.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <LocationEnhancedContent content={wikiData.extract} />
        </div>
      ) : (
        <div className="text-sm text-gray-600 dark:text-gray-400 italic text-center py-4">
          No Wikipedia information available for this location.
        </div>
      )}
    </div>
  );
}