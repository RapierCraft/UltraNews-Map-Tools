interface AssetRequest {
  type: 'building' | 'aircraft' | 'vehicle' | 'terrain' | 'object' | 'animation' | 'explosion' | 'smoke' | 'debris';
  specifications: any;
  urgency: 'immediate' | 'normal' | 'background';
  fallbackOptions?: string[];
}

interface Asset3D {
  id: string;
  type: string;
  format: 'gltf' | 'glb' | 'obj' | 'fbx' | 'procedural';
  url?: string;
  data?: any;
  animations?: AnimationClip[];
  metadata: AssetMetadata;
}

interface AssetMetadata {
  name: string;
  description: string;
  dimensions: { width: number; height: number; depth: number };
  origin: 'generated' | 'api' | 'cached' | 'procedural';
  accuracy: number; // 0-1 scale
  license: string;
  attribution?: string;
}

interface AnimationClip {
  name: string;
  duration: number;
  keyframes: Keyframe[];
  loop: boolean;
}

interface Keyframe {
  time: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

export class AssetAcquisitionEngine {
  private assetCache: Map<string, Asset3D> = new Map();
  private activeRequests: Map<string, Promise<Asset3D>> = new Map();
  private proceduralGenerators: Map<string, Function> = new Map();

  constructor() {
    this.initializeProceduralGenerators();
    this.initializeAssetSources();
  }

  async acquireAsset(request: AssetRequest): Promise<Asset3D> {
    const assetId = this.generateAssetId(request);
    
    // Check cache first
    if (this.assetCache.has(assetId)) {
      console.log(`📦 Using cached asset: ${assetId}`);
      return this.assetCache.get(assetId)!;
    }

    // Check if already requesting
    if (this.activeRequests.has(assetId)) {
      console.log(`⏳ Waiting for existing request: ${assetId}`);
      return await this.activeRequests.get(assetId)!;
    }

    // Start new acquisition
    const acquisitionPromise = this.performAssetAcquisition(request);
    this.activeRequests.set(assetId, acquisitionPromise);

    try {
      const asset = await acquisitionPromise;
      this.assetCache.set(assetId, asset);
      this.activeRequests.delete(assetId);
      return asset;
    } catch (error) {
      this.activeRequests.delete(assetId);
      throw error;
    }
  }

  private async performAssetAcquisition(request: AssetRequest): Promise<Asset3D> {
    console.log(`🔍 Acquiring 3D asset:`, request);

    // Strategy 1: Try procedural generation first (fastest, most reliable)
    if (this.canGenerateProcedurally(request)) {
      try {
        return await this.generateProceduralAsset(request);
      } catch (error) {
        console.warn('Procedural generation failed:', error);
      }
    }

    // Strategy 2: Try public 3D model APIs
    try {
      return await this.fetchFromPublicAPIs(request);
    } catch (error) {
      console.warn('Public API acquisition failed:', error);
    }

    // Strategy 3: Generate from basic primitives
    try {
      return await this.generatePrimitiveAsset(request);
    } catch (error) {
      console.warn('Primitive generation failed:', error);
    }

    // Strategy 4: Use fallback assets
    return await this.getFallbackAsset(request);
  }

  private canGenerateProcedurally(request: AssetRequest): boolean {
    return this.proceduralGenerators.has(request.type);
  }

  private async generateProceduralAsset(request: AssetRequest): Promise<Asset3D> {
    const generator = this.proceduralGenerators.get(request.type);
    if (!generator) {
      throw new Error(`No procedural generator for ${request.type}`);
    }

    console.log(`🏭 Generating procedural ${request.type}:`, request.specifications);
    
    const assetData = await generator(request.specifications);
    
    return {
      id: this.generateAssetId(request),
      type: request.type,
      format: 'procedural',
      data: assetData,
      animations: assetData.animations || [],
      metadata: {
        name: request.specifications.name || `Generated ${request.type}`,
        description: `Procedurally generated ${request.type}`,
        dimensions: assetData.dimensions || { width: 100, height: 100, depth: 100 },
        origin: 'procedural',
        accuracy: 0.8,
        license: 'Generated',
        attribution: 'UltraMaps Procedural Generator'
      }
    };
  }

