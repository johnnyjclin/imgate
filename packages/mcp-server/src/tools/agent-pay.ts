import { z } from 'zod';
import { ServerConfig } from '../types.js';
import { Coinbase, Wallet, WalletData } from '@coinbase/coinbase-sdk';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

// Constants for Decryption
const ALGORITHM = "aes-256-gcm";
const SALT_LENGTH = 64;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function decryptFile(encryptedBuffer: Buffer, key: string): Buffer {
  try {
    const keyBuffer = Buffer.from(key, "base64");
    const salt = encryptedBuffer.subarray(0, SALT_LENGTH);
    const iv = encryptedBuffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = encryptedBuffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = encryptedBuffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Imgate contract ABI
const CONTRACT_ABI = [
  "function purchase(bytes32 assetId) external",
  "function usdc() view returns (address)"
] as const;

// ERC20 ABI
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)"
] as const;

/**
 * Input schema for agent_pay tool
 */
export const AgentPaySchema = z.object({
  assetId: z.string().describe('The UUID of the asset to purchase')
});

/**
 * Definition for the MCP tool
 */
export const agentPayTool = {
  name: 'agent_pay',
  description: 'Pay for an asset ensuring the agent wallet has funds. If funds are missing, it returns the address to fund.',
  inputSchema: {
    type: 'object',
    properties: {
      assetId: {
        type: 'string',
        description: 'The UUID of the asset to purchase'
      }
    },
    required: ['assetId']
  }
};

// Use home directory for persistence to avoid permission issues
// Logic: Try ~/.imgate/wallet_data.json, fallback to temp dir if needed
function getWalletPath(): string {
  const homeDir = os.homedir();
  const imgateDir = path.join(homeDir, '.imgate');
  
  try {
    if (!fs.existsSync(imgateDir)) {
      fs.mkdirSync(imgateDir, { recursive: true });
    }
    return path.join(imgateDir, 'wallet_data.json');
  } catch (error) {
    // Fallback to tmp dir
    return path.join(os.tmpdir(), 'imgate_wallet_data.json');
  }
}

const WALLET_FILE_PATH = getWalletPath();

/**
 * Perform an agentic payment using Coinbase AgentKit Wallet
 */
