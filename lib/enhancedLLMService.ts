import { llmService } from './llmService';

interface EnhancedLLMResponse {
  narrative: string;
  experience: any; // ImmersiveExperience structure
  dataRequests: DataRequest[];
  visualInstructions: string[];
  cameraInstructions: CameraInstruction[];
  timelineEvents: TimelineEventData[];
}

interface DataRequest {
  type: 'wikipedia' | 'building_data' | 'historical_records' | 'news_api';
  query: string;
  parameters?: Record<string, any>;
}

interface CameraInstruction {
  action: 'fly_to' | 'orbit' | 'follow' | 'split_screen';
  coordinates?: [number, number, number?];
  duration?: number;
  targets?: string[]; // for split screen
}

interface TimelineEventData {
  time: string; // ISO timestamp or relative time
  title: string;
  description: string;
  coordinates: [number, number];
  visualActions: string[];
}

export class EnhancedLLMService {
  
  async processAdvancedQuery(query: string, location?: any): Promise<EnhancedLLMResponse> {
    const agentType = this.detectQueryType(query);
    const enhancedPrompt = this.createAdvancedPrompt(query, agentType, location);
    
    try {
      // Use existing LLM service with enhanced prompt
      const response = await this.callLLMWithAdvancedPrompt(enhancedPrompt);
      
      // Parse and structure the response
      const structuredResponse = this.parseAdvancedResponse(response);
      
      // Enhance with external data
      const enhancedResponse = await this.enhanceWithExternalData(structuredResponse, query);
      
      return enhancedResponse;
      
    } catch (error) {
      console.error('Enhanced LLM processing failed:', error);
      return this.generateFallbackResponse(query, agentType);
    }
  }

  private createAdvancedPrompt(query: string, agentType: string, location?: any): string {
    const baseContext = location ? 
      `\n\nCONTEXT LOCATION: ${location.name || `${location.lat}, ${location.lon}`}` : '';

    return `You are UltraMaps Advanced Visualization AI, capable of creating immersive 3D experiences on a Cesium globe.

QUERY: "${query}"
AGENT TYPE: ${agentType}${baseContext}

You must respond with a JSON object containing these exact fields:

{
  "narrative": "Brief 2-3 sentence overview for the user",
  "experience": {
    "id": "unique_id",
    "title": "Experience Title",
    "description": "Detailed description",
    "locations": [
      {
        "id": "location_1",
        "coordinates": [lat, lon, altitude_optional],
        "name": "Location Name",
        "description": "What happened here",
        "buildings": [
          {
            "id": "building_1",
            "coordinates": [lat, lon],
            "height": 417,
            "floors": 110,
            "footprint": [[coordinates_array]],
            "historical": {
              "builtYear": 1973,
              "destroyedYear": 2001,
              "reconstructed": true
            }
          }
        ],
        "objects": [
          {
            "id": "aircraft_1",
            "type": "aircraft",
            "coordinates": [lat, lon, altitude],
            "model": "boeing_767",
            "scale": 1.0,
            "rotation": [0, 0, 0]
          }
        ]
      }
    ],
    "timeline": [
      {
        "timestamp": "2001-09-11T08:46:00Z",
        "title": "First Impact",
        "description": "Flight 11 impacts North Tower",
        "location": [40.7484, -73.9857, 300],
        "visualElements": ["aircraft_1", "building_1"]
      }
    ],
    "animations": [
      {
        "id": "flight_path_1",
        "type": "flight_path",
        "duration": 30,
        "startTime": 0,
        "targetId": "aircraft_1",
        "keyframes": [
          {
            "time": 0,
            "position": [starting_coords],
            "rotation": [0, 0, 0]
          },
          {
            "time": 1,
            "position": [impact_coords],
            "rotation": [0, 0, 45]
          }
        ]
      }
    ],
    "overlays": [
      {
        "id": "impact_zones",
        "type": "impact_zones",
        "data": {},
        "style": {
          "color": "#ff4444",
          "opacity": 0.7
        }
      }
    ],
    "splitScreens": [
      {
        "id": "wtc_pentagon_split",
        "locations": ["wtc", "pentagon"],
        "layout": "horizontal",
        "syncTimeline": true
      }
    ]
  },
  "dataRequests": [
    {
      "type": "wikipedia",
      "query": "September 11 attacks",
      "parameters": {"sections": ["timeline", "casualties", "buildings"]}
    }
  ],
  "visualInstructions": [
    "Render World Trade Center towers with accurate dimensions",
    "Create flight path from Boston to NYC",
    "Animate collapse sequence with physics",
    "Add smoke and debris effects",
    "Include timeline scrubber for minute-by-minute control"
  ],
  "cameraInstructions": [
    {
      "action": "fly_to",
      "coordinates": [40.7484, -73.9857, 1000],
      "duration": 3
    },
    {
      "action": "split_screen",
      "targets": ["wtc_view", "pentagon_view"]
    }
  ]
}

CRITICAL: 
- Always include precise coordinates (research actual locations)
- Include accurate timestamps for historical events
- Specify realistic building dimensions and object scales
- Create meaningful timeline progressions
- Design educational and respectful visualizations
- Include multiple camera angles and perspectives

For historical events like 9/11, include:
- Exact building specifications (height, floors, footprint)
- Accurate flight paths and timing
- Multiple locations (WTC, Pentagon, Shanksville)
- Timeline from first impact to final collapse
- Emergency response visualizations
- Memorial and reconstruction elements

Remember: You are creating educational, immersive experiences that help users understand complex events and locations through interactive 3D visualization.`;
  }

