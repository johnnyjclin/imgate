export interface PaywallClaim {
  currency: string;
  amount: string;
  recipient: string;
  network?: string; // e.g. 'base-sepolia'
}

export interface CreatorInfo {
  name?: string;
  twitter?: string;
  bio?: string;
  description?: string;
}

export interface SignerConfig {
  certificate: string | Buffer;
  privateKey: string | Buffer;
  algorithm?: string;
  useTestSigner?: boolean;
}

export interface C2PAAction {
  action: string;
  softwareAgent?: {
    name: string;
    version?: string;
    [key: string]: any;
  } | string;
  when?: string;
  description?: string;
  parameters?: any;
}

// Official C2PA test credentials from contentauth/c2pa-node-v2 repo
// These are properly chained certificates that work with C2PA verification
const TEST_KEY = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgfNJBsaRLSeHizv0m
GL+gcn78QmtfLSm+n+qG9veC2W2hRANCAAQPaL6RkAkYkKU4+IryBSYxJM3h77sF
iMrbvbI8fG7w2Bbl9otNG/cch3DAw5rGAPV7NWkyl3QGuV/wt0MrAPDo
-----END PRIVATE KEY-----`;

// Certificate chain: Signer -> Intermediate CA -> Root CA
const TEST_CERT = `-----BEGIN CERTIFICATE-----
MIIChzCCAi6gAwIBAgIUcCTmJHYF8dZfG0d1UdT6/LXtkeYwCgYIKoZIzj0EAwIw
gYwxCzAJBgNVBAYTAlVTMQswCQYDVQQIDAJDQTESMBAGA1UEBwwJU29tZXdoZXJl
MScwJQYDVQQKDB5DMlBBIFRlc3QgSW50ZXJtZWRpYXRlIFJvb3QgQ0ExGTAXBgNV
BAsMEEZPUiBURVNUSU5HX09OTFkxGDAWBgNVBAMMD0ludGVybWVkaWF0ZSBDQTAe
Fw0yMjA2MTAxODQ2NDBaFw0zMDA4MjYxODQ2NDBaMIGAMQswCQYDVQQGEwJVUzEL
MAkGA1UECAwCQ0ExEjAQBgNVBAcMCVNvbWV3aGVyZTEfMB0GA1UECgwWQzJQQSBU
ZXN0IFNpZ25pbmcgQ2VydDEZMBcGA1UECwwQRk9SIFRFU1RJTkdfT05MWTEUMBIG
A1UEAwwLQzJQQSBTaWduZXIwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAQPaL6R
kAkYkKU4+IryBSYxJM3h77sFiMrbvbI8fG7w2Bbl9otNG/cch3DAw5rGAPV7NWky
l3QGuV/wt0MrAPDoo3gwdjAMBgNVHRMBAf8EAjAAMBYGA1UdJQEB/wQMMAoGCCsG
AQUFBwMEMA4GA1UdDwEB/wQEAwIGwDAdBgNVHQ4EFgQUFznP0y83joiNOCedQkxT
tAMyNcowHwYDVR0jBBgwFoAUDnyNcma/osnlAJTvtW6A4rYOL2swCgYIKoZIzj0E
AwIDRwAwRAIgOY/2szXjslg/MyJFZ2y7OH8giPYTsvS7UPRP9GI9NgICIDQPMKrE
LQUJEtipZ0TqvI/4mieoyRCeIiQtyuS0LACz
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIICajCCAg+gAwIBAgIUfXDXHH+6GtA2QEBX2IvJ2YnGMnUwCgYIKoZIzj0EAwIw
dzELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAkNBMRIwEAYDVQQHDAlTb21ld2hlcmUx
GjAYBgNVBAoMEUMyUEEgVGVzdCBSb290IENBMRkwFwYDVQQLDBBGT1IgVEVTVElO
R19PTkxZMRAwDgYDVQQDDAdSb290IENBMB4XDTIyMDYxMDE4NDY0MFoXDTMwMDgy
NzE4NDY0MFowgYwxCzAJBgNVBAYTAlVTMQswCQYDVQQIDAJDQTESMBAGA1UEBwwJ
U29tZXdoZXJlMScwJQYDVQQKDB5DMlBBIFRlc3QgSW50ZXJtZWRpYXRlIFJvb3Qg
Q0ExGTAXBgNVBAsMEEZPUiBURVNUSU5HX09OTFkxGDAWBgNVBAMMD0ludGVybWVk
aWF0ZSBDQTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHllI4O7a0EkpTYAWfPM
D6Rnfk9iqhEmCQKMOR6J47Rvh2GGjUw4CS+aLT89ySukPTnzGsMQ4jK9d3V4Aq4Q
LsOjYzBhMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgGGMB0GA1UdDgQW
BBQOfI1yZr+iyeUAlO+1boDitg4vazAfBgNVHSMEGDAWgBRembiG4Xgb2VcVWnUA
UrYpDsuojDAKBggqhkjOPQQDAgNJADBGAiEAtdZ3+05CzFo90fWeZ4woeJcNQC4B
84Ill3YeZVvR8ZECIQDVRdha1xEDKuNTAManY0zthSosfXcvLnZui1A/y/DYeg==
-----END CERTIFICATE-----`;

export interface C2PAManifest {
  manifestPresent: boolean;
  title?: string;
  format?: string;
  claimGenerator?: string;
  claimGeneratorInfo?: {
    name: string;
    version?: string;
  }[];
  signature?: {
    issuer?: string;
    time?: string;
    certSerial?: string;
  };
  assertions?: Array<{
    label: string;
    data: any;
  }>;
  actions?: C2PAAction[];
  
  // Specific extracted metadata for easy UI consumption
  generativeInfo?: {
    software?: string;
    type?: string; 
    prompt?: string;
  };
  
  ingredients?: Array<{
    title?: string;
    format?: string;
    relationship?: string;
    thumbnail?: {
      contentType: string;
      data: string;
    };
  }>;
  thumbnail?: {
    contentType: string;
    data: string; // base64
  } | null;
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
 * Clean up action labels to be more human readable
 */
function formatActionLabel(action: string): string {
  if (!action) return 'Unknown Action';
  const parts = action.split('.');
  const name = parts[parts.length - 1];
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ');
}

/**
 * Helper to safely extract base64 thumbnail data from various input formats
 */
function extractThumbnailData(thumb: any): string | undefined {
  if (!thumb) return undefined;
  
  try {
      // Handle various thumbnail formats
      if (typeof thumb === 'string') {
          // If it's already a base64 string or binary string
          return Buffer.from(thumb).toString('base64');
      } else if (Buffer.isBuffer(thumb)) {
          return thumb.toString('base64');
      } else if (thumb instanceof Uint8Array) {
          return Buffer.from(thumb).toString('base64');
      } else if (thumb.data) {
          // Nested data property (v1 style or some variants)
           if (typeof thumb.data === 'string') {
               return Buffer.from(thumb.data).toString('base64');
           } else if (Number.isInteger(thumb.data[0]) || Array.isArray(thumb.data) || typeof thumb.data === 'object') {
               // Array-like object of bytes
               return Buffer.from(Object.values(thumb.data) as number[]).toString('base64');
           }
      }
      // If it's a raw object that might be an array-like buffer
      if (typeof thumb === 'object' && (Number.isInteger(thumb[0]) || thumb.type === 'Buffer')) {
          if (thumb.type === 'Buffer' && Array.isArray(thumb.data)) {
               return Buffer.from(thumb.data).toString('base64');
          }
          return Buffer.from(Object.values(thumb) as number[]).toString('base64');
      }
  } catch (e) {
      console.warn('Failed to parse thumbnail:', e);
  }
  return undefined;
}

/**
 * Parse C2PA manifest from image buffer using c2pa-node
 */
export async function parseC2PAManifest(buffer: Buffer, mimeType?: string): Promise<C2PAManifest> {
  try {
    // Import from the new @contentauth/c2pa-node package
    // Dynamic import to avoid build issues if strictly ESM/CJS mismatch occurs
    const { Reader } = require('@contentauth/c2pa-node');
    
    // Detect actual image type from buffer if not provided or generic
    const actualMimeType = (!mimeType || mimeType === 'application/octet-stream') 
      ? detectImageMimeType(buffer)
      : mimeType;
    
    console.log('Reading C2PA manifest with @contentauth/c2pa-node (v2)...');
    console.log('Buffer length:', buffer.length, 'Detected MIME type:', actualMimeType);
    
    // Reader.fromAsset expects SourceAsset { buffer, mimeType }
    // but the type definition says SourceAsset = SourceBufferAsset | FileAsset
    // SourceBufferAsset = { buffer: Buffer, mimeType: string }
    const reader = await Reader.fromAsset({ 
      buffer: buffer,
      mimeType: actualMimeType
    });
    
    if (!reader) {
      console.log('❌ C2PA: Reader could not be initialized (invalid asset or no C2PA compatible format)');
      return { manifestPresent: false };
    }

    // Get the manifest store as JSON
    const result = reader.json();
    
    if (!result) {
      console.log('❌ C2PA: No result from reader.json()');
      return { manifestPresent: false };
    }

    console.log("C2PA:", result)

    // Comprehensive logging for debugging
    console.log('--- C2PA Deep Inspection ---');
    if (result.manifests) { // Note: V2 might return 'manifests' map or similar structure, let's check validation_status
      console.log(`Found manifests.`);
    }

    if (result.validation_status && result.validation_status.length > 0) {
       console.log('⚠️ Validation Issues:', JSON.stringify(result.validation_status, null, 2));
    } else {
       console.log('✅ Validation Status: OK');
    }
    
    // Check for active manifest
    // In v2/contentauth node, active_manifest might be a string string label pointing to the manifest in the store
    let manifest: any = result.active_manifest;
    
    // If active_manifest is a string, we need to look it up in the manifests map
    if (typeof manifest === 'string' && result.manifests) {
       console.log(`Active manifest label is string: ${manifest}. Looking up in store...`);
       manifest = result.manifests[manifest];
    }
    
    if (!manifest) {
      console.log('❌ No active manifest identified for this asset (lookup failed).');
      return { manifestPresent: false };
    }

    console.log('✅ Active Manifest Found:', manifest.label || result.active_manifest);
    
    // Debug: Log all keys and assertion labels to help troubleshoot missing data
    console.log('--- Manifest Details ---');
    console.log('Manifest Title:', manifest.title);
    console.log('Claim Generator:', manifest.claim_generator);
    console.log('Ingredients Count:', manifest.ingredients?.length);
    console.log('Assertions Keys:', manifest.assertions ? Object.keys(manifest.assertions) : 'None');
    
    // Inspect specific assertion types
    if (manifest.assertions) {
        Object.entries(manifest.assertions).forEach(([key, val]: [string, any]) => {
            if (key.includes('actions')) {
                console.log(`Assertion [${key}] found with ${val.actions?.length} actions.`);
            }
        });
    }
    console.log('---------------------------');
    
    // Extract actions
    let actions: C2PAAction[] = [];
    let generativeInfo: any = {};
    
    // Normalize assertions to a list of { label, data } to handle both Array and Map formats
    let assertionList: { label: string, data: any }[] = [];
    
    if (Array.isArray(manifest.assertions)) {
       assertionList = manifest.assertions;
    } else if (manifest.assertions && typeof manifest.assertions === 'object') {
       assertionList = Object.entries(manifest.assertions).map(([label, data]) => ({ label, data }));
    }

    console.log(`Parsed ${assertionList.length} assertions from manifest.`);

    // 1. Process Actions (c2pa.actions)
    // Find action assertion
    const actionAssertion = assertionList.find(a => a.label.includes('c2pa.actions'));
    
    if (actionAssertion) {
      const actionsData = actionAssertion.data;
      console.log(`Found actions in assertion: ${actionAssertion.label}`);
      
      const rawActions = actionsData.actions || [];
      if (Array.isArray(rawActions)) {
        actions = rawActions.map((a: any) => {
          let agent = a.softwareAgent;
          // Handle complex software agent object
          if (typeof agent === 'object' && agent !== null) {
             agent = agent.name + (agent.version ? ` v${agent.version}` : '');
          }
          
          // Check for generative AI indicators in actions
          if (a.action?.includes('generated') || a.parameters?.['c2pa.prompt']) {
             generativeInfo.type = 'Generative AI';
             generativeInfo.software = agent;
             if (a.parameters?.['c2pa.prompt']) {
                generativeInfo.prompt = a.parameters['c2pa.prompt'];
             }
          }

          return {
            action: a.action,
            description: formatActionLabel(a.action),
            softwareAgent: agent,
            when: a.when,
            parameters: a.parameters
          };
        });
      }
    } else {
        console.log('No c2pa.actions assertion found in list.');
    }

    // 2. Process Ingredients (parent assets)
    // Sometimes ingredients are top-level, sometimes they are assertions.
    let rawIngredients = manifest.ingredients || [];
    
    // If no top-level ingredients, check assertions for c2pa.ingredient
    if (!rawIngredients || rawIngredients.length === 0) {
        const ingredientAssertions = assertionList.filter(a => a.label.includes('c2pa.ingredient'));
        if (ingredientAssertions.length > 0) {
            console.log(`Found ${ingredientAssertions.length} ingredient assertions, mapping to ingredients list.`);
            rawIngredients = ingredientAssertions.map(a => a.data);
        }
    }

    console.log(JSON.stringify(rawIngredients, null, 2));

    const ingredients = rawIngredients.map((ing: any) => {
      const thumb = ing.thumbnail;
      const thumbnailData = extractThumbnailData(thumb);

      // Check for validation status to see if data is embedded
      if (ing.data) {
        console.log(`ℹ️ Ingredient '${ing.title}' has data property of type:`, typeof ing.data);
      }

      return {
          title: ing.title,
          format: ing.format,
          relationship: ing.relationship,
          instanceId: ing.instance_id,
          documentId: ing.document_id,
          // If the ingredient itself is embedded (rare), it might be here, but usually it's just a reference
          // We can't easily extract the full parent usually.
          thumbnail: (thumb && thumbnailData) ? {
            contentType: thumb.content_type || (ing.format || 'image/jpeg'),
            data: thumbnailData
          } : undefined
      };
    });

    if (ingredients.length > 0) {
        console.log(`Extracted ${ingredients.length} ingredients.`);
    } else {
        console.log('No ingredients extracted.');
    }


    // 3. Process Claim Generator Info
    let claimGeneratorInfo = [];
    if (manifest.claim_generator_info) {
       claimGeneratorInfo = manifest.claim_generator_info.map((info: any) => ({
          name: info.name,
          version: info.version
       }));
    }

    return {
      manifestPresent: true,
      title: manifest.title,
      format: manifest.format,
      claimGenerator: manifest.claim_generator,
      claimGeneratorInfo,
      signature: manifest.signature_info
        ? {
            issuer: manifest.signature_info.issuer,
            time: manifest.signature_info.time,
            certSerial: manifest.signature_info.cert_serial
          }
        : undefined,
      assertions: assertionList,
      actions,
      generativeInfo: Object.keys(generativeInfo).length > 0 ? generativeInfo : undefined,
      ingredients,
      thumbnail: (() => {
          const tData = extractThumbnailData(manifest.thumbnail);
          return (manifest.thumbnail && tData)
            ? {
                contentType: manifest.thumbnail.content_type || 'image/jpeg',
                data: tData,
              }
            : undefined;
      })()
    };
  } catch (error) {
    console.error('Error parsing C2PA manifest:', error);
    return { manifestPresent: false };
  }
}

/**
 * Mock C2PA data for demo purposes with optional promotional metadata
 */
export function createMockC2PAManifest(
  filename: string,
  promotional?: {
    creatorName?: string;
    twitterHandle?: string;
    creatorBio?: string;
  }
): C2PAManifest {
  const assertions: Array<{ label: string; data: any }> = [
    {
      label: 'c2pa.actions',
      data: { actions: [{ action: 'c2pa.created', softwareAgent: 'Imgate Platform' }] }
    }
  ];

  // Add Schema.org CreativeWork assertion if promotional metadata is provided
  if (promotional && (promotional.creatorName || promotional.twitterHandle || promotional.creatorBio)) {
    const creativeWork: any = {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: filename,
    };

    // Add author information
    if (promotional.creatorName || promotional.twitterHandle) {
      creativeWork.author = {
        '@type': 'Person',
        ...(promotional.creatorName && { name: promotional.creatorName }),
        ...(promotional.twitterHandle && { 
          sameAs: `https://x.com/${promotional.twitterHandle.replace(/^@/, '')}`
        }),
      };
    }

    // Add description (bio)
    if (promotional.creatorBio) {
      creativeWork.description = promotional.creatorBio;
    }

    assertions.push({
      label: 'stds.schema-org.CreativeWork',
      data: creativeWork
    });
  }

  // Populate actions from the assertions for consistency
  const actions: C2PAAction[] = [
      {
          action: 'c2pa.created',
          description: 'Created',
          softwareAgent: 'Imgate Platform',
          when: new Date().toISOString()
      }
  ];

  return {
    manifestPresent: true,
    title: filename,
    claimGenerator: 'Imgate Platform',
    claimGeneratorInfo: [{ name: 'Imgate Platform', version: '1.0.0' }],
    signature: {
      issuer: 'Imgate Platform',
      time: new Date().toISOString(),
    },
    assertions,
    actions,
  };
}

