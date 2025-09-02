import { assetAcquisitionEngine } from './assetAcquisitionEngine';

interface CesiumAsset {
  entity: any; // Cesium Entity
  primitive?: any; // Cesium Primitive
  animations: CesiumAnimation[];
  metadata: any;
}

interface CesiumAnimation {
  property: any; // Cesium Property
  duration: number;
  startTime: any; // Cesium JulianDate
  stopTime: any; // Cesium JulianDate
}

export class CesiumAssetRenderer {
  private viewer: any;
  private renderedAssets: Map<string, CesiumAsset> = new Map();
  
  constructor(cesiumViewer: any) {
    this.viewer = cesiumViewer;
  }

  async renderAssetFromSpec(assetId: string, specifications: any): Promise<CesiumAsset> {
    console.log(`🎨 Rendering asset: ${assetId}`, specifications);

    // Acquire the 3D asset
    const asset = await assetAcquisitionEngine.acquireAsset({
      type: specifications.type,
      specifications,
      urgency: 'immediate'
    });

    // Convert to Cesium renderable
    const cesiumAsset = await this.convertToCesiumAsset(asset, specifications);
    
    // Store for management
    this.renderedAssets.set(assetId, cesiumAsset);
    
    return cesiumAsset;
  }

  private async convertToCesiumAsset(asset: any, specifications: any): Promise<CesiumAsset> {
    switch (asset.type) {
      case 'building':
        return await this.renderBuilding(asset, specifications);
      case 'aircraft':
        return await this.renderAircraft(asset, specifications);
      case 'vehicle':
        return await this.renderVehicle(asset, specifications);
      case 'terrain':
        return await this.renderTerrain(asset, specifications);
      case 'explosion':
        return await this.renderExplosion(asset, specifications);
      case 'smoke':
        return await this.renderSmoke(asset, specifications);
      case 'debris':
        return await this.renderDebris(asset, specifications);
      default:
        return await this.renderGenericObject(asset, specifications);
    }
  }

  private async renderBuilding(asset: any, specs: any): Promise<CesiumAsset> {
    const position = Cesium.Cartesian3.fromDegrees(
      specs.location[1], 
      specs.location[0], 
      specs.location[2] || 0
    );

    let entity: any;

    if (asset.format === 'procedural' && asset.data.type === 'procedural_building') {
      // Render detailed procedural building
      entity = this.viewer.entities.add({
        position: position,
        box: {
          dimensions: new Cesium.Cartesian3(
            asset.data.dimensions.width,
            asset.data.dimensions.depth,
            asset.data.dimensions.height
          ),
          material: Cesium.Color.fromCssColorString(asset.data.materials.wall),
          outline: true,
          outlineColor: Cesium.Color.BLACK
        },
        label: {
          text: asset.metadata.name,
          font: '12pt sans-serif',
          pixelOffset: new Cesium.Cartesian2(0, -50),
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE
        }
      });

      // Add windows and details if specified
      if (asset.data.features.windows) {
        await this.addBuildingWindows(entity, asset.data);
      }

    } else if (asset.url) {
      // Render from external 3D model URL
      entity = this.viewer.entities.add({
        position: position,
        model: {
          uri: asset.url,
          scale: specs.scale || 1.0,
          minimumPixelSize: 128,
          maximumScale: 20000
        }
      });
    } else {
      // Fallback to basic box
      entity = this.viewer.entities.add({
        position: position,
        box: {
          dimensions: new Cesium.Cartesian3(
            asset.data.dimensions.width,
            asset.data.dimensions.depth, 
            asset.data.dimensions.height
          ),
          material: Cesium.Color.fromCssColorString(asset.data.materials.color || '#cccccc')
        }
      });
    }

    return {
      entity,
      animations: [],
      metadata: asset.metadata
    };
  }

