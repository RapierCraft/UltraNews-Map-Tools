'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Popup } from 'react-leaflet';

interface DynamicPopupProps {
  children: React.ReactNode;
  position: [number, number];
  maxWidth?: number;
  minWidth?: number;
}

interface PopupDimensions {
  width: number;
  height: number;
  maxHeight: number;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export default function DynamicPopup({ 
  children, 
  position, 
  maxWidth = 500,
  minWidth = 350 
}: DynamicPopupProps) {
  const [dimensions, setDimensions] = useState<PopupDimensions>({
    width: 400,
    height: 600,
    maxHeight: 600,
    position: 'center'
  });

  const calculateOptimalDimensions = (): PopupDimensions => {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Get the map container to understand available space
    const mapContainer = document.querySelector('.leaflet-container');
    if (!mapContainer) {
      return {
        width: Math.min(maxWidth, viewport.width * 0.9),
        height: Math.min(600, viewport.height * 0.8),
        maxHeight: viewport.height * 0.8,
        position: 'center'
      };
    }

    const mapRect = mapContainer.getBoundingClientRect();
    
    // Calculate available space in different directions
    const availableSpace = {
      top: mapRect.top,
      bottom: viewport.height - mapRect.bottom,
      left: mapRect.left,
      right: viewport.width - mapRect.right,
      center: {
        width: mapRect.width,
        height: mapRect.height
      }
    };

    // Determine optimal position based on available space
    let optimalPosition: 'top' | 'bottom' | 'left' | 'right' | 'center' = 'center';
    let optimalWidth = Math.min(maxWidth, availableSpace.center.width * 0.7);
    let optimalHeight = Math.min(650, availableSpace.center.height * 0.85); // More generous height
    let maxHeight = Math.min(650, availableSpace.center.height * 0.85);

    // Check if we have more space on the sides
    if (availableSpace.right > 400 && availableSpace.right > availableSpace.center.width * 0.4) {
      optimalPosition = 'right';
      optimalWidth = Math.min(maxWidth, Math.max(minWidth, availableSpace.right - 40));
      optimalHeight = Math.min(700, mapRect.height * 0.9); // Taller side panels
      maxHeight = Math.min(700, mapRect.height * 0.9);
    } else if (availableSpace.left > 400 && availableSpace.left > availableSpace.center.width * 0.4) {
      optimalPosition = 'left';
      optimalWidth = Math.min(maxWidth, Math.max(minWidth, availableSpace.left - 40));
      optimalHeight = Math.min(700, mapRect.height * 0.9); // Taller side panels
      maxHeight = Math.min(700, mapRect.height * 0.9);
    }
    
    // Mobile optimization
    if (viewport.width < 768) {
      optimalPosition = 'center';
      optimalWidth = Math.min(viewport.width * 0.95, maxWidth);
      optimalHeight = Math.min(viewport.height * 0.85, 550); // Better mobile height
      maxHeight = Math.min(viewport.height * 0.85, 550);
    }

    return {
      width: Math.max(minWidth, optimalWidth),
      height: optimalHeight,
      maxHeight,
      position: optimalPosition
    };
  };

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions(calculateOptimalDimensions());
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [position]);

  const getPopupClassName = () => {
    const baseClass = 'dynamic-popup';
    return `${baseClass} ${baseClass}--${dimensions.position}`;
  };

  const getPopupOffset = (): [number, number] => {
    switch (dimensions.position) {
      case 'left':
        return [-dimensions.width - 20, -dimensions.height / 2];
      case 'right':
        return [20, -dimensions.height / 2];
      case 'top':
        return [-dimensions.width / 2, -dimensions.height - 20];
      case 'bottom':
        return [-dimensions.width / 2, 20];
      default:
        return [0, 0];
    }
  };

  return (
    <Popup
      position={position}
      maxWidth={dimensions.width}
      minWidth={dimensions.width}
      className={getPopupClassName()}
      closeButton={false}
      autoPan={dimensions.position === 'center'}
      autoPanPadding={[20, 20]}
      offset={getPopupOffset()}
      keepInView={true}
    >
      <div 
        className="dynamic-popup-content"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          maxHeight: `${dimensions.maxHeight}px`,
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        {children}
      </div>
    </Popup>
  );
}