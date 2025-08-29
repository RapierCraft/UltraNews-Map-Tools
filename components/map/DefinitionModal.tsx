'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  ExternalLink, 
  Globe,
  Loader2,
  BookOpen,
  Expand
} from 'lucide-react';
import { WikipediaAPI } from '@/lib/wikipedia';

interface DefinitionModalProps {
  term: string;
  isOpen: boolean;
  onClose: () => void;
  onExpand?: (term: string) => void;
  position?: { x: number; y: number };
}

export default function DefinitionModal({ 
  term, 
  isOpen, 
  onClose, 
  onExpand,
  position = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}: DefinitionModalProps) {
  const [definitionData, setDefinitionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!isOpen || !term) return;

    const fetchDefinition = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        const data = await WikipediaAPI.getPageSummary(term);
        setDefinitionData(data);
      } catch (err) {
        console.error('Failed to fetch definition:', err);
        setError('Failed to load definition');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDefinition();
  }, [term, isOpen]);

  if (!isOpen) return null;

  // Position the modal near the clicked position but ensure it stays in viewport
  const modalStyle = {
    position: 'fixed' as const,
    top: Math.min(position.y + 20, window.innerHeight - 300),
    left: Math.min(position.x - 200, window.innerWidth - 420),
    width: '400px',
    maxHeight: '300px',
    zIndex: 10001
  };

  return (
    <div 
      className="fixed inset-0 z-[10000] bg-black/20"
      onClick={onClose}
    >
      <Card 
        className={`shadow-2xl border-0 ${isDark ? 'bg-gray-900/98 backdrop-blur-xl' : 'bg-white/98 backdrop-blur-xl'} flex flex-col`}
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <CardHeader className="pb-2 px-4 py-3 flex-shrink-0 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                <BookOpen className={`w-4 h-4 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
              </div>
              <div>
                <h3 className={`text-base font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} leading-tight`}>
                  {term}
                </h3>
                <Badge variant="secondary" className={`text-xs mt-0.5 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                  Definition
                </Badge>
              </div>
            </div>
            <div className="flex gap-1">
              {definitionData && onExpand && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onExpand(term)}
                  title="Expand to full article"
                >
                  <Expand className="w-3 h-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onClose}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 min-h-0 px-4 py-3">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-3">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Loading definition...
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {error}
                </p>
              </div>
            ) : definitionData ? (
              <div className="space-y-3">
                <div className={`text-sm leading-relaxed ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  {definitionData.extract}
                </div>
                
                {definitionData.images && definitionData.images.length > 0 && (
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src={definitionData.images[0]} 
                      alt={term}
                      className="w-full h-32 object-cover"
                    />
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    asChild
                    className="flex-1"
                  >
                    <a href={definitionData.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Wikipedia
                    </a>
                  </Button>
                  {onExpand && (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => onExpand(term)}
                      className="flex-1"
                    >
                      <Globe className="h-3 w-3 mr-1" />
                      Full Article
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className={`text-sm text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                No definition available for "{term}"
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}