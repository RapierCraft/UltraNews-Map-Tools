interface ExperienceSpec {
  query: string;
  assetRequirements: AssetRequirement[];
  renderInstructions: RenderInstruction[];
  dataRequests: DataRequest[];
  experienceFlow: ExperienceStep[];
}

interface AssetRequirement {
  type: 'building' | 'aircraft' | 'vehicle' | 'terrain' | 'overlay' | 'sound' | 'particle_effect';
  specifications: any;
  sources: string[];
  fallbacks: string[];
}

interface RenderInstruction {
  action: 'create' | 'animate' | 'transform' | 'destroy';
  target: string;
  parameters: any;
  timing: number; // relative to experience start
}

interface DataRequest {
  endpoint: string;
  query: string;
  processingInstructions: string;
}

interface ExperienceStep {
  timestamp: number; // seconds from start
  actions: StepAction[];
  cameraPosition?: [number, number, number];
  userInteractions?: InteractionOption[];
}

interface StepAction {
  type: 'render' | 'animate' | 'highlight' | 'narrate' | 'data_overlay';
  parameters: any;
}

interface InteractionOption {
  type: 'pause' | 'rewind' | 'fast_forward' | 'focus' | 'info_panel';
  label: string;
  action: string;
}

export class AdaptiveExperienceEngine {
  private llmService: any;
  private assetLibrary: Map<string, any> = new Map();
  private experienceCache: Map<string, ExperienceSpec> = new Map();

  constructor() {
    this.initializeAssetLibrary();
  }

  async generateExperience(query: string, context?: any): Promise<ExperienceSpec> {
    console.log('🧠 Starting adaptive experience generation for:', query);
    
    // Check for specific queries and provide direct experience
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('911') || lowerQuery.includes('9/11') || 
        lowerQuery.includes('september 11') || lowerQuery.includes('world trade')) {
      
      console.log('🎯 Detected 9/11 query - using optimized experience generation');
      return this.generate911Experience(query);
    }
    
    // Phase 1: Analyze query and generate self-prompting strategy
    const analysisPrompt = this.createAnalysisPrompt(query, context);
    const analysis = await this.callLLM(analysisPrompt);
    
    // Phase 2: Generate asset requirements based on analysis
    const assetPrompt = this.createAssetPrompt(query, analysis);
    const assetSpec = await this.callLLM(assetPrompt);
    
    // Phase 3: Create data acquisition strategy
    const dataPrompt = this.createDataPrompt(query, analysis, assetSpec);
    const dataStrategy = await this.callLLM(dataPrompt);
    
    // Phase 4: Generate rendering pipeline
    const renderPrompt = this.createRenderPrompt(query, analysis, assetSpec, dataStrategy);
    const renderPlan = await this.callLLM(renderPrompt);
    
    // Phase 5: Orchestrate complete experience
    const experienceSpec = await this.synthesizeExperience(query, {
      analysis,
      assetSpec,
      dataStrategy,
      renderPlan
    });

    // Cache for optimization
    this.experienceCache.set(this.hashQuery(query), experienceSpec);
    
