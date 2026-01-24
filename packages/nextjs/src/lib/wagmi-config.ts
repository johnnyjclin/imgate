import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia, base, mainnet, sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Imgate',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [baseSepolia, base, mainnet, sepolia],
  ssr: true, // If your dApp uses server side rendering (SSR)
});
