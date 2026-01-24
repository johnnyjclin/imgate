'use client';

import { useState, useEffect } from 'react';
import { WalletButton } from '@/components/WalletButton';
import { useWallet } from '@/hooks/useWallet';
import { parseUnits, keccak256, toBytes } from 'viem';
import Link from 'next/link';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_IMGATE_CONTRACT_ADDRESS as `0x${string}`;

// Debug: Check if env var is loaded
console.log('Upload page - CONTRACT_ADDRESS:', CONTRACT_ADDRESS);

const CONTRACT_ABI = [
  {
    inputs: [
      { internalType: 'bytes32', name: 'assetId', type: 'bytes32' },
      { internalType: 'uint256', name: 'price', type: 'uint256' },
    ],
    name: 'registerAsset',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

interface C2PAInfo {
  manifestPresent: boolean;
  title?: string;
  claimGenerator?: string;
  signature?: {
    issuer?: string;
    time?: string;
  };
  assertions?: Array<{
    label: string;
    data: any;
  }>;
  ingredients?: Array<{
    title?: string;
    relationship?: string;
  }>;
}

export default function UploadPage() {
  const { address, isConnected, getWalletClient } = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [price, setPrice] = useState('10');
  const [preview, setPreview] = useState<string | null>(null);
  const [c2paInfo, setC2paInfo] = useState<C2PAInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerHash, setRegisterHash] = useState<string | null>(null);
  const [txWaiting, setTxWaiting] = useState(false);
  const [txConfirmed, setTxConfirmed] = useState(false);
  
  // Track transaction confirmation status
  useEffect(() => {
    if (registerHash && !txWaiting && !txConfirmed) {
      setTxWaiting(true);
      setRegistering(false);
      console.log('Transaction sent:', registerHash);
      
      // Simulate waiting (in production, use publicClient.waitForTransactionReceipt)
      setTimeout(() => {
        setTxConfirmed(true);
        setTxWaiting(false);
        console.log('Transaction confirmed!');
      }, 5000); // Wait 5 seconds as a simple indicator
    }
  }, [registerHash, txWaiting, txConfirmed]);
  
  // Manual C2PA claim inputs
  const [addingClaim, setAddingClaim] = useState(false);
  const [claimCreator, setClaimCreator] = useState('');
  const [claimTool, setClaimTool] = useState('');
  const [claimNotes, setClaimNotes] = useState('');

  // useEffect(() => {
  //   if (isRegisterSuccess) {
  //     console.log('Asset registered on blockchain!');
  //     setRegistering(false);
  //     setTxWaiting(false);
  //   }
  // }, [isRegisterSuccess]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
      setC2paInfo(null);
      setRegistering(false);
      setRegisterHash(null);
      setTxWaiting(false);
      setTxConfirmed(false);

      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);

      // Defer C2PA parsing to not block UI
      setTimeout(async () => {
        try {
          const arrayBuffer = await selectedFile.arrayBuffer();
          const response = await fetch('/api/parse-c2pa', {
            method: 'POST',
            headers: { 
              'Content-Type': selectedFile.type || 'image/jpeg'
            },
            body: arrayBuffer,
          });

          if (response.ok) {
            const c2paData = await response.json();
            setC2paInfo(c2paData);
            
            if (!c2paData.manifestPresent) {
              setAddingClaim(true);
            }
          }
        } catch (err) {
          console.error('Error parsing C2PA:', err);
          setAddingClaim(true);
        }
      }, 100);
    }
  };

  const handleAddManualClaim = () => {
    if (claimCreator || claimTool || claimNotes) {
      setC2paInfo({
        manifestPresent: true,
        title: file?.name || 'Uploaded Image',
        claimGenerator: claimTool || 'Manual Upload',
        signature: {
          issuer: claimCreator || address || 'Unknown',
          time: new Date().toISOString(),
        },
        assertions: [
          {
            label: 'Creator Statement',
            data: claimNotes || 'Original work uploaded to Imgate'
          },
          {
            label: 'Upload Method',
            data: 'Direct upload to Imgate platform'
          }
        ]
      });
      setAddingClaim(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !address) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('creatorAddress', address);
      formData.append('priceUSDC', price);

      // Include C2PA data if available
      if (c2paInfo) {
        formData.append('c2paData', JSON.stringify(c2paInfo));
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleManualRegister = async () => {
    if (!result || !CONTRACT_ADDRESS || registering) return;

    setRegistering(true);
    setError(null);
    setTxWaiting(false);

    try {
      const walletClient = getWalletClient();
      const assetIdBytes32 = keccak256(toBytes(result.asset.assetId));
      const priceInWei = parseUnits(price, 6);
      
      console.log('Starting blockchain registration...');
      console.log('Asset ID (bytes32):', assetIdBytes32);
      console.log('Price:', priceInWei.toString());

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'registerAsset',
        args: [assetIdBytes32, priceInWei],
        account: address,
        chain: null,
      });

      setRegisterHash(hash);
      setRegistering(false);
      setTxWaiting(true);
      console.log('Registration transaction initiated:', hash);

      // Wait for confirmation
      setTimeout(() => {
        setTxConfirmed(true);
        setTxWaiting(false);
        console.log('Transaction confirmed!');
      }, 5000);
    } catch (error) {
      console.error('Manual registration failed:', error);
      setError(`Registration failed: ${(error as Error).message}`);
      setRegistering(false);
      setTxWaiting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-indigo-600">
            Imgate
          </Link>
          <div className="flex gap-4 items-center">
            <Link
              href="/upload"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Upload
            </Link>
            <Link
              href="/dashboard"
              className="text-gray-700 hover:text-indigo-600 font-medium"
            >
              Dashboard
            </Link>
            <WalletButton />
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Upload Your Image
        </h1>
        <p className="text-gray-600 mb-8">
          Create a short URL with encrypted IPFS storage
        </p>

        {!isConnected ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <p className="text-gray-600 mb-4">
              Connect your wallet to start uploading
            </p>
            <WalletButton />
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Image
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-indigo-50 file:text-indigo-700
                    hover:file:bg-indigo-100 cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported: JPEG, PNG, WebP (max 50MB)
                </p>
              </div>

              {/* Preview */}
              {preview && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview
                  </label>
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-w-full max-h-96 rounded-lg border"
                  />
                </div>
              )}

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                

              {/* C2PA Content Credentials */}
              {c2paInfo && c2paInfo.manifestPresent && (
                <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">✓</span>
                    <h3 className="text-xl font-bold text-green-800">
                      Content Credentials Detected
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Asset Title */}
                    {c2paInfo.title && (
                      <div className="pb-3 border-b border-green-200">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {c2paInfo.title}
                        </h4>
                      </div>
                    )}
                    
                    {/* Signed By */}
                    {c2paInfo.signature?.issuer && (
                      <div>
                        <div className="text-sm font-medium text-gray-500 mb-1">
                          Issued by
                        </div>
                        <div className="text-base font-semibold text-gray-900">
                          {c2paInfo.signature.issuer}
                        </div>
                        {c2paInfo.signature.time && (
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(c2paInfo.signature.time).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Content Summary - Check for AI generation */}
                    {c2paInfo.assertions && c2paInfo.assertions.some((a: any) => 
                      a.label.includes('ai') || a.label.includes('generation')
                    ) && (
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-600 text-lg">ⓘ</span>
                          <div>
                            <div className="font-medium text-blue-900 text-sm">
                              Content Summary
                            </div>
                            <div className="text-blue-800 text-sm mt-1">
                              This content was generated with an AI tool
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Process - App/Device Used */}
                    {c2paInfo.claimGenerator && (
                      <div>
                        <div className="text-sm font-medium text-gray-500 mb-1">
                          Process
                        </div>
                        <div className="bg-white border border-gray-200 p-3 rounded">
                          <div className="text-xs text-gray-500 mb-1">
                            App or device used
                          </div>
                          <div className="text-sm text-gray-900 font-medium">
                            {c2paInfo.claimGenerator}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Assertions/Claims */}
                    {c2paInfo.assertions && c2paInfo.assertions.length > 0 && (
                      <div>
                        <details className="group">
                          <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2">
                            <span className="transform transition-transform group-open:rotate-90">
                              ▶
                            </span>
                            Claims ({c2paInfo.assertions.length})
                          </summary>
                          <div className="mt-2 ml-6 space-y-2">
                            {c2paInfo.assertions.map((assertion: any, idx: number) => (
                              <div key={idx} className="text-xs bg-gray-50 p-3 rounded border border-gray-200">
                                <div className="font-semibold text-gray-800 mb-2">
                                  {assertion.label}
                                </div>
                                {assertion.data && (
                                  <div className="text-gray-600 ml-2">
                                    {/* Actions */}
                                    {assertion.label.includes('actions') && Array.isArray(assertion.data) && (
                                      <div className="space-y-1">
                                        {assertion.data.map((action: any, i: number) => (
                                          <div key={i} className="pl-2 border-l-2 border-blue-300">
                                            <div className="font-medium">{action.action || 'Unknown action'}</div>
                                            {action.softwareAgent && (
                                              <div className="text-xs text-gray-500">Tool: {action.softwareAgent}</div>
                                            )}
                                            {action.when && (
                                              <div className="text-xs text-gray-500">
                                                {new Date(action.when).toLocaleString()}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Creative Work */}
                                    {assertion.label.includes('CreativeWork') && typeof assertion.data === 'object' && (
                                      <div className="space-y-1">
                                        {assertion.data.author && (
                                          <div><strong>Author:</strong> {JSON.stringify(assertion.data.author)}</div>
                                        )}
                                        {assertion.data.datePublished && (
                                          <div><strong>Published:</strong> {assertion.data.datePublished}</div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Hash */}
                                    {assertion.label.includes('hash') && (
                                      <div className="font-mono text-xs break-all">
                                        {typeof assertion.data === 'string' 
                                          ? assertion.data 
                                          : JSON.stringify(assertion.data, null, 2)}
                                      </div>
                                    )}
                                    
                                    {/* Generic display */}
                                    {!assertion.label.includes('actions') && 
                                     !assertion.label.includes('CreativeWork') &&
                                     !assertion.label.includes('hash') && (
                                      <pre className="text-xs overflow-auto max-h-32 bg-white p-2 rounded">
                                        {typeof assertion.data === 'string' 
                                          ? assertion.data 
                                          : JSON.stringify(assertion.data, null, 2)}
                                      </pre>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                    
                    {/* Source Materials */}
                    {c2paInfo.ingredients && c2paInfo.ingredients.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-500 mb-2">
                          Source Materials
                        </div>
                        <div className="space-y-1">
                          {c2paInfo.ingredients.map((ing: any, idx: number) => (
                            <div key={idx} className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                              • {ing.title || `Source ${idx + 1}`}
                              {ing.relationship && (
                                <span className="text-xs text-gray-500 ml-2">
                                  ({ing.relationship})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Verification Link */}
                    <div className="pt-3 border-t border-green-200">
                      <a
                        href="https://verify.contentauthenticity.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-700 hover:text-green-800 underline"
                      >
                        Verify at contentauthenticity.org →
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {c2paInfo && !c2paInfo.manifestPresent && (
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">ℹ️</span>
                    <p className="text-sm text-gray-600">
                      No C2PA content credentials found in this image
                    </p>
                  </div>
                </div>
              )}

              {/* Manual Claim Entry */}
              {addingClaim && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">
                    Add Content Provenance (Optional)
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Creator/Artist Name
                      </label>
                      <input
                        type="text"
                        value={claimCreator}
                        onChange={(e) => setClaimCreator(e.target.value)}
                        placeholder="Your name or artist name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Created With (Tool/Camera)
                      </label>
                      <input
                        type="text"
                        value={claimTool}
                        onChange={(e) => setClaimTool(e.target.value)}
                        placeholder="e.g., Photoshop, Canon EOS R5, Midjourney"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes/Description
                      </label>
                      <textarea
                        value={claimNotes}
                        onChange={(e) => setClaimNotes(e.target.value)}
                        placeholder="Brief description of the work or creation process"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddManualClaim}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                      >
                        Add Provenance Info
                      </button>
                      <button
                        onClick={() => setAddingClaim(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </div>
              )}  Price (USDC)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="0"
                  step="0.01"
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You receive 95% ({(parseFloat(price) * 0.95).toFixed(2)} USDC)
                </p>
              </div>

              {/* Upload Button */}
              <button
                onClick={() => handleUpload()}
                disabled={!file || uploading}
                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {uploading ? 'Uploading...' : 'Upload & Generate Short URL'}
              </button>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Success */}
              {result && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <p className="text-green-800 font-semibold mb-2">
                    Upload Successful! 🎉
                  </p>
                  {registering && !registerHash && (
                    <div className="mb-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 p-3 rounded">
                      🔐 Please approve the transaction in your wallet...
                    </div>
                  )}
                  {registerHash && txWaiting && !txConfirmed && (
                    <div className="mb-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 p-3 rounded">
                      ⏳ Transaction submitted! Waiting for confirmation on blockchain...
                      <div className="text-xs mt-1 font-mono break-all">
                        Tx: {registerHash.slice(0, 10)}...{registerHash.slice(-8)}
                      </div>
                      <div className="text-xs mt-1 text-gray-600">
                        This may take 1-2 minutes. You can safely navigate away.
                      </div>
                    </div>
                  )}
                  {!txWaiting && !txConfirmed && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm text-yellow-800 mb-2">
                        Asset uploaded! Click below to register on blockchain.
                      </p>
                      <button
                        onClick={handleManualRegister}
                        disabled={registering}
                        className="text-sm bg-yellow-600 text-white px-3 py-1.5 rounded hover:bg-yellow-700 transition disabled:opacity-50"
                      >
                        Register on Blockchain
                      </button>
                    </div>
                  )}
                  {txConfirmed && (
                    <div className="mb-2 text-sm text-green-700">
                      ✓ Asset registered on blockchain! Ready for purchase.
                    </div>
                  )}
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Short URL:</span>
                      <Link
                        href={`/${result.asset.slug}`}
                        className="text-indigo-600 hover:underline ml-2"
                      >
                        {result.asset.shortUrl}
                      </Link>
                    </div>
                    <div>
                      <span className="font-medium">Asset ID:</span>
                      <span className="text-gray-600 ml-2 font-mono text-xs">
                        {result.asset.assetId}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Preview CID:</span>
                      <span className="text-gray-600 ml-2 font-mono text-xs">
                        {result.asset.previewCID}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/${result.asset.slug}`}
                    className="inline-block mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                  >
                    View Your Image
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
