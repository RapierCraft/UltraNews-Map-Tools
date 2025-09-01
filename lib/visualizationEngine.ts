import { Visualization } from './multiAgentSystem';

export interface VisualizationLayer {
  id: string;
  type: 'timeline' | 'heatmap' | 'network' | 'chart' | 'infographic' | 'route' | 'overlay';
  data: any;
  style: {
    colors: string[];
    opacity: number;
    strokeWidth?: number;
    fillOpacity?: number;
  };
  interactive: boolean;
  zIndex: number;
}

export interface TimelineData {
  events: Array<{
    date: Date;
    title: string;
    description: string;
    location?: { lat: number; lon: number };
    importance: 'low' | 'medium' | 'high';
    category: string;
  }>;
  timespan: {
    start: Date;
    end: Date;
  };
}

export interface HeatmapData {
  points: Array<{
    lat: number;
    lon: number;
    intensity: number;
    value?: number;
    label?: string;
  }>;
  gradient: Record<number, string>;
  radius: number;
  maxZoom: number;
}

export interface NetworkData {
  nodes: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
    size: number;
    color: string;
    category: string;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    weight: number;
    label?: string;
    color: string;
  }>;
}

export class VisualizationEngine {
  private static instance: VisualizationEngine;
  private activeLayers: Map<string, VisualizationLayer> = new Map();

  static getInstance(): VisualizationEngine {
    if (!VisualizationEngine.instance) {
      VisualizationEngine.instance = new VisualizationEngine();
    }
    return VisualizationEngine.instance;
  }

  generateCesiumLayer(visualization: Visualization, cesiumViewer: any): VisualizationLayer | null {
    if (!cesiumViewer || !window.Cesium) return null;

    switch (visualization.type) {
      case 'timeline':
        return this.generateTimelineLayer(visualization, cesiumViewer);
      case 'heatmap':
        return this.generateHeatmapLayer(visualization, cesiumViewer);
      case 'network':
        return this.generateNetworkLayer(visualization, cesiumViewer);
      case 'route':
        return this.generateRouteLayer(visualization, cesiumViewer);
      case 'overlay':
        return this.generateOverlayLayer(visualization, cesiumViewer);
      default:
        console.warn(`Unsupported visualization type: ${visualization.type}`);
        return null;
    }
  }

  private generateTimelineLayer(visualization: Visualization, cesiumViewer: any): VisualizationLayer {
    const timelineData = visualization.data as TimelineData;
    
    // Add timeline events as entities on the globe
    timelineData.events.forEach((event, index) => {
      if (event.location) {
        const entity = cesiumViewer.entities.add({
          name: `timeline-event-${index}`,
          position: window.Cesium.Cartesian3.fromDegrees(
            event.location.lon, 
            event.location.lat, 
            this.getEventHeight(event.importance)
          ),
          point: {
            pixelSize: this.getEventSize(event.importance),
            color: this.getEventColor(event.importance),
            outlineColor: window.Cesium.Color.WHITE,
            outlineWidth: 2,
            heightReference: window.Cesium.HeightReference.RELATIVE_TO_GROUND
          },
          label: {
            text: event.title,
            font: '12pt sans-serif',
            pixelOffset: new window.Cesium.Cartesian2(0, -40),
            fillColor: window.Cesium.Color.WHITE,
            outlineColor: window.Cesium.Color.BLACK,
            outlineWidth: 2,
            scale: 0.8
          },
          description: `<h3>${event.title}</h3><p>${event.description}</p><small>${event.date.toLocaleDateString()}</small>`
        });
      }
    });

    return {
      id: `timeline-${Date.now()}`,
      type: 'timeline',
      data: timelineData,
      style: {
        colors: ['#3b82f6', '#ef4444', '#10b981'],
        opacity: 0.8
      },
      interactive: true,
      zIndex: 100
    };
  }

  private generateHeatmapLayer(visualization: Visualization, cesiumViewer: any): VisualizationLayer {
    const heatmapData = visualization.data as HeatmapData;
    
    // Create heatmap using entities with graduated circles
    heatmapData.points.forEach((point, index) => {
      const radius = point.intensity * heatmapData.radius;
      const color = this.getHeatmapColor(point.intensity);
      
      cesiumViewer.entities.add({
        name: `heatmap-point-${index}`,
        position: window.Cesium.Cartesian3.fromDegrees(point.lon, point.lat, 100),
        ellipse: {
          semiMajorAxis: radius,
          semiMinorAxis: radius,
          material: color.withAlpha(0.4),
          outline: true,
          outlineColor: color,
          heightReference: window.Cesium.HeightReference.CLAMP_TO_GROUND
        },
        label: point.label ? {
          text: point.label,
          font: '10pt sans-serif',
          pixelOffset: new window.Cesium.Cartesian2(0, -20),
          fillColor: window.Cesium.Color.WHITE,
          outlineColor: window.Cesium.Color.BLACK,
          outlineWidth: 1,
          scale: 0.7
        } : undefined
      });
    });

    return {
      id: `heatmap-${Date.now()}`,
      type: 'heatmap',
      data: heatmapData,
      style: {
        colors: ['#3b82f6', '#f59e0b', '#ef4444'],
        opacity: 0.6
      },
      interactive: true,
      zIndex: 200
    };
  }

