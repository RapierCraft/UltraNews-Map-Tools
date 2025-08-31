import { VectorTileStyle } from './cesiumVectorProvider';

// Base vector tile styles for different themes and use cases
export const VECTOR_STYLES: Record<string, VectorTileStyle> = {
  'osm-light': {
    id: 'osm-light',
    name: 'OpenStreetMap Light',
    sources: {
      'osm': {
        type: 'vector',
        tiles: ['http://localhost:8002/api/v1/tiles/vector-hybrid/{z}/{x}/{y}.mvt'],
        maxzoom: 14
      }
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        source: 'osm',
        paint: {
          'background-color': '#f8f8f8'
        }
      },
      {
        id: 'landuse',
        type: 'fill',
        source: 'osm',
        'source-layer': 'landuse',
        paint: {
          'fill-color': '#e8f5e8',
          'fill-opacity': 0.6
        },
        filter: ['==', 'class', 'park']
      },
      {
        id: 'water',
        type: 'fill',
        source: 'osm',
        'source-layer': 'water',
        paint: {
          'fill-color': '#a8ddf0',
          'fill-opacity': 0.8
        }
      },
      {
        id: 'buildings',
        type: 'fill',
        source: 'osm',
        'source-layer': 'building',
        paint: {
          'fill-color': '#d9d9d9',
          'fill-opacity': 0.9,
          'fill-outline-color': '#bfbfbf'
        }
      },
      {
        id: 'roads-major',
        type: 'line',
        source: 'osm',
        'source-layer': 'transportation',
        paint: {
          'line-color': '#ffffff',
          'line-width': 3,
          'line-opacity': 0.9
        },
        filter: ['in', 'class', 'motorway', 'trunk', 'primary']
      },
      {
        id: 'roads-minor',
        type: 'line',
        source: 'osm',
        'source-layer': 'transportation',
        paint: {
          'line-color': '#ffffff',
          'line-width': 2,
          'line-opacity': 0.8
        },
        filter: ['in', 'class', 'secondary', 'tertiary', 'minor', 'service']
      },
      {
        id: 'place-labels',
        type: 'symbol',
        source: 'osm',
        'source-layer': 'place',
        layout: {
          'text-field': '{name}',
          'text-size': 14,
          'text-font': ['Arial']
        },
        paint: {
          'text-color': '#333333',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2
        }
      }
    ]
  },

  'osm-dark': {
    id: 'osm-dark',
    name: 'OpenStreetMap Dark',
    sources: {
      'osm': {
        type: 'vector',
        tiles: ['http://localhost:8002/api/v1/tiles/vector-hybrid/{z}/{x}/{y}.mvt'],
        maxzoom: 14
      }
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        source: 'osm',
        paint: {
          'background-color': '#1a1a1a'
        }
      },
      {
        id: 'landuse',
        type: 'fill',
        source: 'osm',
        'source-layer': 'landuse',
        paint: {
          'fill-color': '#2d4a2d',
          'fill-opacity': 0.6
        },
        filter: ['==', 'class', 'park']
      },
      {
        id: 'water',
        type: 'fill',
        source: 'osm',
        'source-layer': 'water',
        paint: {
          'fill-color': '#2d5a87',
          'fill-opacity': 0.8
        }
      },
      {
        id: 'buildings',
        type: 'fill',
        source: 'osm',
        'source-layer': 'building',
        paint: {
          'fill-color': '#333333',
          'fill-opacity': 0.9,
          'fill-outline-color': '#555555'
        }
      },
      {
        id: 'roads-major',
        type: 'line',
        source: 'osm',
        'source-layer': 'transportation',
        paint: {
          'line-color': '#666666',
          'line-width': 3,
          'line-opacity': 0.9
        },
        filter: ['in', 'class', 'motorway', 'trunk', 'primary']
      },
      {
        id: 'roads-minor',
        type: 'line',
        source: 'osm',
        'source-layer': 'transportation',
        paint: {
          'line-color': '#555555',
          'line-width': 2,
          'line-opacity': 0.8
        },
        filter: ['in', 'class', 'secondary', 'tertiary', 'minor', 'service']
      },
      {
        id: 'place-labels',
        type: 'symbol',
        source: 'osm',
        'source-layer': 'place',
        layout: {
          'text-field': '{name}',
          'text-size': 14,
          'text-font': ['Arial']
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 2
        }
      }
    ]
  },

  'news-story': {
    id: 'news-story',
    name: 'News Story Visualization',
    sources: {
      'osm': {
        type: 'vector',
        tiles: ['http://localhost:8002/api/v1/tiles/vector-hybrid/{z}/{x}/{y}.mvt'],
        maxzoom: 14
      }
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        source: 'osm',
        paint: {
          'background-color': '#f5f5f5'
        }
      },
      {
        id: 'countries-highlighted',
        type: 'fill',
        source: 'osm',
        'source-layer': 'boundary',
        paint: {
          'fill-color': '#ff6b6b',
          'fill-opacity': 0.3
        },
        filter: ['==', 'admin_level', 2]
      },
      {
        id: 'water',
        type: 'fill',
        source: 'osm',
        'source-layer': 'water',
        paint: {
          'fill-color': '#a8ddf0',
          'fill-opacity': 0.6
        }
      },
      {
        id: 'borders',
        type: 'line',
        source: 'osm',
        'source-layer': 'boundary',
        paint: {
          'line-color': '#ff4757',
          'line-width': 2,
          'line-opacity': 0.8
        },
        filter: ['==', 'admin_level', 2]
      }
    ]
  }
};

