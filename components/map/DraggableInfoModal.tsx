'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Move, Info, Maximize2, Minimize2 } from 'lucide-react';
import { useTheme } from 'next-themes';

interface DraggableInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  sourceElement?: HTMLElement | null;
  sourcePosition?: { x: number; y: number };
  badge?: string;
}

export default function DraggableInfoModal({
  isOpen,
  onClose,
  title,
  children,
  sourceElement,
  sourcePosition,
  badge
}: DraggableInfoModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 250, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [lineEndPoint, setLineEndPoint] = useState({ x: 0, y: 0 });
  
  const modalRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const originalPosRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  // Update line endpoint when source element or modal moves
  useEffect(() => {
    if (!isOpen) return;

    const updateLineEndPoint = () => {
      if (sourceElement) {
        const rect = sourceElement.getBoundingClientRect();
        setLineEndPoint({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        });
      } else if (sourcePosition) {
        setLineEndPoint(sourcePosition);
      }
    };

    updateLineEndPoint();
    
    // Update on scroll, resize, or any DOM changes (for map panning/zooming)
    const interval = setInterval(updateLineEndPoint, 50); // Faster updates for smoother line movement
    
    window.addEventListener('scroll', updateLineEndPoint, true);
    window.addEventListener('resize', updateLineEndPoint);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('scroll', updateLineEndPoint, true);
      window.removeEventListener('resize', updateLineEndPoint);
    };
  }, [isOpen, sourceElement, sourcePosition, position]);

  // Initialize position
  useEffect(() => {
    if (isOpen && !isMaximized) {
      // Position modal offset from source
      const initialX = Math.min(window.innerWidth - 550, Math.max(50, (sourcePosition?.x || window.innerWidth / 2) + 100));
      const initialY = Math.min(window.innerHeight - 400, Math.max(50, (sourcePosition?.y || 100) - 50));
      setPosition({ x: initialX, y: initialY });
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMaximized) return;
    e.preventDefault();
    
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;
    
    dragStartRef.current = { x: startX, y: startY };
    setIsDragging(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      
      rafRef.current = requestAnimationFrame(() => {
        const newX = e.clientX - startX;
        const newY = e.clientY - startY;
        
        // Keep modal within viewport
        const boundedX = Math.max(0, Math.min(window.innerWidth - 500, newX));
        const boundedY = Math.max(0, Math.min(window.innerHeight - 100, newY));
        
        // Direct DOM manipulation for instant updates
        if (modalRef.current) {
          modalRef.current.style.transform = `translate(${boundedX}px, ${boundedY}px)`;
        }
        
        // Update state for the line position
        setPosition({ x: boundedX, y: boundedY });
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const toggleMaximize = () => {
    if (!isMaximized) {
      originalPosRef.current = position;
      setPosition({ x: 50, y: 50 });
    } else {
      setPosition(originalPosRef.current);
    }
    setIsMaximized(!isMaximized);
  };

  if (!isOpen) return null;

  const modalStyle = isMaximized 
    ? {
        top: '50px',
        left: '50px', 
        right: '50px',
        bottom: '50px',
        width: 'auto',
        height: 'auto',
        maxWidth: 'none',
        maxHeight: 'none',
        transform: 'none'
      }
    : {
        top: '0',
        left: '0',
        transform: `translate(${position.x}px, ${position.y}px)`,
        width: '500px',
        maxHeight: '80vh',
        willChange: 'transform'
      };

  return createPortal(
    <>
      {/* Connection line with curved path */}
      {(sourceElement || sourcePosition) && !isMaximized && lineEndPoint.x > 0 && lineEndPoint.y > 0 && (
        <svg
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 9998, width: '100vw', height: '100vh' }}
        >
          <defs>
            <filter id="lineShadow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2"/>
            </filter>
          </defs>
          {(() => {
            // Calculate the curved path with one bend
            const startX = lineEndPoint.x;
            const startY = lineEndPoint.y;
            // Info icon center position
            const iconCenterX = position.x + 30;
            const iconCenterY = position.y + 25;
            const iconRadius = 18; // Icon background radius (including padding)
            
            // Calculate angle from marker to icon center
            const angleToIcon = Math.atan2(iconCenterY - startY, iconCenterX - startX);
            
            // Calculate endpoint on the edge of the icon circle (coming from marker direction)
            const endX = iconCenterX - Math.cos(angleToIcon) * iconRadius;
            const endY = iconCenterY - Math.sin(angleToIcon) * iconRadius;
            
            // Calculate control point for the bend (offset horizontally)
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            
            // Create bend based on relative positions
            let controlX = midX;
            let controlY = midY;
            
            // If modal is to the right of marker, bend goes right then down/up
            // If modal is to the left, bend goes left then down/up
            const horizontalDiff = endX - startX;
            const verticalDiff = endY - startY;
            
            if (Math.abs(horizontalDiff) > Math.abs(verticalDiff)) {
              // More horizontal - create vertical bend
              controlX = startX + horizontalDiff * 0.7;
              controlY = startY;
            } else {
              // More vertical - create horizontal bend
              controlX = startX;
              controlY = startY + verticalDiff * 0.7;
            }
            
            // Create path with quadratic bezier curve
            const pathData = `M ${startX} ${startY} Q ${controlX} ${controlY}, ${endX} ${endY}`;
            
            return (
              <>
                {/* Main curved line */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={isDark ? '#60a5fa' : '#3b82f6'}
                  strokeWidth="2.5"
                  opacity="0.7"
                  filter="url(#lineShadow)"
                  strokeLinecap="round"
                />
                
                {/* Dotted overlay for style */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={isDark ? '#93c5fd' : '#60a5fa'}
                  strokeWidth="1.5"
                  strokeDasharray="6,4"
                  opacity="0.8"
                  strokeLinecap="round"
                />
                
                {/* Small circle at source */}
                <circle
                  cx={startX}
                  cy={startY}
                  r="5"
                  fill={isDark ? '#60a5fa' : '#3b82f6'}
                  opacity="0.9"
                />
                
                {/* Small circle at destination */}
                <circle
                  cx={endX}
                  cy={endY}
                  r="4"
                  fill={isDark ? '#60a5fa' : '#3b82f6'}
                  opacity="0.7"
                />
              </>
            );
          })()}
        </svg>
      )}

      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed"
        style={{
          ...modalStyle,
          zIndex: 9999,
          cursor: isDragging ? 'grabbing' : 'default',
          transition: isDragging ? 'none' : 'none' // No transitions during drag
        }}
      >
        <Card className={`
          h-full flex flex-col shadow-2xl border-0
          ${isDark ? 'bg-gray-900/95 backdrop-blur-xl' : 'bg-white/95 backdrop-blur-xl'}
          ${isMaximized ? '' : 'resize overflow-hidden'}
        `}>
          <CardHeader 
            className="pb-2 px-4 py-2 cursor-grab active:cursor-grabbing select-none flex-shrink-0"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                  <Info className={`w-4 h-4 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
                </div>
                <div>
                  <CardTitle className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {title}
                  </CardTitle>
                  {badge && (
                    <Badge variant="secondary" className="text-xs mt-0">
                      {badge}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={toggleMaximize}
                >
                  {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={onClose}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {!isMaximized && (
              <div className="flex items-center gap-1 mt-1">
                <Move className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400">Drag to reposition</span>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="flex-1 px-4 py-2 overflow-y-auto">
            {children}
          </CardContent>
        </Card>
      </div>
    </>,
    document.body
  );
}