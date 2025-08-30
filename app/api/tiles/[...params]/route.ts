import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { params: string[] } }
) {
  try {
    const [provider, z, x, y] = params.params;
    
    if (!provider || !z || !x || !y) {
      return NextResponse.json({ error: 'Invalid tile parameters' }, { status: 400 });
    }

    let tileUrl: string;

    switch (provider) {
      case 'osm':
        const subdomains = ['a', 'b', 'c'];
        const subdomain = subdomains[Math.abs(parseInt(x) + parseInt(y)) % subdomains.length];
        tileUrl = `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
        break;
      case 'cartodb-light':
        const cartoSubdomains = ['a', 'b', 'c', 'd'];
        const cartoSub = cartoSubdomains[Math.abs(parseInt(x) + parseInt(y)) % cartoSubdomains.length];
        tileUrl = `https://${cartoSub}.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`;
        break;
      case 'cartodb-dark':
        const darkSubdomains = ['a', 'b', 'c', 'd'];
        const darkSub = darkSubdomains[Math.abs(parseInt(x) + parseInt(y)) % darkSubdomains.length];
        tileUrl = `https://${darkSub}.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`;
        break;
      default:
        return NextResponse.json({ error: 'Unsupported tile provider' }, { status: 400 });
    }

    const response = await fetch(tileUrl, {
      headers: {
        'User-Agent': 'UltraNews-Map-Tools/1.0'
      },
      // Add timeout and keep-alive for better performance
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch tile' }, { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400', // Cache for 1 week
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Tile proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}