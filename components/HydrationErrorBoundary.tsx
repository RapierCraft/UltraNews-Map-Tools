'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary specifically for hydration mismatches
 * Catches hydration errors and provides fallback UI
 */
export class HydrationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a hydration error
    const isHydrationError = error.message.includes('hydration') || 
                           error.message.includes('server HTML') ||
                           error.message.includes('client') ||
                           error.stack?.includes('hydrateRoot');
    
    if (isHydrationError) {
      return { hasError: true, error };
    }
    
    // Re-throw non-hydration errors
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log hydration errors for debugging
    console.warn('Hydration error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI for hydration errors
      return (
        <div className="w-full h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <h1 className="text-xl font-semibold mb-2">Loading...</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Preparing the application...
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}