'use client';

import { useState, useRef, useEffect } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import DraggableInfoModal from './DraggableInfoModal';
import POIInfoPanel from './POIInfoPanel';

interface POIMarker {
  id: string;
  position: [number, number];
  type: 'explosion' | 'facility' | 'economic' | 'military' | 'infrastructure';
  title: string;
  data: any;
  icon: string;
  color: string;
  priority: number;
  wikipediaTopics?: string[];
}

interface ProfessionalMarkerProps {
  poi: POIMarker;
  wikipediaData?: {[key: string]: any};
}

export default function ProfessionalMarker({ poi, wikipediaData }: ProfessionalMarkerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [markerElement, setMarkerElement] = useState<HTMLElement | null>(null);
  const [markerPosition, setMarkerPosition] = useState<{ x: number; y: number } | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Update marker element when ref is set
  useEffect(() => {
    if (markerRef.current) {
      const element = markerRef.current.getElement();
      if (element) {
        setMarkerElement(element);
        const rect = element.getBoundingClientRect();
        setMarkerPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        });
      }
    }
  }, [markerRef.current, isModalOpen]);

  const createPOIIcon = (marker: POIMarker) => {
    const iconMap = {
      explosion: '💥',
      facility: '🏭', 
      economic: '💰',
      military: '🛡️',
      infrastructure: '⚡',
      bank: '🏛️',
      tech: '💻',
      shield: '🛡️',
      target: '🎯',
      nuclear: '☢️'
    };

    // Enhanced colors for better visibility in dark mode
    const enhancedColor = marker.color === '#FF0000' ? '#FF4444' : 
                          marker.color === '#4A90E2' ? '#60A5FA' :
                          marker.color === '#F39C12' ? '#FBBF24' :
                          marker.color === '#3498DB' ? '#3B82F6' :
                          marker.color === '#2E86AB' ? '#0EA5E9' :
                          marker.color === '#E74C3C' ? '#EF4444' :
                          marker.color === '#2ECC71' ? '#10B981' : marker.color;

    const size = marker.priority >= 9 ? 44 : marker.priority >= 7 ? 38 : 32;
    const pulseClass = marker.priority >= 9 ? 'priority-high' : '';

    return L.divIcon({
      html: `
        <div class="poi-marker ${pulseClass}" style="
          background: linear-gradient(135deg, ${enhancedColor}, ${enhancedColor}dd); 
          border: 3px solid rgba(255,255,255,0.9);
          border-radius: 50%;
          width: ${size}px;
          height: ${size}px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${size * 0.4}px;
          box-shadow: 
            0 8px 25px rgba(0,0,0,0.3),
            0 3px 8px rgba(0,0,0,0.2),
            inset 0 1px 0 rgba(255,255,255,0.3);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(12px);
          position: relative;
          z-index: 1000;
        ">
          <div style="
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
            position: relative;
            z-index: 1001;
          ">
            ${iconMap[marker.icon as keyof typeof iconMap] || '📍'}
          </div>
        </div>
      `,
      className: 'poi-marker',
      iconSize: [size, size],
      iconAnchor: [size/2, size/2]
    });
  };

  const handleMarkerClick = () => {
    // Update position when clicked
    if (markerRef.current) {
      const element = markerRef.current.getElement();
      if (element) {
        setMarkerElement(element);
        const rect = element.getBoundingClientRect();
        setMarkerPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        });
      }
    }
    setIsModalOpen(true);
  };

  return (
    <>
      <Marker
        ref={markerRef}
        position={poi.position}
        icon={createPOIIcon(poi)}
        eventHandlers={{
          click: handleMarkerClick
        }}
      />
      
      <DraggableInfoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={poi.title}
        sourceElement={markerElement}
        sourcePosition={markerPosition}
        badge={poi.type}
      >
        <POIInfoPanel 
          poi={poi} 
          wikipediaData={wikipediaData}
        />
      </DraggableInfoModal>
    </>
  );
}