  private async renderAircraft(asset: any, specs: any): Promise<CesiumAsset> {
    const startPosition = Cesium.Cartesian3.fromDegrees(
      specs.startLocation[1],
      specs.startLocation[0], 
      specs.startLocation[2] || 10000
    );

    let entity: any;

    if (asset.format === 'procedural' && asset.data.type === 'procedural_aircraft') {
      // Create procedural aircraft from primitives
      entity = await this.createProceduralAircraft(startPosition, asset.data, specs);
    } else if (asset.url) {
      // Use external 3D model
      entity = this.viewer.entities.add({
        position: startPosition,
        model: {
          uri: asset.url,
          scale: specs.scale || 1.0,
          minimumPixelSize: 64
        },
        label: {
          text: specs.name || 'Aircraft',
          font: '10pt sans-serif',
          pixelOffset: new Cesium.Cartesian2(0, -40)
        }
      });
    } else {
      // Fallback aircraft representation
      entity = this.viewer.entities.add({
        position: startPosition,
        ellipse: {
          semiMajorAxis: asset.data.dimensions.wingspan / 2,
          semiMinorAxis: asset.data.dimensions.length / 2,
          material: Cesium.Color.WHITE.withAlpha(0.8),
          outline: true,
          outlineColor: Cesium.Color.BLACK
        },
        label: {
          text: specs.name || 'Aircraft',
          font: '10pt sans-serif'
        }
      });
    }

    // Set up flight path if available
    const animations = [];
    if (specs.flightPath && specs.flightPath.length > 1) {
      const animation = await this.createFlightPathAnimation(entity, specs.flightPath, specs);
      animations.push(animation);
    }

    return {
      entity,
      animations,
      metadata: asset.metadata
    };
  }

  private async createProceduralAircraft(position: any, data: any, specs: any): Promise<any> {
    // Create a simple aircraft shape using Cesium primitives
    const fuselageLength = data.dimensions.length;
    const wingspan = data.dimensions.wingspan;
    
    // Main fuselage
    const entity = this.viewer.entities.add({
      position: position,
      cylinder: {
        length: fuselageLength,
        topRadius: fuselageLength * 0.05,
        bottomRadius: fuselageLength * 0.08,
        material: Cesium.Color.fromCssColorString(data.materials.fuselage)
      },
      orientation: Cesium.Transforms.headingPitchRollQuaternion(
        position,
        new Cesium.HeadingPitchRoll(0, 0, Math.PI / 2)
      )
    });

    // Wings (simplified as ellipses)
    this.viewer.entities.add({
      position: position,
      ellipse: {
        semiMajorAxis: wingspan / 2,
        semiMinorAxis: fuselageLength * 0.15,
        material: Cesium.Color.fromCssColorString(data.materials.wings).withAlpha(0.9),
        outline: true,
        outlineColor: Cesium.Color.BLACK
      }
    });

    return entity;
  }

  private async renderVehicle(asset: any, specs: any): Promise<CesiumAsset> {
    const position = Cesium.Cartesian3.fromDegrees(
      specs.startLocation[1],
      specs.startLocation[0],
      specs.startLocation[2] || 0
    );

    let entity: any;

    if (asset.data.type === 'procedural_vehicle') {
      // Create simple vehicle from box primitive
      entity = this.viewer.entities.add({
        position: position,
        box: {
          dimensions: new Cesium.Cartesian3(
            asset.data.dimensions.width,
            asset.data.dimensions.depth,
            asset.data.dimensions.height
          ),
          material: Cesium.Color.fromCssColorString(asset.data.materials.body)
        },
        label: {
          text: specs.name || 'Vehicle',
          pixelOffset: new Cesium.Cartesian2(0, -30)
        }
      });
    } else {
      // Fallback vehicle
      entity = this.viewer.entities.add({
        position: position,
        box: {
          dimensions: new Cesium.Cartesian3(4, 2, 1.5),
          material: Cesium.Color.RED
        }
      });
    }

    const animations = [];
    if (specs.route && specs.route.length > 1) {
      const animation = await this.createVehicleRouteAnimation(entity, specs.route, specs);
      animations.push(animation);
    }

    return {
      entity,
      animations,
      metadata: asset.metadata
    };
  }

