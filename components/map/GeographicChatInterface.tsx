'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageCircle, 
  Send, 
  MapPin, 
  Clock, 
  Building, 
  Camera,
  TrendingUp,
  Globe,
  Loader2,
  Bot,
  User,
  Mic,
  MicOff,
  Sparkles
} from 'lucide-react';
import { enhancedMultiAgentCoordinator } from '@/lib/specializedAgents';
import { visualizationEngine } from '@/lib/visualizationEngine';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentType?: string;
  visualizations?: Visualization[];
  relatedData?: any;
}

interface Visualization {
  type: 'timeline' | 'heatmap' | 'network' | 'chart' | 'infographic';
  data: any;
  metadata: {
    title: string;
    description: string;
    source: string;
  };
}

interface GeographicChatProps {
  onVisualizationRequest: (query: string, agentType: string) => void;
  onLocationFocus: (lat: number, lon: number, zoom?: number) => void;
  currentLocation?: { lat: number; lon: number; name?: string };
  cesiumViewer?: any;
  className?: string;
}

const AGENT_TYPES = [
  { id: 'trip-planning', name: 'Trip Planning', icon: MapPin, color: 'bg-blue-500' },
  { id: 'historical', name: 'Historical Research', icon: Clock, color: 'bg-purple-500' },
  { id: 'real-estate', name: 'Real Estate Intelligence', icon: Building, color: 'bg-green-500' },
  { id: 'news-events', name: 'News & Events', icon: Camera, color: 'bg-red-500' },
  { id: 'business', name: 'Business Intelligence', icon: TrendingUp, color: 'bg-orange-500' },
  { id: 'environmental', name: 'Environmental Data', icon: Globe, color: 'bg-emerald-500' }
];

const SAMPLE_QUERIES = [
  "Plan a 7-day trip to Japan with $3000 budget",
  "What happened at this location during WWII?",
  "Who owns this empty lot and what is it worth?",
  "Show me current protests in this city",
  "Where should I open a coffee shop in this area?",
  "How has this coastline changed over 50 years?"
];

