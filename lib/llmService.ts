interface LLMResponse {
  content: string;
  agentType: string;
  visualizations: any[];
  confidence: number;
  sources: string[];
  followUpSuggestions?: string[];
}

interface GeographicContext {
  lat?: number;
  lon?: number;
  name?: string;
}

export class LLMService {
  private ollamaUrl = 'http://localhost:11434';
  private openRouterUrl = 'https://openrouter.ai/api/v1';
  private isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

  constructor() {
    console.log('🚀 Initializing LLMService...');
    console.log('🔧 Environment:', {
      isDev: this.isDev,
      nodeEnv: process.env.NODE_ENV,
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY
    });
    
    // Validate environment variables
    if (!process.env.OPENROUTER_API_KEY) {
      console.warn('⚠️ OPENROUTER_API_KEY not set - OpenRouter will not work');
    }
    
    console.log('✅ LLMService initialized successfully');
  }

  private async checkOllamaHealth(): Promise<boolean> {
    try {
      console.log('🔍 Checking Ollama health at:', this.ollamaUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${this.ollamaUrl}/api/tags`, {
        signal: controller.signal,
        method: 'GET'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        const modelCount = data.models?.length || 0;
        console.log(`✅ Ollama healthy with ${modelCount} models`);
        return true;
      } else {
        console.log(`❌ Ollama responded with status: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log('❌ Ollama not available:', error.message);
      return false;
    }
  }

  private async queryOllama(prompt: string, model = 'llama3.2:3b'): Promise<string> {
    console.log(`🦙 Calling Ollama with model: ${model}`);
    
    const response = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 500
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Ollama request failed:', response.status, errorText);
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Ollama response received, length:', data.response?.length || 0);
    
    if (!data.response) {
      throw new Error('Ollama returned empty response');
    }
    
    return data.response;
  }

  private async queryOpenRouter(prompt: string, model = 'anthropic/claude-3-haiku'): Promise<string> {
    const response = await fetch(`${this.openRouterUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'UltraMaps Geographic Intelligence'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `You are UltraMaps AI, a specialized geographic intelligence assistant. You help users understand locations, plan trips, analyze real estate, research history, and explore environmental data. Always be helpful, concise, and focus on geographic context.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter request failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private detectAgentType(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('trip') || lowerQuery.includes('travel') || lowerQuery.includes('visit') || lowerQuery.includes('plan') || lowerQuery.includes('itinerary')) {
      return 'trip-planning';
    }
    if (lowerQuery.includes('history') || lowerQuery.includes('historical') || lowerQuery.includes('happened') || lowerQuery.includes('founded') || lowerQuery.includes('war') || lowerQuery.includes('ancient')) {
      return 'historical';
    }
    if (lowerQuery.includes('property') || lowerQuery.includes('real estate') || lowerQuery.includes('owns') || lowerQuery.includes('worth') || lowerQuery.includes('value') || lowerQuery.includes('price')) {
      return 'real-estate';
    }
    if (lowerQuery.includes('news') || lowerQuery.includes('events') || lowerQuery.includes('current') || lowerQuery.includes('happening') || lowerQuery.includes('protests')) {
      return 'news-events';
    }
    if (lowerQuery.includes('business') || lowerQuery.includes('market') || lowerQuery.includes('shop') || lowerQuery.includes('restaurant') || lowerQuery.includes('opportunity')) {
      return 'business';
    }
    if (lowerQuery.includes('climate') || lowerQuery.includes('environment') || lowerQuery.includes('weather') || lowerQuery.includes('pollution') || lowerQuery.includes('changed')) {
      return 'environmental';
    }
    
    return 'general';
  }

  private createGeographicPrompt(query: string, location?: GeographicContext, advanced = false): string {
    const locationContext = location 
      ? `\n\nCONTEXT: User is asking about location: ${location.name || `${location.lat}, ${location.lon}`}`
      : '';

    if (advanced) {
      return `You are UltraMaps Advanced Visualization AI, specialized in creating immersive 3D globe experiences.

QUERY: "${query}"${locationContext}

Create a comprehensive response with detailed markdown that includes:

## **Overview**
Brief explanation of what will be visualized on the 3D globe.

## **Key Locations** 
Specific coordinates and what will be shown at each location. Include:
- Exact latitude/longitude coordinates
- Building specifications (height, floors, footprint)
- Historical context and significance

## **Timeline** (if applicable)
Key moments with specific timestamps:
- Event sequences with exact times
- What happens at each moment
- Visual changes and animations

## **3D Elements**
Buildings, objects, and animations to be rendered:
- **Buildings**: Accurate dimensions, historical details
- **Objects**: Aircraft, vehicles, monuments with specifications
- **Animations**: Flight paths, movements, explosions, collapses

## **Interactive Features**
User controls and exploration options:
- Timeline scrubber controls
- Camera movement instructions
- Layer toggles and overlays
- Split-screen configurations

## **Educational Value**
What users will learn from this immersive experience.

For historical events like 9/11:
- Include World Trade Center (417m height, 110 floors each)
- Pentagon coordinates: 38.8719, -77.0563
- Flight paths with accurate aircraft models
- Timeline from 8:46 AM to collapse times
- Split-screen NYC/Pentagon views
- Interactive timeline scrubbing

Make your response detailed, technical, and focused on creating an immersive educational experience that manipulates the 3D globe with precision.`;
    }

    return `As UltraMaps AI, a geographic intelligence assistant, respond to this query: "${query}"${locationContext}

Please provide:
1. A helpful, concise response focused on geographic context
2. Specific information relevant to the location if provided
3. Actionable insights or recommendations
4. Brief mention of what visualizations might be helpful

Keep the response under 200 words and focus on being immediately useful to someone exploring geographic information.`;
  }

  async processGeographicQuery(query: string, location?: GeographicContext, advanced = false): Promise<LLMResponse> {
    console.log('🔍 Processing geographic query:', { query, location, advanced });
    
    const agentType = this.detectAgentType(query);
    const prompt = this.createGeographicPrompt(query, location, advanced);
    
    console.log('🤖 Generated prompt for agent type:', agentType);
    console.log('📝 Prompt preview:', prompt.substring(0, 150) + '...');
    
    let content = '';
    let sources = ['Mock Data']; // Default fallback
    
    try {
      // Try Ollama first in development
      if (this.isDev) {
        console.log('🧪 Development mode - checking Ollama...');
        const ollamaAvailable = await this.checkOllamaHealth();
        console.log('🦙 Ollama available:', ollamaAvailable);
        
        if (ollamaAvailable) {
          console.log('🦙 Using Ollama for LLM processing');
          content = await this.queryOllama(prompt);
          sources = ['Ollama Local LLM'];
          console.log('✅ Ollama response received');
        } else {
          console.log('🌐 Ollama unavailable, trying OpenRouter fallback');
          console.log('🔑 OpenRouter API key available:', !!process.env.OPENROUTER_API_KEY);
          content = await this.queryOpenRouter(prompt);
          sources = ['OpenRouter (Fallback)'];
          console.log('✅ OpenRouter response received');
        }
      } else {
        // Production: Use OpenRouter directly
        console.log('🌐 Production mode - using OpenRouter directly');
        console.log('🔑 OpenRouter API key available:', !!process.env.OPENROUTER_API_KEY);
        content = await this.queryOpenRouter(prompt);
        sources = ['OpenRouter'];
        console.log('✅ OpenRouter response received');
      }
    } catch (error) {
      console.error('❌ LLM processing failed with error:', error);
      console.error('📊 Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3)
      });
      
      // Re-throw the error instead of falling back to mock
      throw new Error(`LLM processing failed: ${error.message}`);
    }

    return {
      content,
      agentType,
      visualizations: this.generateMockVisualizations(agentType),
      confidence: 0.85,
      sources,
      followUpSuggestions: this.generateFollowUpSuggestions(agentType, query)
    };
  }

  private generateEnhancedMockResponse(query: string, agentType: string, location?: GeographicContext): string {
    const locationText = location ? location.name || `${location.lat?.toFixed(4)}, ${location.lon?.toFixed(4)}` : 'this area';
    
    switch (agentType) {
      case 'trip-planning':
        return `I can help you plan your trip! Based on your query "${query}", I'll analyze ${locationText} for optimal routes, accommodations, activities, and budget considerations. I can provide day-by-day itineraries, transportation options, and local recommendations tailored to your preferences and budget.`;
        
      case 'historical':
        return `Let me research the historical context of ${locationText}. I'll explore significant events, cultural developments, and historical changes in this area. This includes analyzing historical records, timeline events, and how this location has evolved over time to give you comprehensive historical insights.`;
        
      case 'real-estate':
        return `I'll analyze the real estate market for ${locationText}. This includes property values, ownership patterns, zoning information, market trends, and investment opportunities. I can provide detailed market analysis and help you understand the property landscape in this area.`;
        
      case 'news-events':
        return `I'm monitoring current events and news for ${locationText}. I'll track live events, social media sentiment, news coverage, and real-time developments. This includes analyzing current situations, event impacts, and ongoing activities in the area.`;
        
      case 'business':
        return `I'll conduct a business intelligence analysis for ${locationText}. This includes market opportunities, competitor analysis, demographic insights, foot traffic patterns, and commercial viability. I can help identify optimal locations for business ventures.`;
        
      case 'environmental':
        return `I'll analyze environmental data for ${locationText}. This includes climate patterns, environmental changes over time, pollution levels, ecological health, and sustainability metrics. I can provide insights into environmental trends and impacts.`;
        
      default:
        return `I understand you're asking about "${query}" in relation to ${locationText}. I'm analyzing this location using multiple geographic intelligence sources to provide you with comprehensive insights and actionable information.`;
    }
  }

  private generateMockVisualizations(agentType: string): any[] {
    const baseViz = {
      type: 'timeline',
      data: { events: [] },
      metadata: {
        title: 'Geographic Analysis',
        description: 'AI-generated geographic insights',
        source: 'UltraMaps AI'
      }
    };

    switch (agentType) {
      case 'trip-planning':
        return [{ ...baseViz, type: 'route', metadata: { ...baseViz.metadata, title: 'Trip Itinerary' } }];
      case 'historical':
        return [{ ...baseViz, type: 'timeline', metadata: { ...baseViz.metadata, title: 'Historical Timeline' } }];
      case 'real-estate':
        return [{ ...baseViz, type: 'heatmap', metadata: { ...baseViz.metadata, title: 'Property Value Map' } }];
      case 'news-events':
        return [{ ...baseViz, type: 'heatmap', metadata: { ...baseViz.metadata, title: 'Live Event Map' } }];
      case 'business':
        return [{ ...baseViz, type: 'heatmap', metadata: { ...baseViz.metadata, title: 'Business Opportunities' } }];
      case 'environmental':
        return [{ ...baseViz, type: 'overlay', metadata: { ...baseViz.metadata, title: 'Environmental Data' } }];
      default:
        return [baseViz];
    }
  }

  private generateFollowUpSuggestions(agentType: string, query: string): string[] {
    const suggestions: Record<string, string[]> = {
      'trip-planning': [
        'Would you like specific restaurant recommendations?',
        'Should I find accommodation options?',
        'Do you want transportation alternatives?'
      ],
      'historical': [
        'Would you like more details about specific time periods?',
        'Should I show related historical locations?',
        'Do you want to explore cultural connections?'
      ],
      'real-estate': [
        'Would you like comparable property analysis?',
        'Should I show market trend predictions?',
        'Do you want zoning and development information?'
      ],
      'news-events': [
        'Would you like alerts for new developments?',
        'Should I analyze social media sentiment?',
        'Do you want historical event comparisons?'
      ],
      'business': [
        'Would you like detailed competitor analysis?',
        'Should I show foot traffic patterns?',
        'Do you want demographic breakdowns?'
      ],
      'environmental': [
        'Would you like long-term trend analysis?',
        'Should I show climate impact predictions?',
        'Do you want pollution source mapping?'
      ]
    };

    return suggestions[agentType] || [
      'Would you like more specific information?',
      'Should I analyze nearby areas?',
      'Do you want additional data sources?'
    ];
  }
}

// Singleton instance - Updated for Ollama
export const llmService = new LLMService();