interface VisualizationRequest {
  query: string;
  location?: GeographicContext;
  agentType: string;
}

interface ImmersiveExperience {
  id: string;
  title: string;
  description: string;
  timeline?: TimelineEvent[];
  locations: ExperienceLocation[];
  visualElements: VisualElement[];
  animations: Animation[];
  overlays: MapOverlay[];
  splitScreens?: SplitScreenConfig[];
  interactiveElements: InteractiveElement[];
}

interface TimelineEvent {
  timestamp: Date;
  title: string;
  description: string;
  location: [number, number, number?]; // lat, lon, altitude
  visualElements?: string[]; // references to visual element IDs
}

interface ExperienceLocation {
  id: string;
  coordinates: [number, number, number?];
  name: string;
  description: string;
  buildings?: Building3D[];
  objects?: Object3D[];
  cameraPosition?: CameraView;
}

interface Building3D {
  id: string;
  coordinates: [number, number];
  height: number;
  floors?: number;
  footprint: [number, number][]; // polygon points
  texture?: string;
  historical?: {
    builtYear: number;
    destroyedYear?: number;
    reconstructed?: boolean;
  };
}

interface Object3D {
  id: string;
  type: 'aircraft' | 'vehicle' | 'monument' | 'custom';
  coordinates: [number, number, number];
  model: string;
  scale: number;
  rotation: [number, number, number];
}

interface Animation {
  id: string;
  type: 'flight_path' | 'explosion' | 'collapse' | 'movement' | 'timeline_scrub';
  duration: number; // in seconds
  startTime: number; // seconds from timeline start
  targetId: string; // ID of object to animate
  keyframes: Keyframe[];
}

interface Keyframe {
  time: number; // 0-1 (percentage of animation duration)
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  properties?: Record<string, any>;
}

interface SplitScreenConfig {
  id: string;
  locations: string[]; // references to ExperienceLocation IDs
  layout: 'horizontal' | 'vertical' | 'quad';
  syncTimeline?: boolean;
}

interface CameraView {
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
  transition?: {
    duration: number;
    easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  };
}

interface MapOverlay {
  id: string;
  type: 'heatmap' | 'timeline_markers' | 'info_panels' | 'flight_paths' | 'impact_zones';
  data: any;
  style: OverlayStyle;
  visibility: {
    minZoom?: number;
    maxZoom?: number;
    timeRange?: [number, number]; // timeline visibility
  };
}

interface OverlayStyle {
  color?: string;
  opacity?: number;
  strokeWidth?: number;
  fillColor?: string;
  icon?: string;
  size?: number;
}

interface InteractiveElement {
  id: string;
  type: 'timeline_scrubber' | 'info_popup' | 'zoom_control' | 'layer_toggle';
  position: 'bottom' | 'top' | 'left' | 'right' | 'overlay';
  config: Record<string, any>;
}

export class AdvancedVisualizationEngine {
  private wikipediaApiBase = 'https://en.wikipedia.org/api/rest_v1';
  
  async generateImmersiveExperience(request: VisualizationRequest): Promise<ImmersiveExperience> {
    const prompt = this.createAdvancedPrompt(request);
    
    // This would typically call your LLM service
    const llmResponse = await this.processWithLLM(prompt);
    
    // Parse LLM response and enhance with external data
    const baseExperience = this.parseLLMResponse(llmResponse);
    const enhancedExperience = await this.enhanceWithExternalData(baseExperience, request.query);
    
    return enhancedExperience;
  }

