'use client';

import { useState, useRef, useEffect } from 'react';
import { useModalStack, DefinitionModalContent } from './ModalStack';

interface DefinitionCardProps {
  term: string;
  children: React.ReactNode;
  delay?: number;
}


export default function DefinitionCard({ term, children, delay = 300 }: DefinitionCardProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const { openModal } = useModalStack();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const progressTimeoutRef = useRef<NodeJS.Timeout>();

  const openDefinitionModal = () => {
    openModal({
      title: term,
      content: <DefinitionModalContent term={term} />,
      term
    });
  };

  const startProgressIndicator = () => {
    setLoadingProgress(0);
    const totalDuration = 1500; // 1.5 seconds
    const steps = 30; // More steps for smoother animation
    let step = 0;
    
    const updateProgress = () => {
      step += 1;
      
      // Weighted progress: slow start, fast middle, slow end (ease-in-out)
      const normalizedStep = step / steps;
      const easedProgress = normalizedStep < 0.5 
        ? 2 * normalizedStep * normalizedStep 
        : 1 - Math.pow(-2 * normalizedStep + 2, 2) / 2;
      
      const progress = Math.min(100, easedProgress * 100);
      setLoadingProgress(progress);
      
      if (step < steps) {
        const nextInterval = totalDuration / steps;
        progressTimeoutRef.current = setTimeout(updateProgress, nextInterval);
      }
    };
    
    updateProgress();
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
    
    setIsHovering(true);
    startProgressIndicator();

    timeoutRef.current = setTimeout(() => {
      openDefinitionModal();
    }, 1500);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
    
    setIsHovering(false);
    setLoadingProgress(0);
  };

  const handleClick = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
    
    setIsHovering(false);
    setLoadingProgress(0);
    openDefinitionModal();
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
    };
  }, []);

  return (
    <span
      className="definition-trigger relative inline-block cursor-pointer border-b border-dashed border-blue-400 dark:border-blue-300 text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 transition-colors"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
      
      {/* Progress Indicator */}
      {isHovering && (
        <div 
          className="absolute -bottom-1 left-0 h-0.5 bg-blue-500 dark:bg-blue-400 transition-all duration-75"
          style={{ width: `${loadingProgress}%` }}
        />
      )}
    </span>
  );
}