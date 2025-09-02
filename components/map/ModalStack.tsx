'use client';

import React, { createContext, useContext, useState, ReactNode, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { X, ArrowLeft, Globe, Info } from 'lucide-react';
import { WikipediaAPI } from '@/lib/wikipedia';

interface ModalStackItem {
  id: string;
  title: string;
  content: ReactNode;
  term?: string;
}

interface ModalStackContextType {
  modals: ModalStackItem[];
  openModal: (modal: Omit<ModalStackItem, 'id'>) => void;
  closeModal: (id?: string) => void;
  closeAllModals: () => void;
  isTermOpen: (term: string) => boolean;
  usedTerms: Set<string>;
  markTermAsUsed: (term: string) => void;
}

const ModalStackContext = createContext<ModalStackContextType | null>(null);

export const useModalStack = () => {
  const context = useContext(ModalStackContext);
  if (!context) {
    throw new Error('useModalStack must be used within a ModalStackProvider');
  }
  return context;
};

interface ModalStackProviderProps {
  children: ReactNode;
}

export function ModalStackProvider({ children }: ModalStackProviderProps) {
  const [modals, setModals] = useState<ModalStackItem[]>([]);
  const [usedTerms, setUsedTerms] = useState<Set<string>>(new Set());
  const [modalCounter, setModalCounter] = useState(0);

  const openModal = (modal: Omit<ModalStackItem, 'id'>) => {
    // Don't open if term is already open
    if (modal.term && isTermOpen(modal.term)) {
      return;
    }
    setModalCounter(prev => prev + 1);
    const id = `modal-${modalCounter + 1}`;
    setModals(prev => [...prev, { ...modal, id }]);
    
    // Mark term as used when modal opens
    if (modal.term) {
      markTermAsUsed(modal.term);
    }
  };

  const closeModal = (id?: string) => {
    if (id) {
      setModals(prev => prev.filter(modal => modal.id !== id));
    } else {
      // Close the topmost modal
      setModals(prev => prev.slice(0, -1));
    }
  };

  const closeAllModals = () => {
    setModals([]);
    setUsedTerms(new Set()); // Reset used terms when all modals close
  };

  const isTermOpen = (term: string) => {
    return modals.some(modal => modal.term === term);
  };

  const markTermAsUsed = (term: string) => {
    setUsedTerms(prev => new Set([...prev, term]));
  };

  return (
    <ModalStackContext.Provider value={{ modals, openModal, closeModal, closeAllModals, isTermOpen, usedTerms, markTermAsUsed }}>
      {children}
      <ModalStackRenderer modals={modals} closeModal={closeModal} />
    </ModalStackContext.Provider>
  );
}

interface ModalStackRendererProps {
  modals: ModalStackItem[];
  closeModal: (id?: string) => void;
}

function ModalStackRenderer({ modals, closeModal }: ModalStackRendererProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [dragStates, setDragStates] = useState<{[key: string]: {x: number, y: number, isDragging: boolean}}>({});

  if (modals.length === 0) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000]">
      {modals.map((modal, index) => {
        const zIndex = 10000 + index;
        const isTopmost = index === modals.length - 1;
        
        // Calculate position offset for stacking effect
        const offsetX = index * 20;
        const offsetY = index * 15;
        
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
        
        return (
          <div
            key={modal.id}
            className="fixed inset-0"
            style={{ zIndex }}
          >
            {/* Backdrop - only show for topmost modal */}
            {isTopmost && (
              <div 
                className="absolute inset-0 bg-black/20 animate-in fade-in-0 duration-200"
                onClick={() => closeModal()}
              />
            )}
            
            {/* Modal */}
            <div
              className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${index === 0 ? 'animate-in zoom-in-95 fade-in-0 duration-200' : ''}`}
              style={{
                transform: `translate(-50%, -50%) translate(${dragState.x}px, ${dragState.y}px)`,
                maxHeight: 'calc(100vh - 100px)',
                maxWidth: 'calc(100vw - 40px)',
                width: '480px',
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
                  className="pb-2 space-y-1 flex-shrink-0 px-4 py-2 cursor-grab active:cursor-grabbing"
                  onMouseDown={handleMouseDown}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                        <Info className={`w-4 h-4 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <CardTitle className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                          {modal.title}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs mt-0">
                          <Globe className="w-3 h-3 mr-1" />
                          Definition #{modals.length}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {modals.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => closeModal()}
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => closeModal(modal.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 min-h-0 px-4 py-2 overflow-y-auto max-h-[60vh]">
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

// Definition Modal Content Component
interface DefinitionModalContentProps {
  term: string;
}

export function DefinitionModalContent({ term }: DefinitionModalContentProps) {
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
        <div className={`h-20 rounded animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
      </div>
    );
  }

  if (!definition) {
    return (
      <div className={`text-sm text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Failed to load definition for "{term}"
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Thumbnail */}
      {definition.thumbnail && (
        <div className="relative h-32 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
          <img
            src={definition.thumbnail.source}
            alt={definition.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Extract */}
      <div className="space-y-3">
        <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {definition.extract}
        </p>

        {/* Enhanced with clickable terms */}
        <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          <EnhancedDefinitionContent content={definition.extract} />
        </div>
      </div>

      <Separator className={isDark ? 'bg-gray-700' : 'bg-gray-200'} />
      
      <div className={`text-xs text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Click on highlighted terms to explore further
      </div>
    </div>
  );
}

// Enhanced content with clickable terms
interface EnhancedDefinitionContentProps {
  content: string;
}

function EnhancedDefinitionContent({ content }: EnhancedDefinitionContentProps) {
  const { openModal, isTermOpen, usedTerms, markTermAsUsed } = useModalStack();
  const [hoveredTerm, setHoveredTerm] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [completedTerms, setCompletedTerms] = useState<Set<string>>(new Set());
  const timeoutRef = useRef<NodeJS.Timeout>();
  const progressTimeoutRef = useRef<NodeJS.Timeout>();

  const CLICKABLE_TERMS = {
    'nuclear reactor': 'Nuclear reactor',
    'VVER': 'VVER',
    'compressor station': 'Natural gas compressor station',
    'LNG terminal': 'Liquefied natural gas terminal',
    'pipeline': 'Pipeline transport',
    'hydroelectric': 'Hydroelectricity',
    'Federal Reserve': 'Federal Reserve System',
    'FDIC': 'Federal Deposit Insurance Corporation',
    'venture capital': 'Venture capital',
    'bank run': 'Bank run',
    'Silicon Valley': 'Silicon Valley',
    'Baltic Sea': 'Baltic Sea',
    'Black Sea': 'Black Sea',
    'Kyiv': 'Kyiv',
    'Mariupol': 'Mariupol',
    'Zaporizhzhia': 'Zaporizhzhia',
    'Gazprom': 'Gazprom',
    'methane': 'Methane',
    'natural gas': 'Natural gas',
    'seismic': 'Seismology',
    'exclusion zone': 'Exclusion zone'
  };

  const startProgressIndicator = (term: string) => {
    setLoadingProgress(0);
    const totalDuration = 1300; // 1.3 seconds
    const steps = 30; // More steps for smoother animation
    let step = 0;
    
    const updateProgress = () => {
      step += 1;
      
      // Weighted progress: slow start, fast middle, slow end (ease-in-out)
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
        // Mark as completed
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
    }, 1300);
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
      content: <DefinitionModalContent term={term} />,
      term
    });
  };

  const enhanceText = (text: string): React.ReactNode => {
    let result: React.ReactNode[] = [];
    let lastIndex = 0;
    
    const sortedTerms = Object.keys(CLICKABLE_TERMS).sort((a, b) => b.length - a.length);
    const replacements: { start: number; end: number; term: string; target: string }[] = [];
    const processedTermsInThisContent = new Set<string>(); // Track terms within this content block
    
    sortedTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        const overlap = replacements.some(r => 
          (match.index >= r.start && match.index < r.end) ||
          (match.index + match[0].length > r.start && match.index + match[0].length <= r.end)
        );
        
        const targetTerm = CLICKABLE_TERMS[term as keyof typeof CLICKABLE_TERMS];
        
        if (!overlap && !processedTermsInThisContent.has(targetTerm)) {
          replacements.push({
            start: match.index,
            end: match.index + match[0].length,
            term: match[0],
            target: targetTerm
          });
          processedTermsInThisContent.add(targetTerm); // Mark as processed in this content
        }
      }
    });
    
    replacements.sort((a, b) => a.start - b.start);
    
    replacements.forEach((replacement, index) => {
      if (replacement.start > lastIndex) {
        result.push(text.substring(lastIndex, replacement.start));
      }
      
      // Check if this term is already open in a modal OR has been used before
      const isOpen = isTermOpen(replacement.target);
      const hasBeenUsed = usedTerms.has(replacement.target);
      
      if (isOpen || hasBeenUsed) {
        // Show as plain text if modal is already open or term has been used
        result.push(
          <span key={`${replacement.target}-${index}`} className="text-gray-600 dark:text-gray-400 font-medium">
            {replacement.term}
          </span>
        );
      } else {
        // Show as clickable link if modal is not open
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
            
            {/* Progress indicator */}
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

  return <div>{enhanceText(content)}</div>;
}