// Style factory functions
export function createNewsStoryStyle(storyType: 'ukraine' | 'pipeline' | 'banking' | 'generic'): VectorTileStyle {
  const baseStyle = VECTOR_STYLES['news-story'];
  
  switch (storyType) {
    case 'ukraine':
      return {
        ...baseStyle,
        id: 'ukraine-story',
        layers: [
          ...baseStyle.layers,
          {
            id: 'conflict-zones',
            type: 'fill',
            source: 'osm',
            'source-layer': 'place',
            paint: {
              'fill-color': '#ff9ff3',
              'fill-opacity': 0.4
            },
            filter: ['in', 'name', 'Ukraine', 'Russia', 'Belarus']
          }
        ]
      };
    
    case 'pipeline':
      return {
        ...baseStyle,
        id: 'pipeline-story',
        layers: [
          ...baseStyle.layers,
          {
            id: 'pipeline-routes',
            type: 'line',
            source: 'osm',
            'source-layer': 'transportation',
            paint: {
              'line-color': '#ffa502',
              'line-width': 4,
              'line-opacity': 0.8
            },
            filter: ['==', 'class', 'pipeline']
          }
        ]
      };
    
    case 'banking':
      return {
        ...baseStyle,
        id: 'banking-story',
        layers: [
          ...baseStyle.layers,
          {
            id: 'financial-districts',
            type: 'fill',
            source: 'osm',
            'source-layer': 'poi',
            paint: {
              'fill-color': '#3742fa',
              'fill-opacity': 0.3
            },
            filter: ['==', 'class', 'finance']
          }
        ]
      };
    
    default:
      return baseStyle;
  }
}

// Dynamic style generation based on map settings
export function generateDynamicStyle(
  isDarkTheme: boolean,
  layers: {
    roads: boolean;
    buildings: boolean;
    waterways: boolean;
    parks: boolean;
    labels: boolean;
    poi: boolean;
  }
): VectorTileStyle {
  const baseStyle = isDarkTheme ? VECTOR_STYLES['osm-dark'] : VECTOR_STYLES['osm-light'];
  
  return {
    ...baseStyle,
    id: `dynamic-${isDarkTheme ? 'dark' : 'light'}`,
    layers: baseStyle.layers.filter(layer => {
      // Filter layers based on user preferences
      if (layer.id.includes('road') && !layers.roads) return false;
      if (layer.id.includes('building') && !layers.buildings) return false;
      if (layer.id.includes('water') && !layers.waterways) return false;
      if (layer.id.includes('park') && !layers.parks) return false;
      if (layer.id.includes('label') && !layers.labels) return false;
      if (layer.id.includes('poi') && !layers.poi) return false;
      return true;
    })
  };
}

// Real-time style updates for news stories
export function updateStyleForLocation(
  baseStyle: VectorTileStyle, 
  location: { lat: number; lon: number; name: string },
  highlightColor: string = '#ff6b6b'
): VectorTileStyle {
  return {
    ...baseStyle,
    layers: [
      ...baseStyle.layers,
      {
        id: 'location-highlight',
        type: 'circle',
        source: 'osm',
        'source-layer': 'poi',
        paint: {
          'circle-color': highlightColor,
          'circle-radius': 8,
          'circle-opacity': 0.8,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2
        }
      }
    ]
  };
}