  private async fetchFromPublicAPIs(request: AssetRequest): Promise<Asset3D> {
    const sources = this.getPublicAPISources(request.type);
    
    for (const source of sources) {
      try {
        const asset = await this.fetchFromSource(source, request);
        if (asset) return asset;
      } catch (error) {
        console.warn(`Failed to fetch from ${source.name}:`, error);
      }
    }
    
    throw new Error('No public APIs available');
  }

  private getPublicAPISources(type: string): Array<{name: string, url: string, method: string}> {
    const sources: Record<string, Array<{name: string, url: string, method: string}>> = {
      building: [
        {
          name: 'OpenStreetMap Buildings',
          url: 'https://overpass-api.de/api/interpreter',
          method: 'overpass'
        },
        {
          name: 'SketchFab',
          url: 'https://api.sketchfab.com/v3/search',
          method: 'sketchfab'
        }
      ],
      aircraft: [
        {
          name: 'NASA 3D Models',
          url: 'https://nasa3d.arc.nasa.gov/models',
          method: 'nasa'
        },
        {
          name: 'SketchFab Aircraft',
          url: 'https://api.sketchfab.com/v3/search?type=models&q=aircraft',
          method: 'sketchfab'
        }
      ],
      vehicle: [
        {
          name: 'OpenVehicles',
          url: 'https://api.openvehicles.com/models',
          method: 'openvehicles'
        },
        {
          name: 'SketchFab Vehicles',
          url: 'https://api.sketchfab.com/v3/search?type=models&q=vehicle',
          method: 'sketchfab'
        }
      ],
      terrain: [
        {
          name: 'USGS Elevation',
          url: 'https://elevation-api.io/api/elevation',
          method: 'elevation_api'
        }
      ]
    };

    return sources[type] || [];
  }

  private async fetchFromSource(source: any, request: AssetRequest): Promise<Asset3D | null> {
    switch (source.method) {
      case 'sketchfab':
        return await this.fetchFromSketchfab(source.url, request);
      case 'nasa':
        return await this.fetchFromNASA(source.url, request);
      case 'overpass':
        return await this.fetchFromOverpass(source.url, request);
      case 'elevation_api':
        return await this.fetchElevationData(source.url, request);
      default:
        return null;
    }
  }

  private async fetchFromSketchfab(url: string, request: AssetRequest): Promise<Asset3D | null> {
    try {
      // Note: SketchFab requires API key for downloads, this is a simplified example
      const searchQuery = encodeURIComponent(request.specifications.name || request.type);
      const response = await fetch(`${url}&q=${searchQuery}&downloadable=true`);
      
      if (!response.ok) return null;
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const model = data.results[0];
        
        return {
          id: this.generateAssetId(request),
          type: request.type,
          format: 'gltf',
          url: model.viewerUrl, // This would need proper download URL with auth
          metadata: {
            name: model.name,
            description: model.description,
            dimensions: { width: 100, height: 100, depth: 100 }, // Would extract from model
            origin: 'api',
            accuracy: 0.7,
            license: model.license?.label || 'Unknown',
            attribution: `${model.user.displayName} on Sketchfab`
          }
        };
      }
    } catch (error) {
      console.error('SketchFab fetch failed:', error);
    }
    
    return null;
  }

  private async fetchFromNASA(url: string, request: AssetRequest): Promise<Asset3D | null> {
    try {
      // NASA provides some 3D models publicly
      const response = await fetch(`${url}/search?q=${request.specifications.name}`);
      if (!response.ok) return null;
      
      // This would need proper NASA API integration
      return null; // Placeholder
    } catch (error) {
      console.error('NASA fetch failed:', error);
      return null;
    }
  }

