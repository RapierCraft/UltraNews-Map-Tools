'use client';

import React from 'react';
import { Map, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ErrorBoundary from './ErrorBoundary';

interface MapErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
}

function MapErrorFallback({ error, onRetry }: MapErrorFallbackProps) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="mx-4 max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <Map className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl font-semibold text-red-900 dark:text-red-100">
            Map Loading Failed
          </CardTitle>
          <CardDescription className="text-red-700 dark:text-red-300">
            Unable to load the map component. This might be due to network issues or browser compatibility.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p>Possible solutions:</p>
            <ul className="mt-2 list-inside list-disc text-left space-y-1">
              <li>Check your internet connection</li>
              <li>Try refreshing the page</li>
              <li>Clear your browser cache</li>
              <li>Disable ad blockers temporarily</li>
            </ul>
          </div>
          {process.env.NODE_ENV === 'development' && error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/10 p-3">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                Development Error:
              </h4>
              <pre className="text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap overflow-x-auto">
                {error.message}
              </pre>
            </div>
          )}
          <div className="flex justify-center gap-2">
            <Button onClick={onRetry} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
            <Button onClick={() => window.location.reload()} variant="default" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface MapErrorBoundaryProps {
  children: React.ReactNode;
}

export default function MapErrorBoundary({ children }: MapErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={<MapErrorFallback />}
      onError={(error, errorInfo) => {
        // Additional map-specific error handling
        console.error('Map Error:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}