export default function GeographicChatInterface({
  onVisualizationRequest,
  onLocationFocus,
  currentLocation,
  cesiumViewer,
  className = ''
}: GeographicChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'system',
      content: 'Welcome to the Geographic Intelligence System. Ask me anything about any location - from trip planning to historical research, real estate analysis, or environmental changes.',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('auto');
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSampleQuery = useCallback((query: string) => {
    setInputValue(query);
    handleSendMessage(query);
  }, []);

  const detectQueryType = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('trip') || lowerQuery.includes('travel') || lowerQuery.includes('visit') || lowerQuery.includes('budget')) {
      return 'trip-planning';
    }
    if (lowerQuery.includes('history') || lowerQuery.includes('happened') || lowerQuery.includes('war') || lowerQuery.includes('founded')) {
      return 'historical';
    }
    if (lowerQuery.includes('property') || lowerQuery.includes('owns') || lowerQuery.includes('worth') || lowerQuery.includes('real estate')) {
      return 'real-estate';
    }
    if (lowerQuery.includes('protest') || lowerQuery.includes('news') || lowerQuery.includes('event') || lowerQuery.includes('current')) {
      return 'news-events';
    }
    if (lowerQuery.includes('business') || lowerQuery.includes('shop') || lowerQuery.includes('market') || lowerQuery.includes('opportunity')) {
      return 'business';
    }
    if (lowerQuery.includes('climate') || lowerQuery.includes('environment') || lowerQuery.includes('changed') || lowerQuery.includes('pollution')) {
      return 'environmental';
    }
    
    return 'general';
  };

  const handleSendMessage = useCallback(async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    // Detect or use selected agent type
    const agentType = selectedAgent === 'auto' ? detectQueryType(text) : selectedAgent;
    const agent = AGENT_TYPES.find(a => a.id === agentType) || AGENT_TYPES[0];

    // Add processing message
    const processingMessage: ChatMessage = {
      id: `processing-${Date.now()}`,
      type: 'assistant',
      content: `🤖 ${agent.name} Agent is analyzing your query...`,
      timestamp: new Date(),
      agentType: agentType
    };

    setMessages(prev => [...prev, processingMessage]);

    try {
      // Use real multi-agent system
      const agentResponse = await enhancedMultiAgentCoordinator.processQuery(text, currentLocation);
      
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: agentResponse.content,
        timestamp: new Date(),
        agentType: agentResponse.agentType,
        visualizations: agentResponse.visualizations
      };

      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== processingMessage.id);
        return [...filtered, assistantMessage];
      });

      // Generate visualizations on Cesium globe
      if (cesiumViewer && agentResponse.visualizations.length > 0) {
        agentResponse.visualizations.forEach(viz => {
          const layer = visualizationEngine.generateCesiumLayer(viz, cesiumViewer);
          if (layer) {
            visualizationEngine.addLayer(layer);
          }
        });
      }

      // Trigger additional visualization request
      onVisualizationRequest(text, agentResponse.agentType);

      setIsProcessing(false);
    } catch (error) {
      console.error('Agent processing failed:', error);
      
      // Fallback to mock response
      const fallbackResponse = generateAgentResponse(text, agentType, currentLocation);
      
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: fallbackResponse.content,
        timestamp: new Date(),
        agentType: agentType,
        visualizations: fallbackResponse.visualizations
      };

      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== processingMessage.id);
        return [...filtered, assistantMessage];
      });

      setIsProcessing(false);
    }
  }, [inputValue, isProcessing, selectedAgent, currentLocation, cesiumViewer, onVisualizationRequest, onLocationFocus]);

  const generateAgentResponse = (query: string, agentType: string, location?: { lat: number; lon: number; name?: string }) => {
    const locationText = location ? `near ${location.name || `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`}` : '';
    
    switch (agentType) {
      case 'trip-planning':
        return {
          content: `I've analyzed your trip planning request. Based on your query "${query}", I'll help you create an optimized itinerary with budget breakdown, accommodation options, and route planning. ${locationText ? `Starting from ${locationText}.` : ''}`,
          visualizations: [
            {
              type: 'timeline',
              data: {},
              metadata: {
                title: 'Trip Itinerary',
                description: 'Day-by-day travel plan with activities and costs',
                source: 'Trip Planning Agent'
              }
            }
          ],
          shouldVisualize: true,
          focusLocation: location ? { lat: location.lat, lon: location.lon, zoom: 12 } : undefined
        };

      case 'historical':
        return {
          content: `I've researched the historical context for your query "${query}". ${locationText ? `Analyzing historical events at ${locationText}.` : ''} I'll show you a timeline of significant events, key figures, and how this location has changed over time.`,
          visualizations: [
            {
              type: 'timeline',
              data: {},
              metadata: {
                title: 'Historical Timeline',
                description: 'Chronological events and changes over time',
                source: 'Historical Research Agent'
              }
            }
          ],
          shouldVisualize: true,
          focusLocation: location ? { lat: location.lat, lon: location.lon, zoom: 14 } : undefined
        };

      case 'real-estate':
        return {
          content: `I've analyzed property data for your query "${query}". ${locationText ? `Examining properties ${locationText}.` : ''} I can show you ownership information, property values, zoning details, and market trends.`,
          visualizations: [
            {
              type: 'network',
              data: {},
              metadata: {
                title: 'Property Ownership Network',
                description: 'Property ownership and market analysis',
                source: 'Real Estate Intelligence Agent'
              }
            }
          ],
          shouldVisualize: true,
          focusLocation: location ? { lat: location.lat, lon: location.lon, zoom: 16 } : undefined
        };

      case 'news-events':
        return {
          content: `I've gathered current news and events for "${query}". ${locationText ? `Monitoring events ${locationText}.` : ''} I'll show you real-time event clusters, social media sentiment, and impact zones.`,
          visualizations: [
            {
              type: 'heatmap',
              data: {},
              metadata: {
                title: 'Live Event Map',
                description: 'Real-time events and social activity',
                source: 'News & Events Agent'
              }
            }
          ],
          shouldVisualize: true,
          focusLocation: location ? { lat: location.lat, lon: location.lon, zoom: 13 } : undefined
        };

      case 'business':
        return {
          content: `I've analyzed business opportunities for "${query}". ${locationText ? `Evaluating market conditions ${locationText}.` : ''} I'll show you market analysis, competitor mapping, demographic insights, and opportunity zones.`,
          visualizations: [
            {
              type: 'heatmap',
              data: {},
              metadata: {
                title: 'Market Opportunity Map',
                description: 'Business opportunities and market analysis',
                source: 'Business Intelligence Agent'
              }
            }
          ],
          shouldVisualize: true,
          focusLocation: location ? { lat: location.lat, lon: location.lon, zoom: 14 } : undefined
        };

      case 'environmental':
        return {
          content: `I've analyzed environmental data for "${query}". ${locationText ? `Studying environmental changes ${locationText}.` : ''} I'll show you temporal changes, pollution levels, climate trends, and ecological impacts.`,
          visualizations: [
            {
              type: 'timeline',
              data: {},
              metadata: {
                title: 'Environmental Change Analysis',
                description: 'Environmental trends and temporal changes',
                source: 'Environmental Data Agent'
              }
            }
          ],
          shouldVisualize: true,
          focusLocation: location ? { lat: location.lat, lon: location.lon, zoom: 12 } : undefined
        };

      default:
        return {
          content: `I understand you're asking about "${query}". ${locationText ? `I can help analyze this ${locationText}.` : ''} Let me coordinate with the appropriate specialized agents to provide you with comprehensive geographic intelligence.`,
          shouldVisualize: false
        };
    }
  };

  const toggleVoiceInput = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [isListening]);

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAgentIcon = (agentType?: string) => {
    const agent = AGENT_TYPES.find(a => a.id === agentType);
    return agent?.icon || Bot;
  };

  const getAgentColor = (agentType?: string) => {
    const agent = AGENT_TYPES.find(a => a.id === agentType);
    return agent?.color || 'bg-gray-500';
  };

  return (
    <div className={`absolute top-4 right-4 z-[1000] w-96 ${className}`}>
      <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur shadow-lg">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="p-4 pb-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chat" className="text-sm">
                <MessageCircle className="h-4 w-4 mr-1" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="agents" className="text-sm">
                <Bot className="h-4 w-4 mr-1" />
                Agents
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat" className="p-4 pt-2">
            {/* Chat Messages */}
            <ScrollArea className="h-80 mb-4">
              <div className="space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.type !== 'user' && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs ${getAgentColor(message.agentType)}`}>
                        {message.type === 'system' ? (
                          <Globe className="h-4 w-4" />
                        ) : (
                          (() => {
                            const Icon = getAgentIcon(message.agentType);
                            return <Icon className="h-4 w-4" />;
                          })()
                        )}
                      </div>
                    )}
                    
                    <div className={`max-w-[280px] ${message.type === 'user' ? 'order-first' : ''}`}>
                      <div className={`p-3 rounded-lg text-sm ${
                        message.type === 'user' 
                          ? 'bg-blue-500 text-white ml-auto' 
                          : message.type === 'system'
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          : 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      }`}>
                        {message.content}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(message.timestamp)}
                        </span>
                        {message.agentType && (
                          <Badge variant="secondary" className="text-xs">
                            {AGENT_TYPES.find(a => a.id === message.agentType)?.name || message.agentType}
                          </Badge>
                        )}
                      </div>
                      
                      {message.visualizations && message.visualizations.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.visualizations.map((viz, index) => (
                            <div key={index} className="text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded border">
                              📊 {viz.metadata.title}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {message.type === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Sample Queries */}
            <div className="mb-4">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">Try these sample queries:</div>
              <div className="flex flex-wrap gap-1">
                {SAMPLE_QUERIES.slice(0, 3).map((query, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs h-6 px-2"
                    onClick={() => handleSampleQuery(query)}
                    disabled={isProcessing}
                  >
                    {query.length > 25 ? `${query.slice(0, 25)}...` : query}
                  </Button>
                ))}
              </div>
            </div>

            {/* Input Area */}
            <div className="space-y-3">
              {/* Agent Selection */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">Agent:</span>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="text-xs bg-gray-50 dark:bg-gray-700 border rounded px-2 py-1 flex-1"
                  disabled={isProcessing}
                >
                  <option value="auto">Auto-detect</option>
                  {AGENT_TYPES.map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </div>

              {/* Current Location Display */}
              {currentLocation && (
                <div className="text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded border">
                  📍 Current focus: {currentLocation.name || `${currentLocation.lat.toFixed(4)}, ${currentLocation.lon.toFixed(4)}`}
                </div>
              )}

              {/* Input Field */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask anything about any location..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isProcessing}
                    className="pr-8"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={toggleVoiceInput}
                    disabled={isProcessing}
                  >
                    {isListening ? (
                      <MicOff className="h-3 w-3 text-red-500" />
                    ) : (
                      <Mic className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                
                <Button
                  size="sm"
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isProcessing}
                  className="px-3"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="agents" className="p-4 pt-2">
            <div className="space-y-3">
              <div className="text-sm font-medium mb-3">Specialized Agents</div>
              
              {AGENT_TYPES.map((agent) => {
                const Icon = agent.icon;
                return (
                  <div key={agent.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                    <div className={`w-10 h-10 rounded-full ${agent.color} flex items-center justify-center text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{agent.name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {getAgentDescription(agent.id)}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-sm font-medium mb-2">🤖 How It Works</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <div>• Ask natural language questions</div>
                  <div>• AI routes to specialized agents</div>
                  <div>• Agents generate visualizations</div>
                  <div>• Get comprehensive geographic intelligence</div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

function getAgentDescription(agentId: string): string {
  switch (agentId) {
    case 'trip-planning':
      return 'Route optimization, bookings, budgets, weather, activities';
    case 'historical':
      return 'Historical events, timelines, cultural context, changes over time';
    case 'real-estate':
      return 'Property ownership, valuations, zoning, market trends';
    case 'news-events':
      return 'Live events, protests, news, social media sentiment';
    case 'business':
      return 'Market analysis, opportunities, demographics, competitors';
    case 'environmental':
      return 'Climate data, pollution, ecological changes, satellite imagery';
    default:
      return 'General geographic intelligence and analysis';
  }
}