/**
 * Embeds x402 paywall information into the image via C2PA manifest.
 * Uses test credentials for POC signing.
 */
export async function embedPaywallAssertion(
  buffer: Buffer,
  paywall: PaywallClaim,
  signerConfig: SignerConfig,
  creatorInfo?: CreatorInfo
): Promise<Buffer> {
  try {
    const { Builder, LocalSigner } = require('@contentauth/c2pa-node');
    
    console.log('Embedding C2PA Paywall Assertion with test credentials...');
    
    // Detect MIME type from buffer
    const mimeType = detectImageMimeType(buffer);
    console.log('Detected image type:', mimeType);
    
    // Always use test credentials for POC
    console.log('ℹ️ Using embedded TEST credentials for signing (POC mode)');
    const certBuffer = Buffer.from(TEST_CERT);
    const keyBuffer = Buffer.from(TEST_KEY);
    
    // Create LocalSigner: newSigner(certificate, privateKey, algorithm, tsaUrl?)
    // Note: certificate comes FIRST, then privateKey
    const signer = LocalSigner.newSigner(
      certBuffer,
      keyBuffer,
      'es256' // ES256 algorithm for our EC key
    );
    
    // Create manifest definition JSON
    const manifestDef = {
       title: creatorInfo?.name ? `Asset by ${creatorInfo.name}` : 'Imgate Asset',
       format: mimeType,
       claim_generator: 'Imgate/1.0.0',
       assertions: []
    };
    
    // Initialize builder with JSON definition
    const builder = Builder.withJson(manifestDef);
    
    // Construct x402 PaymentRequirements
    const x402Requirements = {
      accepts: [{
        scheme: 'exact',
        network: paywall.network || 'base-sepolia',
        parameters: {
          recipient: paywall.recipient,
          amount: paywall.amount,
          currency: paywall.currency
        }
      }]
    };

    // Add x402 assertion
    builder.addAssertion('org.x402.requirements', x402Requirements);
    
    // Add required c2pa.actions with 'created' action (required by C2PA spec)
    builder.addAssertion('c2pa.actions', {
      actions: [
        {
          action: 'c2pa.created',
          softwareAgent: 'Imgate/1.0.0',
          when: new Date().toISOString()
        }
      ]
    });
    
    // Construct CreativeWork with creator info
    const creativeWork: any = {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      'offers': {
        '@type': 'Offer',
        'price': paywall.amount,
        'priceCurrency': paywall.currency,
        'description': `Purchase required. Payment: ${paywall.recipient}`,
      }
    };

    if (creatorInfo?.name) {
      creativeWork['author'] = {
        '@type': 'Person',
        'name': creatorInfo.name
      };
      
      if (creatorInfo.twitter) {
        const handle = creatorInfo.twitter.replace(/^@/, '');
        creativeWork['author']['sameAs'] = `https://twitter.com/${handle}`;
      }
      
      if (creatorInfo.bio) {
        creativeWork['author']['description'] = creatorInfo.bio;
      }
    }
    
    if (creatorInfo?.description) {
      creativeWork['description'] = creatorInfo.description;
    }

    builder.addAssertion('stds.schema-org.CreativeWork', creativeWork);

    // Create source and destination assets
    const source = { buffer: buffer, mimeType };
    const dest = { buffer: null };
    
    console.log(`Signing asset (${buffer.length} bytes)...`);

    // Sign and embed - synchronous for LocalSigner
    builder.sign(signer, source, dest);
    
    // Get the signed buffer from dest
    const signedBuffer = dest.buffer as unknown as Buffer;
    
    if (!signedBuffer || signedBuffer.length === 0) {
        throw new Error("C2PA signing returned empty buffer");
    }

    console.log(`✅ C2PA signed successfully. Size: ${signedBuffer.length} (+${signedBuffer.length - buffer.length} bytes)`);
    return signedBuffer;
    
  } catch (error) {
    console.error('❌ Failed to embed C2PA assertion:', error);
    console.warn('⚠️ Returning original buffer without C2PA');
    // Return original buffer if signing fails (graceful degradation)
    return buffer;
  }
}
