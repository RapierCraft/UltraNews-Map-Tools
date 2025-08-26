'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import DynamicPopup from './DynamicPopup';
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

interface ProfessionalPopupProps {
  poi: POIMarker;
  wikipediaData?: {[key: string]: any};
  children?: React.ReactNode;
}

export default function ProfessionalPopup({ poi, wikipediaData, children }: ProfessionalPopupProps) {
  return (
    <DynamicPopup 
      position={poi.position}
      maxWidth={500}
      minWidth={380}
    >
      <POIInfoPanel 
        poi={poi} 
        wikipediaData={wikipediaData}
      />
      {children}
    </DynamicPopup>
  );
}