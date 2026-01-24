import { z } from 'zod';
import { Asset, ServerConfig } from '../types.js';

/**
 * Input schema for generate_payment_link tool
 */
export const GeneratePaymentLinkSchema = z.object({
  assetId: z.string().optional().describe('Asset UUID'),
  slug: z.string().optional().describe('Asset slug (short URL)')
}).refine(data => data.slug || data.assetId, {
  message: 'Either slug or assetId must be provided'
});

/**
 * Generate a payment link for licensing an image
 */
export async function generatePaymentLink(
  input: z.infer<typeof GeneratePaymentLinkSchema>,
  config: ServerConfig
): Promise<string> {
  try {
    let asset: Asset;
    let slug: string;

    // If slug is provided, use it directly
    if (input.slug) {
      slug = input.slug;
      // Fetch asset to verify it exists and get details
      const response = await fetch(`${config.apiUrl}/api/asset/${slug}`);
      if (!response.ok) {
        if (response.status === 404) {
          return `❌ Asset not found: ${slug}`;
        }
        return `❌ Error fetching asset: ${response.statusText}`;
      }
      asset = await response.json() as Asset;
    } else if (input.assetId) {
      // Fetch by asset ID to get the slug
      const response = await fetch(`${config.apiUrl}/api/asset?id=${input.assetId}`);
      if (!response.ok) {
        if (response.status === 404) {
          return `❌ Asset not found: ${input.assetId}`;
        }
        return `❌ Error fetching asset: ${response.statusText}`;
      }
      asset = await response.json() as Asset;
      slug = asset.slug;
    } else {
      return `❌ Either slug or assetId must be provided`;
    }

    // Handle both formats: plain number (10) or USDC decimals (10000000)
    const priceValue = parseInt(asset.priceUSDC);
    const priceInUSDC = priceValue > 1000 
      ? (priceValue / 1_000_000).toFixed(2)  // USDC format with decimals
      : priceValue.toFixed(2);  // Plain number format
    const paymentUrl = `${config.appUrl}/${slug}`;

    let result = `💰 **Payment Link Generated**\n\n`;
    result += `**Image:** ${asset.filename}\n`;
    result += `**Creator:** ${asset.creatorAddress}\n`;
    result += `**License Price:** ${priceInUSDC} USDC\n`;
    result += `**License Duration:** 24 hours\n\n`;
    
    result += `**Payment Process:**\n`;
    result += `1. Connect your Web3 wallet (MetaMask, Rainbow, etc.)\n`;
    result += `2. Approve USDC spending\n`;
    result += `3. Complete purchase transaction\n`;
    result += `4. License recorded on-chain\n`;
    result += `5. Download high-resolution original\n\n`;
    
    result += `**Revenue Split:**\n`;
    result += `- Creator receives: ${(parseFloat(priceInUSDC) * 0.95).toFixed(2)} USDC (95%)\n`;
    result += `- Platform fee: ${(parseFloat(priceInUSDC) * 0.05).toFixed(2)} USDC (5%)\n\n`;
    
    result += `**Network:** Base Sepolia (Testnet)\n`;
    result += `**Payment Token:** USDC (${config.usdcAddress})\n\n`;
    
    result += `🔗 **Purchase Here:** ${paymentUrl}\n\n`;
    
    if (asset.c2paManifestPresent) {
      result += `✅ C2PA verified content\n`;
    }
    result += `✅ On-chain provenance\n`;
    result += `✅ Encrypted high-resolution original\n`;

    return result;

  } catch (error) {
    return `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
  }
}

/**
 * Tool metadata for MCP registration
 */
export const generatePaymentLinkTool = {
  name: 'generate_payment_link',
  description: 'Generate a payment/purchase link for an Imgate image license. Returns the URL where users can connect their wallet and pay in USDC to access the high-resolution original.',
  inputSchema: {
    type: 'object',
    properties: {
      assetId: {
        type: 'string',
        description: 'Asset UUID to generate payment link for'
      },
      slug: {
        type: 'string',
        description: 'Asset slug (short URL identifier)'
      }
    },
    oneOf: [
      { required: ['slug'] },
      { required: ['assetId'] }
    ]
  }
};
