import { NextRequest, NextResponse } from 'next/server';
import { parseC2PAManifest } from '@/lib/c2pa';

export async function POST(request: NextRequest) {
  try {
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Get content type from request header
    const contentType = request.headers.get('content-type') || 'image/jpeg';

    const c2paInfo = await parseC2PAManifest(buffer, contentType);

    return NextResponse.json(c2paInfo);
  } catch (error) {
    console.error('Error parsing C2PA:', error);
    return NextResponse.json(
      { manifestPresent: false, error: 'Failed to parse C2PA manifest' },
      { status: 500 }
    );
  }
}
