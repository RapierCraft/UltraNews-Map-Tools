# Hydration Error Fix Guide

## What Causes Hydration Mismatches?

1. **Server/client branches** - `typeof window !== 'undefined'`
2. **Variable input** - `Date.now()`, `Math.random()`, etc.
3. **Date formatting** - User locale differences
4. **External data** - APIs without snapshots
5. **Invalid HTML nesting**
6. **Browser extensions** - Adding attributes like `data-sharkid`

## Fixes Applied

### 1. Created Hydration-Safe Hooks

- `useHydrationSafeId` - Consistent IDs across SSR/client
- `useHydrationSafeTime` - Consistent timestamps
- `useHydrationSafeRandom` - Consistent random values

### 2. Fixed Component Issues

- **LocationModalSystem.tsx** - Replaced `Date.now() + Math.random()` with counter
- **ModalStack.tsx** - Replaced `Date.now() + Math.random()` with counter
- **LoadingScreen.tsx** - Already properly handled with useEffect

### 3. Created Utility Components

- **ClientOnly.tsx** - Render components only on client
- **HydrationErrorBoundary.tsx** - Catch and handle hydration errors
- **useIsomorphicLayoutEffect** - Safe layout effect hook

## How to Use

### For new components with dynamic content:
```tsx
import { ClientOnly } from '@/components/ClientOnly';

function MyComponent() {
  return (
    <ClientOnly fallback={<div>Loading...</div>}>
      <DynamicContent />
    </ClientOnly>
  );
}
```

### For components needing IDs:
```tsx
import { useHydrationSafeId } from '@/hooks/useHydrationSafeId';

function MyComponent() {
  const id = useHydrationSafeId('my-component');
  return <div id={id}>Content</div>;
}
```

### For components with timestamps:
```tsx
import { useHydrationSafeTime } from '@/hooks/useHydrationSafeId';

function MyComponent() {
  const timestamp = useHydrationSafeTime();
  return <div>Created: {timestamp}</div>;
}
```

## Best Practices

1. **Always use useEffect for client-only code**
2. **Use counters instead of Date.now() + Math.random() for IDs**
3. **Wrap dynamic components in ClientOnly when necessary**
4. **Use the hydration error boundary at app level**
5. **Test with SSR disabled to identify hydration issues**

## Testing

To test if hydration issues are fixed:
1. Check browser console for hydration warnings
2. Run with React StrictMode enabled
3. Test with slow network conditions
4. Verify consistent rendering between server and client