  private createAdvancedPrompt(request: VisualizationRequest): string {
    const { query, location, agentType } = request;
    
    const systemPrompt = `You are UltraMaps Advanced Visualization AI, specialized in creating immersive 3D globe experiences. 

Your task is to analyze user queries and generate detailed JSON specifications for interactive, historically accurate 3D visualizations on a Cesium globe.

CAPABILITIES YOU HAVE ACCESS TO:
- 3D building generation and placement
- Aircraft and vehicle 3D models
- Timeline-based animations
- Split-screen multi-location views
- Historical data integration
- Real-time overlays and infographics
- Interactive timeline scrubbing
- Camera movements and transitions

RESPONSE FORMAT:
Always respond with a JSON object containing:
1. "narrative": Brief overview text for the user
2. "experience": Complete ImmersiveExperience specification
3. "dataRequests": External APIs or data sources needed
4. "visualInstructions": Specific technical instructions for the 3D engine

EXAMPLE QUERY TYPES AND RESPONSES:

Historical Events: "Explain the 9/11 attacks"
- Create timeline from 8:00 AM to 12:00 PM EST
- Generate accurate World Trade Center buildings (110 floors, 417m height)
- Place aircraft models (Boeing 767) with flight paths
- Animate impacts at precise times (8:46 AM, 9:03 AM)
- Include Pentagon location with split-screen
- Add timeline scrubber for minute-by-minute progression
- Show evacuation routes, emergency response

Natural Disasters: "Show the 2004 Indian Ocean tsunami"
- Generate pre-tsunami coastal buildings and infrastructure
- Animate wave propagation across Indian Ocean
- Show impact times at different coastal locations
- Include seismic data visualization
- Timeline of destruction and rescue efforts

Current Events: "Show the Russia-Ukraine conflict"
- Real-time conflict zones with data overlays
- Troop movements and territorial changes over time
- Infrastructure damage assessment
- Refugee movement patterns
- Supply route visualizations

TECHNICAL REQUIREMENTS:
- All coordinates must be precise lat/lon values
- Building heights and footprints must be historically accurate
- Timeline events must have exact timestamps when available
- Animations must be realistic (physics-based flight paths, etc.)
- Camera transitions should be cinematic but informative
- All data sources must be cited

Always prioritize accuracy, educational value, and immersive storytelling.`;

    const userPrompt = `Query: "${query}"
${location ? `Context Location: ${location.name || `${location.lat}, ${location.lon}`}` : ''}
Agent Type: ${agentType}

Generate a comprehensive immersive 3D experience specification for this query. Include all technical details needed to render this experience on a Cesium globe with timeline controls, 3D objects, animations, and educational overlays.`;

    return systemPrompt + '\n\n' + userPrompt;
  }

