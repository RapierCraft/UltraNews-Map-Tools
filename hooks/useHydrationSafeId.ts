import { useEffect, useState } from 'react';

/**
 * Hook that provides hydration-safe unique IDs and timestamps
 * Prevents hydration mismatches by returning consistent values
 * during SSR and initial client render
 */
export function useHydrationSafeId(prefix = 'id') {
  const [id, setId] = useState(`${prefix}-ssr`);
  
  useEffect(() => {
    setId(`${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  }, [prefix]);
  
  return id;
}

/**
 * Hook that provides hydration-safe timestamps
 */
export function useHydrationSafeTime() {
  const [timestamp, setTimestamp] = useState(0);
  
  useEffect(() => {
    setTimestamp(Date.now());
  }, []);
  
  return timestamp;
}

/**
 * Hook that provides hydration-safe random values
 */
export function useHydrationSafeRandom(min = 0, max = 1) {
  const [value, setValue] = useState(min);
  
  useEffect(() => {
    setValue(Math.random() * (max - min) + min);
  }, [min, max]);
  
  return value;
}