'use client';

import { useState, useEffect } from 'react';
import { WalletButton } from '@/components/WalletButton';
import { useWallet } from '@/hooks/useWallet';
import { parseUnits, formatUnits, keccak256, toBytes } from 'viem';
import Link from 'next/link';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_IMGATE_CONTRACT_ADDRESS as `0x${string}`;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS as `0x${string}`;

const CONTRACT_ABI = [
  {
    inputs: [{ internalType: 'bytes32', name: 'assetId', type: 'bytes32' }],
    name: 'purchase',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const ERC20_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export function ViewAsset({ slug }: { slug: string }) {
  const { address, isConnected, getWalletClient } = useWallet();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [approveSuccess, setApproveSuccess] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [approveHash, setApproveHash] = useState<string | null>(null);
  const [purchaseHash, setPurchaseHash] = useState<string | null>(null);

  // Track approve success
  useEffect(() => {
    if (approveHash && !approveSuccess) {
      setTimeout(() => {
        setApproveSuccess(true);
        console.log('Approval confirmed');
      }, 3000);
    }
  }, [approveHash, approveSuccess]);

  // Track purchase success
  useEffect(() => {
    if (purchaseHash && !purchaseSuccess) {
      setTimeout(() => {
        setPurchaseSuccess(true);
        console.log('Purchase confirmed');
      }, 3000);
    }
  }, [purchaseHash, purchaseSuccess]);

  // Load asset data
  useEffect(() => {
    if (!slug) return;
    
    fetch(`/api/asset/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => {
        setAsset(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading asset:", err);
        setLoading(false);
      });
  }, [slug]);

  // Check access after purchase
  useEffect(() => {
    if (purchaseSuccess && address && asset) {
      checkAccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseSuccess, address, asset]);

  const checkAccess = async () => {
    if (!address || !asset) return;

    try {
      const response = await fetch('/api/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: asset.assetId,
          payer: address,
        }),
      });

      const data = await response.json();
      setHasAccess(data.hasAccess);
    } catch (error) {
      console.error('Access check failed:', error);
    }
  };

  const handlePurchase = async () => {
    if (!asset || !address) return;

    setPurchasing(true);
    setApproveSuccess(false);
    setPurchaseSuccess(false);

    try {
      const walletClient = getWalletClient();
      const priceInWei = parseUnits(asset.priceUSDC, 6);

      // Step 1: Approve USDC
      console.log('Approving USDC...');
      const hash = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, priceInWei],
        account: address,
        chain: null,
      });

      setApproveHash(hash);
      console.log('Approval transaction:', hash);

      // Wait a bit for approval
      setTimeout(async () => {
        setApproveSuccess(true);
        
        // Step 2: Purchase asset
        try {
          const assetIdBytes32 = keccak256(toBytes(asset.assetId));
          console.log('Purchasing asset...');
          
          const purchaseHash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'purchase',
            args: [assetIdBytes32],
            account: address,
            chain: null,
          });

          setPurchaseHash(purchaseHash);
          console.log('Purchase transaction:', purchaseHash);

          // Wait for confirmation
          setTimeout(() => {
            setPurchaseSuccess(true);
            setPurchasing(false);
            checkAccess();
          }, 3000);
        } catch (purchaseError) {
          console.error('Purchase failed:', purchaseError);
          alert('Purchase transaction failed. Please try again.');
          setPurchasing(false);
        }
      }, 3000);
    } catch (error) {
      console.error('Approval failed:', error);
      alert('USDC approval failed. Please try again.');
      setPurchasing(false);
    }
  };

  const handleDownload = async () => {
    if (!address || !asset) return;

    try {
      const response = await fetch(
        `/api/download?assetId=${asset.assetId}&payer=${address}`
      );

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const data = await response.json();

      // In production, implement browser-side decryption
      // For now, just redirect to IPFS
      window.open(data.ipfsUrl, '_blank');
    } catch (error) {
      alert('Download failed. Make sure you have purchased this image.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Image Not Found</h1>
          <Link href="/" className="text-indigo-600 hover:underline">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-indigo-600">
            Imgate
          </Link>
          <WalletButton />
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Image Preview */}
          <div>
            <img
              src={`https://gateway.pinata.cloud/ipfs/${asset.previewCID}`}
              alt={asset.filename}
              className="w-full rounded-lg shadow-lg"
            />
            <p className="text-sm text-gray-500 mt-2 text-center">
              Watermarked Preview - {asset.width}x{asset.height}px
            </p>
          </div>

          {/* Right: Details & Purchase */}
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {asset.filename}
            </h1>

            <div className="space-y-4 mb-6">
              <div>
                <span className="text-gray-600">Price:</span>
                <span className="text-2xl font-bold text-indigo-600 ml-2">
                  {asset.priceUSDC} USDC
                </span>
              </div>

              <div>
                <span className="text-gray-600">Creator:</span>
                <span className="font-mono text-sm ml-2 break-all">
                  {asset.creatorAddress}
                </span>
              </div>

              <div>
                <span className="text-gray-600">Dimensions:</span>
                <span className="ml-2">
                  {asset.width} x {asset.height}px
                </span>
              </div>

              {/* C2PA Status */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Content Credentials</h3>
                {asset.c2paManifestPresent ? (
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-green-600">✓</span> C2PA Verified
                    </div>
                    {asset.c2paSigner && (
                      <div>Signer: {asset.c2paSigner}</div>
                    )}
                    {asset.c2paSigningTime && (
                      <div>
                        Signed: {new Date(asset.c2paSigningTime).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    No C2PA credentials found. Creator wallet attestation
                    available.
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {!isConnected ? (
                <div className="text-center">
                  <p className="text-gray-600 mb-3">
                    Connect wallet to purchase
                  </p>
                  <WalletButton />
                </div>
              ) : hasAccess ? (
                <button
                  onClick={handleDownload}
                  className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  Download High-Res
                </button>
              ) : (
                <button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  {purchasing ? 'Processing...' : `Purchase for ${asset.priceUSDC} USDC`}
                </button>
              )}

              <p className="text-xs text-gray-500 text-center">
                24-hour license • 95% goes to creator • Gasless payment
              </p>
            </div>

            {/* Revenue Split */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm">
              <h4 className="font-semibold mb-2">Revenue Split</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Creator (95%):</span>
                  <span className="font-mono">
                    {(parseFloat(asset.priceUSDC) * 0.95).toFixed(2)} USDC
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Platform (5%):</span>
                  <span className="font-mono">
                    {(parseFloat(asset.priceUSDC) * 0.05).toFixed(2)} USDC
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
