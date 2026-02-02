'use client';

import { useAccount, useWalletClient, usePublicClient } from 'wagmi';

// Custom hook to get wallet connection state compatible with existing code
export function useWallet() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const getWalletClient = () => {
    if (!walletClient) {
      throw new Error('No wallet connected');
    }
    return walletClient;
  };

  const getPublicClient = () => {
    if (!publicClient) {
      throw new Error('No public client available');
    }
    return publicClient;
  };

  return { address, isConnected, getWalletClient, getPublicClient };
}
