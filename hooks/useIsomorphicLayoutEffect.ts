import { useEffect, useLayoutEffect } from 'react';

/**
 * Hook that uses useLayoutEffect on the client and useEffect on the server
 * This prevents React hydration warnings about useLayoutEffect on server
 */
export const useIsomorphicLayoutEffect = 
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;