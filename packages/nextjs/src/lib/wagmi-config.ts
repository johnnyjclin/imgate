import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia, base, mainnet, sepolia } from 'wagmi/chains';

export const BASE_SEPOLIA_USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// Customize chain to change the displayed token symbol
const customBaseSepolia = {
  ...baseSepolia,
  contracts: {
    ...baseSepolia.contracts,
    usdc: {
      address: BASE_SEPOLIA_USDC_ADDRESS,
    },
  },
};

export const config = getDefaultConfig({
  appName: 'Imgate',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [customBaseSepolia, base, mainnet, sepolia],
  ssr: true, // If your dApp uses server side rendering (SSR)
});
