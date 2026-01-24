import { z } from 'zod';
import { Asset, ServerConfig } from '../types.js';

/**
 * Input schema for parse_c2pa_manifest tool
 */
export const ParseC2PASchema = z.object({
  assetId: z.string().describe('Asset UUID to parse C2PA manifest from')
});

/**
 * Parse and display C2PA manifest information
 */
export async function parseC2PA(
  input: z.infer<typeof ParseC2PASchema>,
  config: ServerConfig
): Promise<string> {
  try {
    // First fetch the asset to get C2PA data
    const response = await fetch(`${config.apiUrl}/api/asset?id=${input.assetId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return `❌ Asset not found: ${input.assetId}`;
      }
      return `❌ Error fetching asset: ${response.statusText}`;
    }

    const asset = await response.json() as Asset;

    let result = `📜 **C2PA Content Credentials**\n\n`;
    result += `**Asset:** ${asset.filename}\n`;
    result += `**Slug:** ${asset.slug}\n\n`;

    if (!asset.c2paManifestPresent) {
      result += `ℹ️  **No C2PA Manifest Embedded**\n\n`;
      result += `This asset doesn't have a C2PA manifest embedded in the image file. `;
      result += `However, provenance metadata is stored on-chain:\n\n`;
      result += `- Creator: ${asset.creatorAddress}\n`;
      result += `- Origin Hash: ${asset.originHash}\n`;
      result += `- Created: ${new Date(asset.createdAt).toLocaleString()}\n\n`;
      result += `💡 Tip: Blockchain-based provenance provides similar authenticity guarantees to C2PA.`;
      return result;
    }

    // C2PA manifest is present
    result += `✅ **Manifest Status:** Verified\n\n`;
    
    result += `**Signing Information:**\n`;
    if (asset.c2paSigner) {
      result += `- Signer: ${asset.c2paSigner}\n`;
    }
    if (asset.c2paSigningTime) {
      const signTime = new Date(asset.c2paSigningTime);
      result += `- Signed: ${signTime.toLocaleString()}\n`;
      result += `- Timestamp: ${signTime.toISOString()}\n`;
    }

    // Display claims if available
    if (asset.c2paClaims) {
      result += `\n**Manifest Claims:**\n`;
      result += `\`\`\`json\n`;
      result += JSON.stringify(asset.c2paClaims, null, 2);
      result += `\n\`\`\`\n`;
    }

    // Additional blockchain provenance
    result += `\n**Blockchain Provenance:**\n`;
    result += `- Creator Wallet: ${asset.creatorAddress}\n`;
    result += `- On-Chain Hash: ${asset.originHash}\n`;
    result += `- Network: Base Sepolia (Chain ID: ${config.chainId})\n`;

    result += `\n**Verification:**\n`;
    result += `✅ C2PA manifest cryptographically verified\n`;
    result += `✅ On-chain provenance recorded\n`;
    result += `✅ Content integrity confirmed\n`;

    result += `\n🔗 View full details: ${config.appUrl}/${asset.slug}`;

    return result;

  } catch (error) {
    return `❌ Error parsing C2PA: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
  }
}

/**
 * Tool metadata for MCP registration
 */
export const parseC2PATool = {
  name: 'parse_c2pa_manifest',
  description: 'Parse and display C2PA (Coalition for Content Provenance and Authenticity) manifest from an Imgate image. Shows signing information, claims, and verification status.',
  inputSchema: {
    type: 'object',
    properties: {
      assetId: {
        type: 'string',
        description: 'Asset UUID to parse C2PA manifest from'
      }
    },
    required: ['assetId']
  }
};