  private generateNetworkLayer(visualization: Visualization, cesiumViewer: any): VisualizationLayer {
    const networkData = visualization.data as NetworkData;
    
    // Add network nodes
    networkData.nodes.forEach((node) => {
      cesiumViewer.entities.add({
        name: `network-node-${node.id}`,
        position: window.Cesium.Cartesian3.fromDegrees(node.x, node.y, 500),
        point: {
          pixelSize: node.size,
          color: window.Cesium.Color.fromCssColorString(node.color),
          outlineColor: window.Cesium.Color.WHITE,
          outlineWidth: 2
        },
        label: {
          text: node.label,
          font: '11pt sans-serif',
          pixelOffset: new window.Cesium.Cartesian2(0, -30),
          fillColor: window.Cesium.Color.WHITE,
          outlineColor: window.Cesium.Color.BLACK,
          outlineWidth: 1
        }
      });
    });

    // Add network edges
    networkData.edges.forEach((edge) => {
      const sourceNode = networkData.nodes.find(n => n.id === edge.source);
      const targetNode = networkData.nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        cesiumViewer.entities.add({
          name: `network-edge-${edge.id}`,
          polyline: {
            positions: [
              window.Cesium.Cartesian3.fromDegrees(sourceNode.x, sourceNode.y, 400),
              window.Cesium.Cartesian3.fromDegrees(targetNode.x, targetNode.y, 400)
            ],
            width: Math.max(2, edge.weight * 5),
            material: window.Cesium.Color.fromCssColorString(edge.color).withAlpha(0.7),
            clampToGround: false
          }
        });
      }
    });

