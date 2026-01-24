'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export function WalletButton() {
  return (
    <ConnectButton 
      chainStatus="full" 
      showBalance={true}
      accountStatus="full"
    />
  );
}
