import { ServerConfig } from './types.js';

/**
 * Load configuration from environment variables
 */
export function loadConfig(): ServerConfig {
  return {
    apiUrl: process.env.IMGATE_API_URL || 'http://localhost:3000',
    appUrl: process.env.IMGATE_APP_URL || 'http://localhost:3000',
    mongoUri: process.env.MONGODB_URI,
    mongoDbName: process.env.MONGODB_DB_NAME || 'imgate',
    chainId: process.env.NEXT_PUBLIC_CHAIN_ID || '84532',
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://sepolia.base.org',
    contractAddress: process.env.NEXT_PUBLIC_IMGATE_CONTRACT_ADDRESS,
    usdcAddress: process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    cdpApiKeyName: process.env.CDP_API_KEY_NAME,
    cdpApiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY
  };
}
