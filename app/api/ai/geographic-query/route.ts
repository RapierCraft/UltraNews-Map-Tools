import { NextRequest, NextResponse } from 'next/server';
import { llmService } from '@/lib/llmService';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 POST request received');
    
    const body = await request.json();
    console.log('📝 Request body:', body);
    
    const { query, location, advanced = false } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    
    // Process the query with the LLM service
    const response = await llmService.processGeographicQuery(query, location, advanced);
    
    const processingTime = Date.now() - startTime;
    
    console.log(`🔍 Processed geographic query in ${processingTime}ms:`, {
      query: query.substring(0, 50) + (query.length > 50 ? '...' : ''),
      agentType: response.agentType,
      sources: response.sources,
      location: location?.name || 'No location'
    });

    return NextResponse.json({
      ...response,
      processingTime
    });

  } catch (error) {
    console.error('Geographic query API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process geographic query',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle GET requests for health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'UltraMaps Geographic AI',
    timestamp: new Date().toISOString()
  });
}