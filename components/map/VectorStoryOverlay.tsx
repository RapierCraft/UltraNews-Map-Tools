'use client';

import { useEffect, useState, useCallback } from 'react';
import { CesiumVectorTileProvider, VectorTileStyle } from '@/lib/cesiumVectorProvider';
import { createNewsStoryStyle, updateStyleForLocation } from '@/lib/vectorStyles';

interface NewsStory {
  id: string;
  headline: string;
  content: string;
  publishedAt: Date;
  source: string;
}

interface VectorStoryOverlayProps {
  story: NewsStory;
  viewer: any; // Cesium viewer
  isDarkTheme?: boolean;
  timelinePosition?: number;
  onFeatureClick?: (feature: any) => void;
}

interface StoryLocation {
  name: string;
  coordinates: [number, number];
  importance: 'high' | 'medium' | 'low';
  type: 'country' | 'city' | 'landmark' | 'infrastructure';
}

export default function VectorStoryOverlay({
  story,
  viewer,
  isDarkTheme = false,
  timelinePosition = 100,
  onFeatureClick
}: VectorStoryOverlayProps) {
  const [vectorProvider, setVectorProvider] = useState<CesiumVectorTileProvider | null>(null);
  const [imageryLayer, setImageryLayer] = useState<any>(null);
  const [storyLocations, setStoryLocations] = useState<StoryLocation[]>([]);

  // Extract locations from story content
  const extractStoryLocations = useCallback((story: NewsStory): StoryLocation[] => {
    const locations: StoryLocation[] = [];
    const content = `${story.headline} ${story.content}`.toLowerCase();

    // Location patterns for different story types
    if (story.id.includes('ukraine') || content.includes('ukraine')) {
      locations.push(
        { name: 'Ukraine', coordinates: [48.3794, 31.1656], importance: 'high', type: 'country' },
        { name: 'Kyiv', coordinates: [50.4501, 30.5234], importance: 'high', type: 'city' },
        { name: 'Russia', coordinates: [61.5240, 105.3188], importance: 'high', type: 'country' }
      );
    }
    
    if (story.id.includes('nord-stream') || content.includes('pipeline')) {
      locations.push(
        { name: 'Nord Stream', coordinates: [54.8000, 15.0000], importance: 'high', type: 'infrastructure' },
        { name: 'Baltic Sea', coordinates: [55.0000, 16.0000], importance: 'high', type: 'landmark' },
        { name: 'Vyborg', coordinates: [60.7115, 28.7461], importance: 'medium', type: 'city' },
        { name: 'Lubmin', coordinates: [54.1333, 13.6333], importance: 'medium', type: 'city' }
      );
    }
    
    if (story.id.includes('svb') || content.includes('silicon valley bank')) {
      locations.push(
        { name: 'Silicon Valley', coordinates: [37.4419, -122.1430], importance: 'high', type: 'landmark' },
        { name: 'Santa Clara', coordinates: [37.3541, -121.9552], importance: 'medium', type: 'city' },
        { name: 'San Francisco', coordinates: [37.7749, -122.4194], importance: 'medium', type: 'city' }
      );
    }

    return locations;
  }, []);

  // Initialize vector provider
  useEffect(() => {
    if (!viewer || !window.Cesium) return;

    const storyType = story.id.includes('ukraine') ? 'ukraine' :
                     story.id.includes('pipeline') ? 'pipeline' :
                     story.id.includes('svb') ? 'banking' : 'generic';

    const style = createNewsStoryStyle(storyType);
    const provider = new CesiumVectorTileProvider(style);

    provider.createImageryProvider().then(imageryProvider => {
      // Remove existing imagery layers (except base terrain)
      const layers = viewer.imageryLayers;
      for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers.get(i);
        if (layer.alpha !== undefined) { // Skip base layers
          layers.remove(layer);
        }
      }

      // Add vector imagery
      const newLayer = layers.addImageryProvider(imageryProvider);
      newLayer.alpha = 0.8;
      
      setImageryLayer(newLayer);
      setVectorProvider(provider);
    }).catch(error => {
      console.error('Failed to create vector imagery provider:', error);
    });

    // Extract and set story locations
    const locations = extractStoryLocations(story);
    setStoryLocations(locations);

    return () => {
      if (imageryLayer) {
        viewer.imageryLayers.remove(imageryLayer);
      }
    };
  }, [story, viewer, extractStoryLocations]);

  // Update style based on theme
  useEffect(() => {
    if (!vectorProvider) return;

    const storyType = story.id.includes('ukraine') ? 'ukraine' :
                     story.id.includes('pipeline') ? 'pipeline' :
                     story.id.includes('svb') ? 'banking' : 'generic';

    const style = createNewsStoryStyle(storyType);
    
    // Apply dark theme modifications if needed
    if (isDarkTheme) {
      style.layers = style.layers.map(layer => {
        if (layer.type === 'background') {
          return {
            ...layer,
            paint: { 'background-color': '#1a1a1a' }
          };
        }
        return layer;
      });
    }

    vectorProvider.updateStyle(style);
  }, [isDarkTheme, vectorProvider, story.id]);

  // Add interactive markers for story locations
  useEffect(() => {
    if (!viewer || !window.Cesium || storyLocations.length === 0) return;

    const entities: any[] = [];

    storyLocations.forEach(location => {
      const importance = location.importance;
      const color = importance === 'high' ? window.Cesium.Color.RED :
                   importance === 'medium' ? window.Cesium.Color.ORANGE :
                   window.Cesium.Color.YELLOW;

      const entity = viewer.entities.add({
        position: window.Cesium.Cartesian3.fromDegrees(location.coordinates[1], location.coordinates[0]),
        point: {
          pixelSize: importance === 'high' ? 12 : importance === 'medium' ? 8 : 6,
          color: color.withAlpha(0.8),
          outlineColor: window.Cesium.Color.WHITE,
          outlineWidth: 2,
          heightReference: window.Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: {
          text: location.name,
          font: '12pt Arial',
          fillColor: window.Cesium.Color.WHITE,
          outlineColor: window.Cesium.Color.BLACK,
          outlineWidth: 2,
          style: window.Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: window.Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new window.Cesium.Cartesian2(0, -20)
        },
        properties: {
          storyLocation: true,
          locationData: location,
          story: story
        }
      });

      entities.push(entity);
    });

    return () => {
      entities.forEach(entity => {
        viewer.entities.remove(entity);
      });
    };
  }, [viewer, storyLocations, story]);

  // Handle timeline animation
  useEffect(() => {
    if (!imageryLayer || !vectorProvider) return;

    // Animate opacity based on timeline position
    const opacity = Math.max(0.2, timelinePosition / 100);
    imageryLayer.alpha = opacity;
  }, [timelinePosition, imageryLayer, vectorProvider]);

  // Setup click handlers for interactive features
  useEffect(() => {
    if (!viewer || !onFeatureClick) return;

    const handler = new window.Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    
    handler.setInputAction((event: any) => {
      const pickedEntity = viewer.scene.pick(event.position);
      
      if (pickedEntity && pickedEntity.id && pickedEntity.id.properties) {
        const properties = pickedEntity.id.properties;
        if (properties.storyLocation && properties.locationData) {
          onFeatureClick({
            type: 'story-location',
            data: properties.locationData.getValue(),
            story: properties.story.getValue(),
            position: event.position
          });
        }
      }
    }, window.Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
    };
  }, [viewer, onFeatureClick]);

  return null; // This component doesn't render anything directly
}

// Utility function to fit view to story locations
export function fitViewToStory(viewer: any, story: NewsStory) {
  if (!viewer || !window.Cesium) return;

  const storyType = story.id.includes('ukraine') ? 'ukraine' :
                   story.id.includes('pipeline') ? 'pipeline' :
                   story.id.includes('svb') ? 'banking' : 'generic';

  let destination;
  
  switch (storyType) {
    case 'ukraine':
      destination = window.Cesium.Cartesian3.fromDegrees(31.1656, 48.3794, 2000000);
      break;
    case 'pipeline':
      destination = window.Cesium.Cartesian3.fromDegrees(15.0000, 54.8000, 1000000);
      break;
    case 'banking':
      destination = window.Cesium.Cartesian3.fromDegrees(-122.1430, 37.4419, 500000);
      break;
    default:
      return;
  }

  viewer.camera.flyTo({
    destination,
    duration: 2.0
  });
}