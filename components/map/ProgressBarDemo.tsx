'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';

export default function ProgressBarDemo() {
  const [hoveredState, setHoveredState] = useState<'idle' | 'hovering' | 'completed'>('idle');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const timeoutRef = useRef<NodeJS.Timeout>();
  const progressTimeoutRef = useRef<NodeJS.Timeout>();

  const startProgress = () => {
    setLoadingProgress(0);
    const progressInterval = 300 / 20; // 300ms total, 20 steps
    let progress = 0;
    
    const updateProgress = () => {
      progress += 5; // 5% per step
      setLoadingProgress(progress);
      
      if (progress < 100) {
        progressTimeoutRef.current = setTimeout(updateProgress, progressInterval);
      } else {
        setHoveredState('completed');
      }
    };
    
    updateProgress();
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
    
    if (hoveredState !== 'completed') {
      setHoveredState('hovering');
      startProgress();
    }
  };

  const handleMouseLeave = () => {
    if (hoveredState !== 'completed') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
      
      setHoveredState('idle');
      setLoadingProgress(0);
    }
  };

  const reset = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
    setHoveredState('idle');
    setLoadingProgress(0);
  };

  return (
    <div className={`p-8 space-y-8 ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}>
      <h2 className="text-2xl font-bold mb-4">Progress Bar Demo</h2>
      
      <div className="space-y-6">
        {/* Demo Text with Clickable Terms */}
        <div className="p-4 border border-gray-300 dark:border-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Example Definition Content:</h3>
          <p className="text-sm leading-relaxed">
            The <span className="relative inline-block">
              <button
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline cursor-pointer font-medium transition-colors"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                nuclear reactor
              </button>
              
              {/* Progress indicator */}
              {hoveredState === 'hovering' && (
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
              {hoveredState === 'completed' && (
                <div className="absolute -top-2 -left-1 w-4 h-4 bg-green-500 dark:bg-green-400 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              )}
            </span> uses controlled nuclear fission to generate heat and electricity.
          </p>
        </div>

        {/* State Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-300 dark:border-gray-700 rounded-lg">
            <h4 className="font-semibold mb-2">Current State:</h4>
            <div className={`px-3 py-1 rounded text-sm ${
              hoveredState === 'idle' ? 'bg-gray-200 dark:bg-gray-700' :
              hoveredState === 'hovering' ? 'bg-blue-200 dark:bg-blue-800' :
              'bg-green-200 dark:bg-green-800'
            }`}>
              {hoveredState === 'idle' ? 'Idle' :
               hoveredState === 'hovering' ? 'Hovering' : 'Completed'}
            </div>
          </div>

          <div className="p-4 border border-gray-300 dark:border-gray-700 rounded-lg">
            <h4 className="font-semibold mb-2">Progress:</h4>
            <div className="text-sm">{loadingProgress}%</div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-75"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
          </div>

          <div className="p-4 border border-gray-300 dark:border-gray-700 rounded-lg">
            <h4 className="font-semibold mb-2">Actions:</h4>
            <button 
              onClick={reset}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Visual Examples of All States */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 border border-gray-300 dark:border-gray-700 rounded-lg">
            <h4 className="font-semibold mb-3">Idle State</h4>
            <div className="relative inline-block">
              <span className="text-blue-600 dark:text-blue-400 underline cursor-pointer font-medium">
                example term
              </span>
              {/* No indicator */}
            </div>
            <p className="text-xs text-gray-500 mt-2">No indicator visible</p>
          </div>

          <div className="p-4 border border-gray-300 dark:border-gray-700 rounded-lg">
            <h4 className="font-semibold mb-3">Hovering State</h4>
            <div className="relative inline-block">
              <span className="text-blue-600 dark:text-blue-400 underline cursor-pointer font-medium">
                example term
              </span>
              <div className="absolute -top-2 -left-1 w-4 h-4 bg-blue-500 dark:bg-blue-400 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-1 h-1 bg-white rounded-full" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Blue circle with pulsing animation</p>
          </div>

          <div className="p-4 border border-gray-300 dark:border-gray-700 rounded-lg">
            <h4 className="font-semibold mb-3">Completed State</h4>
            <div className="relative inline-block">
              <span className="text-blue-600 dark:text-blue-400 underline cursor-pointer font-medium">
                example term
              </span>
              <div className="absolute -top-2 -left-1 w-4 h-4 bg-green-500 dark:bg-green-400 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Green circle (permanent)</p>
          </div>
        </div>

        {/* Sizing Examples */}
        <div className="p-4 border border-gray-300 dark:border-gray-700 rounded-lg">
          <h4 className="font-semibold mb-3">Size Variations:</h4>
          <div className="flex items-center gap-6">
            {/* Current size */}
            <div className="relative">
              <span className="text-blue-600 underline">current (w-4 h-4)</span>
              <div className="absolute -top-2 -left-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
            
            {/* Smaller */}
            <div className="relative">
              <span className="text-blue-600 underline">smaller (w-3 h-3)</span>
              <div className="absolute -top-1.5 -left-0.5 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>
            
            {/* Larger */}
            <div className="relative">
              <span className="text-blue-600 underline">larger (w-5 h-5)</span>
              <div className="absolute -top-2.5 -left-1.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-white rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}