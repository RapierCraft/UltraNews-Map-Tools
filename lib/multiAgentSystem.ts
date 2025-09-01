export interface GeographicQuery {
  id: string;
  query: string;
  location?: {
    lat: number;
    lon: number;
    name?: string;
    bounds?: [number, number, number, number];
  };
  parameters?: Record<string, any>;
  timestamp: Date;
}

export interface AgentResponse {
  agentType: string;
  content: string;
  visualizations: Visualization[];
  data?: any;
  confidence: number;
  sources: string[];
  followUpSuggestions?: string[];
}

export interface Visualization {
  type: 'timeline' | 'heatmap' | 'network' | 'chart' | 'infographic' | 'route' | 'overlay';
  data: any;
  metadata: {
    title: string;
    description: string;
    source: string;
    generatedAt: Date;
  };
  renderOptions?: {
    style?: string;
    interactive?: boolean;
    layers?: string[];
  };
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  dataSources: string[];
  specializations: string[];
}

export abstract class BaseAgent {
  protected id: string;
  protected name: string;
  protected capabilities: string[];

  constructor(id: string, name: string, capabilities: string[]) {
    this.id = id;
    this.name = name;
    this.capabilities = capabilities;
  }

  abstract canHandle(query: GeographicQuery): boolean;
  abstract process(query: GeographicQuery): Promise<AgentResponse>;
  
  protected async fetchData(url: string, options?: RequestInit): Promise<any> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'Geographic-Intelligence-System/1.0',
          ...options?.headers
        }
      });
      return await response.json();
    } catch (error) {
      console.error(`Data fetch error for ${this.name}:`, error);
      throw new Error(`Failed to fetch data from ${url}`);
    }
  }

  protected generateVisualization(type: Visualization['type'], data: any, metadata: Partial<Visualization['metadata']>): Visualization {
    return {
      type,
      data,
      metadata: {
        title: metadata.title || 'Visualization',
        description: metadata.description || 'Generated visualization',
        source: metadata.source || this.name,
        generatedAt: new Date()
      }
    };
  }
}

export class TripPlanningAgent extends BaseAgent {
  constructor() {
    super(
      'trip-planning',
      'Trip Planning Agent',
      ['route-optimization', 'booking-integration', 'budget-management', 'weather-integration']
    );
  }

  canHandle(query: GeographicQuery): boolean {
    const keywords = ['trip', 'travel', 'visit', 'budget', 'plan', 'journey', 'vacation', 'tour'];
    return keywords.some(keyword => query.query.toLowerCase().includes(keyword));
  }

  async process(query: GeographicQuery): Promise<AgentResponse> {
    const budget = this.extractBudget(query.query);
    const duration = this.extractDuration(query.query);
    const destination = this.extractDestination(query.query);

    // Simulate trip planning logic
    const itinerary = await this.generateItinerary(destination, budget, duration, query.location);
    
    const visualization = this.generateVisualization('timeline', itinerary, {
      title: `${duration}-day Trip to ${destination}`,
      description: `Complete itinerary with budget breakdown and activities`,
      source: 'Trip Planning Agent'
    });

    return {
      agentType: this.id,
      content: `I've created a comprehensive ${duration}-day trip plan to ${destination} with a $${budget} budget. The itinerary includes accommodation, transportation, activities, and meal recommendations optimized for your preferences.`,
      visualizations: [visualization],
      confidence: 0.85,
      sources: ['Booking APIs', 'Weather Services', 'Activity Databases'],
      followUpSuggestions: [
        'Would you like to see alternative route options?',
        'Should I include specific restaurant recommendations?',
        'Do you want me to check real-time pricing for accommodations?'
      ]
    };
  }

  private extractBudget(query: string): number {
    const budgetMatch = query.match(/\$(\d+(?:,\d+)?)/);
    return budgetMatch ? parseInt(budgetMatch[1].replace(',', '')) : 2000;
  }

  private extractDuration(query: string): number {
    const durationMatch = query.match(/(\d+)[-\s]?day/);
    return durationMatch ? parseInt(durationMatch[1]) : 7;
  }