  private async renderTerrain(asset: any, specs: any): Promise<CesiumAsset> {
    if (asset.data.type === 'procedural_terrain') {
      // Create terrain from heightmap data
      const primitive = await this.createTerrainFromHeightmap(asset.data);
      
      return {
        entity: null,
        primitive,
        animations: [],
        metadata: asset.metadata
      };
    }

    // Fallback terrain representation
    const entity = this.viewer.entities.add({
      rectangle: {
        coordinates: Cesium.Rectangle.fromDegrees(...asset.data.bounds),
        material: Cesium.Color.GREEN.withAlpha(0.5),
        outline: true,
        outlineColor: Cesium.Color.BLACK
      }
    });

    return {
      entity,
      animations: [],
      metadata: asset.metadata
    };
  }

  private async renderGenericObject(asset: any, specs: any): Promise<CesiumAsset> {
    const position = Cesium.Cartesian3.fromDegrees(
      specs.location[1],
      specs.location[0],
      specs.location[2] || 0
    );

    const entity = this.viewer.entities.add({
      position: position,
      ellipsoid: {
        radii: new Cesium.Cartesian3(10, 10, 10),
        material: Cesium.Color.YELLOW.withAlpha(0.8)
      },
      label: {
        text: asset.metadata.name || 'Object',
        pixelOffset: new Cesium.Cartesian2(0, -40)
      }
    });

    return {
      entity,
      animations: [],
      metadata: asset.metadata
    };
  }

  private async addBuildingWindows(entity: any, buildingData: any): Promise<void> {
    // Add window details to building (simplified)
    const windowCount = Math.floor(buildingData.floors / 2) * 4; // 4 windows per floor
    
    // This would create individual window entities or modify the building material
    // For now, just modify the building appearance
    if (entity.box) {
      entity.box.material = new Cesium.ImageMaterialProperty({
        image: this.generateBuildingTexture(buildingData),
        transparent: true
      });
    }
  }

  private generateBuildingTexture(buildingData: any): string {
    // Generate a simple procedural building texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Wall color
    ctx.fillStyle = buildingData.materials.wall || '#e0e0e0';
    ctx.fillRect(0, 0, 256, 256);

    // Draw windows
    ctx.fillStyle = buildingData.materials.windows || '#87CEEB';
    const windowSize = 20;
    const spacing = 30;
    
    for (let y = 20; y < 256; y += spacing) {
      for (let x = 20; x < 256; x += spacing) {
        ctx.fillRect(x, y, windowSize, windowSize);
      }
    }

    return canvas.toDataURL();
  }

  private async createFlightPathAnimation(entity: any, flightPath: [number, number, number][], specs: any): Promise<CesiumAnimation> {
    const startTime = this.viewer.clock.currentTime.clone();
    const duration = specs.duration || 60;
    const stopTime = Cesium.JulianDate.addSeconds(startTime, duration, new Cesium.JulianDate());

    // Create sampled position property
    const positionProperty = new Cesium.SampledPositionProperty();

    flightPath.forEach((point, index) => {
      const time = Cesium.JulianDate.addSeconds(
        startTime, 
        (index / (flightPath.length - 1)) * duration,
        new Cesium.JulianDate()
      );
      
      const position = Cesium.Cartesian3.fromDegrees(point[1], point[0], point[2]);
      positionProperty.addSample(time, position);
    });

    // Set interpolation
    positionProperty.setInterpolationOptions({
      interpolationDegree: 2,
      interpolationAlgorithm: Cesium.HermitePolynomialApproximation
    });

    // Apply to entity
    entity.position = positionProperty;

    // Add path visualization
    entity.path = {
      material: Cesium.Color.YELLOW.withAlpha(0.7),
      width: 3,
      leadTime: 0,
      trailTime: 30,
      resolution: 1
    };

    // Set up automatic orientation along path
    entity.orientation = new Cesium.VelocityOrientationProperty(positionProperty);

    return {
      property: positionProperty,
      duration,
      startTime,
      stopTime
    };
  }

