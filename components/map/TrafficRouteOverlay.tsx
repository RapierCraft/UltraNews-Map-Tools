'use client';

import { useEffect, useState } from 'react';
import { Polyline, Marker, Popup } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Clock, AlertTriangle } from 'lucide-react';

interface TrafficInfo {
  condition: string;
  delay_minutes: number;
  speed_kmh: number;
  confidence: number;
}

interface RouteSegment {
  distance_m: number;
  duration_s: number;
  traffic_duration_s: number;
  geometry: number[][];
  instructions: string;
  traffic_info?: TrafficInfo;
}

interface NavigationRoute {
  total_distance_m: number;
  total_duration_s: number;
  total_traffic_duration_s: number;
  segments: RouteSegment[];
  overview_geometry: number[][];
  traffic_delay_s: number;
  confidence: number;
}

interface TrafficRouteOverlayProps {
  route: NavigationRoute | null;
  showTrafficColors?: boolean;
  showWaypoints?: boolean;
  onSegmentClick?: (segment: RouteSegment, index: number) => void;
}

const trafficColors = {
  free_flow: '#10B981',    // Green
  light: '#F59E0B',       // Yellow
  moderate: '#F97316',    // Orange
  heavy: '#EF4444',       // Red
  severe: '#991B1B'       // Dark red
};

const getTrafficColor = (condition: string, confidence: number): string => {
  const baseColor = trafficColors[condition as keyof typeof trafficColors] || '#6B7280';
  
  // Reduce opacity for low confidence
  if (confidence < 0.5) {
    return baseColor + '80'; // 50% opacity
  } else if (confidence < 0.8) {
    return baseColor + 'CC'; // 80% opacity
  }
  return baseColor; // Full opacity
};

const createTrafficIcon = (condition: string) => {
  const color = trafficColors[condition as keyof typeof trafficColors] || '#6B7280';
  
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      "></div>
    `,
    className: 'traffic-marker',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
};

export default function TrafficRouteOverlay({ 
  route, 
  showTrafficColors = true, 
  showWaypoints = true,
  onSegmentClick 
}: TrafficRouteOverlayProps) {
  const map = useMap();
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);

  useEffect(() => {
    if (route && route.overview_geometry.length > 0) {
      // Fit map to route bounds
      const coordinates = route.overview_geometry.map(coord => [coord[1], coord[0]] as [number, number]);
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [route, map]);

  if (!route) return null;

  // Convert overview geometry to Leaflet format (lat, lon)
  const routeCoordinates = route.overview_geometry.map(coord => [coord[1], coord[0]] as [number, number]);

  return (
    <>
      {/* Main route line */}
      <Polyline
        positions={routeCoordinates}
        pathOptions={{
          color: showTrafficColors ? '#3B82F6' : '#3B82F6',
          weight: 5,
          opacity: 0.8,
          dashArray: undefined
        }}
      />

      {/* Traffic-colored segments */}
      {showTrafficColors && route.segments.map((segment, index) => {
        if (!segment.traffic_info || segment.geometry.length === 0) return null;

        const segmentCoords = segment.geometry.map(coord => [coord[1], coord[0]] as [number, number]);
        const color = getTrafficColor(segment.traffic_info.condition, segment.traffic_info.confidence);

        return (
          <Polyline
            key={`traffic-${index}`}
            positions={segmentCoords}
            pathOptions={{
              color: color,
              weight: 4,
              opacity: hoveredSegment === index ? 1.0 : 0.9,
              dashArray: segment.traffic_info.confidence < 0.6 ? '5, 5' : undefined
            }}
            eventHandlers={{
              mouseover: () => setHoveredSegment(index),
              mouseout: () => setHoveredSegment(null),
              click: () => onSegmentClick?.(segment, index)
            }}
          />
        );
      })}

      {/* Traffic condition markers at key points */}
      {showWaypoints && route.segments.map((segment, index) => {
        if (!segment.traffic_info || segment.geometry.length === 0) return null;
        if (segment.traffic_info.condition === 'free_flow') return null; // Only show problematic traffic

        // Place marker at middle of segment
        const midPoint = segment.geometry[Math.floor(segment.geometry.length / 2)];
        if (!midPoint) return null;

        return (
          <Marker
            key={`traffic-marker-${index}`}
            position={[midPoint[1], midPoint[0]]}
            icon={createTrafficIcon(segment.traffic_info.condition)}
          >
            <Popup>
              <div className="space-y-2 min-w-48">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">Traffic Alert</span>
                </div>
                
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Condition:</span> {segment.traffic_info.condition.replace('_', ' ')}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Delay:</span> +{segment.traffic_info.delay_minutes} minutes
                  </div>
                  <div>
                    <span className="text-muted-foreground">Speed:</span> {Math.round(segment.traffic_info.speed_kmh)} km/h
                  </div>
                  <div>
                    <span className="text-muted-foreground">Confidence:</span> {Math.round(segment.traffic_info.confidence * 100)}%
                  </div>
                </div>

                <div className="text-xs text-muted-foreground border-t pt-1">
                  {segment.instructions}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Start/End markers */}
      {routeCoordinates.length > 0 && (
        <>
          <Marker position={routeCoordinates[0]}>
            <Popup>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-500" />
                <span className="font-medium">Start</span>
              </div>
            </Popup>
          </Marker>
          
          <Marker position={routeCoordinates[routeCoordinates.length - 1]}>
            <Popup>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-500" />
                <span className="font-medium">Destination</span>
              </div>
            </Popup>
          </Marker>
        </>
      )}
    </>
  );
}