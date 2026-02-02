import { z } from 'zod';
import { ServerConfig } from '../types.js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import sharp from 'sharp';

/**
 * Input schema for download_asset tool
 */
export const DownloadAssetSchema = z.object({
  assetId: z.string().describe('Asset UUID to download'),
  walletAddress: z.string().optional().describe('Wallet address that owns the license (defaults to agent wallet)')
});

/**
 * Download and decrypt an asset, returning a data URI for display
 */
export async function downloadAsset(
  input: z.infer<typeof DownloadAssetSchema>,
  config: ServerConfig
): Promise<string> {
  try {
    // 1. Determine Wallet Address (User provided or Agent default)
    let payer = input.walletAddress;
    
    // If no address provided, try to find the agent wallet address
    if (!payer) {
      try {
        const homeDir = os.homedir();
        const walletPath = path.join(homeDir, '.imgate', 'wallet_data.json');
        if (fs.existsSync(walletPath)) {
            const data = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
            // This is a naive check for the address in the exported data. 
            // Coinbase SDK export format might vary, but usually contains the address or seed.
            // If simpler, we can assume the user passed it, but for "Chat window trigger", 
            // the agent knows its own address. 
            // Let's rely on the user passing it OR finding it if we can instantiate the wallet.
            // For now, if missing, we'll fail and ask for it, 
            // UNLESS we can instantiate the wallet cheaply here.
            // We can re-use the logic from agent-pay but that requires imports/deps.
            // Simpler: Read the seed? No, that's unsafe.
            // Let's require the address for now or try to fetch it if we had a persistent store.
        }
      } catch (e) {
          // ignore
      }
    }

    if (!payer) {
       // Try to infer from "agent-pay" logs or ask user?
       // For a smooth demo, the Agent "knows" its address. 
       // In MCP, the tool doesn't share state with other tools easily.
       // We'll require it for now, or allow the caller to omit it and we fail.
       return `❌ Please provide the 'walletAddress' to verify ownership. (Use 'agent_pay' first to get the address)`;
    }

    // 2. Get Download Info from API
    // We reuse the /api/download endpoint which verifies the purchase on-chain/db
    const response = await fetch(
      `${config.apiUrl}/api/download?assetId=${input.assetId}&payer=${payer}`
    );

    if (!response.ok) {
        if (response.status === 403) {
            return `❌ Access Denied: No valid license found for this wallet. Please purchase the asset first.`;
        }
        return `❌ Error fetching download info: ${response.statusText}`;
    }

    const downloadInfo = await response.json() as any;
    /*
      Expected format:
      {
        success: true,
        encryptedCID: string,
        encryptionKey: string (base64),
        ipfsUrl: string,
        filename: string
      }
    */

    // 3. Download Encrypted Block
    console.error(`[Download] Fetching from IPFS: ${downloadInfo.ipfsUrl}`);
    const ipfsResponse = await fetch(downloadInfo.ipfsUrl);
    if (!ipfsResponse.ok) throw new Error(`Failed to fetch from IPFS: ${ipfsResponse.statusText}`);
    
    const encryptedBuffer = await ipfsResponse.arrayBuffer();
    const encryptedData = new Uint8Array(encryptedBuffer);

    // 4. Decrypt (Node.js version of the ViewAsset structure)
    // Structure: Salt (64) + IV (16) + AuthTag (16) + Ciphertext
    const SALT_LEN = 64;
    const IV_LEN = 16;
    const TAG_LEN = 16;
    
    if (encryptedData.length < SALT_LEN + IV_LEN + TAG_LEN) {
        throw new Error("Encrypted data is too short");
    }

    const salt = encryptedData.slice(0, SALT_LEN);
    const iv = encryptedData.slice(SALT_LEN, SALT_LEN + IV_LEN);
    const authTag = encryptedData.slice(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + TAG_LEN);
    const encryptedContent = encryptedData.slice(SALT_LEN + IV_LEN + TAG_LEN);

    // Import Key
    // Key is Base64 encoded raw bytes
    const keyBuffer = Buffer.from(downloadInfo.encryptionKey, 'base64');
    
    // Create Decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    const decrypted = Buffer.concat([
        decipher.update(encryptedContent),
        decipher.final()
    ]);
    
    // 5. Watermark with Wallet Address
    console.error(`[Download] Applying watermark: Licensed to ${payer}`);
    const image = sharp(decrypted);
    const metadata = await image.metadata();
    
    const width = metadata.width || 800;
    const height = metadata.height || 600;
    
    // Create SVG overlay
    // White text with black stroke for visibility on any background
    // Bottom right corner or centered at bottom
    const watermarkText = `Licensed to: ${payer?.substring(0, 8)}...${payer?.substring(payer.length - 6)}`;
    
    const svgOverlay = `
    <svg width="${width}" height="${height}">
      <style>
        .watermark {
          fill: rgba(255, 255, 255, 0.8);
          stroke: black;
          stroke-width: 1px;
          font-size: ${Math.max(24, Math.floor(width / 30))}px;
          font-family: sans-serif;
          font-weight: bold;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
      </style>
      <text x="50%" y="${height - 20}" text-anchor="middle" class="watermark">${watermarkText}</text>
    </svg>
    `;

    const watermarkedBuffer = await image
        .composite([{
            input: Buffer.from(svgOverlay),
            top: 0,
            left: 0,
        }])
        .toBuffer();

    // 6. Return as Base64 Data URI for Claude to Display
    const base64Image = watermarkedBuffer.toString('base64');
    const mimeType = 'image/jpeg'; // Assuming JPEG for demo, or infer from filename
    
    console.error(`[Download] Decrypted and Watermarked ${watermarkedBuffer.length} bytes.`);

    // Check size. if > 5MB, maybe warn? Claude supports up to ~5MB usually.
    // If it's huge, we might return a snippet or a local file link?
    // Let's return the image markdown.

    return `
🎉 **Download Successful!**

Here is your decrypted asset (Watermarked):

![${downloadInfo.filename}](data:${mimeType};base64,${base64Image})

**Metadata:**
- Filename: ${downloadInfo.filename}
- Size: ${(watermarkedBuffer.length / 1024).toFixed(2)} KB
- License: Active (Watermarked)
`;

  } catch (error) {
    console.error('[Download] Error:', error);
    return `❌ Error downloading/decrypting asset: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
  }
}

/**
 * Tool metadata for MCP registration
 */
export const downloadAssetTool = {
  name: 'download_asset',
  description: 'Download, decrypt, and display the high-resolution asset image. Requires a valid license (purchase) for the given wallet address.',
  inputSchema: {
    type: 'object',
    properties: {
      assetId: {
        type: 'string',
        description: 'Asset UUID to download'
      },
      walletAddress: {
        type: 'string',
        description: 'Wallet address that owns the license'
      }
    },
    required: ['assetId']
  }
};