    return {
      id: `network-${Date.now()}`,
      type: 'network',
      data: networkData,
      style: {
        colors: ['#3b82f6', '#ef4444', '#10b981'],
        opacity: 0.7,
        strokeWidth: 3
      },
      interactive: true,
      zIndex: 300
    };
  }

  private generateRouteLayer(visualization: Visualization, cesiumViewer: any): VisualizationLayer {
    const routeData = visualization.data;
    
    if (routeData.path && routeData.path.length > 0) {
      const positions = routeData.path.map((coord: [number, number]) => 
        window.Cesium.Cartesian3.fromDegrees(coord[1], coord[0], 200)
      );

      cesiumViewer.entities.add({
        name: 'route-visualization',
        polyline: {
          positions: positions,
          width: 8,
          material: window.Cesium.Color.fromCssColorString('#2563eb'),
          clampToGround: true
        }
      });

      // Add waypoints
      routeData.waypoints?.forEach((waypoint: any, index: number) => {
        cesiumViewer.entities.add({
          name: `route-waypoint-${index}`,
          position: window.Cesium.Cartesian3.fromDegrees(waypoint.lon, waypoint.lat, 300),
          point: {
            pixelSize: 12,
            color: index === 0 ? window.Cesium.Color.GREEN : 
                   index === routeData.waypoints.length - 1 ? window.Cesium.Color.RED : 
                   window.Cesium.Color.ORANGE,
            outlineColor: window.Cesium.Color.WHITE,
            outlineWidth: 3
          },
          label: {
            text: waypoint.name || `Stop ${index + 1}`,
            font: '11pt sans-serif',
            pixelOffset: new window.Cesium.Cartesian2(0, -30),
            fillColor: window.Cesium.Color.WHITE,
            outlineColor: window.Cesium.Color.BLACK,
            outlineWidth: 1
          }
        });
      });
    }

    return {
      id: `route-${Date.now()}`,
      type: 'route',
      data: routeData,
      style: {
        colors: ['#2563eb', '#10b981', '#ef4444'],
        opacity: 0.9,
        strokeWidth: 8
      },
      interactive: true,
      zIndex: 400
    };
  }

  private generateOverlayLayer(visualization: Visualization, cesiumViewer: any): VisualizationLayer {
    const overlayData = visualization.data;
    
    // Generate polygon overlays for environmental or zoning data
    if (overlayData.polygons) {
      overlayData.polygons.forEach((polygon: any, index: number) => {
        const positions = polygon.coordinates.map((coord: [number, number]) =>
          window.Cesium.Cartesian3.fromDegrees(coord[0], coord[1])
        );

        cesiumViewer.entities.add({
          name: `overlay-polygon-${index}`,
          polygon: {
            hierarchy: positions,
            material: window.Cesium.Color.fromCssColorString(polygon.color || '#3b82f6').withAlpha(0.3),
            outline: true,
            outlineColor: window.Cesium.Color.fromCssColorString(polygon.color || '#3b82f6'),
            height: polygon.height || 0,
            extrudedHeight: polygon.extrudedHeight || 1000
          },
          label: polygon.label ? {
            text: polygon.label,
            font: '12pt sans-serif',
            fillColor: window.Cesium.Color.WHITE,
            outlineColor: window.Cesium.Color.BLACK,
            outlineWidth: 2
          } : undefined
        });
      });
    }

    return {
      id: `overlay-${Date.now()}`,
      type: 'overlay',
      data: overlayData,
      style: {
        colors: ['#3b82f6', '#10b981', '#f59e0b'],
        opacity: 0.5,
        fillOpacity: 0.3
      },
      interactive: true,
      zIndex: 150
    };
  }

  private getEventHeight(importance: 'low' | 'medium' | 'high'): number {
    switch (importance) {
      case 'high': return 5000;
      case 'medium': return 2000;
      case 'low': return 500;
      default: return 1000;
    }
  }

  private getEventSize(importance: 'low' | 'medium' | 'high'): number {
    switch (importance) {
      case 'high': return 15;
      case 'medium': return 10;
      case 'low': return 6;
      default: return 8;
    }
  }

  private getEventColor(importance: 'low' | 'medium' | 'high'): any {
    switch (importance) {
      case 'high': return window.Cesium.Color.RED;
      case 'medium': return window.Cesium.Color.ORANGE;
      case 'low': return window.Cesium.Color.YELLOW;
      default: return window.Cesium.Color.BLUE;
    }
  }

  private getHeatmapColor(intensity: number): any {
    // Gradient from blue (low) to red (high)
    if (intensity < 0.3) return window.Cesium.Color.BLUE;
    if (intensity < 0.6) return window.Cesium.Color.YELLOW;
    if (intensity < 0.8) return window.Cesium.Color.ORANGE;
    return window.Cesium.Color.RED;
  }

  addLayer(layer: VisualizationLayer): void {
    this.activeLayers.set(layer.id, layer);
  }

  removeLayer(layerId: string): void {
    this.activeLayers.delete(layerId);
  }

  clearAllLayers(cesiumViewer: any): void {
    // Remove all visualization entities from Cesium
    const entitiesToRemove = cesiumViewer.entities.values.filter((entity: any) => 
      entity.name && (
        entity.name.startsWith('timeline-') ||
        entity.name.startsWith('heatmap-') ||
        entity.name.startsWith('network-') ||
        entity.name.startsWith('route-') ||
        entity.name.startsWith('overlay-')
      )
    );
    
    entitiesToRemove.forEach((entity: any) => cesiumViewer.entities.remove(entity));
    this.activeLayers.clear();
  }

  getActiveLayers(): VisualizationLayer[] {
    return Array.from(this.activeLayers.values());
  }

  // Generate infographic data for overlay display
  generateInfographic(visualization: Visualization): {
    title: string;
    sections: Array<{
      type: 'stat' | 'chart' | 'list' | 'image';
      content: any;
    }>;
  } {
    const { metadata, data } = visualization;
    
    return {
      title: metadata.title,
      sections: [
        {
          type: 'stat',
          content: {
            label: 'Data Points',
            value: Array.isArray(data) ? data.length : Object.keys(data).length,
            trend: '+15%'
          }
        },
        {
          type: 'chart',
          content: {
            type: 'bar',
            data: this.extractChartData(data)
          }
        },
        {
          type: 'list',
          content: {
            title: 'Key Insights',
            items: this.extractKeyInsights(visualization.type, data)
          }
        }
      ]
    };
  }

  private extractChartData(data: any): any {
    // Convert various data types to chart format
    if (data.timeline) {
      return data.timeline.events?.map((event: any) => ({
        x: event.time || event.date,
        y: event.impact || event.intensity || 1
      })) || [];
    }
    
    if (data.points) {
      return data.points.map((point: any) => ({
        x: point.lat,
        y: point.intensity || point.value || 1
      }));
    }
    
    return [];
  }

  private extractKeyInsights(type: string, data: any): string[] {
    switch (type) {
      case 'timeline':
        return [
          `${data.events?.length || 0} historical events identified`,
          `Timespan: ${data.timespan?.start ? new Date(data.timespan.start).getFullYear() : 'Unknown'} - ${data.timespan?.end ? new Date(data.timespan.end).getFullYear() : 'Present'}`,
          'Click events on map for details'
        ];
      
      case 'heatmap':
        return [
          `${data.points?.length || 0} data points analyzed`,
          `Peak activity in ${data.hotspots?.join(', ') || 'multiple areas'}`,
          'Color intensity shows activity level'
        ];
        
      case 'network':
        return [
          `${data.nodes?.length || 0} entities mapped`,
          `${data.edges?.length || 0} relationships identified`,
          'Node size indicates importance'
        ];
        
      default:
        return ['Visualization generated successfully', 'Interactive elements available', 'Data from multiple sources'];
    }
  }
}

export const visualizationEngine = VisualizationEngine.getInstance();