  private async callLLMWithAdvancedPrompt(prompt: string): Promise<string> {
    const response = await fetch('/api/ai/geographic-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query: prompt,
        advanced: true 
      })
    });
    
    const data = await response.json();
    return data.content;
  }

  private parseAdvancedResponse(response: string): Partial<EnhancedLLMResponse> {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse advanced response:', error);
    }
    
    // Fallback parsing
    return {
      narrative: response.substring(0, 200) + '...',
      experience: {},
      dataRequests: [],
      visualInstructions: [],
      cameraInstructions: [],
      timelineEvents: []
    };
  }

  private async enhanceWithExternalData(
    response: Partial<EnhancedLLMResponse>, 
    query: string
  ): Promise<EnhancedLLMResponse> {
    
    // Fetch additional data based on dataRequests
    if (response.dataRequests && response.dataRequests.length > 0) {
      for (const request of response.dataRequests) {
        if (request.type === 'wikipedia') {
          const wikiData = await this.fetchWikipediaData(request.query);
          // Integrate wiki data into experience
        }
      }
    }

    return {
      narrative: response.narrative || 'Processing your request...',
      experience: response.experience || {},
      dataRequests: response.dataRequests || [],
      visualInstructions: response.visualInstructions || [],
      cameraInstructions: response.cameraInstructions || [],
      timelineEvents: response.timelineEvents || []
    };
  }

  private async fetchWikipediaData(query: string): Promise<any> {
    try {
      const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/search/${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl);
      const data = await response.json();
      
      if (data.pages && data.pages.length > 0) {
        const pageTitle = data.pages[0].title;
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
        const summaryResponse = await fetch(summaryUrl);
        return await summaryResponse.json();
      }
    } catch (error) {
      console.error('Wikipedia fetch error:', error);
    }
    return null;
  }

  private detectQueryType(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('attack') || lowerQuery.includes('war') || lowerQuery.includes('battle') || lowerQuery.includes('9/11') || lowerQuery.includes('911')) {
      return 'historical-event';
    }
    if (lowerQuery.includes('tsunami') || lowerQuery.includes('earthquake') || lowerQuery.includes('hurricane') || lowerQuery.includes('disaster')) {
      return 'natural-disaster';
    }
    if (lowerQuery.includes('conflict') || lowerQuery.includes('ukraine') || lowerQuery.includes('war') || lowerQuery.includes('invasion')) {
      return 'current-conflict';
    }
    if (lowerQuery.includes('trip') || lowerQuery.includes('travel') || lowerQuery.includes('visit') || lowerQuery.includes('plan')) {
      return 'trip-planning';
    }
    
    return 'general';
  }

  private generateFallbackResponse(query: string, agentType: string): EnhancedLLMResponse {
    return {
      narrative: `I'm analyzing your request about "${query}" and preparing an immersive 3D visualization.`,
      experience: {
        id: `fallback_${Date.now()}`,
        title: 'Geographic Analysis',
        description: 'Interactive geographic visualization',
        locations: [],
        visualElements: [],
        animations: [],
        overlays: [],
        interactiveElements: []
      },
      dataRequests: [
        {
          type: 'wikipedia',
          query: query,
          parameters: {}
        }
      ],
      visualInstructions: [
        'Prepare 3D globe visualization',
        'Research location data',
        'Create interactive overlays'
      ],
      cameraInstructions: [],
      timelineEvents: []
    };
  }
}

export const enhancedLLMService = new EnhancedLLMService();