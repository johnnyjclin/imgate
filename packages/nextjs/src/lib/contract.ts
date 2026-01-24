import { ethers } from "ethers";

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
 * Verify purchase by checking for Purchased event
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
    const { contract, provider } = getContract();

    // Convert assetId to bytes32 if it's a UUID
    const assetIdBytes32 = ethers.id(assetId);

    // Get current block number
    const currentBlock = await provider.getBlockNumber();
    // Query only last 90,000 blocks to stay under RPC limit
    const fromBlock = Math.max(0, currentBlock - 90000);

    // Query for Purchased events with block range limit
    const filter = contract.filters.Purchased(assetIdBytes32, payer);
    const events = await contract.queryFilter(filter, fromBlock, 'latest');

    if (events.length === 0) {
      return null;
    }

    // Get the most recent purchase
    const latestEvent = events[events.length - 1];
    const args = latestEvent.args;

    if (!args) {
      return null;
    }

    const expiresAt = Number(args.expiresAt);
    const isValid = expiresAt > Math.floor(Date.now() / 1000);

    return {
      txHash: latestEvent.transactionHash,
      amount: args.amount.toString(),
      expiresAt,
      isValid,
    };
  } catch (error) {
    console.error("Error verifying purchase:", error);
    return null;
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
    const { contract } = getContract();

    const assetIdBytes32 = ethers.id(assetId);
    const filter = contract.filters.Purchased(assetIdBytes32);
    const events = await contract.queryFilter(filter);

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
