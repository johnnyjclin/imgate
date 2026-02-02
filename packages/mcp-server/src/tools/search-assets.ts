import { z } from 'zod';
import { Asset, ServerConfig } from '../types.js';

/**
 * Input schema for search tool
 */
export const SearchAssetsSchema = z.object({
  query: z.string().describe('Natural language description or keywords to find images (e.g. "portrait of a woman with red hair", "cityscape at night")')
});

/**
 * Search for assets in the Imgate library and return rich details
 */
export async function searchAssets(
  input: z.infer<typeof SearchAssetsSchema>,
  config: ServerConfig
): Promise<string> {
  try {
    const response = await fetch(`${config.apiUrl}/api/assets/search?q=${encodeURIComponent(input.query)}`);
    
    if (!response.ok) {
      return `❌ Error searching assets: ${response.statusText}`;
    }

    const data = await response.json() as { assets: Asset[], isFallback: boolean };
    const assets = data.assets;
    const isFallback = data.isFallback;

    if (assets.length === 0) {
      return `🔍 No images found matching "${input.query}". Try different keywords.`;
    }

    let result = isFallback 
      ? `🔍 **No exact matches for "${input.query}", but here are some popular images you might like:**\n\n`
      : `🔍 **Found ${assets.length} images matching "${input.query}"**\n\n`;
    
    // Limit to top 5 results for clarity
    const displayAssets = assets.slice(0, 5);

    // Create a rich HTML-like display
    // Using simple HTML table structure which usually renders well in Markdown viewers
    result += `Here are the top results:\n\n`;

    for (const asset of displayAssets) {
      // Format price
      const priceValue = parseInt(asset.priceUSDC);
      const priceInUSDC = priceValue > 1000 
        ? (priceValue / 1_000_000).toFixed(2)
        : priceValue.toFixed(2);
      
      const previewUrl = `https://gateway.pinata.cloud/ipfs/${asset.previewCID}`;
      const createdDate = new Date(asset.createdAt).toLocaleDateString();

      // Format Creator Details (from database)
      let creatorDisplay = asset.creatorAddress.slice(0, 6) + '...' + asset.creatorAddress.slice(-4);
      if (asset.creatorName) {
        creatorDisplay = asset.creatorName;
        if (asset.twitterHandle) {
             const handle = asset.twitterHandle.startsWith('@') ? asset.twitterHandle : `@${asset.twitterHandle}`;
             const url = `https://twitter.com/${handle.replace('@', '')}`;
             creatorDisplay += ` ([${handle}](${url}))`;
        }
      }

      // Build creator details section
      let creatorDetails = '';
      if (asset.creatorName) {
        creatorDetails += `**${asset.creatorName}**\n`;
      }
      if (asset.twitterHandle) {
        const handle = asset.twitterHandle.startsWith('@') ? asset.twitterHandle : `@${asset.twitterHandle}`;
        const url = `https://twitter.com/${handle.replace('@', '')}`;
        creatorDetails += `[${handle}](${url})\n`;
      }
      if (asset.creatorBio) {
        creatorDetails += `_${asset.creatorBio}_\n\n`;
      }
      if (asset.description) {
        creatorDetails += `${asset.description}\n\n`;
      }
      creatorDetails += `💰 **${priceInUSDC} USDC**\n`;
      creatorDetails += `📏 ${asset.width}x${asset.height}px\n`;
      creatorDetails += `🔐 ${asset.assetId}\n`;
      if (asset.c2paManifestPresent) {
        creatorDetails += `✅ C2PA Certified\n`;
      }
      creatorDetails += `🔗 [View/Purchase](${config.appUrl}/${asset.slug})`;

      // Two-column layout: Left (Preview) | Right (Creator Details)
      result += `<table width="100%" border="0" cellspacing="0" cellpadding="12" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 20px;">
  <tr>
    <td width="240" valign="top" style="vertical-align: top; padding-right: 16px;">
       <img src="${previewUrl}" alt="${asset.filename}" width="220" style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.12);" />
    </td>
    <td valign="top" style="vertical-align: top; line-height: 1.6;">
       ${creatorDetails.split('\n').map(line => line.trim() ? `<div>${line}</div>` : '<br/>').join('')}
    </td>
  </tr>
</table>\n\n`;
    }

    result += `💡 **Want to buy one?**\nJust ask me to "buy [Image Name]" or "purchase asset [ID]".\n`;

    return result;

  } catch (error) {
    return `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
  }
}

/**
 * Tool metadata for MCP registration
 */
export const searchAssetsTool = {
  name: 'search',
  description: 'Search for images by natural language description or keyword (e.g., "portrait of a woman", "mountain landscape"). Returns a visual list of results with prices and details.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Description of the image you are looking for'
      }
    },
    required: ['query']
  }
};
