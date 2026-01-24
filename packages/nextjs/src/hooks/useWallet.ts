'use client';

import { useAccount, useWalletClient } from 'wagmi';

// Custom hook to get wallet connection state compatible with existing code
export function useWallet() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const getWalletClient = () => {
    if (!walletClient) {
      throw new Error('No wallet connected');
    }
    return walletClient;
  };

  return { address, isConnected, getWalletClient };
}
