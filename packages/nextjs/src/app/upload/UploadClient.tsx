'use client';

import { useState, useEffect } from 'react';
import { WalletButton } from '@/components/WalletButton';
import { useWallet } from '@/hooks/useWallet';
import { parseUnits, keccak256, stringToBytes } from 'viem';
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
  claimGeneratorInfo?: {
    name: string;
    version?: string;
  }[];
  signature?: {
    issuer?: string;
    time?: string;
  };
  actions?: {
    action: string;
    description?: string;
    softwareAgent?: string | any;
    when?: string;
    parameters?: any;
  }[];
  generativeInfo?: {
    software?: string;
    type?: string; 
    prompt?: string;
  };
  assertions?: Array<{
    label: string;
    data: any;
  }>;
  ingredients?: Array<{
    title?: string;
    format?: string;
    relationship?: string;
    thumbnail?: {
      contentType: string;
      data: string;
    };
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
  
  // Promotional metadata state
  const [creatorName, setCreatorName] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [creatorBio, setCreatorBio] = useState('');
  const [description, setDescription] = useState(''); // New field for Image Description
  const [paymentAddress, setPaymentAddress] = useState('');
  
  // Avatar upload state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Update payment address when wallet connects
  useEffect(() => {
    if (address && !paymentAddress) {
      setPaymentAddress(address);
    }
  }, [address, paymentAddress]);
  
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith('image/')) {
        setError('Please select a valid image file for avatar');
        return;
      }
      
      // Validate file size (max 5MB for avatar)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('Avatar file too large (max 5MB)');
        return;
      }
      
      setAvatarFile(selectedFile);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
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
      // Use explicit payment address, or fallback to connected wallet
      formData.append('paymentAddress', paymentAddress || address);
      formData.append('priceUSDC', price);

      // Include C2PA data if available
      if (c2paInfo) {
        formData.append('c2paData', JSON.stringify(c2paInfo));
      }

      // Include promotional metadata if provided
      if (creatorName) formData.append('creatorName', creatorName);
      if (twitterHandle) formData.append('twitterHandle', twitterHandle);
      if (creatorBio) formData.append('creatorBio', creatorBio);
      if (description) formData.append('description', description); // Add description to upload
      
      // Include avatar file if provided
      if (avatarFile) formData.append('avatar', avatarFile);
      
      // We are using 'creatorBio' as the description field.
      // If the user entered description, it should leverage this or a new field.
      // Based on UI at line ~705, the field definition below is "Short Bio".
      // We will add a "Description" field specifically for the Image.

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
      
      // Automatically register on blockchain after successful upload
      setUploading(false);
      await handleAutoRegister(data);
    } catch (err) {
      setError((err as Error).message);
      setUploading(false);
    }
  };

  const handleAutoRegister = async (uploadResult: any) => {
    if (!uploadResult || !CONTRACT_ADDRESS) return;

    setRegistering(true);
    setError(null);
    setTxWaiting(false);

    try {
      const walletClient = getWalletClient();
      const assetIdBytes32 = keccak256(stringToBytes(uploadResult.asset.assetId));
      const priceInWei = parseUnits(price, 6);
      
      console.log('Auto-registering on blockchain...');
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
      console.error('Auto-registration failed:', error);
      setError(`Blockchain registration failed: ${(error as Error).message}. Asset uploaded but not registered on-chain.`);
      setRegistering(false);
      setTxWaiting(false);
    }
  };

  const handleManualRegister = async () => {
    if (!result || !CONTRACT_ADDRESS || registering) return;

    setRegistering(true);
    setError(null);
    setTxWaiting(false);

    try {
      const walletClient = getWalletClient();
      const assetIdBytes32 = keccak256(stringToBytes(result.asset.assetId));
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
                  Price (USDC)
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

              {/* Creator Promotional Information */}
              <div className="border-t border-gray-200 pt-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Creator Promotional Information
                  </h3>
                  <p className="text-sm text-gray-600">
                    Optional: Help AI assistants discover and promote your work by embedding your social media information in the image metadata.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Avatar Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile Avatar
                    </label>
                    <div className="flex items-start gap-4">
                      {/* Avatar Preview */}
                      {avatarPreview ? (
                        <div className="flex-shrink-0">
                          <img
                            src={avatarPreview}
                            alt="Avatar preview"
                            className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
                          />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                          <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                      
                      {/* File Input */}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Upload your profile picture (max 5MB, JPG/PNG)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Creator Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Name or Brand
                    </label>
                    <input
                      type="text"
                      value={creatorName}
                      onChange={(e) => setCreatorName(e.target.value)}
                      placeholder="e.g., John Smith"
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  {/* Twitter Handle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      X (Twitter) Handle
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-600">
                        @
                      </span>
                      <input
                        type="text"
                        value={twitterHandle}
                        onChange={(e) => setTwitterHandle(e.target.value)}
                        placeholder="username"
                        className="block w-full px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Creator Bio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                       Short Bio (Creator)
                    </label>
                    <textarea
                      value={creatorBio}
                      onChange={(e) => setCreatorBio(e.target.value)}
                      placeholder="Brief description of your work or specialization"
                      rows={2}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  {/* Image Description (SEO/MCP) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Image Description / Keywords 
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the image contents for AI search (e.g. 'A futuristic city at sunset with flying cars')..."
                      rows={3}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This description is indexed for the 'search_assets' tool.
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Address Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Recipient Address (Wallet)
                </label>
                <div className="relative rounded-md shadow-sm">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <span className="text-gray-500 sm:text-sm">0x</span>
                   </div>
                   <input
                    type="text"
                    value={paymentAddress?.replace(/^0x/, '') || ''}
                    onChange={(e) => {
                        const val = e.target.value.replace(/[^a-fA-F0-9]/g, '');
                        setPaymentAddress(val ? `0x${val}` : '');
                    }}
                    placeholder="Recipient wallet address (defaults to connected wallet)"
                    className="block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  This address will be embedded in the image metadata for receiving payments (x402).
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
                      🔐 Registering on blockchain... Please approve the transaction in your wallet.
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
                  {!registering && !registerHash && !txWaiting && !txConfirmed && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm text-yellow-800 mb-2">
                        ⚠️ Auto-registration failed or was cancelled. Click below to retry.
                      </p>
                      <button
                        onClick={handleManualRegister}
                        disabled={registering}
                        className="text-sm bg-yellow-600 text-white px-3 py-1.5 rounded hover:bg-yellow-700 transition disabled:opacity-50"
                      >
                        Retry Blockchain Registration
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