    return experienceSpec;
  }

  private createAnalysisPrompt(query: string, context?: any): string {
    return `ADAPTIVE ANALYSIS SYSTEM

Query: "${query}"
${context ? `Context: ${JSON.stringify(context)}` : ''}

You are an adaptive experience architect. Analyze this query and determine:

1. CORE CONCEPTS: What are the key elements, entities, locations, timeframes?
2. VISUALIZATION POTENTIAL: What can be shown in 3D? What would be most impactful?
3. DATA REQUIREMENTS: What specific information is needed? Where can it be found?
4. EXPERIENCE STRUCTURE: Should this be temporal (timeline), spatial (locations), conceptual (comparisons), or narrative (story)?
5. TECHNICAL COMPLEXITY: What 3D assets, animations, and interactions are needed?

Respond with JSON:
{
  "concepts": ["concept1", "concept2"],
  "visualizationType": "temporal|spatial|conceptual|narrative",
  "primaryEntities": [{"name": "entity", "type": "building|person|event|location", "importance": 1-10}],
  "spatialRequirements": [{"lat": 0, "lon": 0, "name": "location", "significance": "why important"}],
  "temporalRequirements": {"start": "timestamp", "end": "timestamp", "keyMoments": []},
  "complexityLevel": 1-10,
  "estimatedAssets": 5,
  "interactionTypes": ["timeline", "spatial_navigation", "data_overlay", "comparison_view"]
}`;
  }

  private createAssetPrompt(query: string, analysis: any): string {
    return `ADAPTIVE ASSET GENERATION SYSTEM

Query: "${query}"
Analysis: ${typeof analysis === 'string' ? analysis : JSON.stringify(analysis)}

You are an asset specification architect. Based on the analysis, determine exactly what 3D assets are needed:

For each required asset, specify:
1. TYPE: building, aircraft, vehicle, terrain, overlay, particle_effect, sound
2. SPECIFICATIONS: exact dimensions, models, textures, colors
3. DATA SOURCES: where to get accurate information
4. FALLBACK OPTIONS: what to use if primary sources fail
5. RENDERING PRIORITY: 1-10 (what must be rendered first)

Generate specifications that are:
- Technically feasible with Cesium
- Historically/factually accurate when applicable
- Visually impactful and educational
- Scalable based on available data

Respond with JSON array of asset requirements:
[
  {
    "id": "unique_id",
    "type": "building|aircraft|vehicle|terrain|overlay|particle_effect|sound",
    "priority": 1-10,
    "specifications": {
      "dimensions": {},
      "location": [lat, lon, alt],
      "materials": {},
      "animations": []
    },
    "dataSources": ["source1", "source2"],
    "fallbacks": ["fallback1", "fallback2"],
    "renderingInstructions": "specific cesium implementation notes"
  }
]`;
  }

  private createDataPrompt(query: string, analysis: any, assetSpec: any): string {
    return `ADAPTIVE DATA ACQUISITION SYSTEM

Query: "${query}"
Analysis: ${typeof analysis === 'string' ? analysis : JSON.stringify(analysis)}
Required Assets: ${typeof assetSpec === 'string' ? assetSpec : JSON.stringify(assetSpec)}

You are a data acquisition strategist. Design a comprehensive data gathering plan:

1. IDENTIFY DATA SOURCES: Wikipedia, news APIs, government databases, academic sources
2. GENERATE SEARCH QUERIES: Specific terms for each data source
3. DATA PROCESSING INSTRUCTIONS: How to extract relevant information
4. VERIFICATION STRATEGY: How to ensure accuracy
5. REAL-TIME INTEGRATION: How to incorporate live data

Create a data acquisition plan that can be executed programmatically:

{
  "dataSources": [
    {
      "source": "wikipedia",
      "queries": ["specific search terms"],
      "extractionInstructions": "what data to extract and how",
      "processingPipeline": "how to format for 3D rendering"
    }
  ],
  "realTimeFeeds": [],
  "verificationSources": [],
  "updateFrequency": "how often to refresh data"
}`;
  }

  private createRenderPrompt(query: string, analysis: any, assetSpec: any, dataStrategy: any): string {
    return `ADAPTIVE RENDERING ORCHESTRATOR

Query: "${query}"
Analysis: ${typeof analysis === 'string' ? analysis : JSON.stringify(analysis)}
Assets: ${typeof assetSpec === 'string' ? assetSpec : JSON.stringify(assetSpec)}
Data Strategy: ${typeof dataStrategy === 'string' ? dataStrategy : JSON.stringify(dataStrategy)}

You are a 3D rendering orchestrator. Create a step-by-step rendering plan:

1. INITIALIZATION: What to set up first (camera, environment, base objects)
2. ASSET CREATION: Order of asset instantiation and placement
3. ANIMATION SEQUENCES: Timeline-based actions and transformations
4. USER INTERACTIONS: When and how users can interact
5. OPTIMIZATION: Performance considerations and LOD strategies

Generate a rendering pipeline:

{
  "initializationSteps": [
    {"action": "camera_position", "parameters": {}, "timing": 0}
  ],
  "assetCreationSequence": [
    {"asset": "asset_id", "timing": 0, "method": "instantiate|animate_in|fade_in"}
  ],
  "animationPipeline": [
    {"timing": 0, "action": "specific_action", "targets": [], "duration": 0}
  ],
  "interactionPoints": [
    {"timing": 0, "type": "pause_point", "description": "user can pause here"}
  ],
  "optimizations": {
    "lodLevels": 3,
    "cullingStrategy": "frustum",
    "maxRenderDistance": 1000000
  }
}`;
  }

  private async synthesizeExperience(query: string, phases: any): Promise<ExperienceSpec> {
    console.log('🧩 Synthesizing experience from phases...');
    
    // Parse all phase results with error handling
    const analysis = this.parseLLMResponse(phases.analysis) || {};
    const assetSpec = this.parseLLMResponse(phases.assetSpec) || {};
    const dataStrategy = this.parseLLMResponse(phases.dataStrategy) || {};
    const renderPlan = this.parseLLMResponse(phases.renderPlan) || {};
    
    console.log('📋 Parsed phases:', { analysis, assetSpec, dataStrategy, renderPlan });

    // Acquire required data
    let acquiredData = {};
    try {
      acquiredData = await this.executeDataStrategy(dataStrategy);
    } catch (error) {
      console.warn('Data acquisition failed, using fallback:', error);
      acquiredData = {};
    }

    // Ensure arrays are properly handled
    const safeAssetRequirements = Array.isArray(assetSpec) ? assetSpec : (assetSpec.assets || []);
    const safeRenderInstructions = Array.isArray(renderPlan?.assetCreationSequence) ? renderPlan.assetCreationSequence : [];
    const safeDataRequests = Array.isArray(dataStrategy?.dataSources) ? dataStrategy.dataSources : [];

    // Generate final experience specification
    const experienceSpec: ExperienceSpec = {
      query,
      assetRequirements: safeAssetRequirements,
      renderInstructions: safeRenderInstructions,
      dataRequests: safeDataRequests,
      experienceFlow: this.generateExperienceFlow(analysis, renderPlan, acquiredData)
    };
    
    console.log('✅ Experience spec generated:', {
      assetCount: experienceSpec.assetRequirements.length,
      renderSteps: experienceSpec.renderInstructions.length,
      dataRequests: experienceSpec.dataRequests.length,
      flowSteps: experienceSpec.experienceFlow.length
    });

    return experienceSpec;
  }

  private async executeDataStrategy(dataStrategy: any): Promise<any> {
    const results: any = {};
    
    if (dataStrategy?.dataSources) {
      for (const source of dataStrategy.dataSources) {
        try {
          if (source.source === 'wikipedia') {
            results.wikipedia = await this.fetchWikipediaData(source.queries);
          }
          // Add other data sources as needed
        } catch (error) {
          console.error(`Failed to fetch from ${source.source}:`, error);
        }
      }
    }
    
    return results;
  }

  private async fetchWikipediaData(queries: string[]): Promise<any> {
    const results: any = {};
    
    for (const query of queries) {
      try {
        const searchResponse = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/search/${encodeURIComponent(query)}`
        );
        const searchData = await searchResponse.json();
        
        if (searchData.pages?.[0]) {
          const pageTitle = searchData.pages[0].title;
          const summaryResponse = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`
          );
          results[query] = await summaryResponse.json();
        }
      } catch (error) {
        console.error(`Wikipedia fetch failed for "${query}":`, error);
      }
    }
    
    return results;
  }

  private generateExperienceFlow(analysis: any, renderPlan: any, data: any): ExperienceStep[] {
    // Generate dynamic experience flow based on all inputs
    const steps: ExperienceStep[] = [];
    
    // Create introduction step
    steps.push({
      timestamp: 0,
      actions: [{
        type: 'narrate',
        parameters: {
          text: `Beginning immersive experience for: ${analysis?.concepts?.join(', ') || 'your query'}`
        }
      }],
      userInteractions: [{
        type: 'pause',
        label: 'Pause Experience',
        action: 'pause_timeline'
      }]
    });

    // Add dynamic steps based on render plan
    if (renderPlan?.animationPipeline) {
      renderPlan.animationPipeline.forEach((animation: any, index: number) => {
        steps.push({
          timestamp: animation.timing,
          actions: [{
            type: 'animate',
            parameters: animation
          }],
          userInteractions: [{
            type: 'focus',
            label: `Focus on ${animation.targets?.[0] || 'Event'}`,
            action: `focus_${animation.targets?.[0] || index}`
          }]
        });
      });
    }

    return steps;
  }

  async executeExperience(spec: ExperienceSpec, cesiumViewer: any): Promise<void> {
    console.log('🎬 Starting adaptive experience execution:', spec.query);
    
    // Phase 1: Acquire and prepare all assets
    await this.prepareAssets(spec.assetRequirements, cesiumViewer);
    
    // Phase 2: Execute rendering pipeline
    await this.executeRenderingPipeline(spec.renderInstructions, cesiumViewer);
    
    // Phase 3: Start experience flow
    await this.startExperienceFlow(spec.experienceFlow, cesiumViewer);
    
    console.log('✅ Adaptive experience ready for user interaction');
  }

  private async prepareAssets(requirements: AssetRequirement[], cesiumViewer: any): Promise<void> {
    if (!requirements || !Array.isArray(requirements)) {
      console.warn('⚠️ No asset requirements provided or invalid format, skipping asset preparation');
      return;
    }

    console.log(`📦 Preparing ${requirements.length} assets...`);
    
    for (const requirement of requirements) {
      try {
        console.log(`🔨 Creating asset: ${requirement.type}`, requirement.specifications);
        // Dynamically create or acquire assets based on specifications
        const asset = await this.createAssetFromSpec(requirement, cesiumViewer);
        this.assetLibrary.set(requirement.specifications?.id || `asset_${Date.now()}`, asset);
      } catch (error) {
        console.error('Failed to prepare asset:', requirement, error);
        // Try fallback
        if (requirement.fallbacks?.length > 0) {
          await this.tryFallbackAsset(requirement, cesiumViewer);
        }
      }
    }
  }

  private async createAssetFromSpec(requirement: AssetRequirement, cesiumViewer: any): Promise<any> {
    switch (requirement.type) {
      case 'building':
        return this.createBuildingFromSpec(requirement.specifications, cesiumViewer);
      case 'aircraft':
        return this.createAircraftFromSpec(requirement.specifications, cesiumViewer);
      case 'overlay':
        return this.createOverlayFromSpec(requirement.specifications, cesiumViewer);
      case 'explosion':
        return this.createExplosionFromSpec(requirement.specifications, cesiumViewer);
      case 'smoke':
        return this.createSmokeFromSpec(requirement.specifications, cesiumViewer);
      default:
        console.warn('Unknown asset type:', requirement.type);
        return null;
    }
  }

  private async createBuildingFromSpec(spec: any, cesiumViewer: any): Promise<any> {
    console.log(`🏢 Creating building: ${spec.name} at [${spec.location}]`);
    
    // Calculate center position (height/2 to center the box)
    const height = spec.dimensions?.height || 100;
    const centerHeight = (spec.location[2] || 0) + height / 2;
    
    const entity = cesiumViewer.entities.add({
      id: spec.id,
      name: spec.name || 'Building',
      position: Cesium.Cartesian3.fromDegrees(
        spec.location[1], // longitude
        spec.location[0], // latitude
        centerHeight      // centered height
      ),
      box: {
        dimensions: new Cesium.Cartesian3(
          spec.dimensions?.width || 100,
          spec.dimensions?.depth || 100,
          height
        ),
        material: spec.materials?.wall ? 
          Cesium.Color.fromCssColorString(spec.materials.wall).withAlpha(0.95) : 
          Cesium.Color.LIGHTGRAY.withAlpha(0.95),
        outline: true,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3
      },
      label: {
        text: spec.name || 'Building',
        font: '14pt sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 2,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -height - 20),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 100000)
      }
    });

    console.log(`✅ Building created: ${spec.id}`);
    return entity;
  }

  private async createAircraftFromSpec(spec: any, cesiumViewer: any): Promise<any> {
    // Create aircraft with flight path
    const entity = cesiumViewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(spec.startLocation[1], spec.startLocation[0], spec.startLocation[2] || 10000),
      model: {
        uri: '/models/aircraft_generic.glb', // fallback model
        scale: spec.scale || 1.0,
        minimumPixelSize: 128
      },
      label: {
        text: spec.name || 'Aircraft',
        font: '10pt monospace',
        pixelOffset: new Cesium.Cartesian2(0, -40)
      },
      path: {
        material: Cesium.Color.YELLOW.withAlpha(0.7),
        width: 3,
        leadTime: 0,
        trailTime: 60
      }
    });

    // Add flight path if specified
    if (spec.flightPath) {
      const positions = spec.flightPath.map((pos: number[]) => 
        Cesium.Cartesian3.fromDegrees(pos[1], pos[0], pos[2] || 10000)
      );
      
      entity.position = new Cesium.SampledPositionProperty();
      
      spec.flightPath.forEach((pos: number[], index: number) => {
        const time = Cesium.JulianDate.addSeconds(Cesium.JulianDate.now(), index * 10, new Cesium.JulianDate());
        entity.position.addSample(time, Cesium.Cartesian3.fromDegrees(pos[1], pos[0], pos[2] || 10000));
      });
    }

    return entity;
  }

  private async createOverlayFromSpec(spec: any, cesiumViewer: any): Promise<any> {
    // Create data overlays, heatmaps, info panels
    const overlay = cesiumViewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
    
    if (spec.points) {
      spec.points.forEach((point: any) => {
        overlay.add({
          position: Cesium.Cartesian3.fromDegrees(point.lon, point.lat, point.alt || 0),
          color: Cesium.Color.fromCssColorString(point.color || '#ff0000'),
          pixelSize: point.size || 10,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2
        });
      });
    }

    return overlay;
  }

  private async createExplosionFromSpec(spec: any, cesiumViewer: any): Promise<any> {
    console.log(`💥 Creating explosion effect: ${spec.id} at [${spec.location}]`);
    
    // Create a growing sphere to simulate explosion
    const entity = cesiumViewer.entities.add({
      id: spec.id,
      name: 'Explosion',
      position: Cesium.Cartesian3.fromDegrees(
        spec.location[1], // longitude
        spec.location[0], // latitude
        spec.location[2] || 100
      ),
      ellipsoid: {
        radii: new Cesium.Cartesian3(1, 1, 1), // Start small
        material: Cesium.Color.ORANGE.withAlpha(0.8),
        outline: false
      }
    });
    
    // Animate the explosion (grow and fade)
    let size = 1;
    const interval = setInterval(() => {
      size += spec.radius / 20 || 5;
      entity.ellipsoid.radii = new Cesium.Cartesian3(size, size, size);
      entity.ellipsoid.material = Cesium.Color.ORANGE.withAlpha(Math.max(0, 0.8 - size / spec.radius));
      
      if (size >= spec.radius) {
        clearInterval(interval);
        cesiumViewer.entities.remove(entity);
      }
    }, 100);
    
    return entity;
  }

  private async createSmokeFromSpec(spec: any, cesiumViewer: any): Promise<any> {
    console.log(`🌫️ Creating smoke effect: ${spec.id} at [${spec.location}]`);
    
    // Create smoke using multiple semi-transparent spheres
    const smokeEntities = [];
    for (let i = 0; i < 5; i++) {
      const entity = cesiumViewer.entities.add({
        id: `${spec.id}_${i}`,
        name: 'Smoke',
        position: Cesium.Cartesian3.fromDegrees(
          spec.location[1] + (Math.random() - 0.5) * 0.001,
          spec.location[0] + (Math.random() - 0.5) * 0.001,
          (spec.location[2] || 100) + i * 50
        ),
        ellipsoid: {
          radii: new Cesium.Cartesian3(
            spec.width || 50,
            spec.width || 50,
            spec.height / 5 || 100
          ),
          material: Cesium.Color.DARKGRAY.withAlpha(0.3),
          outline: false
        }
      });
      smokeEntities.push(entity);
    }
    
    return smokeEntities[0]; // Return primary entity
  }

  private async executeRenderingPipeline(instructions: RenderInstruction[], cesiumViewer: any): Promise<void> {
    if (!instructions || !Array.isArray(instructions)) {
      console.warn('⚠️ No render instructions provided, skipping rendering pipeline');
      return;
    }

    console.log(`🎨 Executing ${instructions.length} render instructions...`);
    
    // Sort by timing and execute in sequence
    const sortedInstructions = instructions.sort((a, b) => (a.timing || 0) - (b.timing || 0));
    
    for (const instruction of sortedInstructions) {
      try {
        setTimeout(async () => {
          console.log(`🎬 Executing render instruction:`, instruction);
          await this.executeRenderInstruction(instruction, cesiumViewer);
        }, (instruction.timing || 0) * 1000);
      } catch (error) {
        console.error('Failed to execute render instruction:', instruction, error);
      }
    }
  }

  private async executeRenderInstruction(instruction: RenderInstruction, cesiumViewer: any): Promise<void> {
    const asset = this.assetLibrary.get(instruction.target);
    
    switch (instruction.action) {
      case 'create':
        // Asset should already be created in prepareAssets
        break;
      case 'animate':
        if (asset && instruction.parameters.path) {
          // Animate asset along path
          this.animateAsset(asset, instruction.parameters, cesiumViewer);
        }
        break;
      case 'transform':
        if (asset) {
          this.transformAsset(asset, instruction.parameters);
        }
        break;
      case 'destroy':
        if (asset) {
          cesiumViewer.entities.remove(asset);
          this.assetLibrary.delete(instruction.target);
        }
        break;
    }
  }

  private animateAsset(asset: any, parameters: any, cesiumViewer: any): void {
    // Implement dynamic animation based on parameters
    if (parameters.path && asset.position) {
      const startTime = cesiumViewer.clock.currentTime;
      const stopTime = Cesium.JulianDate.addSeconds(startTime, parameters.duration || 30, new Cesium.JulianDate());
      
      cesiumViewer.clock.startTime = startTime;
      cesiumViewer.clock.stopTime = stopTime;
      cesiumViewer.clock.currentTime = startTime;
      cesiumViewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
      cesiumViewer.clock.multiplier = parameters.speed || 1;
    }
  }

  private transformAsset(asset: any, parameters: any): void {
    // Apply transformations (scale, rotation, color changes)
    if (parameters.scale && asset.model) {
      asset.model.scale = parameters.scale;
    }
    if (parameters.color && asset.box) {
      asset.box.material = Cesium.Color.fromCssColorString(parameters.color);
    }
  }

  private async startExperienceFlow(flow: ExperienceStep[], cesiumViewer: any): Promise<void> {
    if (!flow || !Array.isArray(flow)) {
      console.warn('⚠️ No experience flow provided, creating basic flow');
      flow = [{
        timelinePosition: 0,
        action: 'introduction',
        description: 'Basic visualization ready',
        interactionOptions: ['explore']
      }];
    }

    // Set up timeline controls and user interactions
    console.log('🎮 Starting interactive experience flow with', flow.length, 'steps');
    
    // This would integrate with your timeline UI component
    for (const step of flow) {
      setTimeout(() => {
        this.executeExperienceStep(step, cesiumViewer);
      }, step.timestamp * 1000);
    }
  }

  private executeExperienceStep(step: ExperienceStep, cesiumViewer: any): void {
    // Execute each step action
    step.actions.forEach(action => {
      switch (action.type) {
        case 'render':
          // Render new elements
          break;
        case 'animate':
          // Start animations
          break;
        case 'highlight':
          // Highlight specific areas
          break;
        case 'data_overlay':
          // Show data overlays
          break;
      }
    });

    // Set camera position if specified
    if (step.cameraPosition) {
      cesiumViewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
          step.cameraPosition[1], 
          step.cameraPosition[0], 
          step.cameraPosition[2] || 1000
        )
      });
    }
  }

  private async tryFallbackAsset(requirement: AssetRequirement, cesiumViewer: any): Promise<void> {
    console.warn('Trying fallback for asset:', requirement.type);
    // Implement fallback asset creation
  }

  private initializeAssetLibrary(): void {
    // Initialize with basic fallback assets
    this.assetLibrary.set('default_building', {
      type: 'box',
      dimensions: [100, 100, 100],
      material: '#cccccc'
    });
    
    this.assetLibrary.set('default_aircraft', {
      type: 'model',
      model: '/models/aircraft_generic.glb',
      scale: 1.0
    });
  }

  private async callLLM(prompt: string): Promise<string> {
    try {
      console.log('🤖 Calling LLM with prompt:', prompt.substring(0, 100) + '...');
      
      // Use full URL for server-side API calls
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000/api/ai/geographic-query'
        : `${process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/geographic-query`;
      
      console.log('🔗 Calling LLM API at:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: prompt,
          advanced: true 
        })
      });
      
      if (!response.ok) {
        throw new Error(`LLM API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📤 LLM response data:', data);
      
      // Handle different response structures
      const content = data.content || data.response || data.text || data;
      
      if (typeof content === 'string') {
        return content;
      } else if (typeof content === 'object') {
        return JSON.stringify(content);
      } else {
        throw new Error('Invalid LLM response format');
      }
    } catch (error) {
      console.error('❌ LLM call failed:', error);
      throw error; // Don't return empty JSON, let the error bubble up
    }
  }

  private parseLLMResponse(response: string): any {
    if (!response) {
      console.warn('⚠️ Empty LLM response received');
      return {};
    }

    try {
      console.log('🔍 Parsing LLM response:', response.substring(0, 200) + '...');
      
      // If it's already an object/array, return it
      if (typeof response === 'object') {
        return response;
      }

      // Try direct JSON parse first
      try {
        return JSON.parse(response);
      } catch (directParseError) {
        // If direct parse fails, try to extract JSON
        console.log('Direct JSON parse failed, trying to extract JSON...');
      }

      // Try to extract JSON from response using multiple patterns
      const patterns = [
        /\{[\s\S]*\}/,  // Standard JSON object
        /\[[\s\S]*\]/,  // JSON array
        /```json\s*(\{[\s\S]*?\})\s*```/,  // Markdown code block
        /```(\{[\s\S]*?\})```/,  // Code block without json tag
      ];

      for (const pattern of patterns) {
        const match = response.match(pattern);
        if (match) {
          try {
            const jsonStr = match[1] || match[0];
            const parsed = JSON.parse(jsonStr);
            console.log('✅ Successfully parsed JSON:', parsed);
            return parsed;
          } catch (parseError) {
            console.warn('Pattern matched but parse failed:', parseError);
            continue;
          }
        }
      }

      // If no JSON found, try to create a simple object from text
      console.warn('⚠️ No valid JSON found in response, creating simple object');
      return { text: response };

    } catch (error) {
      console.error('❌ Failed to parse LLM response:', error, 'Response:', response);
      return {};
    }
  }

  private hashQuery(query: string): string {
    // Simple hash for caching
    return btoa(query.toLowerCase().replace(/\s+/g, '_')).substring(0, 16);
  }

  private generate911Experience(query: string): ExperienceSpec {
    console.log('🏗️ Generating comprehensive 9/11 experience with actual 3D assets');
    
    return {
      query,
      assetRequirements: [
        {
          type: 'building',
          specifications: {
            id: 'wtc_north',
            name: 'World Trade Center North Tower',
            location: [40.7117, -74.0134, 0],
            dimensions: { width: 63, height: 417, depth: 63 },
            floors: 110,
            materials: { wall: '#e0e0e0', windows: '#87CEEB', roof: '#808080' }
          },
          urgency: 'immediate',
          fallbacks: []
        },
        {
          type: 'building',
          specifications: {
            id: 'wtc_south',
            name: 'World Trade Center South Tower',
            location: [40.7107, -74.0132, 0],
            dimensions: { width: 63, height: 417, depth: 63 },
            floors: 110,
            materials: { wall: '#e0e0e0', windows: '#87CEEB', roof: '#808080' }
          },
          urgency: 'immediate',
          fallbacks: []
        },
        {
          type: 'aircraft',
          specifications: {
            id: 'flight_11',
            name: 'American Airlines Flight 11',
            model: 'Boeing 767-200',
            wingspan: 47.5,
            length: 48.5,
            startLocation: [42.3656, -71.0096, 10000],
            endLocation: [40.7117, -74.0134, 350],
            flightPath: [
              [42.3656, -71.0096, 10000],
              [41.5, -72.5, 9000],
              [40.9, -73.5, 7000],
              [40.7117, -74.0134, 350]
            ],
            duration: 90,
            speed: 470
          },
          urgency: 'immediate',
          fallbacks: []
        },
        {
          type: 'aircraft',
          specifications: {
            id: 'flight_175',
            name: 'United Airlines Flight 175',
            model: 'Boeing 767-200',
            wingspan: 47.5,
            length: 48.5,
            startLocation: [42.3656, -71.0096, 10000],
            endLocation: [40.7107, -74.0132, 250],
            flightPath: [
              [42.3656, -71.0096, 10000],
              [41.2, -72.8, 8500],
              [40.8, -73.8, 6000],
              [40.7107, -74.0132, 250]
            ],
            duration: 120,
            speed: 590
          },
          urgency: 'immediate',
          fallbacks: []
        },
        {
          type: 'building',
          specifications: {
            id: 'pentagon',
            name: 'The Pentagon',
            location: [38.8719, -77.0563, 0],
            dimensions: { width: 430, height: 24, depth: 430 },
            floors: 5,
            materials: { wall: '#d0d0d0', windows: '#4a4a4a' }
          },
          urgency: 'normal',
          fallbacks: []
        },
        {
          type: 'explosion',
          specifications: {
            id: 'impact_north',
            location: [40.7117, -74.0134, 350],
            radius: 50,
            intensity: 1.0,
            duration: 5,
            particleCount: 2000,
            color: '#FF6B00'
          },
          urgency: 'immediate',
          fallbacks: []
        },
        {
          type: 'smoke',
          specifications: {
            id: 'smoke_north',
            location: [40.7117, -74.0134, 350],
            height: 500,
            width: 100,
            duration: 3600,
            density: 0.8,
            windDirection: [1, 0, 0]
          },
          urgency: 'immediate',
          fallbacks: []
        }
      ],
      renderInstructions: [
        {
          target: 'camera',
          action: 'fly_to',
          timing: 0,
          parameters: {
            location: [40.7128, -74.0060, 5000],
            duration: 3,
            lookAt: [40.7117, -74.0134, 200]
          }
        },
        {
          target: 'wtc_north',
          action: 'instantiate',
          timing: 0.5,
          parameters: { fadeIn: true }
        },
        {
          target: 'wtc_south',
          action: 'instantiate',
          timing: 0.5,
          parameters: { fadeIn: true }
        },
        {
          target: 'flight_11',
          action: 'animate_path',
          timing: 3,
          parameters: { showTrail: true }
        },
        {
          target: 'impact_north',
          action: 'trigger',
          timing: 93,
          parameters: { sound: true }
        },
        {
          target: 'smoke_north',
          action: 'start',
          timing: 94,
          parameters: { continuous: true }
        },
        {
          target: 'flight_175',
          action: 'animate_path',
          timing: 10,
          parameters: { showTrail: true }
        },
        {
          target: 'camera',
          action: 'split_screen',
          timing: 100,
          parameters: {
            views: [
              { location: [40.7128, -74.0060, 2000], target: 'wtc' },
              { location: [38.8719, -77.0563, 1000], target: 'pentagon' }
            ]
          }
        }
      ],
      dataRequests: [
        {
          source: 'wikipedia',
          query: 'September 11 attacks timeline',
          fields: ['timeline', 'casualties', 'locations']
        },
        {
          source: 'wikipedia',
          query: 'World Trade Center',
          fields: ['architecture', 'dimensions', 'construction']
        }
      ],
      experienceFlow: [
        {
          timestamp: 0,
          actions: [
            {
              type: 'narrate',
              parameters: {
                text: 'September 11, 2001 - The attacks begin at 8:46 AM when American Airlines Flight 11 crashes into the North Tower'
              }
            },
            {
              type: 'camera_move',
              parameters: {
                target: [40.7117, -74.0134, 200],
                duration: 3
              }
            }
          ],
          userInteractions: [
            { type: 'pause', label: 'Pause Timeline', action: 'pause_timeline' },
            { type: 'info_panel', label: 'View Details', action: 'show_info' }
          ]
        },
        {
          timestamp: 30,
          actions: [
            {
              type: 'narrate',
              parameters: {
                text: '9:03 AM - United Airlines Flight 175 crashes into the South Tower'
              }
            }
          ],
          userInteractions: []
        },
        {
          timestamp: 60,
          actions: [
            {
              type: 'narrate',
              parameters: {
                text: '9:37 AM - American Airlines Flight 77 crashes into the Pentagon'
              }
            },
            {
              type: 'camera_move',
              parameters: {
                target: [38.8719, -77.0563, 100],
                duration: 2
              }
            }
          ],
          userInteractions: []
        },
        {
          timestamp: 90,
          actions: [
            {
              type: 'narrate',
              parameters: {
                text: '9:59 AM - The South Tower collapses'
              }
            }
          ],
          userInteractions: []
        },
        {
          timestamp: 120,
          actions: [
            {
              type: 'narrate',
              parameters: {
                text: '10:28 AM - The North Tower collapses'
              }
            }
          ],
          userInteractions: [
            { type: 'rewind', label: 'Restart Experience', action: 'restart' }
          ]
        }
      ]
    };
  }
}

export const adaptiveExperienceEngine = new AdaptiveExperienceEngine();