import { NextRequest, NextResponse } from 'next/server';
import { adaptiveExperienceEngine } from '@/lib/adaptiveExperienceEngine';

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Adaptive experience request received');
    
    const body = await request.json();
    console.log('📋 Request body:', body);
    
    const { query, context } = body;

    if (!query || typeof query !== 'string') {
      console.log('❌ Invalid query provided:', query);
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    console.log(`🧠 Starting adaptive experience generation for: "${query}"`);
    const startTime = Date.now();
    
    // Generate completely adaptive experience
    console.log('🎯 Calling adaptiveExperienceEngine.generateExperience...');
    const experienceSpec = await adaptiveExperienceEngine.generateExperience(query, context);
    console.log('✅ Experience spec generated successfully');
    
    const processingTime = Date.now() - startTime;
    
    console.log(`🎬 Generated adaptive experience in ${processingTime}ms:`, {
      query: query.substring(0, 50) + (query.length > 50 ? '...' : ''),
      assetsRequired: experienceSpec.assetRequirements?.length || 0,
      renderInstructions: experienceSpec.renderInstructions?.length || 0,
      experienceSteps: experienceSpec.experienceFlow?.length || 0,
      dataRequests: experienceSpec.dataRequests?.length || 0
    });

    return NextResponse.json({
      type: 'adaptive_experience',
      spec: experienceSpec,
      processingTime,
      capabilities: {
        selfPrompting: true,
        dynamicAssetGeneration: true,
        realTimeDataAcquisition: true,
        adaptiveRendering: true,
        interactiveExperience: true
      },
      executionInstructions: {
        phase1: 'Asset preparation and data acquisition',
        phase2: 'Dynamic 3D rendering pipeline execution', 
        phase3: 'Interactive experience flow activation',
        userControls: 'Timeline scrubbing, camera control, data layer toggles'
      }
    });

  } catch (error) {
    console.error('Adaptive experience generation failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate adaptive experience',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'System will attempt basic visualization'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'UltraMaps Adaptive Experience Engine',
    capabilities: [
      'Self-prompting query analysis',
      'Dynamic asset specification',
      'Real-time data acquisition',
      'Adaptive 3D rendering',
      'Interactive experience orchestration',
      'Fallback and error recovery'
    ],
    supportedQueries: [
      'Any historical event or person',
      'Natural disasters and phenomena', 
      'Current events and conflicts',
      'Geographic comparisons',
      'Conceptual visualizations',
      'Data-driven experiences'
    ],
    timestamp: new Date().toISOString()
  });
}