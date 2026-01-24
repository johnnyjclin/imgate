import { z } from 'zod';
import { Asset, ServerConfig } from '../types.js';

/**
 * Input schema for read_asset tool
 */
export const ReadAssetSchema = z.object({
  slug: z.string().optional().describe('Short URL slug (e.g., "abcd12")'),
  assetId: z.string().optional().describe('Asset UUID')
}).refine(data => data.slug || data.assetId, {
  message: 'Either slug or assetId must be provided'
});

/**
 * Fetch asset metadata from Imgate API
 */
export async function readAsset(
  input: z.infer<typeof ReadAssetSchema>,
  config: ServerConfig
): Promise<string> {
  try {
    const identifier = input.slug || input.assetId;
    const endpoint = input.slug 
      ? `${config.apiUrl}/api/asset/${input.slug}`
      : `${config.apiUrl}/api/asset?id=${input.assetId}`;

    const response = await fetch(endpoint);
    
    if (!response.ok) {
      if (response.status === 404) {
        return `❌ Asset not found: ${identifier}`;
      }
      return `❌ Error fetching asset: ${response.statusText}`;
    }

    const asset = await response.json() as Asset;

    // Format response for AI consumption
    // Handle both formats: plain number (10) or USDC decimals (10000000)
    const priceValue = parseInt(asset.priceUSDC);
    const priceInUSDC = priceValue > 1000 
      ? (priceValue / 1_000_000).toFixed(2)  // USDC format with decimals
      : priceValue.toFixed(2);  // Plain number format
    const createdDate = new Date(asset.createdAt).toLocaleDateString();
    
    let result = `🖼️  **${asset.filename}**\n\n`;
    result += `**Asset Details:**\n`;
    result += `- Dimensions: ${asset.width}x${asset.height}px\n`;
    result += `- Created: ${createdDate}\n`;
    result += `- Asset ID: ${asset.assetId}\n`;
    result += `- Slug: ${asset.slug}\n\n`;
    
    result += `**Creator & Licensing:**\n`;
    result += `- Creator: ${asset.creatorAddress}\n`;
    result += `- License Price: ${priceInUSDC} USDC\n`;
    result += `- View/Purchase: ${config.appUrl}/${asset.slug}\n\n`;
    
    result += `**Content Credentials (C2PA):**\n`;
    if (asset.c2paManifestPresent) {
      result += `✅ C2PA Manifest Present\n`;
      if (asset.c2paSigner) {
        result += `- Signer: ${asset.c2paSigner}\n`;
      }
      if (asset.c2paSigningTime) {
        result += `- Signed: ${new Date(asset.c2paSigningTime).toLocaleString()}\n`;
      }
    } else {
      result += `ℹ️  No C2PA manifest (metadata stored on-chain)\n`;
    }
    
    result += `\n**Storage:**\n`;
    result += `- Preview (public): ipfs://${asset.previewCID}\n`;
    result += `- Original (encrypted): ipfs://${asset.encryptedCID}\n`;
    result += `- Hash: ${asset.originHash.slice(0, 16)}...\n`;

    return result;

  } catch (error) {
    return `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
  }
}

/**
 * Tool metadata for MCP registration
 */
export const readAssetTool = {
  name: 'read_asset',
  description: 'Fetch comprehensive metadata for an Imgate image by slug (short URL) or asset ID. Returns creator info, pricing, C2PA status, dimensions, and storage details.',
  inputSchema: {
    type: 'object',
    properties: {
      slug: {
        type: 'string',
        description: 'Short URL slug (e.g., "abcd12" from pic.xyz/abcd12)'
      },
      assetId: {
        type: 'string',
        description: 'Asset UUID for direct lookup'
      }
    },
    oneOf: [
      { required: ['slug'] },
      { required: ['assetId'] }
    ]
  }
};
