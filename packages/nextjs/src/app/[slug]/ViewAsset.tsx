'use client';

import { useState, useEffect } from 'react';
import { WalletButton } from '@/components/WalletButton';
import { useWallet } from '@/hooks/useWallet';
import { usePublicClient } from 'wagmi';
import { parseUnits, formatUnits, keccak256, stringToBytes } from 'viem';
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
  const publicClient = usePublicClient();
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

  const checkAccess = async (txHash?: string) => {
    if (!address || !asset) return;

    try {
      const response = await fetch('/api/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: asset.assetId,
          payer: address,
          txHash: txHash // Pass txHash if we just purchased
        }),
      });

      const data = await response.json();
      setHasAccess(data.hasAccess);
    } catch (error) {
      console.error('Access check failed:', error);
    }
  };

  const handlePurchase = async () => {
    if (!asset || !address || !publicClient) return;

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
      
      // Wait for approval confirmation
      console.log('Waiting for approval confirmation...');
      await publicClient.waitForTransactionReceipt({ hash });
      setApproveSuccess(true);
      console.log('Approval confirmed');
      
      // Step 2: Purchase asset
      try {
        const assetIdBytes32 = keccak256(stringToBytes(asset.assetId));
        console.log('Purchasing asset...', assetIdBytes32);
        
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

        // Wait for purchase confirmation
        console.log('Waiting for purchase confirmation...');
        await publicClient.waitForTransactionReceipt({ hash: purchaseHash });
        setPurchaseSuccess(true);
        console.log('Purchase confirmed');
        
        // Immediately verify and unlock using the txHash (x402 style verification)
        // No need to wait for indexers or timeouts
        setPurchasing(false);
        checkAccess(purchaseHash);
          
      } catch (purchaseError) {
        console.error('Purchase failed:', purchaseError);
        alert('Purchase transaction failed. Please try again.');
        setPurchasing(false);
      }
    } catch (error) {
      console.error('Approval failed:', error);
      alert('USDC approval failed. Please try again.');
      setPurchasing(false);
    }
  };

  const handleDownload = async () => {
    if (!address || !asset) return;

    try {
      // Use Server-Side JIT Signing Flow (mode=direct)
      // This ensures the asset is freshly signed with C2PA credentials including the purchase info
      const downloadUrl = `/api/download?assetId=${asset.assetId}&payer=${address}&mode=direct`;

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        let errorMessage = response.statusText;
        try {
          const data = await response.json();
          if (data.error) errorMessage = data.error;
        } catch (e) {
          // Ignore JSON parse error
        }
        throw new Error(`Download failed: ${errorMessage}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = asset.filename || `imgate-${asset.slug}.jpg`;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Verify C2PA on external site (optional user flow)
      if (confirm('Download complete! Verify C2PA credentials on contentcredentials.org?')) {
        window.open('https://contentcredentials.org/verify', '_blank');
      }

    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed. ' + (error as Error).message);
    }
  };

  const handleDownloadPreview = async () => {
    if (!asset) return;
    try {
        // Fetch blob to force download (avoids opening in tab for cross-origin)
        const url = `https://gateway.pinata.cloud/ipfs/${asset.previewCID}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch preview");
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `preview-${asset.filename}`;
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
    } catch (e) {
        console.error(e);
        alert("Failed to download preview");
    }
  };

  // Helper function for decryption
  const decryptFile = async (encryptedData: ArrayBuffer, keyBase64: string): Promise<ArrayBuffer> => {
    // Import encryption utils here or use Web Crypto API directly
    const keyBytes = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyBytes,
      "AES-GCM",
      true,
      ["decrypt"]
    );

    const data = new Uint8Array(encryptedData);
    const salt = data.slice(0, 64); // Salt (64 bytes)
    const iv = data.slice(64, 64 + 16); // IV (16 bytes)
    const authTag = data.slice(64 + 16, 64 + 16 + 16); // Auth Tag (16 bytes)
    const encryptedContent = data.slice(64 + 16 + 16); // Encrypted Content

    // Note: Node.js crypto.createCipheriv handles auth tag differently than Web Crypto API.
    // In Node.js (used in encryption.ts), authTag is appended or handled separately.
    // If using Web Crypto API for decryption, we usually need the ciphertext to include the tag at the end.
    // Our encryption.ts structure: Salt (64) + IV (16) + AuthTag (16) + Ciphertext
    // Web Crypto expect: IV (param) + Ciphertext + Tag (appended)
    
    // Construct buffer for Web Crypto: Ciphertext + AuthTag
    const dataToDecrypt = new Uint8Array(encryptedContent.length + authTag.length);
    dataToDecrypt.set(encryptedContent);
    dataToDecrypt.set(authTag, encryptedContent.length);

    return await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
        tagLength: 128, // 16 bytes * 8
      },
      cryptoKey,
      dataToDecrypt
    );
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
          <div className="flex flex-col">
            <img
              src={`https://gateway.pinata.cloud/ipfs/${asset.previewCID}`}
              alt={asset.filename}
              className="w-full rounded-lg shadow-lg"
            />
            <div className="flex justify-between items-center mt-3 px-1">
                <p className="text-sm text-gray-500">
                Watermarked Preview - {asset.width}x{asset.height}px
                </p>
                <button 
                    onClick={handleDownloadPreview}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                    title="Download preview with embedded C2PA Paywall info"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 9.75v10.32m0 0L8.25 16.5m3.75 3.575 3.75-3.575M12 9.75V3" />
                    </svg>
                    Download Preview
                </button>
            </div>
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