  private async fetchFromOverpass(url: string, request: AssetRequest): Promise<Asset3D | null> {
    if (request.type !== 'building' || !request.specifications.location) {
      return null;
    }

    try {
      const [lat, lon] = request.specifications.location;
      const bbox = `${lat-0.001},${lon-0.001},${lat+0.001},${lon+0.001}`;
      
      const query = `
        [out:json][timeout:25];
        (
          way["building"](${bbox});
          relation["building"](${bbox});
        );
        out geom;
      `;

      const response = await fetch(url, {
        method: 'POST',
        body: query,
        headers: { 'Content-Type': 'text/plain' }
      });

      if (!response.ok) return null;

      const data = await response.json();
      
      if (data.elements && data.elements.length > 0) {
        const building = data.elements[0];
        
        return {
          id: this.generateAssetId(request),
          type: 'building',
          format: 'procedural',
          data: {
            geometry: building.geometry || building.bounds,
            tags: building.tags,
            height: building.tags?.height ? parseInt(building.tags.height) : request.specifications.height || 50
          },
          metadata: {
            name: building.tags?.name || 'OSM Building',
            description: `Building from OpenStreetMap: ${building.tags?.['addr:street'] || 'Unknown location'}`,
            dimensions: {
              width: 100, // Would calculate from geometry
              height: building.tags?.height ? parseInt(building.tags.height) : 50,
              depth: 100
            },
            origin: 'api',
            accuracy: 0.9,
            license: 'ODbL',
            attribution: 'OpenStreetMap Contributors'
          }
        };
      }
    } catch (error) {
      console.error('Overpass API failed:', error);
    }

    return null;
  }

  private async fetchElevationData(url: string, request: AssetRequest): Promise<Asset3D | null> {
    if (request.type !== 'terrain') return null;

    try {
      const { bounds } = request.specifications;
      const response = await fetch(`${url}?bounds=${bounds.join(',')}&resolution=100`);
      
      if (!response.ok) return null;
      
      const elevationData = await response.json();
      
      return {
        id: this.generateAssetId(request),
        type: 'terrain',
        format: 'procedural',
        data: {
          elevations: elevationData.results,
          resolution: 100,
          bounds: bounds
        },
        metadata: {
          name: 'Terrain Data',
          description: 'Elevation-based terrain mesh',
          dimensions: { width: 1000, height: 200, depth: 1000 },
          origin: 'api',
          accuracy: 0.95,
          license: 'Public Domain',
          attribution: 'USGS'
        }
      };
    } catch (error) {
      console.error('Elevation API failed:', error);
    }

    return null;
  }

  private async generatePrimitiveAsset(request: AssetRequest): Promise<Asset3D> {
    console.log(`🔲 Generating primitive ${request.type}`);
    
    const primitiveData = this.createPrimitiveGeometry(request);
    
    return {
      id: this.generateAssetId(request),
      type: request.type,
      format: 'procedural',
      data: primitiveData,
      metadata: {
        name: `Primitive ${request.type}`,
        description: `Basic geometric representation of ${request.type}`,
        dimensions: primitiveData.dimensions,
        origin: 'generated',
        accuracy: 0.5,
        license: 'Generated',
        attribution: 'UltraMaps Basic Generator'
      }
    };
  }

  private createPrimitiveGeometry(request: AssetRequest): any {
    const specs = request.specifications;
    
    switch (request.type) {
      case 'building':
        return {
          type: 'box',
          dimensions: {
            width: specs.width || specs.dimensions?.width || 50,
            height: specs.height || specs.dimensions?.height || 100,
            depth: specs.depth || specs.dimensions?.depth || 50
          },
          materials: {
            color: specs.color || '#cccccc',
            texture: specs.texture || null
          }
        };
        
      case 'aircraft':
        return {
          type: 'aircraft_primitive',
          dimensions: {
            width: specs.wingspan || 35,
            height: specs.height || 8,
            depth: specs.length || 40
          },
          materials: {
            color: specs.color || '#ffffff',
            markings: specs.markings || []
          }
        };
        
      case 'vehicle':
        return {
          type: 'box',
          dimensions: {
            width: specs.width || 2,
            height: specs.height || 1.5,
            depth: specs.length || 4
          },
          materials: {
            color: specs.color || '#ff0000'
          }
        };
        
      default:
        return {
          type: 'box',
          dimensions: { width: 10, height: 10, depth: 10 },
          materials: { color: '#888888' }
        };
    }
  }