export async function agentPay(
  input: z.infer<typeof AgentPaySchema>,
  config: ServerConfig
): Promise<string> {
  try {
    if (!config.cdpApiKeyName || !config.cdpApiKeyPrivateKey) {
      return `❌ Agent payment failed: CDP API credentials not configured on server. Please add CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY to your .env file.`;
    }

    if (!config.contractAddress) {
      return `❌ Agent payment failed: Contract address not configured.`;
    }

    // 1. Initialize Agent Wallet (Coinbase SDK)
    Coinbase.configure({
      apiKeyName: config.cdpApiKeyName,
      privateKey: config.cdpApiKeyPrivateKey.replace(/\\n/g, '\n')
    });

    // 2. Load or Create Wallet
    let wallet: Wallet;
    try {
      if (fs.existsSync(WALLET_FILE_PATH)) {
        console.error('[AgentPay] Loading existing wallet data from', WALLET_FILE_PATH);
        const data = JSON.parse(fs.readFileSync(WALLET_FILE_PATH, 'utf-8'));
        wallet = await Wallet.import(data);
      } else {
        console.error('[AgentPay] Creating new wallet at', WALLET_FILE_PATH);
        // Create on Base Sepolia by default for this demo
        wallet = await Wallet.create({ networkId: Coinbase.networks.BaseSepolia });
        
        // Save wallet data
        const data = await wallet.export();
        fs.writeFileSync(WALLET_FILE_PATH, JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.error('Error loading/creating wallet:', error);
      return `❌ Failed to initialize wallet at ${WALLET_FILE_PATH}: ${error instanceof Error ? error.message : String(error)}`;
    }

    const address = await wallet.getDefaultAddress();
    // Using stderr for logs so they don't pollute the generic MCP response if captured vaguely, 
    // though here we return explicit strings.
    console.error(`[AgentPay] Wallet Address: ${address}`);

    // 3. Check for Funds (ETH for gas, USDC for payment)
    const balances = await wallet.listBalances();
    const ethBalance = balances.get(Coinbase.assets.Eth) || 0;
    const usdcBalance = balances.get(Coinbase.assets.Usdc) || 0;
    
    console.error(`[AgentPay] Balances - ETH: ${ethBalance}, USDC: ${usdcBalance}`);

    // Price is fixed 1 USDC for demo (but allow any balance check > 0 for demo smoothness if price is dynamic)
    // In our app, price is 10.00 USDC based on your screenshot.
    // Let's set the check to 0.1 USDC to catch empty wallets, but assume user funded enough.
    const MIN_USDC_REQUIRED = 0.1;

    let fundingMessage = "";
    let needsFunding = false;

    if (Number(ethBalance) < 0.0001) {
      fundingMessage += `\n- **ETH**: ${ethBalance} (Need ~0.001 for gas)`;
      needsFunding = true;
    }
    // We check against a smaller amount to avoid blocking if the price logic varies
    // The contract transaction will fail if funds are truly insufficient.
    if (Number(usdcBalance) < MIN_USDC_REQUIRED) {
      fundingMessage += `\n- **USDC**: ${usdcBalance} (Need USDC)`;
      needsFunding = true;
    }

    if (needsFunding) {
      return `The agent wallet has insufficient funds.\n` +
             `**PLEASE FUND THE AGENT:**\n` +
             `Address: \`${address}\`\n` +
             fundingMessage + `\n\n` +
             `Please send Base Sepolia ETH/USDC to this address and try again.\n(Wallet stored at: ${WALLET_FILE_PATH})`;
    }

    // 4. Get Asset Details (to know Price and Creator)
    console.error(`[AgentPay] Fetching asset details for ${input.assetId}...`);
    const assetResponse = await fetch(`${config.apiUrl}/api/asset?id=${input.assetId}`);
    if (!assetResponse.ok) {
        throw new Error(`Failed to fetch asset details: ${assetResponse.statusText}`);
    }
    const asset = await assetResponse.json() as any;
    
    // Parse price. Asset priceUSDC is string "10.00" or similar.
    // We need to convert to units.
    // If we assume USDC has 6 decimals on Base Sepolia (Token: 0x036CbD53842c5426634e7929541eC2318f3dCF7e)
    const USDC_DECIMALS = 6;
    const priceAmount = ethers.parseUnits(asset.priceUSDC, USDC_DECIMALS); // Uses ethers.js logic

    console.error(`[AgentPay] Price: ${asset.priceUSDC} (${priceAmount.toString()} units). Creator: ${asset.creatorAddress}`);

    // Base Sepolia USDC Address
    const USDC_ADDRESS = config.usdcAddress || "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

    // 5. Execute Purchase Flow
    console.error('[AgentPay] Starting purchase flow...');

    // A. Approve USDC
    console.error('[AgentPay] Approving USDC...');
    const approveTx = await wallet.invokeContract({
        contractAddress: USDC_ADDRESS,
        method: 'approve',
        args: {
            spender: config.contractAddress,
            amount: priceAmount.toString()
        },
        abi: ERC20_ABI
    });
    await approveTx.wait();
    console.error(`[AgentPay] Approval confirmed.`);

    // B. Purchase Asset
    console.error('[AgentPay] Purchasing asset on-chain...');
    // Asset ID -> bytes32
    const assetIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(input.assetId));
    
    const purchaseTx = await wallet.invokeContract({
        contractAddress: config.contractAddress,
        method: 'purchase',
        args: {
            assetId: assetIdBytes32
        },
        abi: CONTRACT_ABI
    });
    
    await purchaseTx.wait();
    const txHash = purchaseTx.getTransactionHash();
    console.error(`[AgentPay] Purchase confirmed! Hash: ${txHash}`);

    // C. Register Purchase (JIT Verification)
    // We register the hash so the API can verify it immediately even if indexer is slow
    const registerResponse = await fetch(`${config.apiUrl}/api/purchase/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            assetId: input.assetId,
            txHash: txHash,
            payer: address
        })
    });

    if (!registerResponse.ok) console.error('Registration warning:', await registerResponse.text());

    // 6. Auto-Delivery: Decrypt and Return
    console.error('[AgentPay] Downloading and decrypting asset...');
    
    // Fetch Download Info (Verification happens here)
    const downloadResponse = await fetch(`${config.apiUrl}/api/download?assetId=${input.assetId}&payer=${address}`);
    if (!downloadResponse.ok) {
        throw new Error(`Download API failed: ${await downloadResponse.text()}`);
    }
    
    const downloadData = await downloadResponse.json() as any;
    
    // Fetch Encrypted File
    const ipfsResponse = await fetch(downloadData.ipfsUrl);
    if (!ipfsResponse.ok) throw new Error('Failed to fetch from IPFS');
    
    const encryptedBlob = await ipfsResponse.arrayBuffer();
    const encryptedBuffer = Buffer.from(encryptedBlob);
    
    // Decrypt
    const decryptedBuffer = decryptFile(encryptedBuffer, downloadData.encryptionKey);
    
    // Result
    const base64Image = decryptedBuffer.toString('base64');
    const dataUri = `data:image/jpeg;base64,${base64Image}`;
    
    return `✅ **Purchase Successful!**
    
**Transaction Hash:** \`${txHash}\`
**Amount:** ${asset.priceUSDC} USDC

🎉 **Here is your unlocked original file:**

![Unlocked Asset](${dataUri})

*(You can also download it using the local path or requesting a file export)*
`;

  } catch (error) {
    console.error('[AgentPay] Error:', error);
    return `❌ Error executing agent payment: ${error instanceof Error ? error.message : String(error)}`;
  }
}
