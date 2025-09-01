'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Loader2,
  Bot,
  User,
  Mic,
  MicOff,
  MessageCircle,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { visualizationEngine } from '@/lib/visualizationEngine';
import Image from 'next/image';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentType?: string;
  visualizations?: any[];
}

interface UltraMapsChatBarProps {
  onVisualizationRequest: (query: string, agentType: string) => void;
  onLocationFocus: (lat: number, lon: number, zoom?: number) => void;
  currentLocation?: { lat: number; lon: number; name?: string };
  cesiumViewer?: any;
  className?: string;
}

const SAMPLE_QUERIES = [
  "Plan a trip to Japan",
  "What happened here in WWII?",
  "Show property values",
  "Current events nearby"
];

export default function UltraMapsChatBar({
  onVisualizationRequest,
  onLocationFocus,
  currentLocation,
  cesiumViewer,
  className = ''
}: UltraMapsChatBarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const detectQueryType = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('trip') || lowerQuery.includes('travel')) return 'trip-planning';
    if (lowerQuery.includes('history') || lowerQuery.includes('happened')) return 'historical';
    if (lowerQuery.includes('property') || lowerQuery.includes('value')) return 'real-estate';
    if (lowerQuery.includes('news') || lowerQuery.includes('events')) return 'news-events';
    if (lowerQuery.includes('business') || lowerQuery.includes('market')) return 'business';
    if (lowerQuery.includes('climate') || lowerQuery.includes('environment')) return 'environmental';
    
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
    setShowSuggestions(false);

    // Auto-expand when processing
    if (!isExpanded) {
      setIsExpanded(true);
    }

    try {
      // Use real LLM API
      const response = await fetch('/api/ai/geographic-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: text,
          location: currentLocation
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const agentResponse = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: agentResponse.content,
        timestamp: new Date(),
        agentType: agentResponse.agentType,
        visualizations: agentResponse.visualizations || []
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Generate visualizations on Cesium globe
      if (cesiumViewer && agentResponse.visualizations && agentResponse.visualizations.length > 0) {
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
      console.error('LLM API request failed:', error);
      
      // Simple fallback response
      const fallbackMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: `I understand you're asking about "${text}". Let me analyze this location and provide you with relevant geographic intelligence.`,
        timestamp: new Date(),
        agentType: 'general'
      };

      setMessages(prev => [...prev, fallbackMessage]);
      setIsProcessing(false);
    }
  }, [inputValue, isProcessing, currentLocation, cesiumViewer, onVisualizationRequest, isExpanded]);

  const handleSampleQuery = useCallback((query: string) => {
    setInputValue(query);
    handleSendMessage(query);
  }, [handleSendMessage]);

  const toggleVoiceInput = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
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

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
      setIsListening(false);
      // Auto-resize textarea after voice input
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 144)}px`; // 6 lines max
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  }, [isListening]);

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAgentBadgeColor = (agentType?: string) => {
    switch (agentType) {
      case 'trip-planning': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'historical': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'real-estate': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'news-events': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'business': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'environmental': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  // Auto-resize textarea function
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 144)}px`; // 6 lines max (24px per line)
  }, []);

  // Handle key press for textarea
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  return (
    <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[1000] transition-all duration-300 ease-in-out ${className}`}>
      <div 
        className={`
          backdrop-blur-lg bg-white/10 dark:bg-black/20 
          border border-white/20 dark:border-gray-800/50
          rounded-2xl shadow-2xl
          transition-all duration-300 ease-in-out
          ${isExpanded ? 'w-[700px] h-[450px]' : 'w-[600px]'}
        `}
        style={{
          minHeight: isExpanded ? '450px' : 'auto'
        }}
      >
        {/* Chat Messages - Only visible when expanded */}
        {isExpanded && (
          <div className="h-[320px] p-6 pb-2">
            <ScrollArea className="h-full">
              <div className="space-y-4">
                {messages.length === 0 && showSuggestions && (
                  <div className="text-center space-y-6 py-12">
                    <div className="flex items-center justify-center mb-6">
                      <Image 
                        src="/ultramaps-logo.png" 
                        alt="UltraMaps" 
                        width={48} 
                        height={48}
                        className="w-12 h-12 opacity-90"
                      />
                    </div>
                    <p className="text-white/80 text-base mb-6 font-light">
                      Ask me anything about any location
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center max-w-md mx-auto">
                      {SAMPLE_QUERIES.map((query, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSampleQuery(query)}
                          className="text-sm bg-white/10 border-white/20 text-white/80 hover:bg-white/20 hover:text-white px-4 py-2"
                        >
                          {query}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.type !== 'user' && (
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-white/80" />
                      </div>
                    )}
                    
                    <div className={`max-w-[400px] ${message.type === 'user' ? 'order-first' : ''}`}>
                      <div className={`p-3 rounded-2xl text-sm ${
                        message.type === 'user' 
                          ? 'bg-blue-500/80 text-white ml-auto' 
                          : 'bg-white/20 text-white/90'
                      }`}>
                        {message.content}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1 px-1">
                        <span className="text-xs text-white/50">
                          {formatTimestamp(message.timestamp)}
                        </span>
                        {message.agentType && (
                          <Badge className={`text-xs px-2 py-0.5 ${getAgentBadgeColor(message.agentType)}`}>
                            {message.agentType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {message.type === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-blue-500/80 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Input Bar */}
        <div className={`p-6 ${isExpanded ? 'pt-3' : 'py-4'}`}>
          {/* Current Location Display */}
          {currentLocation && isExpanded && (
            <div className="mb-4 text-sm bg-white/10 text-white/70 p-3 rounded-xl border border-white/10">
              📍 {currentLocation.name || `${currentLocation.lat.toFixed(4)}, ${currentLocation.lon.toFixed(4)}`}
            </div>
          )}

          <div className="flex items-end gap-4">
            {/* UltraMaps Logo - Always visible */}
            <div className="flex items-center justify-center flex-shrink-0 mb-2">
              <Image 
                src="/ultramaps-logo.png" 
                alt="UltraMaps" 
                width={28} 
                height={28}
                className="w-7 h-7 opacity-90"
              />
            </div>

            {/* Input Field with integrated mic */}
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleTextareaChange}
                onKeyPress={handleKeyPress}
                placeholder={isExpanded ? "Ask anything about any location..." : "Ask me about this location..."}
                disabled={isProcessing}
                rows={1}
                className="
                  bg-white/10 border-white/20 text-white placeholder:text-white/50
                  focus:bg-white/20 focus:border-white/40 focus:ring-0
                  rounded-xl min-h-[48px] max-h-36 resize-none
                  pr-12 py-3 px-4
                "
                style={{
                  lineHeight: '24px'
                }}
              />
              
              {/* Integrated Voice Input Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleVoiceInput}
                disabled={isProcessing}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 p-0 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white"
              >
                {isListening ? (
                  <MicOff className="h-4 w-4 text-red-400" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Send Button */}
            <Button
              size="sm"
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isProcessing}
              className="w-12 h-12 p-0 rounded-xl bg-blue-500/80 hover:bg-blue-500 text-white disabled:opacity-50 flex-shrink-0 mb-0"
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>

            {/* Expand/Collapse Button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-12 h-12 p-0 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex-shrink-0 mb-0"
            >
              {isExpanded ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="mt-4 flex items-center gap-3 text-white/70 text-sm ml-11">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing your request...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}