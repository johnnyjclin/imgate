'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance } from 'wagmi';
import { BASE_SEPOLIA_USDC_ADDRESS } from '../lib/wagmi-config';
import { baseSepolia } from 'wagmi/chains';

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { data: usdcBalance } = useBalance({
    address,
    token: BASE_SEPOLIA_USDC_ADDRESS as `0x${string}`,
    chainId: baseSepolia.id,
  });

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button 
                    onClick={openConnectModal} 
                    type="button"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl transition-colors"
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button 
                    onClick={openChainModal} 
                    type="button"
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-xl transition-colors"
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={openChainModal}
                    style={{ display: 'flex', alignItems: 'center' }}
                    type="button"
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-bold py-2 px-4 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 20,
                          height: 20,
                          borderRadius: 999,
                          overflow: 'hidden',
                          marginRight: 4,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 20, height: 20 }}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </button>

                  <button 
                    onClick={openAccountModal} 
                    type="button"
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-bold py-1.5 px-2 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center"
                  >
                     <div className="flex items-center gap-2 mr-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <span className="text-sm font-medium">
                          {usdcBalance 
                            ? `${Number(usdcBalance.formatted).toFixed(2)} USDC`
                            : '0.00 USDC'
                          }
                        </span>
                     </div>
                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline-block">{account.displayName}</span>
                      {/* Avatar placeholder if needed, rainbowkit usually provides it in account.ensAvatar or uses blockie */}
                       {account.ensAvatar ? (
                          <img 
                            src={account.ensAvatar} 
                            alt="ENS Avatar" 
                            className="w-8 h-8 rounded-full" 
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500" />
                        )}
                    </div>
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
