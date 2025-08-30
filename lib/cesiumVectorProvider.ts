'use client';

import { MVTLoader } from '@loaders.gl/mvt';
import { load } from '@loaders.gl/core';

declare global {
  interface Window {
    Cesium: any;
  }
}

export interface VectorTileStyle {
  id: string;
  name: string;
  sources: Record<string, any>;
  layers: Array<{
    id: string;
    type: 'fill' | 'line' | 'symbol' | 'circle' | 'background';
    source: string;
    'source-layer'?: string;
    paint?: Record<string, any>;
    layout?: Record<string, any>;
    filter?: any[];
  }>;
}

export class CesiumVectorTileProvider {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tileSize: number = 512;
  private style: VectorTileStyle;
  private cache = new Map<string, HTMLCanvasElement>();

  constructor(style: VectorTileStyle) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.tileSize;
    this.canvas.height = this.tileSize;
    this.ctx = this.canvas.getContext('2d')!;
    this.style = style;
  }

  async createImageryProvider(): Promise<any> {
    if (!window.Cesium) {
      throw new Error('Cesium not loaded');
    }

    // Create custom imagery provider that converts vector tiles to canvas images
    const that = this;
    
    // Create a simple provider that serves pre-rendered canvas tiles
    return {
      ready: true,
      rectangle: window.Cesium.Rectangle.MAX_VALUE,
      tileWidth: this.tileSize,
      tileHeight: this.tileSize,
      maximumLevel: 14,
      minimumLevel: 0,
      tilingScheme: new window.Cesium.WebMercatorTilingScheme(),
      credit: new window.Cesium.Credit('© OpenStreetMap contributors | Vector Tiles'),
      
      requestImage: async function(x: number, y: number, level: number) {
        try {
          const canvas = await that.renderVectorTile(x, y, level);
          return canvas;
        } catch (error) {
          console.warn(`Failed to render vector tile ${level}/${x}/${y}:`, error);
          return that.createEmptyCanvas();
        }
      }
    };
  }

  private createEmptyCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.tileSize;
    canvas.height = this.tileSize;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.tileSize, this.tileSize);
    return canvas;
  }

  private async createDataUrl(x: number, y: number, level: number): Promise<string> {
    const tileKey = `${level}/${x}/${y}`;
    
    // Check cache first
    if (this.cache.has(tileKey)) {
      return this.cache.get(tileKey)!.toDataURL();
    }

    // Render vector tile to canvas
    const canvas = await this.renderVectorTile(x, y, level);
    this.cache.set(tileKey, canvas);
    
    // Clean cache if it gets too large
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    return canvas.toDataURL();
  }

  private async renderVectorTile(x: number, y: number, z: number): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = this.tileSize;
    canvas.height = this.tileSize;
    const ctx = canvas.getContext('2d')!;

    try {
      // Fetch vector tile data from hybrid backend
      const tileUrl = `http://localhost:8001/api/v1/tiles/vector-hybrid/${z}/${x}/${y}.mvt`;

      const vectorTile = await load(tileUrl, MVTLoader);
      
      // Clear canvas
      ctx.clearRect(0, 0, this.tileSize, this.tileSize);
      
      // Render layers based on style
      for (const layer of this.style.layers) {
        if (layer.type === 'background') {
          this.renderBackground(ctx, layer);
        } else if (vectorTile[layer['source-layer']]) {
          const features = vectorTile[layer['source-layer']];
          this.renderLayer(ctx, features, layer, x, y, z);
        }
      }

    } catch (error) {
      console.warn(`Failed to load vector tile ${z}/${x}/${y}:`, error);
      // Return blank tile on error
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, this.tileSize, this.tileSize);
    }

    return canvas;
  }

  private renderBackground(ctx: CanvasRenderingContext2D, layer: any) {
    const backgroundColor = layer.paint?.['background-color'] || '#f8f8f8';
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, this.tileSize, this.tileSize);
  }

  private renderLayer(
    ctx: CanvasRenderingContext2D, 
    features: any[], 
    layer: any, 
    x: number, 
    y: number, 
    z: number
  ) {
    const tileExtent = 4096; // Standard MVT extent
    const scale = this.tileSize / tileExtent;

    for (const feature of features) {
      if (this.filterFeature(feature, layer.filter)) {
        this.renderFeature(ctx, feature, layer, scale);
      }
    }
  }

  private filterFeature(feature: any, filter?: any[]): boolean {
    if (!filter) return true;
    // Implement basic filter logic
    // For now, return true (no filtering)
    return true;
  }

  private renderFeature(ctx: CanvasRenderingContext2D, feature: any, layer: any, scale: number) {
    const geometry = feature.geometry;
    
    if (!geometry || !geometry.coordinates) return;

    ctx.save();

    switch (layer.type) {
      case 'fill':
        this.renderPolygon(ctx, geometry.coordinates, layer.paint, scale);
        break;
      case 'line':
        this.renderLine(ctx, geometry.coordinates, layer.paint, scale);
        break;
      case 'circle':
        this.renderCircle(ctx, geometry.coordinates, layer.paint, scale);
        break;
      case 'symbol':
        this.renderSymbol(ctx, geometry.coordinates, layer.layout, layer.paint, scale, feature.properties);
        break;
    }

    ctx.restore();
  }

  private renderPolygon(ctx: CanvasRenderingContext2D, coordinates: number[][][], paint: any, scale: number) {
    const fillColor = paint?.['fill-color'] || '#cccccc';
    const fillOpacity = paint?.['fill-opacity'] ?? 1;
    
    ctx.fillStyle = fillColor;
    ctx.globalAlpha = fillOpacity;
    
    ctx.beginPath();
    for (const ring of coordinates) {
      for (let i = 0; i < ring.length; i++) {
        const [x, y] = ring[i];
        const screenX = x * scale;
        const screenY = y * scale;
        
        if (i === 0) {
          ctx.moveTo(screenX, screenY);
        } else {
          ctx.lineTo(screenX, screenY);
        }
      }
      ctx.closePath();
    }
    ctx.fill();
  }

  private renderLine(ctx: CanvasRenderingContext2D, coordinates: number[][], paint: any, scale: number) {
    const lineColor = paint?.['line-color'] || '#666666';
    const lineWidth = (paint?.['line-width'] || 1) * scale;
    const lineOpacity = paint?.['line-opacity'] ?? 1;
    
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = lineOpacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    for (let i = 0; i < coordinates.length; i++) {
      const [x, y] = coordinates[i];
      const screenX = x * scale;
      const screenY = y * scale;
      
      if (i === 0) {
        ctx.moveTo(screenX, screenY);
      } else {
        ctx.lineTo(screenX, screenY);
      }
    }
    ctx.stroke();
  }

  private renderCircle(ctx: CanvasRenderingContext2D, coordinates: number[], paint: any, scale: number) {
    const [x, y] = coordinates;
    const screenX = x * scale;
    const screenY = y * scale;
    const radius = (paint?.['circle-radius'] || 3) * scale;
    const fillColor = paint?.['circle-color'] || '#ff0000';
    const strokeColor = paint?.['circle-stroke-color'] || '#ffffff';
    const strokeWidth = (paint?.['circle-stroke-width'] || 1) * scale;
    
    ctx.beginPath();
    ctx.arc(screenX, screenY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = fillColor;
    ctx.fill();
    
    if (strokeWidth > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
  }

  private renderSymbol(
    ctx: CanvasRenderingContext2D, 
    coordinates: number[], 
    layout: any, 
    paint: any, 
    scale: number,
    properties: any
  ) {
    const [x, y] = coordinates;
    const screenX = x * scale;
    const screenY = y * scale;
    
    const textField = layout?.['text-field'];
    if (textField && properties) {
      const text = this.resolveTextField(textField, properties);
      if (text) {
        const fontSize = (layout?.['text-size'] || 12) * scale;
        const textColor = paint?.['text-color'] || '#000000';
        
        ctx.fillStyle = textColor;
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, screenX, screenY);
      }
    }
  }

  private resolveTextField(textField: string, properties: any): string {
    if (textField.startsWith('{') && textField.endsWith('}')) {
      const fieldName = textField.slice(1, -1);
      return properties[fieldName] || '';
    }
    return textField;
  }

  updateStyle(newStyle: VectorTileStyle) {
    this.style = newStyle;
    this.cache.clear(); // Clear cache to force re-render
  }
}