  private extractDestination(query: string): string {
    // Simple destination extraction - in real implementation would use NLP
    const destinations = ['japan', 'tokyo', 'paris', 'london', 'new york', 'italy', 'spain'];
    const found = destinations.find(dest => query.toLowerCase().includes(dest));
    return found ? found.charAt(0).toUpperCase() + found.slice(1) : 'Selected Location';
  }

  private async generateItinerary(destination: string, budget: number, days: number, location?: any) {
    // Simulate itinerary generation
    return {
      destination,
      totalBudget: budget,
      dailyBudget: Math.floor(budget / days),
      days: Array.from({ length: days }, (_, i) => ({
        day: i + 1,
        activities: ['Morning activity', 'Afternoon activity', 'Evening activity'],
        accommodation: `Hotel option ${i + 1}`,
        meals: ['Breakfast', 'Lunch', 'Dinner'],
        estimatedCost: Math.floor(budget / days)
      }))
    };
  }
}

export class HistoricalResearchAgent extends BaseAgent {
  constructor() {
    super(
      'historical',
      'Historical Research Agent',
      ['timeline-generation', 'event-analysis', 'cultural-context', 'narrative-creation']
    );
  }

  canHandle(query: GeographicQuery): boolean {
    const keywords = ['history', 'historical', 'happened', 'founded', 'war', 'ancient', 'past', 'when', 'timeline'];
    return keywords.some(keyword => query.query.toLowerCase().includes(keyword));
  }

  async process(query: GeographicQuery): Promise<AgentResponse> {
    const timeperiod = this.extractTimePeriod(query.query);
    const eventType = this.extractEventType(query.query);
    
    // Simulate historical research
    const timeline = await this.generateHistoricalTimeline(query.location, timeperiod, eventType);
    
    const visualization = this.generateVisualization('timeline', timeline, {
      title: `Historical Timeline - ${timeperiod}`,
      description: `Key events and changes over time`,
      source: 'Historical Research Agent'
    });

    return {
      agentType: this.id,
      content: `I've researched the historical context for your query. ${query.location ? `At this location` : 'For this area'}, I found significant ${eventType} events during ${timeperiod}. The timeline shows key developments, influential figures, and how this location evolved over time.`,
      visualizations: [visualization],
      confidence: 0.78,
      sources: ['Wikipedia', 'Historical Archives', 'Museum Databases'],
      followUpSuggestions: [
        'Would you like more details about specific events?',
        'Should I show related historical locations nearby?',
        'Do you want to see how this connects to broader historical movements?'
      ]
    };
  }

  private extractTimePeriod(query: string): string {
    if (query.toLowerCase().includes('wwii') || query.toLowerCase().includes('world war')) return 'WWII Era';
    if (query.toLowerCase().includes('medieval')) return 'Medieval Period';
    if (query.toLowerCase().includes('ancient')) return 'Ancient Times';
    return 'Modern Era';
  }

  private extractEventType(query: string): string {
    if (query.toLowerCase().includes('war') || query.toLowerCase().includes('battle')) return 'military';
    if (query.toLowerCase().includes('founded') || query.toLowerCase().includes('built')) return 'founding';
    if (query.toLowerCase().includes('culture') || query.toLowerCase().includes('art')) return 'cultural';
    return 'general historical';
  }

  private async generateHistoricalTimeline(location?: any, timeperiod?: string, eventType?: string) {
    return {
      timeperiod,
      eventType,
      events: [
        { year: 1945, event: 'Major historical event', significance: 'High' },
        { year: 1960, event: 'Cultural development', significance: 'Medium' },
        { year: 1980, event: 'Economic change', significance: 'High' }
      ]
    };
  }
}

export class RealEstateAgent extends BaseAgent {
  constructor() {
    super(
      'real-estate',
      'Real Estate Intelligence Agent',
      ['property-analysis', 'ownership-research', 'market-valuation', 'zoning-analysis']
    );
  }

  canHandle(query: GeographicQuery): boolean {
    const keywords = ['property', 'owns', 'worth', 'value', 'real estate', 'lot', 'building', 'house', 'zoning'];
    return keywords.some(keyword => query.query.toLowerCase().includes(keyword));
  }

