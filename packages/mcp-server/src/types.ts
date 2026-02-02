/**
 * Asset metadata structure from Imgate API
 */
export interface Asset {
  assetId: string;
  slug: string;
  creatorAddress: string;
  originHash: string;
  previewCID: string;
  encryptedCID: string;
  priceUSDC: string;
  filename: string;
  width: number;
  height: number;
  c2paManifestPresent: boolean;
  c2paSigner?: string;
  c2paSigningTime?: string;
  c2paClaims?: any;
  createdAt: number;
  creatorName?: string;
  twitterHandle?: string;
  creatorBio?: string;
  description?: string;
}

/**
 * Purchase record structure
 */
export interface Purchase {
  assetId: string;
  payer: string;
  txHash: string;
  amount: string;
  expiresAt: number;
  timestamp: number;
}

/**
 * Configuration for the MCP server
 */
export interface ServerConfig {
  apiUrl: string;
  appUrl: string;
  mongoUri?: string;
  mongoDbName?: string;
  chainId?: string;
  rpcUrl?: string;
  contractAddress?: string;
  usdcAddress?: string;
  cdpApiKeyName?: string;
  cdpApiKeyPrivateKey?: string;
}

/**
 * Tool input validation schemas
 */
export interface ReadAssetInput {
  slug?: string;
  assetId?: string;
}

export interface ParseC2PAInput {
  assetId: string;
}

export interface VerifyPurchaseInput {
  assetId: string;
  walletAddress: string;
}

export interface GeneratePaymentLinkInput {
  assetId: string;
  slug?: string;
}
