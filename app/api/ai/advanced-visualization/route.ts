import { NextRequest, NextResponse } from 'next/server';
import { enhancedLLMService } from '@/lib/enhancedLLMService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, location, advanced = false } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    
    // Process with enhanced LLM service for immersive experiences
    const response = await enhancedLLMService.processAdvancedQuery(query, location);
    
    const processingTime = Date.now() - startTime;
    
    console.log(`🎬 Generated immersive experience in ${processingTime}ms:`, {
      query: query.substring(0, 50) + (query.length > 50 ? '...' : ''),
      experienceId: response.experience.id,
      locations: response.experience.locations?.length || 0,
      animations: response.experience.animations?.length || 0,
      timelineEvents: response.timelineEvents?.length || 0
    });

    return NextResponse.json({
      ...response,
      processingTime,
      type: 'immersive_experience'
    });

  } catch (error) {
    console.error('Advanced visualization API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate immersive experience',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'UltraMaps Advanced Visualization AI',
    capabilities: [
      'Immersive 3D experiences',
      'Historical event recreation',
      'Timeline-based animations',
      'Split-screen visualizations',
      'Interactive overlays',
      '3D building and object placement'
    ],
    timestamp: new Date().toISOString()
  });
}