  private async getFallbackAsset(request: AssetRequest): Promise<Asset3D> {
    console.log(`🆘 Using fallback asset for ${request.type}`);
    
    // Return a very basic representation
    return {
      id: this.generateAssetId(request),
      type: request.type,
      format: 'procedural',
      data: {
        type: 'sphere', // Most basic 3D shape
        dimensions: { width: 10, height: 10, depth: 10 },
        materials: { color: '#ff6b6b' }
      },
      metadata: {
        name: `Fallback ${request.type}`,
        description: `Basic fallback representation`,
        dimensions: { width: 10, height: 10, depth: 10 },
        origin: 'generated',
        accuracy: 0.1,
        license: 'Fallback',
        attribution: 'UltraMaps Fallback System'
      }
    };
  }

  private initializeProceduralGenerators(): void {
    // Building generator
    this.proceduralGenerators.set('building', async (specs: any) => {
      return {
        type: 'procedural_building',
        dimensions: {
          width: specs.width || 50,
          height: specs.height || 100,
          depth: specs.depth || 50
        },
        floors: specs.floors || Math.floor((specs.height || 100) / 3),
        materials: {
          wall: specs.wallColor || '#e0e0e0',
          roof: specs.roofColor || '#8B4513',
          windows: specs.windowColor || '#87CEEB'
        },
        features: {
          windows: true,
          doors: true,
          roof: specs.roofType || 'flat'
        }
      };
    });

    // Aircraft generator
    this.proceduralGenerators.set('aircraft', async (specs: any) => {
      return {
        type: 'procedural_aircraft',
        model: specs.model || 'generic',
        dimensions: {
          wingspan: specs.wingspan || 35,
          length: specs.length || 40,
          height: specs.height || 8
        },
        materials: {
          fuselage: specs.fuselageColor || '#ffffff',
          wings: specs.wingColor || '#ffffff'
        },
        animations: [
          {
            name: 'flight',
            duration: 60,
            keyframes: [
              { time: 0, position: [0, 0, 10000], rotation: [0, 0, 0] },
              { time: 1, position: [1000, 0, 10000], rotation: [0, 0, 0] }
            ],
            loop: false
          }
        ]
      };
    });

    // Vehicle generator  
    this.proceduralGenerators.set('vehicle', async (specs: any) => {
      return {
        type: 'procedural_vehicle',
        vehicleType: specs.vehicleType || 'car',
        dimensions: {
          width: specs.width || 2,
          height: specs.height || 1.5,
          depth: specs.length || 4
        },
        materials: {
          body: specs.color || '#ff0000',
          windows: '#87CEEB'
        }
      };
    });

    // Terrain generator
    this.proceduralGenerators.set('terrain', async (specs: any) => {
      return {
        type: 'procedural_terrain',
        bounds: specs.bounds || [-1, -1, 1, 1],
        resolution: specs.resolution || 100,
        heightmap: specs.heightmap || this.generateHeightmap(specs.resolution || 100),
        materials: {
          surface: specs.surfaceType || 'grass'
        }
      };
    });

    // Explosion generator
    this.proceduralGenerators.set('explosion', async (specs: any) => {
      return {
        type: 'procedural_explosion',
        intensity: specs.intensity || 1.0,
        radius: specs.radius || 100,
        duration: specs.duration || 5,
        particles: {
          count: specs.particleCount || 1000,
          size: specs.particleSize || 2,
          color: specs.color || '#FF6B00',
          velocity: specs.velocity || 50
        },
        shockwave: {
          enabled: specs.shockwave || true,
          speed: specs.shockwaveSpeed || 300,
          color: '#FFFFFF'
        },
        animations: [{
          name: 'explosion_sequence',
          duration: specs.duration || 5,
          keyframes: [
            { time: 0, scale: [0, 0, 0] },
            { time: 0.1, scale: [2, 2, 2] },
            { time: 0.3, scale: [5, 5, 5] },
            { time: 1, scale: [0, 0, 0] }
          ],
          loop: false
        }]
      };
    });

    // Smoke generator
    this.proceduralGenerators.set('smoke', async (specs: any) => {
      return {
        type: 'procedural_smoke',
        density: specs.density || 0.8,
        height: specs.height || 200,
        width: specs.width || 50,
        duration: specs.duration || 120,
        particles: {
          count: specs.particleCount || 500,
          size: specs.particleSize || 5,
          color: specs.color || '#404040',
          opacity: specs.opacity || 0.7
        },
        wind: {
          direction: specs.windDirection || [1, 0, 0],
          strength: specs.windStrength || 0.3
        },
        animations: [{
          name: 'smoke_rise',
          duration: specs.duration || 120,
          keyframes: [
            { time: 0, position: [0, 0, 0], scale: [0.5, 0.5, 0.5] },
            { time: 1, position: [specs.windDirection?.[0] * 100 || 50, 0, specs.height || 200], scale: [2, 2, 2] }
          ],
          loop: true
        }]
      };
    });

    // Debris generator
    this.proceduralGenerators.set('debris', async (specs: any) => {
      const debrisCount = specs.count || 20;
      const debrisPieces = [];
      
      for (let i = 0; i < debrisCount; i++) {
        debrisPieces.push({
          id: `debris_${i}`,
          size: Math.random() * 5 + 1,
          velocity: [
            (Math.random() - 0.5) * specs.spreadRadius || 50,
            (Math.random() - 0.5) * specs.spreadRadius || 50, 
            Math.random() * specs.maxHeight || 100
          ],
          rotation: [Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28],
          material: specs.material || 'concrete'
        });
      }
      
      return {
        type: 'procedural_debris',
        pieces: debrisPieces,
        physics: {
          gravity: specs.gravity || 9.81,
          drag: specs.drag || 0.1,
          bounce: specs.bounce || 0.3
        },
        animations: [{
          name: 'debris_scatter',
          duration: specs.duration || 10,
          keyframes: debrisPieces.map((piece, index) => ({
            time: index / debrisPieces.length,
            position: piece.velocity,
            rotation: piece.rotation
          })),
          loop: false
        }]
      };
    });
  }

