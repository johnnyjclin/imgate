import { ethers } from "ethers";
import { getPurchase } from "./database";

const CONTRACT_ABI = [
  "event Purchased(bytes32 indexed assetId, address indexed payer, address indexed creator, uint256 amount, uint256 platformFee, uint256 creatorAmount, uint256 expiresAt, uint256 timestamp)",
  "function getAsset(bytes32 assetId) view returns (address creator, uint256 price, bool exists)",
];

/**
 * Get contract instance
 */
function getContract() {
  if (!process.env.NEXT_PUBLIC_IMGATE_CONTRACT_ADDRESS) {
    throw new Error("Contract address not configured");
  }

  if (!process.env.NEXT_PUBLIC_BASE_RPC_URL) {
    throw new Error("RPC URL not configured");
  }

  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_BASE_RPC_URL);
  const contract = new ethers.Contract(
    process.env.NEXT_PUBLIC_IMGATE_CONTRACT_ADDRESS,
    CONTRACT_ABI,
    provider
  );

  return { contract, provider };
}

/**
 * Retry helper for RPC calls
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    console.warn(`RPC call failed, retrying in ${delay}ms... (${retries} retries left)`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

/**
 * Verify purchase by checking Database First, then Contract (fallback)
 * @param assetId Asset ID
 * @param payer Payer address
 * @returns Purchase info or null
 */
export async function verifyPurchase(
  assetId: string,
  payer: string
): Promise<{
  txHash: string;
  amount: string;
  expiresAt: number;
  isValid: boolean;
} | null> {
  try {
    // 1. Check MongoDB (Primary Source for "x402" Flow)
    const dbPurchase = await getPurchase(payer, assetId);
    if (dbPurchase) {
        const isValid = dbPurchase.expiresAt > Date.now();
        if (isValid) {
            return {
                txHash: dbPurchase.txHash,
                amount: dbPurchase.amount,
                expiresAt: Math.floor(dbPurchase.expiresAt / 1000), // Convert to seconds for consistancy
                isValid: true
            };
        }
    }

    // 2. Output check for debugging
    // console.log("DB purchase not found or expired, checking contract...");

    // 3. (Optional) Legacy Contract Check removed for "No Contract" requirement compliance.
    // However, for robust x402 support, we should allow checking chain state if txHash is provided elsewhere
    // This function focuses on "Do we have a record of valid purchase?"
    
    return null;

  } catch (error) {
    console.error("Error verifying purchase:", error);
    return null;
  }
}

/**
 * Verify a specific transaction hash on-chain for a valid purchase event
 */
export async function verifyTransactionOnChain(
  txHash: string,
  assetId: string,
  payer: string
): Promise<{ isValid: boolean; amount?: string; expiresAt?: number }> {
    try {
        const { provider, contract } = getContract();
        const receipt = await withRetry(() => provider.getTransactionReceipt(txHash));

        if (!receipt || receipt.status !== 1) {
            console.log(`Tx ${txHash} not found or failed`);
            return { isValid: false };
        }

        // Parse logs to find 'Purchased' event
        const assetIdBytes32 = ethers.id(assetId);
        
        for (const log of receipt.logs) {
            try {
                const parsedLog = contract.interface.parseLog(log);
                if (parsedLog && parsedLog.name === 'Purchased') {
                    // Check if it matches our asset and payer
                    // args: [assetId, payer, creator, amount, fee, creatorAmount, expiresAt, timestamp]
                    const eventAssetId = parsedLog.args[0]; // bytes32
                    const eventPayer = parsedLog.args[1];
                    const eventExpiresAt = parsedLog.args[6];

                    if (eventAssetId === assetIdBytes32 && eventPayer.toLowerCase() === payer.toLowerCase()) {
                         return { 
                             isValid: true, 
                             expiresAt: Number(eventExpiresAt),
                             amount: parsedLog.args[3].toString()
                         };
                    }
                }
            } catch (e) {
                // Ignore logs that don't match interface
            }
        }
        
        return { isValid: false };

    } catch (e) {
        console.error("On-chain verification failed:", e);
        return { isValid: false };
    }
}

/**
 * Get all purchases for an asset
 * @param assetId Asset ID
 * @returns Array of purchase events
 */
export async function getPurchaseEvents(assetId: string): Promise<
  Array<{
    payer: string;
    amount: string;
    expiresAt: number;
    timestamp: number;
    txHash: string;
  }>
> {
  try {
    const { contract, provider } = getContract();
    
    // Get currently block to limit range
    const currentBlock = await withRetry(() => provider.getBlockNumber());
    const fromBlock = Math.max(0, currentBlock - 50000);

    const assetIdBytes32 = ethers.id(assetId);
    const filter = contract.filters.Purchased(assetIdBytes32);
    // Use retry and limit range
    const events = await withRetry(() => contract.queryFilter(filter, fromBlock, 'latest'));

    return events.map((event) => ({
      payer: event.args!.payer,
      amount: event.args!.amount.toString(),
      expiresAt: Number(event.args!.expiresAt),
      timestamp: Number(event.args!.timestamp),
      txHash: event.transactionHash,
    }));
  } catch (error) {
    console.error("Error getting purchase events:", error);
    return [];
  }
}

/**
 * Convert UUID to bytes32 for contract calls
 */
export function uuidToBytes32(uuid: string): string {
  return ethers.id(uuid);
}