  async process(query: GeographicQuery): Promise<AgentResponse> {
    if (!query.location) {
      throw new Error('Real estate analysis requires a specific location');
    }

    // Simulate property data retrieval
    const propertyData = await this.analyzeProperty(query.location);
    
    const visualization = this.generateVisualization('network', propertyData, {
      title: 'Property Ownership Analysis',
      description: 'Ownership networks, valuations, and market data',
      source: 'Real Estate Intelligence Agent'
    });

    return {
      agentType: this.id,
      content: `I've analyzed the property at this location. The current owner is ${propertyData.owner}, estimated value is $${propertyData.value.toLocaleString()}, and it's zoned for ${propertyData.zoning}. Market trends show ${propertyData.trend} over the past year.`,
      visualizations: [visualization],
      confidence: 0.82,
      sources: ['Property Records', 'Tax Assessments', 'MLS Data'],
      followUpSuggestions: [
        'Would you like to see comparable properties?',
        'Should I analyze the ownership history?',
        'Do you want zoning variance possibilities?'
      ]
    };
  }

  private async analyzeProperty(location: { lat: number; lon: number }) {
    // Simulate property analysis
    return {
      owner: 'ABC Development Corp',
      value: 850000,
      zoning: 'Residential',
      trend: 'increasing (+8.5%)',
      lastSale: '2019-03-15',
      taxAssessment: 720000
    };
  }
}

export class MultiAgentCoordinator {
  private agents: BaseAgent[];
  private queryHistory: GeographicQuery[] = [];

  constructor() {
    this.agents = [
      new TripPlanningAgent(),
      new HistoricalResearchAgent(),
      new RealEstateAgent()
    ];
  }

  async processQuery(query: string, location?: { lat: number; lon: number; name?: string }): Promise<AgentResponse> {
    const geographicQuery: GeographicQuery = {
      id: `query-${Date.now()}`,
      query,
      location,
      timestamp: new Date()
    };

    this.queryHistory.push(geographicQuery);

    // Find best agent for this query
    const capableAgents = this.agents.filter(agent => agent.canHandle(geographicQuery));
    
    if (capableAgents.length === 0) {
      return this.generateFallbackResponse(geographicQuery);
    }

    // Use the first capable agent (in real implementation, would rank by confidence)
    const selectedAgent = capableAgents[0];
    
    try {
      return await selectedAgent.process(geographicQuery);
    } catch (error) {
      console.error(`Agent ${selectedAgent.constructor.name} failed:`, error);
      return this.generateErrorResponse(geographicQuery, error as Error);
    }
  }

  private generateFallbackResponse(query: GeographicQuery): AgentResponse {
    return {
      agentType: 'general',
      content: `I understand you're asking about "${query.query}". While I don't have a specialized agent for this exact request, I can help you with general geographic information. Try rephrasing your question or specify if you're interested in historical data, real estate, trip planning, or environmental analysis.`,
      visualizations: [],
      confidence: 0.3,
      sources: ['General Knowledge'],
      followUpSuggestions: [
        'Could you be more specific about what type of information you need?',
        'Are you looking for historical, business, or travel information?',
        'Would you like me to suggest related queries I can help with?'
      ]
    };
  }

  private generateErrorResponse(query: GeographicQuery, error: Error): AgentResponse {
    return {
      agentType: 'error',
      content: `I encountered an issue processing your request: "${query.query}". This might be due to data availability or connectivity issues. Please try rephrasing your question or try again in a moment.`,
      visualizations: [],
      confidence: 0.1,
      sources: [],
      followUpSuggestions: [
        'Try rephrasing your question',
        'Check if you specified a valid location',
        'Ask about a different topic or location'
      ]
    };
  }

  getAvailableAgents(): Agent[] {
    return this.agents.map(agent => ({
      id: (agent as any).id,
      name: (agent as any).name,
      description: `Specialized agent for ${(agent as any).id.replace('-', ' ')} tasks`,
      capabilities: (agent as any).capabilities,
      dataSources: ['APIs', 'Databases', 'Web Sources'],
      specializations: (agent as any).capabilities
    }));
  }

  getQueryHistory(): GeographicQuery[] {
    return this.queryHistory.slice(-10); // Last 10 queries
  }
}

// Singleton instance
export const multiAgentCoordinator = new MultiAgentCoordinator();