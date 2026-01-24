import { z } from 'zod';
import { ServerConfig } from '../types.js';

/**
 * Input schema for verify_purchase tool
 */
export const VerifyPurchaseSchema = z.object({
  assetId: z.string().describe('Asset UUID to check license for'),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid Ethereum address')
    .describe('Wallet address to verify (0x...)')
});

/**
 * Verify if a wallet has an active license for an asset
 */
export async function verifyPurchase(
  input: z.infer<typeof VerifyPurchaseSchema>,
  config: ServerConfig
): Promise<string> {
  try {
    // Call the access verification API endpoint
    const response = await fetch(
      `${config.apiUrl}/api/asset/access?assetId=${input.assetId}&payer=${input.walletAddress}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return `❌ Asset not found: ${input.assetId}`;
      }
      return `❌ Error verifying purchase: ${response.statusText}`;
    }

    const result = await response.json() as {
      hasAccess: boolean;
      purchase?: {
        txHash: string;
        amount: string;
        expiresAt: number;
        timestamp: number;
      };
    };

    let output = `🔐 **License Verification**\n\n`;
    output += `**Asset ID:** ${input.assetId}\n`;
    output += `**Wallet:** ${input.walletAddress}\n\n`;

    if (result.hasAccess) {
      output += `✅ **Active License Found**\n\n`;
      
      if (result.purchase) {
        const expiresDate = new Date(result.purchase.expiresAt);
        const purchaseDate = new Date(result.purchase.timestamp);
        const now = Date.now();
        const hoursRemaining = Math.max(0, (result.purchase.expiresAt - now) / (1000 * 60 * 60));
        
        // Handle both formats for amount
        const amountValue = parseInt(result.purchase.amount);
        const amountInUSDC = amountValue > 1000
          ? (amountValue / 1_000_000).toFixed(2)
          : amountValue.toFixed(2);
        
        output += `**Purchase Details:**\n`;
        output += `- Transaction: ${result.purchase.txHash}\n`;
        output += `- Amount Paid: ${amountInUSDC} USDC\n`;
        output += `- Purchased: ${purchaseDate.toLocaleString()}\n`;
        output += `- Expires: ${expiresDate.toLocaleString()}\n`;
        output += `- Time Remaining: ${hoursRemaining.toFixed(1)} hours\n\n`;
        
        output += `**Access Granted:**\n`;
        output += `✅ Can download high-resolution original\n`;
        output += `✅ License valid for commercial use (24h)\n`;
        output += `✅ Content authenticity verified\n\n`;
        
        output += `🔗 Download: ${config.appUrl}/api/asset/download?assetId=${input.assetId}&payer=${input.walletAddress}`;
      }
    } else {
      output += `❌ **No Active License**\n\n`;
      output += `This wallet address does not have an active license for this asset.\n\n`;
      output += `**To access this image:**\n`;
      output += `1. View asset details: ${config.appUrl}/api/asset?id=${input.assetId}\n`;
      output += `2. Connect your wallet\n`;
      output += `3. Purchase license with USDC\n`;
      output += `4. License valid for 24 hours after purchase\n\n`;
      output += `💡 Licenses are recorded on-chain and verified automatically.`;
    }

    return output;

  } catch (error) {
    return `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
  }
}

/**
 * Tool metadata for MCP registration
 */
export const verifyPurchaseTool = {
  name: 'verify_purchase',
  description: 'Check if a wallet address has an active license (purchase) for an Imgate image. Returns license status, expiration time, transaction details, and download access.',
  inputSchema: {
    type: 'object',
    properties: {
      assetId: {
        type: 'string',
        description: 'Asset UUID to check license for'
      },
      walletAddress: {
        type: 'string',
        description: 'Ethereum wallet address to verify (must start with 0x)'
      }
    },
    required: ['assetId', 'walletAddress']
  }
};
