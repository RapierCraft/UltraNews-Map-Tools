'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { X, MapPin, Navigation, Search, Route, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface SearchResult {
  place_id: number | string;
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
  source?: string;
}

interface SearchBarProps {
  onLocationSelect?: (result: SearchResult) => void;
  className?: string;
  showModeSelector?: boolean;
}

// Enhanced in-memory cache for search results  
const searchCache = new globalThis.Map<string, { data: SearchResult[], timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for longer persistence

// Multiple free geocoding APIs for parallel requests
const geocodingAPIs = [
  {
    name: 'nominatim',
    search: async (query: string, signal: AbortSignal) => {
      const params = new URLSearchParams({
        format: 'json',
        q: query,
        limit: '5',
        addressdetails: '0',
        extratags: '0', 
        namedetails: '0',
        polygon: '0'
      });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        { signal, headers: { 'User-Agent': 'MapMap/1.0' } }
      );
      const data = await response.json();
      return data.map((item: Record<string, any>) => ({
        place_id: item.place_id,
        lat: item.lat,
        lon: item.lon,
        display_name: item.display_name,
        type: item.type,
        importance: item.importance || 0,
        osm_type: item.osm_type,
        osm_id: item.osm_id,
        source: 'nominatim'
      }));
    }
  },
  {
    name: 'photon',
    search: async (query: string, signal: AbortSignal) => {
      const params = new URLSearchParams({
        q: query,
        limit: '5',
        lang: 'en'
      });
      const response = await fetch(
        `https://photon.komoot.io/api/?${params.toString()}`,
        { signal }
      );
      const data = await response.json();
      return data.features?.map((item: Record<string, any>) => ({
        place_id: `photon_${item.properties.osm_id}`,
        lat: item.geometry.coordinates[1].toString(),
        lon: item.geometry.coordinates[0].toString(),
        display_name: item.properties.name + (item.properties.state ? `, ${item.properties.state}` : '') + (item.properties.country ? `, ${item.properties.country}` : ''),
        type: item.properties.osm_key,
        importance: item.properties.osm_type === 'city' ? 0.8 : 0.5,
        osm_type: item.properties.osm_type,
        osm_id: item.properties.osm_id,
        source: 'photon'
      })) || [];
    }
  },
  {
    name: 'locationiq',
    search: async (query: string, signal: AbortSignal) => {
      const params = new URLSearchParams({
        format: 'json',
        q: query,
        limit: '5',
        addressdetails: '0',
        normalizecity: '1'
      });
      // LocationIQ free tier (no API key required for basic usage)
      const response = await fetch(
        `https://us1.locationiq.com/v1/search?${params.toString()}`,
        { signal, headers: { 'User-Agent': 'MapMap/1.0' } }
      );
      if (response.status === 429) {
        // Rate limited - return empty results
        return [];
      }
      const data = await response.json();
      return data.map((item: Record<string, any>) => ({
        place_id: `locationiq_${item.place_id}`,
        lat: item.lat,
        lon: item.lon,
        display_name: item.display_name,
        type: item.type || item.class,
        importance: item.importance || 0.6,
        osm_type: item.osm_type,
        osm_id: item.osm_id,
        source: 'locationiq'
      }));
    }
  }
];

export default function SearchBar({ onLocationSelect, className = '', showModeSelector = true }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const searchTimeout = useRef<NodeJS.Timeout>();
  const resultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();

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
    if (searchQuery.length < 1) {
      setResults([]);
      return;
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsLoading(true);
    console.log('Starting search for:', searchQuery);

    try {
      // Simple Nominatim search for debugging
      const params = new URLSearchParams({
        format: 'json',
        q: searchQuery,
        limit: '8',
        addressdetails: '1',
        extratags: '0', 
        namedetails: '0',
        polygon: '0'
      });
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        { 
          signal, 
          headers: { 'User-Agent': 'MapMap/1.0' },
          mode: 'cors'
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Search response:', data);
      
      const searchResults = data.map((item: any) => ({
        place_id: item.place_id,
        lat: item.lat,
        lon: item.lon,
        display_name: item.display_name,
        type: item.type,
        class: item.class,
        importance: item.importance || 0,
        osm_type: item.osm_type,
        osm_id: item.osm_id,
        boundingbox: item.boundingbox,
        source: 'nominatim'
      }));

      setResults(searchResults);
      setShowResults(true);
      setSelectedIndex(-1);
      console.log('Search results set:', searchResults);

    } catch (error: unknown) {
      const err = error as Error;
      if (err.name !== 'AbortError') {
        console.error('Search error:', err);
      }
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Advanced debouncing with predictive search
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (value.trim()) {
      // Instant search for very short queries (country codes, state abbreviations)
      if (value.length <= 2) {
        searchLocation(value);
        return;
      }

      // Check if this is likely a continuation of previous search
      const previousQuery = query.toLowerCase();
      const newQuery = value.toLowerCase();
      const isExtension = newQuery.startsWith(previousQuery) && newQuery.length > previousQuery.length;
      
      // Shorter debounce for query extensions (user still typing same location)
      const delay = isExtension ? 50 : 150;
      
      // Check cache immediately for exact or partial matches
      const cacheKey = newQuery;
      const cached = searchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setResults(cached.data);
        setShowResults(true);
        setSelectedIndex(-1);
        return;
      }

      // Look for cached partial matches for instant suggestions
      for (const [key, cachedData] of searchCache.entries()) {
        if (key.startsWith(newQuery) && Date.now() - cachedData.timestamp < CACHE_DURATION) {
          // Show partial results immediately while waiting for real search
          const partialResults = cachedData.data.filter(result => 
            result.display_name.toLowerCase().includes(newQuery)
          );
          if (partialResults.length > 0) {
            setResults(partialResults);
            setShowResults(true);
            setSelectedIndex(-1);
          }
          break;
        }
      }
      
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
        {showModeSelector ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-1 h-8 w-8 z-10 hover:bg-accent"
              >
                <Image
                  src="/logo.png"
                  alt="UltraMaps"
                  width={20}
                  height={20}
                  className="h-5 w-5"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem 
                onClick={() => router.push('/')}
                className="cursor-pointer"
              >
                <Globe className="mr-2 h-4 w-4" />
                <span>Map View</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => router.push('/navigation')}
                className="cursor-pointer"
              >
                <Navigation className="mr-2 h-4 w-4" />
                <span>Navigation</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  inputRef.current?.focus();
                }}
                className="cursor-pointer"
              >
                <Search className="mr-2 h-4 w-4" />
                <span>Search Locations</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  // Future: Add route planning mode
                  router.push('/navigation');
                }}
                className="cursor-pointer"
              >
                <Route className="mr-2 h-4 w-4" />
                <span>Route Planning</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Image
            src="/logo.png"
            alt="UltraMaps"
            width={24}
            height={24}
            className="absolute left-2 h-6 w-6 pointer-events-none"
          />
        )}
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search for a location..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="pl-12 pr-10 h-10 bg-background border-border shadow-sm"
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