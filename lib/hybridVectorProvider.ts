'use client';

import federatedStyle from './federatedStyle.json';

declare global {
  interface Window {
    Cesium: any;
  }
}

export class HybridVectorProvider {
  private maplibreMap: any;
  private canvas: HTMLCanvasElement;
  private tileSize = 512;
  private cache = new Map<string, HTMLCanvasElement>();
  private style: any;

  constructor(style?: any) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.tileSize;
    this.canvas.height = this.tileSize;
    this.style = style || federatedStyle;
    this.initializeMapLibre();
  }

  private async initializeMapLibre() {
    if (typeof window === 'undefined') return;
    
    // Dynamic import to avoid SSR issues
    const maplibregl = (await import('maplibre-gl')).default;
    
    // Create invisible MapLibre map for vector tile rendering
    const container = document.createElement('div');
    container.style.width = `${this.tileSize}px`;
    container.style.height = `${this.tileSize}px`;
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    document.body.appendChild(container);

    this.maplibreMap = new maplibregl.Map({
      container,
      style: this.style,
      center: [0, 0],
      zoom: 0,
      preserveDrawingBuffer: true,
      interactive: false,
      attributionControl: false
    });
  }

  async createCesiumImageryProvider(): Promise<any> {
    if (!window.Cesium) {
      throw new Error('Cesium not loaded');
    }

    // Wait for MapLibre to be ready
    if (!this.maplibreMap || !this.maplibreMap.loaded()) {
      await new Promise(resolve => {
        const checkLoaded = () => {
          if (this.maplibreMap && this.maplibreMap.loaded()) {
            resolve(true);
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      });
    }

    // Create custom provider that renders tiles using MapLibre
    const CustomProvider = function(this: any) {
      this._tileWidth = 512;
      this._tileHeight = 512;
      this._maximumLevel = 14; 
      this._minimumLevel = 0;
      this._tilingScheme = new window.Cesium.WebMercatorTilingScheme();
      this._hasAlphaChannel = true;
      this._credit = new window.Cesium.Credit('© OpenStreetMap contributors | UltraMaps Hybrid');
      this._readyPromise = Promise.resolve(true);
      this._rectangle = window.Cesium.Rectangle.fromDegrees(-180, -85, 180, 85);
    };

    CustomProvider.prototype = Object.create(window.Cesium.ImageryProvider.prototype);
    CustomProvider.prototype.constructor = CustomProvider;

    // Define required properties
    Object.defineProperties(CustomProvider.prototype, {
      url: { get: function() { return undefined; } },
      tileWidth: { get: function() { return this._tileWidth; } },
      tileHeight: { get: function() { return this._tileHeight; } },
      maximumLevel: { get: function() { return this._maximumLevel; } },
      minimumLevel: { get: function() { return this._minimumLevel; } },
      tilingScheme: { get: function() { return this._tilingScheme; } },
      hasAlphaChannel: { get: function() { return this._hasAlphaChannel; } },
      credit: { get: function() { return this._credit; } },
      readyPromise: { get: function() { return this._readyPromise; } },
      rectangle: { get: function() { return this._rectangle; } }
    });

    const self = this;
    CustomProvider.prototype.requestImage = function(x: number, y: number, level: number) {
      return self.renderHybridTile(x, y, level).catch((error: Error) => {
        console.warn(`Tile render failed ${level}/${x}/${y}:`, error);
        return self.createEmptyCanvas();
      });
    };

    return new CustomProvider();
  }

  private createEmptyCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.tileSize;
    canvas.height = this.tileSize;
    return canvas;
  }

  private async renderTileUrl(x: number, y: number, level: number): Promise<string> {
    const tileKey = `${level}/${x}/${y}`;
    
    // Check cache
    if (this.cache.has(tileKey)) {
      return this.cache.get(tileKey)!.toDataURL();
    }

    try {
      const canvas = await this.renderHybridTile(x, y, level);
      
      // Cache management
      if (this.cache.size > 200) {
        // Remove oldest entries
        const keysToDelete = Array.from(this.cache.keys()).slice(0, 50);
        keysToDelete.forEach(key => this.cache.delete(key));
      }
      
      this.cache.set(tileKey, canvas);
      return canvas.toDataURL();
    } catch (error) {
      console.warn(`Failed to render hybrid tile ${tileKey}:`, error);
      return this.createEmptyTileDataUrl();
    }
  }

  private async renderHybridTile(x: number, y: number, z: number): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = this.tileSize;
    canvas.height = this.tileSize;
    const ctx = canvas.getContext('2d')!;

    if (!this.maplibreMap || !this.maplibreMap.loaded()) {
      // Wait for map to load
      await new Promise(resolve => {
        if (this.maplibreMap.loaded()) {
          resolve(true);
        } else {
          this.maplibreMap.once('load', resolve);
        }
      });
    }

    try {
      // Calculate bounds for this tile
      const bounds = this.tileToBounds(x, y, z);
      
      // Set MapLibre map to tile bounds
      this.maplibreMap.fitBounds([
        [bounds.west, bounds.south],
        [bounds.east, bounds.north]
      ], {
        padding: 0,
        animate: false
      });

      // Wait for map to finish rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture the rendered map
      const mapCanvas = this.maplibreMap.getCanvas();
      ctx.drawImage(mapCanvas, 0, 0, this.tileSize, this.tileSize);

    } catch (error) {
      console.warn('MapLibre rendering failed, using fallback:', error);
      // Fallback: simple colored tile
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(0, 0, this.tileSize, this.tileSize);
      ctx.strokeStyle = '#cccccc';
      ctx.strokeRect(0, 0, this.tileSize, this.tileSize);
    }

    return canvas;
  }

  private tileToBounds(x: number, y: number, z: number) {
    const n = Math.pow(2, z);
    const west = (x / n) * 360 - 180;
    const east = ((x + 1) / n) * 360 - 180;
    
    const north_rad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
    const south_rad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n)));
    
    const north = (north_rad * 180) / Math.PI;
    const south = (south_rad * 180) / Math.PI;

    return { north, south, east, west };
  }

  private createEmptyTileDataUrl(): string {
    const canvas = document.createElement('canvas');
    canvas.width = this.tileSize;
    canvas.height = this.tileSize;
    const ctx = canvas.getContext('2d')!;
    
    // Transparent tile
    ctx.clearRect(0, 0, this.tileSize, this.tileSize);
    return canvas.toDataURL();
  }

  updateStyle(newStyle: any) {
    this.style = newStyle;
    this.cache.clear();
    
    if (this.maplibreMap) {
      this.maplibreMap.setStyle(newStyle);
    }
  }

  // Dynamic style updates for news stories
  highlightCountries(countries: string[], highlightColor = '#ff6b6b') {
    if (!this.maplibreMap) return;

    // Add or update highlight layer
    const highlightLayerId = 'country-highlights';
    
    if (this.maplibreMap.getLayer(highlightLayerId)) {
      this.maplibreMap.removeLayer(highlightLayerId);
    }

    this.maplibreMap.addLayer({
      id: highlightLayerId,
      type: 'fill',
      source: 'ultramaps',
      'source-layer': 'boundary',
      filter: ['all', 
        ['==', 'admin_level', 2],
        ['in', 'name', ...countries]
      ],
      paint: {
        'fill-color': highlightColor,
        'fill-opacity': 0.4
      }
    });

    this.cache.clear(); // Force re-render
  }

  highlightRegions(regions: { name: string; color: string }[]) {
    if (!this.maplibreMap) return;

    regions.forEach((region, index) => {
      const layerId = `region-highlight-${index}`;
      
      if (this.maplibreMap.getLayer(layerId)) {
        this.maplibreMap.removeLayer(layerId);
      }

      this.maplibreMap.addLayer({
        id: layerId,
        type: 'fill',
        source: 'ultramaps',
        'source-layer': 'place',
        filter: ['==', 'name', region.name],
        paint: {
          'fill-color': region.color,
          'fill-opacity': 0.3
        }
      });
    });

    this.cache.clear();
  }

  destroy() {
    if (this.maplibreMap) {
      this.maplibreMap.remove();
    }
    this.cache.clear();
  }
}

// Factory function for easy integration
export function createHybridVectorProvider(isDarkTheme = false, newsStoryType?: string) {
  let style = federatedStyle;
  
  if (isDarkTheme) {
    // Create dark theme variant
    style = {
      ...federatedStyle,
      layers: federatedStyle.layers.map(layer => {
        if (layer.id === 'background') {
          return {
            ...layer,
            paint: { 'background-color': '#1a1a1a' }
          };
        }
        if (layer.type === 'symbol' && layer.paint?.['text-color']) {
          return {
            ...layer,
            paint: {
              ...layer.paint,
              'text-color': '#ffffff',
              'text-halo-color': '#000000'
            }
          };
        }
        return layer;
      })
    };
  }
  
  return new HybridVectorProvider(style);
}