export interface C2PAManifest {
  manifestPresent: boolean;
  title?: string;
  claimGenerator?: string;
  signature?: {
    issuer?: string;
    time?: string;
  };
  assertions?: Array<{
    label: string;
    data: any;
  }>;
  ingredients?: Array<{
    title?: string;
    relationship?: string;
  }>;
  thumbnail?: {
    contentType: string;
    data: string; // base64
  };
}

/**
 * Detect image MIME type from buffer using magic bytes
 */
function detectImageMimeType(buffer: Buffer): string {
  // Check magic bytes
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return 'image/webp';
  }
  // Default to JPEG
  return 'image/jpeg';
}

/**
 * Parse C2PA manifest from image buffer using c2pa-node
 */
export async function parseC2PAManifest(buffer: Buffer, mimeType?: string): Promise<C2PAManifest> {
  try {
    // Import c2pa-node (works with Webpack, not Turbopack)
    const { createC2pa } = require('c2pa-node');
    const c2pa = createC2pa();
    
    // Detect actual image type from buffer if not provided or generic
    const actualMimeType = (!mimeType || mimeType === 'application/octet-stream') 
      ? detectImageMimeType(buffer)
      : mimeType;
    
    console.log('Reading C2PA manifest with c2pa-node...');
    console.log('Buffer length:', buffer.length, 'Detected MIME type:', actualMimeType);
    
    // c2pa-node requires both buffer and mimeType
    const result = await c2pa.read({ 
      buffer: new Uint8Array(buffer),
      mimeType: actualMimeType
    });
    
    if (!result || !result.active_manifest) {
      console.log('No C2PA manifest found');
      return { manifestPresent: false };
    }

    const manifest = result.active_manifest;
    
    console.log('C2PA Manifest found:', {
      title: manifest.title,
      claim_generator: manifest.claim_generator,
      assertions: Object.keys(manifest.assertions || {})
    });

    return {
      manifestPresent: true,
      title: manifest.title,
      claimGenerator: manifest.claim_generator,
      signature: manifest.signature_info
        ? {
            issuer: manifest.signature_info.issuer,
            time: manifest.signature_info.time,
          }
        : undefined,
      assertions: manifest.assertions
        ? Object.entries(manifest.assertions).map(([label, data]) => ({
            label,
            data,
          }))
        : [],
      ingredients: manifest.ingredients?.map((ing: any) => ({
        title: ing.title,
        relationship: ing.relationship,
      })),
      thumbnail: manifest.thumbnail
        ? {
            contentType: manifest.thumbnail.content_type || 'image/jpeg',
            data: Buffer.from(manifest.thumbnail).toString('base64'),
          }
        : undefined,
    };
  } catch (error) {
    console.error('Error parsing C2PA manifest:', error);
    return { manifestPresent: false };
  }
}

/**
 * Mock C2PA data for demo purposes
 */
export function createMockC2PAManifest(filename: string): C2PAManifest {
  return {
    manifestPresent: true,
    title: filename,
    claimGenerator: 'Demo Upload Tool',
    signature: {
      issuer: 'Imgate Platform',
      time: new Date().toISOString(),
    },
    assertions: [
      {
        label: 'c2pa.actions',
        data: { actions: [{ action: 'c2pa.created' }] }
      },
      {
        label: 'stds.schema-org.CreativeWork',
        data: { '@context': 'https://schema.org', '@type': 'CreativeWork' }
      }
    ],
  };
}