  private generateHeightmap(resolution: number): number[][] {
    const heightmap: number[][] = [];
    for (let i = 0; i < resolution; i++) {
      heightmap[i] = [];
      for (let j = 0; j < resolution; j++) {
        // Simple procedural height generation
        heightmap[i][j] = Math.random() * 50 + 
                         Math.sin(i * 0.1) * 20 + 
                         Math.cos(j * 0.1) * 20;
      }
    }
    return heightmap;
  }

  private initializeAssetSources(): void {
    // Initialize any asset source configurations
    console.log('🔧 Asset acquisition sources initialized');
  }

  private generateAssetId(request: AssetRequest): string {
    // Create unique ID based on request parameters
    const key = `${request.type}_${JSON.stringify(request.specifications)}`;
    return btoa(key).substring(0, 16);
  }

  // Animation system
  async createAnimation(asset: Asset3D, animationType: string, parameters: any): Promise<AnimationClip> {
    switch (animationType) {
      case 'flight_path':
        return this.createFlightAnimation(parameters);
      case 'building_collapse':
        return this.createCollapseAnimation(parameters);
      case 'vehicle_movement':
        return this.createVehicleAnimation(parameters);
      case 'explosion':
        return this.createExplosionAnimation(parameters);
      default:
        return this.createBasicAnimation(parameters);
    }
  }

