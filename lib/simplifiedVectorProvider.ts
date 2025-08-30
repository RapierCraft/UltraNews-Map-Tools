'use client';

declare global {
  interface Window {
    Cesium: any;
  }
}

export class SimplifiedVectorProvider {
  private isDarkTheme: boolean;

  constructor(isDarkTheme: boolean = false) {
    this.isDarkTheme = isDarkTheme;
  }

  async createImageryProvider(): Promise<any> {
    if (!window.Cesium) {
      throw new Error('Cesium not loaded');
    }

    // Create a provider that serves vector-style rendered tiles
    // Using the hybrid endpoint which converts vector to styled images
    const baseUrl = this.isDarkTheme
      ? 'http://localhost:8001/api/v1/tiles/vector-styled-dark/{z}/{x}/{y}.png'
      : 'http://localhost:8001/api/v1/tiles/vector-styled-light/{z}/{x}/{y}.png';

    return new window.Cesium.UrlTemplateImageryProvider({
      url: baseUrl,
      credit: '© OpenStreetMap contributors | Vector Rendered',
      maximumLevel: 14,
      minimumLevel: 0,
      tileWidth: 512,
      tileHeight: 512
    });
  }

  updateTheme(isDarkTheme: boolean) {
    this.isDarkTheme = isDarkTheme;
  }
}