  private async createVehicleRouteAnimation(entity: any, route: [number, number][], specs: any): Promise<CesiumAnimation> {
    const startTime = this.viewer.clock.currentTime.clone();
    const duration = specs.duration || 30;
    const stopTime = Cesium.JulianDate.addSeconds(startTime, duration, new Cesium.JulianDate());

    const positionProperty = new Cesium.SampledPositionProperty();

    route.forEach((point, index) => {
      const time = Cesium.JulianDate.addSeconds(
        startTime,
        (index / (route.length - 1)) * duration,
        new Cesium.JulianDate()
      );
      
      const position = Cesium.Cartesian3.fromDegrees(point[1], point[0], 0);
      positionProperty.addSample(time, position);
    });

    entity.position = positionProperty;
    entity.orientation = new Cesium.VelocityOrientationProperty(positionProperty);

    // Add route visualization
    const routeEntity = this.viewer.entities.add({
      polyline: {
        positions: route.map(point => 
          Cesium.Cartesian3.fromDegrees(point[1], point[0], 0)
        ),
        width: 3,
        material: Cesium.Color.BLUE.withAlpha(0.7)
      }
    });

    return {
      property: positionProperty,
      duration,
      startTime,
      stopTime
    };
  }

  private async createTerrainFromHeightmap(data: any): Promise<any> {
    // Create terrain mesh from elevation data
    const positions = [];
    const indices = [];
    const resolution = data.resolution;
    const bounds = data.bounds;
    
    // Convert bounds to Cartesian coordinates and create mesh
    // This is a simplified implementation
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const lon = bounds[0] + (bounds[2] - bounds[0]) * (j / resolution);
        const lat = bounds[1] + (bounds[3] - bounds[1]) * (i / resolution);
        const height = data.heightmap[i][j] || 0;
        
        positions.push(Cesium.Cartesian3.fromDegrees(lon, lat, height));
      }
    }

    // Create indices for triangles (simplified)
    for (let i = 0; i < resolution - 1; i++) {
      for (let j = 0; j < resolution - 1; j++) {
        const topLeft = i * resolution + j;
        const topRight = topLeft + 1;
        const bottomLeft = (i + 1) * resolution + j;
        const bottomRight = bottomLeft + 1;

        // Two triangles per quad
        indices.push(topLeft, bottomLeft, topRight);
        indices.push(topRight, bottomLeft, bottomRight);
      }
    }

    // Create Cesium primitive
    const geometry = new Cesium.Geometry({
      attributes: {
        position: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.DOUBLE,
          componentsPerAttribute: 3,
          values: new Float64Array(positions.flatMap(p => [p.x, p.y, p.z]))
        })
      },
      indices: new Uint16Array(indices),
      primitiveType: Cesium.PrimitiveType.TRIANGLES,
      boundingSphere: Cesium.BoundingSphere.fromPoints(positions)
    });

    const primitive = this.viewer.scene.primitives.add(new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: geometry
      }),
      appearance: new Cesium.EllipsoidSurfaceAppearance({
        material: Cesium.Material.fromType('Color', {
          color: Cesium.Color.GREEN
        })
      })
    }));

    return primitive;
  }

  private async renderExplosion(asset: any, specs: any): Promise<CesiumAsset> {
    const position = Cesium.Cartesian3.fromDegrees(
      specs.location[1],
      specs.location[0],
      specs.location[2] || 0
    );

    const startTime = this.viewer.clock.currentTime.clone();
    const duration = asset.data.duration || 5;
    const stopTime = Cesium.JulianDate.addSeconds(startTime, duration, new Cesium.JulianDate());

    // Create particle system for explosion
    const particleSystem = this.viewer.scene.primitives.add(new Cesium.ParticleSystem({
      image: this.createExplosionTexture(),
      startColor: Cesium.Color.fromCssColorString(asset.data.particles.color).withAlpha(0.9),
      endColor: Cesium.Color.fromCssColorString(asset.data.particles.color).withAlpha(0.0),
      startScale: 1.0,
      endScale: 4.0,
      particleLife: duration,
      speed: asset.data.particles.velocity || 50,
      imageSize: new Cesium.Cartesian2(asset.data.particles.size || 2, asset.data.particles.size || 2),
      emissionRate: asset.data.particles.count / duration,
      bursts: [
        new Cesium.ParticleBurst({
          time: 0.0,
          minimum: asset.data.particles.count || 1000,
          maximum: asset.data.particles.count || 1000
        })
      ],
      lifetime: duration,
      emitter: new Cesium.SphereEmitter(asset.data.radius || 100),
      modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(position)
    }));

    // Add shockwave effect if enabled
    let shockwaveEntity = null;
    if (asset.data.shockwave?.enabled) {
      shockwaveEntity = this.viewer.entities.add({
        position: position,
        ellipse: {
          semiMajorAxis: 1,
          semiMinorAxis: 1,
          height: specs.location[2] || 0,
          material: Cesium.Color.fromCssColorString(asset.data.shockwave.color).withAlpha(0.3),
          outline: true,
          outlineColor: Cesium.Color.WHITE
        }
      });

      // Animate shockwave expansion
      const shockwaveAnimation = this.createShockwaveAnimation(shockwaveEntity, asset.data, startTime, duration);
    }

    return {
      entity: shockwaveEntity,
      primitive: particleSystem,
      animations: [{
        property: null,
        duration,
        startTime,
        stopTime
      }],
      metadata: asset.metadata
    };
  }

  private async renderSmoke(asset: any, specs: any): Promise<CesiumAsset> {
    const position = Cesium.Cartesian3.fromDegrees(
      specs.location[1],
      specs.location[0],
      specs.location[2] || 0
    );

    const duration = asset.data.duration || 120;
    const startTime = this.viewer.clock.currentTime.clone();
    const stopTime = Cesium.JulianDate.addSeconds(startTime, duration, new Cesium.JulianDate());

    // Create continuous smoke particle system
    const smokeSystem = this.viewer.scene.primitives.add(new Cesium.ParticleSystem({
      image: this.createSmokeTexture(),
      startColor: Cesium.Color.fromCssColorString(asset.data.particles.color).withAlpha(asset.data.particles.opacity || 0.7),
      endColor: Cesium.Color.fromCssColorString(asset.data.particles.color).withAlpha(0.0),
      startScale: 0.5,
      endScale: 3.0,
      particleLife: 30.0,
      speed: 5.0,
      imageSize: new Cesium.Cartesian2(asset.data.particles.size || 5, asset.data.particles.size || 5),
      emissionRate: asset.data.particles.count / 30, // particles per second
      lifetime: duration,
      emitter: new Cesium.ConeEmitter(Math.PI / 6), // Smoke cone
      modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(position),
      forces: [
        // Wind effect
        (particle: any) => {
          const windDirection = asset.data.wind.direction;
          const windStrength = asset.data.wind.strength || 0.3;
          return new Cesium.Cartesian3(
            windDirection[0] * windStrength,
            windDirection[1] * windStrength,
            windDirection[2] * windStrength || 0.1 // Slight upward drift
          );
        }
      ]
    }));

    return {
      entity: null,
      primitive: smokeSystem,
      animations: [{
        property: null,
        duration,
        startTime,
        stopTime
      }],
      metadata: asset.metadata
    };
  }

  private async renderDebris(asset: any, specs: any): Promise<CesiumAsset> {
    const basePosition = Cesium.Cartesian3.fromDegrees(
      specs.location[1],
      specs.location[0],
      specs.location[2] || 0
    );

    const debrisEntities: any[] = [];
    const animations: CesiumAnimation[] = [];
    const duration = specs.duration || 10;
    const startTime = this.viewer.clock.currentTime.clone();
    const stopTime = Cesium.JulianDate.addSeconds(startTime, duration, new Cesium.JulianDate());

    // Create individual debris pieces
    asset.data.pieces.forEach((piece: any, index: number) => {
      const initialVelocity = piece.velocity;
      const debrisEntity = this.viewer.entities.add({
        position: basePosition,
        box: {
          dimensions: new Cesium.Cartesian3(piece.size, piece.size, piece.size),
          material: this.getDebrisMaterial(piece.material)
        }
      });

      // Create physics-based animation
      const debrisAnimation = this.createDebrisPhysicsAnimation(
        debrisEntity,
        basePosition,
        initialVelocity,
        asset.data.physics,
        startTime,
        duration
      );

      debrisEntities.push(debrisEntity);
      animations.push(debrisAnimation);
    });

    return {
      entity: debrisEntities[0], // Primary entity for management
      animations,
      metadata: {
        ...asset.metadata,
        debrisEntities // Store all debris entities for cleanup
      }
    };
  }

  private createExplosionTexture(): string {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Create radial gradient for explosion particle
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 0, 1)');    // Bright yellow center
    gradient.addColorStop(0.3, 'rgba(255, 140, 0, 1)');  // Orange
    gradient.addColorStop(0.7, 'rgba(255, 0, 0, 0.8)');  // Red
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');        // Transparent edge

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    return canvas.toDataURL();
  }

  private createSmokeTexture(): string {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Create cloudy smoke texture
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(100, 100, 100, 0.8)');
    gradient.addColorStop(0.5, 'rgba(80, 80, 80, 0.6)');
    gradient.addColorStop(1, 'rgba(40, 40, 40, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    return canvas.toDataURL();
  }

  private getDebrisMaterial(materialType: string): any {
    const materials: Record<string, any> = {
      concrete: Cesium.Color.LIGHTGRAY,
      steel: Cesium.Color.DARKSLATEGRAY,
      glass: Cesium.Color.LIGHTBLUE.withAlpha(0.7),
      wood: Cesium.Color.SADDLEBROWN,
      default: Cesium.Color.GRAY
    };

    return materials[materialType] || materials.default;
  }

  private createShockwaveAnimation(entity: any, explosionData: any, startTime: any, duration: number): CesiumAnimation {
    const maxRadius = explosionData.radius || 100;
    
    // Animate the shockwave expansion
    const radiusProperty = new Cesium.SampledProperty(Number);
    radiusProperty.addSample(startTime, 1);
    radiusProperty.addSample(
      Cesium.JulianDate.addSeconds(startTime, duration * 0.3, new Cesium.JulianDate()),
      maxRadius
    );
    radiusProperty.addSample(
      Cesium.JulianDate.addSeconds(startTime, duration, new Cesium.JulianDate()),
      maxRadius * 1.5
    );

    entity.ellipse.semiMajorAxis = radiusProperty;
    entity.ellipse.semiMinorAxis = radiusProperty;

    return {
      property: radiusProperty,
      duration,
      startTime,
      stopTime: Cesium.JulianDate.addSeconds(startTime, duration, new Cesium.JulianDate())
    };
  }

  private createDebrisPhysicsAnimation(
    entity: any,
    basePosition: any,
    initialVelocity: [number, number, number],
    physics: any,
    startTime: any,
    duration: number
  ): CesiumAnimation {
    const positionProperty = new Cesium.SampledPositionProperty();
    const timeSteps = 60; // 60 physics steps over duration
    const dt = duration / timeSteps;

    let position = [0, 0, 0]; // Relative to base position
    let velocity = [...initialVelocity];

    for (let i = 0; i <= timeSteps; i++) {
      const time = Cesium.JulianDate.addSeconds(startTime, i * dt, new Cesium.JulianDate());
      
      // Apply gravity
      velocity[2] -= physics.gravity * dt;
      
      // Apply drag
      const speed = Math.sqrt(velocity[0]**2 + velocity[1]**2 + velocity[2]**2);
      const dragFactor = 1 - (physics.drag * dt * speed / 100);
      velocity = velocity.map(v => v * dragFactor);
      
      // Update position
      position[0] += velocity[0] * dt;
      position[1] += velocity[1] * dt;
      position[2] += velocity[2] * dt;
      
      // Ground collision (simplified)
      if (position[2] < 0) {
        position[2] = 0;
        velocity[2] = -velocity[2] * physics.bounce;
        velocity[0] *= 0.8; // Friction
        velocity[1] *= 0.8;
      }

      const worldPosition = Cesium.Cartesian3.add(
        basePosition,
        new Cesium.Cartesian3(position[0], position[1], position[2]),
        new Cesium.Cartesian3()
      );

      positionProperty.addSample(time, worldPosition);
    }

    entity.position = positionProperty;

    return {
      property: positionProperty,
      duration,
      startTime,
      stopTime: Cesium.JulianDate.addSeconds(startTime, duration, new Cesium.JulianDate())
    };
  }

  // Animation control methods
  playAnimation(assetId: string, animationName?: string): void {
    const asset = this.renderedAssets.get(assetId);
    if (!asset || !asset.animations.length) return;

    const animation = animationName 
      ? asset.animations.find(a => a.property.constructor.name.includes(animationName))
      : asset.animations[0];

    if (animation) {
      this.viewer.clock.startTime = animation.startTime.clone();
      this.viewer.clock.stopTime = animation.stopTime.clone();
      this.viewer.clock.currentTime = animation.startTime.clone();
      this.viewer.clock.multiplier = 1.0;
      this.viewer.clock.shouldAnimate = true;
    }
  }

  pauseAnimation(): void {
    this.viewer.clock.shouldAnimate = false;
  }

  resetAnimation(assetId: string): void {
    const asset = this.renderedAssets.get(assetId);
    if (!asset || !asset.animations.length) return;

    this.viewer.clock.currentTime = asset.animations[0].startTime.clone();
  }

  setAnimationSpeed(speed: number): void {
    this.viewer.clock.multiplier = speed;
  }

  // Asset management
  removeAsset(assetId: string): void {
    const asset = this.renderedAssets.get(assetId);
    if (!asset) return;

    if (asset.entity) {
      this.viewer.entities.remove(asset.entity);
    }
    if (asset.primitive) {
      this.viewer.scene.primitives.remove(asset.primitive);
    }

    this.renderedAssets.delete(assetId);
  }

  removeAllAssets(): void {
    this.renderedAssets.forEach((_, assetId) => {
      this.removeAsset(assetId);
    });
  }

  getRenderedAssets(): string[] {
    return Array.from(this.renderedAssets.keys());
  }

  // LOD and performance optimization
  optimizeForPerformance(): void {
    // Implement LOD switching based on camera distance
    this.renderedAssets.forEach((asset, id) => {
      if (asset.entity && asset.entity.model) {
        // Adjust model detail based on distance
        const distance = this.getDistanceFromCamera(asset.entity.position);
        if (distance > 10000) {
          asset.entity.model.minimumPixelSize = 32;
        } else if (distance > 5000) {
          asset.entity.model.minimumPixelSize = 64;
        } else {
          asset.entity.model.minimumPixelSize = 128;
        }
      }
    });
  }

  private getDistanceFromCamera(position: any): number {
    if (!position) return Infinity;
    
    const cameraPosition = this.viewer.camera.position;
    const targetPosition = position.getValue ? position.getValue(this.viewer.clock.currentTime) : position;
    
    return Cesium.Cartesian3.distance(cameraPosition, targetPosition);
  }
}

export { CesiumAssetRenderer };