  private async processWithLLM(prompt: string): Promise<string> {
    // This would integrate with your existing LLM service
    const response = await fetch('/api/ai/advanced-visualization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    
    const data = await response.json();
    return data.content;
  }

  private parseLLMResponse(response: string): Partial<ImmersiveExperience> {
    try {
      const parsed = JSON.parse(response);
      return parsed.experience || {};
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      return {};
    }
  }

  private async enhanceWithExternalData(
    baseExperience: Partial<ImmersiveExperience>, 
    query: string
  ): Promise<ImmersiveExperience> {
    
    // Enhance with Wikipedia data
    const wikipediaData = await this.fetchWikipediaData(query);
    
    // Enhance with building data
    const buildingData = await this.fetchBuildingData(baseExperience.locations || []);
    
    // Create default structure if missing
    const experience: ImmersiveExperience = {
      id: `exp_${Date.now()}`,
      title: baseExperience.title || this.extractTitle(query),
      description: baseExperience.description || 'Interactive 3D visualization',
      locations: baseExperience.locations || [],
      visualElements: baseExperience.visualElements || [],
      animations: baseExperience.animations || [],
      overlays: baseExperience.overlays || [],
      interactiveElements: baseExperience.interactiveElements || this.createDefaultInteractiveElements(),
      ...baseExperience
    };

    return experience;
  }

  private async fetchWikipediaData(query: string): Promise<any> {
    try {
      // Search for relevant Wikipedia articles
      const searchResponse = await fetch(
        `${this.wikipediaApiBase}/page/search/${encodeURIComponent(query)}`
      );
      const searchData = await searchResponse.json();
      
      if (searchData.pages && searchData.pages.length > 0) {
        const pageTitle = searchData.pages[0].title;
        
        // Fetch detailed page content
        const pageResponse = await fetch(
          `${this.wikipediaApiBase}/page/summary/${encodeURIComponent(pageTitle)}`
        );
        const pageData = await pageResponse.json();
        
        return pageData;
      }
    } catch (error) {
      console.error('Wikipedia API error:', error);
    }
    
    return null;
  }

  private async fetchBuildingData(locations: ExperienceLocation[]): Promise<any> {
    // This would integrate with building APIs or databases
    // For now, return mock data
    return null;
  }

  private extractTitle(query: string): string {
    // Simple title extraction from query
    const words = query.split(' ').slice(0, 4);
    return words.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  private createDefaultInteractiveElements(): InteractiveElement[] {
    return [
      {
        id: 'timeline_scrubber',
        type: 'timeline_scrubber',
        position: 'bottom',
        config: {
          height: 60,
          showTimeLabels: true,
          enablePlayback: true,
          playbackSpeed: 1.0
        }
      },
      {
        id: 'layer_controls',
        type: 'layer_toggle',
        position: 'top',
        config: {
          layers: ['buildings', 'overlays', 'animations', 'labels']
        }
      }
    ];
  }

  // Method to render experience on Cesium globe
  async renderExperience(experience: ImmersiveExperience, cesiumViewer: any): Promise<void> {
    // Clear existing entities
    cesiumViewer.entities.removeAll();
    
    // Render locations and buildings
    for (const location of experience.locations) {
      await this.renderLocation(location, cesiumViewer);
    }
    
    // Add overlays
    for (const overlay of experience.overlays) {
      await this.renderOverlay(overlay, cesiumViewer);
    }
    
    // Set up animations
    if (experience.animations && experience.animations.length > 0) {
      await this.setupAnimations(experience.animations, cesiumViewer);
    }
    
    // Set up timeline controls
    if (experience.timeline) {
      await this.setupTimelineControls(experience.timeline, cesiumViewer);
    }
    
    // Set up split screens if configured
    if (experience.splitScreens) {
      await this.setupSplitScreens(experience.splitScreens, cesiumViewer);
    }
  }

  private async renderLocation(location: ExperienceLocation, cesiumViewer: any): Promise<void> {
    // Render 3D buildings
    if (location.buildings) {
      for (const building of location.buildings) {
        await this.render3DBuilding(building, cesiumViewer);
      }
    }
    
    // Render 3D objects
    if (location.objects) {
      for (const object of location.objects) {
        await this.render3DObject(object, cesiumViewer);
      }
    }
    
    // Set camera position if specified
    if (location.cameraPosition) {
      this.setCameraView(location.cameraPosition, cesiumViewer);
    }
  }

  private async render3DBuilding(building: Building3D, cesiumViewer: any): Promise<void> {
    // Implementation for rendering 3D buildings
    // This would use Cesium's 3D Tiles or primitive rendering
    console.log('Rendering 3D building:', building);
  }

  private async render3DObject(object: Object3D, cesiumViewer: any): Promise<void> {
    // Implementation for rendering 3D objects (aircraft, vehicles, etc.)
    console.log('Rendering 3D object:', object);
  }

  private setCameraView(cameraView: CameraView, cesiumViewer: any): void {
    // Implementation for camera positioning and transitions
    console.log('Setting camera view:', cameraView);
  }

  private async renderOverlay(overlay: MapOverlay, cesiumViewer: any): Promise<void> {
    // Implementation for rendering map overlays
    console.log('Rendering overlay:', overlay);
  }

  private async setupAnimations(animations: Animation[], cesiumViewer: any): Promise<void> {
    // Implementation for setting up timeline-based animations
    console.log('Setting up animations:', animations);
  }

  private async setupTimelineControls(timeline: TimelineEvent[], cesiumViewer: any): Promise<void> {
    // Implementation for timeline scrubber controls
    console.log('Setting up timeline controls:', timeline);
  }

  private async setupSplitScreens(splitScreens: SplitScreenConfig[], cesiumViewer: any): Promise<void> {
    // Implementation for split-screen functionality
    console.log('Setting up split screens:', splitScreens);
  }
}

// Export singleton instance
export const advancedVisualizationEngine = new AdvancedVisualizationEngine();