  private createFlightAnimation(params: any): AnimationClip {
    const keyframes: Keyframe[] = [];
    const path = params.flightPath || [];
    const duration = params.duration || 60;

    path.forEach((point: [number, number, number], index: number) => {
      keyframes.push({
        time: index / (path.length - 1),
        position: point,
        rotation: this.calculateFlightRotation(path, index)
      });
    });

    return {
      name: 'flight_path',
      duration,
      keyframes,
      loop: false
    };
  }

  private createCollapseAnimation(params: any): AnimationClip {
    const duration = params.duration || 10;
    
    return {
      name: 'building_collapse',
      duration,
      keyframes: [
        { time: 0, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        { time: 0.7, position: [0, 0, 0], rotation: [0.1, 0, 0.05], scale: [1, 1, 1] },
        { time: 1, position: [0, -50, 0], rotation: [0.3, 0, 0.1], scale: [1, 0.1, 1] }
      ],
      loop: false
    };
  }

  private createVehicleAnimation(params: any): AnimationClip {
    const path = params.route || [];
    const duration = params.duration || 30;
    const keyframes: Keyframe[] = [];

    path.forEach((point: [number, number], index: number) => {
      keyframes.push({
        time: index / (path.length - 1),
        position: [point[0], point[1], 0],
        rotation: [0, 0, this.calculateBearing(path, index)]
      });
    });

    return {
      name: 'vehicle_movement',
      duration,
      keyframes,
      loop: false
    };
  }

  private createExplosionAnimation(params: any): AnimationClip {
    return {
      name: 'explosion',
      duration: params.duration || 5,
      keyframes: [
        { time: 0, scale: [0, 0, 0] },
        { time: 0.1, scale: [2, 2, 2] },
        { time: 0.3, scale: [5, 5, 5] },
        { time: 1, scale: [0, 0, 0] }
      ],
      loop: false
    };
  }

  private createBasicAnimation(params: any): AnimationClip {
    return {
      name: 'basic_animation',
      duration: params.duration || 10,
      keyframes: [
        { time: 0, position: [0, 0, 0] },
        { time: 1, position: [0, 0, 100] }
      ],
      loop: params.loop || false
    };
  }

  private calculateFlightRotation(path: [number, number, number][], index: number): [number, number, number] {
    if (index >= path.length - 1) return [0, 0, 0];
    
    const current = path[index];
    const next = path[index + 1];
    
    // Calculate heading and pitch based on flight path
    const dx = next[0] - current[0];
    const dy = next[1] - current[1];
    const dz = next[2] - current[2];
    
    const heading = Math.atan2(dx, dy);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const pitch = Math.atan2(dz, distance);
    
    return [pitch, heading, 0];
  }

  private calculateBearing(path: [number, number][], index: number): number {
    if (index >= path.length - 1) return 0;
    
    const current = path[index];
    const next = path[index + 1];
    
    const dx = next[0] - current[0];
    const dy = next[1] - current[1];
    
    return Math.atan2(dx, dy);
  }

  // Asset optimization and caching
  optimizeAsset(asset: Asset3D, targetLOD: number): Asset3D {
    console.log(`🔧 Optimizing asset ${asset.id} for LOD ${targetLOD}`);
    
    const optimizedAsset = { ...asset };
    
    switch (asset.type) {
      case 'building':
        optimizedAsset.data = this.optimizeBuildingLOD(asset.data, targetLOD);
        break;
      case 'aircraft':
        optimizedAsset.data = this.optimizeAircraftLOD(asset.data, targetLOD);
        break;
      case 'vehicle':
        optimizedAsset.data = this.optimizeVehicleLOD(asset.data, targetLOD);
        break;
      case 'terrain':
        optimizedAsset.data = this.optimizeTerrainLOD(asset.data, targetLOD);
        break;
      default:
        // Generic optimization
        optimizedAsset.data = this.optimizeGenericLOD(asset.data, targetLOD);
    }
    
    // Update metadata to reflect optimization
    optimizedAsset.metadata.accuracy = asset.metadata.accuracy * (targetLOD / 5.0);
    optimizedAsset.id = `${asset.id}_LOD${targetLOD}`;
    
    return optimizedAsset;
  }

  private optimizeBuildingLOD(data: any, lod: number): any {
    const optimized = { ...data };
    
    if (lod <= 2) {
      // Low detail - simple box only
      delete optimized.features;
      optimized.floors = Math.max(1, Math.floor(optimized.floors / 3));
    } else if (lod <= 3) {
      // Medium detail - basic features
      optimized.features = { ...optimized.features, windows: false };
      optimized.floors = Math.max(1, Math.floor(optimized.floors / 2));
    }
    // High detail (4-5) keeps all features
    
    return optimized;
  }

  private optimizeAircraftLOD(data: any, lod: number): any {
    const optimized = { ...data };
    
    if (lod <= 2) {
      // Low detail - simple ellipse representation
      optimized.type = 'simple_aircraft';
      delete optimized.animations;
    } else if (lod <= 3) {
      // Medium detail - basic 3D shape
      optimized.animations = optimized.animations?.slice(0, 1); // Keep only main animation
    }
    
    return optimized;
  }

  private optimizeVehicleLOD(data: any, lod: number): any {
    const optimized = { ...data };
    
    if (lod <= 2) {
      // Low detail - simple dot or small box
      optimized.dimensions = {
        width: Math.max(1, optimized.dimensions.width / 2),
        height: Math.max(0.5, optimized.dimensions.height / 2),
        depth: Math.max(1, optimized.dimensions.depth / 2)
      };
    }
    
    return optimized;
  }

  private optimizeTerrainLOD(data: any, lod: number): any {
    const optimized = { ...data };
    
    if (lod <= 2) {
      // Low detail - reduce resolution significantly
      optimized.resolution = Math.max(10, Math.floor(data.resolution / 4));
    } else if (lod <= 3) {
      // Medium detail - moderate reduction
      optimized.resolution = Math.max(25, Math.floor(data.resolution / 2));
    }
    
    // Regenerate heightmap at new resolution if needed
    if (optimized.resolution !== data.resolution) {
      optimized.heightmap = this.downsampleHeightmap(data.heightmap, data.resolution, optimized.resolution);
    }
    
    return optimized;
  }

  private optimizeGenericLOD(data: any, lod: number): any {
    const optimized = { ...data };
    
    if (lod <= 2) {
      // Reduce dimensions for low detail
      if (optimized.dimensions) {
        optimized.dimensions.width *= 0.5;
        optimized.dimensions.height *= 0.5;
        optimized.dimensions.depth *= 0.5;
      }
    }
    
    return optimized;
  }

  private downsampleHeightmap(heightmap: number[][], oldRes: number, newRes: number): number[][] {
    const newHeightmap: number[][] = [];
    const scale = oldRes / newRes;
    
    for (let i = 0; i < newRes; i++) {
      newHeightmap[i] = [];
      for (let j = 0; j < newRes; j++) {
        const oldI = Math.floor(i * scale);
        const oldJ = Math.floor(j * scale);
        newHeightmap[i][j] = heightmap[oldI]?.[oldJ] || 0;
      }
    }
    
    return newHeightmap;
  }

  // Advanced caching with automatic cleanup
  clearCache(): void {
    this.assetCache.clear();
    console.log('🗑️ Asset cache cleared');
  }

  clearCacheByType(type: string): void {
    const toDelete: string[] = [];
    this.assetCache.forEach((asset, id) => {
      if (asset.type === type) {
        toDelete.push(id);
      }
    });
    
    toDelete.forEach(id => this.assetCache.delete(id));
    console.log(`🗑️ Cleared ${toDelete.length} assets of type ${type}`);
  }

  evictLeastRecentlyUsed(maxSize: number): void {
    if (this.assetCache.size <= maxSize) return;
    
    const entries = Array.from(this.assetCache.entries());
    const toEvict = entries.slice(0, this.assetCache.size - maxSize);
    
    toEvict.forEach(([id]) => {
      this.assetCache.delete(id);
    });
    
    console.log(`🗑️ Evicted ${toEvict.length} assets to maintain cache size`);
  }

  getCacheStats(): { total: number; memory: number; types: Record<string, number>; hitRate: number } {
    const types: Record<string, number> = {};
    let estimatedMemory = 0;
    
    this.assetCache.forEach(asset => {
      types[asset.type] = (types[asset.type] || 0) + 1;
      
      // Rough memory estimation
      estimatedMemory += this.estimateAssetMemoryUsage(asset);
    });

    return {
      total: this.assetCache.size,
      memory: estimatedMemory,
      types,
      hitRate: this.calculateHitRate()
    };
  }

  private estimateAssetMemoryUsage(asset: Asset3D): number {
    // Rough estimation in KB
    let size = 0;
    
    switch (asset.type) {
      case 'building':
        size = (asset.data.dimensions?.width || 50) * 
               (asset.data.dimensions?.height || 100) * 
               (asset.data.dimensions?.depth || 50) / 1000;
        break;
      case 'terrain':
        const resolution = asset.data.resolution || 100;
        size = (resolution * resolution * 4) / 1024; // 4 bytes per height value
        break;
      default:
        size = 10; // Default small size
    }
    
    // Account for animations
    if (asset.animations && asset.animations.length > 0) {
      size += asset.animations.length * 5; // 5KB per animation
    }
    
    return size;
  }

  private calculateHitRate(): number {
    // This would need actual tracking of cache hits/misses
    // For now, return a placeholder
    return 0.75; // 75% hit rate assumption
  }

  // Preload frequently used assets
  async preloadCommonAssets(): Promise<void> {
    console.log('🔄 Preloading common assets...');
    
    const commonAssets = [
      {
        type: 'building' as const,
        specifications: { 
          width: 50, height: 100, depth: 50, 
          name: 'Generic Building',
          floors: 30 
        },
        urgency: 'background' as const
      },
      {
        type: 'aircraft' as const,
        specifications: {
          model: 'Boeing 767',
          wingspan: 47.5,
          length: 48.5,
          name: 'Commercial Aircraft'
        },
        urgency: 'background' as const
      },
      {
        type: 'vehicle' as const,
        specifications: {
          vehicleType: 'car',
          width: 2, height: 1.5, length: 4,
          name: 'Generic Vehicle'
        },
        urgency: 'background' as const
      }
    ];
    
    const preloadPromises = commonAssets.map(asset => 
      this.acquireAsset(asset).catch(error => 
        console.warn('Preload failed for asset:', asset.type, error)
      )
    );
    
    await Promise.allSettled(preloadPromises);
    console.log('✅ Asset preloading completed');
  }

  // Background optimization
  async optimizeCacheInBackground(): Promise<void> {
    console.log('🔧 Starting background cache optimization...');
    
    const assets = Array.from(this.assetCache.values());
    const largeAssets = assets.filter(asset => 
      this.estimateAssetMemoryUsage(asset) > 100 // > 100KB
    );
    
    for (const asset of largeAssets) {
      try {
        const optimized = this.optimizeAsset(asset, 3); // Medium LOD
        this.assetCache.set(optimized.id, optimized);
        
        // Remove original if different
        if (optimized.id !== asset.id) {
          this.assetCache.delete(asset.id);
        }
      } catch (error) {
        console.warn('Background optimization failed for:', asset.id, error);
      }
    }
    
    console.log(`✅ Optimized ${largeAssets.length} assets in background`);
  }
}

export const assetAcquisitionEngine = new AssetAcquisitionEngine();