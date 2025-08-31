'use client';

import { useState, useEffect, useMemo } from 'react';
import { localMetroService, MetroLine, MetroStation } from '@/lib/localMetroService';

interface UseLocalMetroOptions {
  enabled: boolean;
  bounds?: [number, number, number, number]; // minLon, minLat, maxLon, maxLat
}

export function useLocalMetro(options: UseLocalMetroOptions) {
  const [lines, setLines] = useState<MetroLine[]>([]);
  const [stations, setStations] = useState<MetroStation[]>([]);
  const [networks, setNetworks] = useState<string[]>([]);

  // Update metro data when bounds or enabled state changes
  useEffect(() => {
    if (!options.enabled || !options.bounds) {
      setLines([]);
      setStations([]);
      setNetworks([]);
      return;
    }

    try {
      // Get data from local service (no API calls)
      const metroLines = localMetroService.getLinesInBounds(options.bounds);
      const metroStations = localMetroService.getStationsInBounds(options.bounds);
      const availableNetworks = localMetroService.getNetworksInBounds(options.bounds);

      setLines(metroLines);
      setStations(metroStations);
      setNetworks(availableNetworks.map(n => `${n.city} ${n.network}`));

      console.log('Local metro data loaded:', {
        lines: metroLines.length,
        stations: metroStations.length,
        networks: availableNetworks.length,
        cities: availableNetworks.map(n => n.city)
      });
    } catch (error) {
      console.error('Failed to load local metro data:', error);
      setLines([]);
      setStations([]);
      setNetworks([]);
    }
  }, [options.enabled, ...(options.bounds || [])]);

  // Convert to GeoJSON for map rendering
  const linesGeoJSON = useMemo(() => {
    if (lines.length === 0) return null;
    return localMetroService.linesToGeoJSON(lines);
  }, [lines]);

  const stationsGeoJSON = useMemo(() => {
    if (stations.length === 0) return null;
    return localMetroService.stationsToGeoJSON(stations);
  }, [stations]);

  return {
    lines,
    stations,
    networks,
    linesGeoJSON,
    stationsGeoJSON,
    hasData: lines.length > 0 || stations.length > 0,
    loading: false // No loading since data is local
  };
}