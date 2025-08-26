'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  importance: number;
  osm_type?: string;
  osm_id?: number;
  boundingbox?: string[];
  geojson?: GeoJSON.Geometry;
  class?: string;
}

interface SearchBarProps {
  onLocationSelect?: (result: SearchResult) => void;
  className?: string;
}

// Simple in-memory cache for search results
const searchCache = new Map<string, { data: SearchResult[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function SearchBar({ onLocationSelect, className = '' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const searchTimeout = useRef<NodeJS.Timeout>();
  const resultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocation = useCallback(async (searchQuery: string) => {
    // Allow searches with 1+ characters for faster results
    if (searchQuery.length < 1) {
      setResults([]);
      return;
    }

    // Check cache first
    const cacheKey = searchQuery.toLowerCase();
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setResults(cached.data);
      setShowResults(true);
      setSelectedIndex(-1);
      return;
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    try {
      // Minimal params for fastest search response
      const params = new URLSearchParams({
        format: 'json',
        q: searchQuery,
        limit: '7',
        // Don't fetch any heavy data during search - just the basics
        addressdetails: '0',
        extratags: '0', 
        namedetails: '0',
        // No polygon data at all during search
        polygon: '0'
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        { signal: abortControllerRef.current.signal }
      );
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      
      // Sort results by importance for better relevance
      const sortedData = data.sort((a: SearchResult, b: SearchResult) => 
        (b.importance || 0) - (a.importance || 0)
      );
      
      // Cache the results
      searchCache.set(cacheKey, {
        data: sortedData,
        timestamp: Date.now()
      });
      
      // Clean old cache entries
      if (searchCache.size > 100) {
        const oldestKey = searchCache.keys().next().value;
        searchCache.delete(oldestKey);
      }
      
      setResults(sortedData);
      setShowResults(true);
      setSelectedIndex(-1); // Reset selection when new results arrive
    } catch (error: unknown) {
      // Error handled silently
      const err = error as Error;
      if (err.name !== 'AbortError') {
        // Error handled silently  
      }
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Debounce search with faster response time
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (value.trim()) {
      // No debounce for 1-2 character searches (countries/states)
      // Short debounce for longer searches to avoid spam
      const delay = value.length <= 2 ? 0 : 100;
      
      searchTimeout.current = setTimeout(() => {
        searchLocation(value);
      }, delay);
    } else {
      setResults([]);
      setShowResults(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // If an item is selected with arrow keys, use that
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleSelectLocation(results[selectedIndex]);
      } else if (results.length > 0) {
        // Otherwise select the best match (first one)
        handleSelectLocation(results[0]);
      } else if (query.trim()) {
        // If no results yet but query exists, trigger immediate search
        if (searchTimeout.current) {
          clearTimeout(searchTimeout.current);
        }
        searchLocation(query);
      }
    } else if (e.key === 'Escape') {
      // Close dropdown on Escape
      setShowResults(false);
      setSelectedIndex(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        setShowResults(true);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        );
        setShowResults(true);
      }
    }
  };

  const handleSelectLocation = (result: SearchResult) => {
    setQuery(result.display_name);
    setShowResults(false);
    setResults([]);
    setSelectedIndex(-1);
    
    if (onLocationSelect) {
      onLocationSelect(result);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
  };

  return (
    <div className={`relative ${className}`} ref={resultsRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search for a location..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10 h-10 bg-background border-border shadow-sm"
          autoComplete="off"
        />
        {query && (
          <Button
            size="icon"
            variant="ghost"
            onClick={clearSearch}
            className="absolute right-1 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (results.length > 0 || isLoading) && (
        <Card className="absolute top-full mt-1 w-full max-h-80 overflow-y-auto shadow-lg z-[1001]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Searching...
            </div>
          ) : (
            <div className="py-1">
              {results.map((result, index) => (
                <button
                  key={result.place_id}
                  onClick={() => handleSelectLocation(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full px-4 py-2 text-left flex items-start gap-2 transition-colors ${
                    index === selectedIndex 
                      ? 'bg-accent text-accent-foreground' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium line-clamp-1">
                      {result.display_name.split(',')[0]}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {result.display_name}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}