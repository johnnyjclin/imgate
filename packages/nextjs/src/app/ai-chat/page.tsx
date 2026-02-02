'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUp, Sparkles, CheckCircle, ShieldCheck, User, ExternalLink, RefreshCw, ArrowRight, ChevronDown, ChevronUp, Download, Wallet, Copy, Check } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { WalletButton } from '@/components/WalletButton';
import { parseUnits } from 'viem';

// Default data for initial state or fallback
const DEFAULT_ASSET = {
    id: 'asset-001',
    title: 'Neon Tokyo Nights',
    description: 'Cyberpunk inspired street photography in Shinjuku directly from camera with C2PA credentials.',
    imageUrl: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=2070&auto=format&fit=crop',
    price: '45.00',
    creator: {
      name: 'Takeshi K.',
      handle: '@takeshi_shots',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Takeshi',
      bio: 'Award-winning street photographer based in Tokyo. Focused on night scapes and urban life.',
    },
    c2pa: true,
    dimensions: '6000x4000',
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'asset-result' | 'processing' | 'tool-call';
  toolName?: string;
  toolInput?: string;
  data?: any;
};

// Extracted Asset Card Component for managing its own state
function AssetCard({ data, onPurchase }: { data: any; onPurchase: (assetData: any) => void }) {
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = () => {
    const address = data.paymentAddress || data.creatorAddress;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-[#141414] border border-white/10 rounded-xl overflow-hidden shadow-2xl mt-2 group hover:border-indigo-500/50 transition-colors duration-300">
      {/* Header with reasoning */}
      <div className="bg-[#1a1a1a] px-4 py-2 border-b border-white/5 flex items-center gap-2 justify-between">
         <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Tool Output</span>
         </div>
         <span className="text-xs font-mono text-indigo-400">JSON Result</span>
      </div>

      {/* Image Showcase */}
      <div className="relative aspect-video w-full overflow-hidden bg-black flex items-center justify-center">
         <img 
           src={data.imageUrl} 
           alt={data.title}
           className="max-w-full max-h-full object-contain"
         />
         <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 flex items-center gap-1.5">
           <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
           <span className="text-xs font-medium text-white">C2PA Verified</span>
         </div>
      </div>

      {/* Content Details */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 pr-4">
            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-indigo-400 transition-colors">{data.title}</h3>
            <p 
               className={`text-sm text-gray-400 cursor-pointer hover:text-gray-300 transition-colors ${isDescExpanded ? '' : 'line-clamp-2'}`}
               onClick={() => setIsDescExpanded(!isDescExpanded)}
            >
               {data.description} {isDescExpanded ? <span className="text-indigo-400 text-xs ml-1">(Show less)</span> : <span className="text-indigo-400 text-xs ml-1">(Read more)</span>}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-2xl font-bold text-white tracking-tight">${data.price}</span>
            <span className="block text-xs text-gray-500">USDC</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
             <div className="bg-black/20 rounded p-2 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Dimensions</span>
                <span className="text-xs font-mono text-gray-300">{data.dimensions}</span>
             </div>
             <div className="bg-black/20 rounded p-2 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Asset Type</span>
                <span className="text-xs font-mono text-gray-300">JPEG Image</span>
             </div>
          </div>

        <div className="h-px bg-white/10 mb-4" />

        {/* Metadata Card */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-full bg-gray-800 overflow-hidden border border-white/10 shadow-lg">
                  <img src={data.creator.avatar} alt={data.creator.name} className="w-full h-full object-cover" />
               </div>
               <div>
                  <div className="text-base font-bold text-white flex items-center gap-1.5">
                    {data.creator.name}
                    <CheckCircle className="w-4 h-4 text-indigo-500" />
                  </div>
                  <a
                    href={`https://x.com/${data.creator.handle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                    </svg>
                    {data.creator.handle}
                  </a>
               </div>
             </div>
          </div>

          <div className="bg-black/40 rounded-lg p-3 text-sm text-gray-300 leading-relaxed border border-white/5 mb-4">
             {data.creator.bio || "Verified digital content creator on Imgate Protocol."}
          </div>
          
          {/* Payment Section */}
          <div className="border-t border-white/10 pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wider">Creator Wallet</span>
            </div>
            <div className="bg-black/40 rounded-lg p-2 mb-3 border border-white/5 flex items-center justify-between gap-2">
              <code className="text-xs font-mono text-gray-300 truncate">
                {(data.paymentAddress || data.creatorAddress).slice(0, 6)}...{(data.paymentAddress || data.creatorAddress).slice(-4)}
              </code>
              <button
                onClick={handleCopyAddress}
                className="p-1.5 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                title={copied ? 'Copied!' : 'Copy address'}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-gray-400 hover:text-white" />
                )}
              </button>
            </div>
            
            <button 
              onClick={async () => {
                setIsPaying(true);
                try {
                  await onPurchase(data);
                } finally {
                  setIsPaying(false);
                }
              }}
              disabled={isPaying}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-600 text-white text-sm font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40"
            >
              {isPaying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
                  Pay ${data.price} USDC
                </>
              )}
            </button>
          </div>
          
          {/* <div className="grid grid-cols-2 gap-2 mt-3">
             <div className="bg-black/20 rounded p-2 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Dimensions</span>
                <span className="text-xs font-mono text-gray-300">{data.dimensions}</span>
             </div>
             <div className="bg-black/20 rounded p-2 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Asset Type</span>
                <span className="text-xs font-mono text-gray-300">JPEG Image</span>
             </div>
          </div> */}

          {/* <button className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40">
             View Full Details
             <ExternalLink className="w-4 h-4" />
          </button> */}
        </div>
      </div>
    </div>
  );
}

export default function AIChatPage() {
  const { address, isConnected, getWalletClient, getPublicClient } = useWallet();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm Imgate AI. I can help you find licensing-ready images with verifiable C2PA provenance. \n\nTry searching for \"portraits\".",
      type: 'text'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Download modal state
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadData, setDownloadData] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Wallet balance state
  const [ethBalance, setEthBalance] = useState<string>('0.00');
  const [usdcBalance, setUsdcBalance] = useState<string>('0.00');
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // Fetch balances when wallet connects
  useEffect(() => {
    const fetchBalances = async () => {
      if (!address || !isConnected) {
        setEthBalance('0.00');
        setUsdcBalance('0.00');
        return;
      }

      setIsLoadingBalances(true);
      try {
        const publicClient = getPublicClient();
        if (!publicClient) return;

        // Get ETH balance
        const ethBal = await publicClient.getBalance({ address });
        setEthBalance((Number(ethBal) / 1e18).toFixed(4));

        // Get USDC balance (Base Sepolia - Circle USDC)
        const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`;
        const usdcBal = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: [
            {
              name: 'balanceOf',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ type: 'uint256' }]
            }
          ],
          functionName: 'balanceOf',
          args: [address]
        }) as bigint;
        
        setUsdcBalance((Number(usdcBal) / 1e6).toFixed(2));
      } catch (error) {
        console.error('Error fetching balances:', error);
      } finally {
        setIsLoadingBalances(false);
      }
    };

    fetchBalances();
    
    // Refresh balances every 30 seconds
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [address, isConnected]); // Remove getPublicClient from dependencies

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handlePurchase = async (assetData: any) => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      const walletClient = await getWalletClient();
      if (!walletClient) {
        alert('Failed to get wallet client');
        return;
      }

      // USDC contract address on Base Sepolia (Circle USDC)
      const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`;

      // Convert price to USDC (6 decimals)
      const amount = parseUnits(assetData.price, 6);

      // 1. Approve USDC spending
      const approveTx = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: [
          {
            name: 'approve',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ type: 'bool' }]
          }
        ],
        functionName: 'approve',
        args: [assetData.paymentAddress, amount]
      });

      console.log('Approval tx:', approveTx);

      // 2. Show payment verifying message in chat
      setMessages(prev => [...prev, {
        id: Date.now() + '-verify',
        role: 'assistant',
        content: 'Payment Verifying...',
        type: 'processing'
      }]);

      // 3. Verify payment and unlock content
      const verifyRes = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: assetData.id,
          payer: address,
          txHash: approveTx,
          amount: assetData.price
        })
      });

      const verifyData = await verifyRes.json();

      // Remove verifying message
      setMessages(prev => prev.filter(m => !m.id.includes('-verify')));

      if (verifyData.success && verifyData.download) {
        // Show success message
        setMessages(prev => [...prev, {
          id: Date.now() + '-success',
          role: 'assistant',
          content: `✅ Payment confirmed! Transaction: ${approveTx.slice(0, 10)}...\n\nYou can now download the original image.`,
          type: 'text'
        }]);

        // Show download modal
        setDownloadData({
          ...verifyData.download,
          title: assetData.title,
          txHash: approveTx
        });
        setShowDownloadModal(true);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now() + '-error',
          role: 'assistant',
          content: '❌ Payment verification failed: ' + (verifyData.error || 'Please try again.'),
          type: 'text'
        }]);
      }

    } catch (error: any) {
      console.error('Purchase error:', error);
      // Remove verifying message on error
      setMessages(prev => prev.filter(m => !m.id.includes('-verify')));
      
      setMessages(prev => [...prev, {
        id: Date.now() + '-error',
        role: 'assistant',
        content: '❌ Purchase failed: ' + (error.message || 'Unknown error. Please try again.'),
        type: 'text'
      }]);
    }
  };

  const handleDownload = async () => {
    if (!downloadData) return;

    setIsDownloading(true);
    try {
      // Call download API with mode=direct to get the decrypted + C2PA signed image
      const downloadUrl = `/api/download?assetId=${downloadData.assetId}&payer=${address}&mode=direct`;
      
      console.log('Downloading from:', downloadUrl);
      
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Download failed');
      }

      // Get the file blob
      const blob = await response.blob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadData.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessages(prev => [...prev, {
        id: Date.now() + '-download-success',
        role: 'assistant',
        content: '✅ Download complete! Your C2PA-signed original image has been saved.',
        type: 'text'
      }]);
      
      setShowDownloadModal(false);
    } catch (error) {
      console.error('Download error:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + '-download-error',
        role: 'assistant',
        content: '❌ Download failed: ' + (error as Error).message,
        type: 'text'
      }]);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      type: 'text'
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Show processing state
    const processingMsgId = 'processing-' + Date.now();
    setMessages(prev => [...prev, {
      id: processingMsgId,
      role: 'assistant',
      content: 'Thinking...',
      type: 'processing'
    }]);

    try {
      // Call Gemini API
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content }),
      });
      
      const data = await res.json();
      
      // Remove generic processing message
      setMessages(prev => prev.filter(m => m.id !== processingMsgId));

      // 1. If tool use is detected, show the tool call simulation
      if (data.tool) {
         setMessages(prev => [...prev, {
            id: Date.now() + '-tool',
            role: 'assistant',
            content: '',
            type: 'tool-call',
            toolName: data.tool,
            toolInput: data.toolInput
         }]);

         // Artificial delay for tool execution visualization
         await new Promise(r => setTimeout(r, 1200));
      }

      if (data.hasAsset && data.realAssets && data.realAssets.length > 0) {
         // Use REAL data from DB - Take up to 3 assets
         const assetsToShow = data.realAssets.slice(0, 3);
         
         const selectedAssets = assetsToShow.map((asset: any) => {
            // Handle regular IPFS CIDs vs Full URLs (for demo fallback)
            const imageUrl = asset.previewCID.startsWith('http') 
              ? asset.previewCID 
              : `https://gateway.pinata.cloud/ipfs/${asset.previewCID}`;

            // Use uploaded avatar if available, otherwise fallback to Dicebear
            const avatarUrl = asset.creatorAvatar 
              ? `https://gateway.pinata.cloud/ipfs/${asset.creatorAvatar}`
              : `https://api.dicebear.com/7.x/avataaars/svg?seed=${asset.creatorAddress}`;

            return {
                id: asset.assetId,
                title: asset.filename.split('.')[0] || 'Untitled Asset',
                description: asset.description || 'No description provided.',
                imageUrl: imageUrl,
                price: parseFloat(asset.priceUSDC).toFixed(2),
                creator: {
                    name: asset.creatorName || `${asset.creatorAddress.slice(0, 6)}...`,
                    handle: asset.twitterHandle || '@anonymous',
                    avatar: avatarUrl,
                    bio: asset.creatorBio || 'Verified digital content creator on Imgate Protocol.'
                },
                creatorAddress: asset.creatorAddress,
                paymentAddress: asset.paymentAddress || asset.creatorAddress,
                c2pa: asset.c2paManifestPresent,
                dimensions: `${asset.width}x${asset.height}`
            };
         });

         // 2. Add the Asset Card (The Tool Result)
         setMessages(prev => [...prev, {
            id: Date.now() + '-asset',
            role: 'assistant',
            content: '',
            type: 'asset-result',
            data: selectedAssets
         }]);
      } else if (data.hasAsset) {
         // Fallback if API says hasAsset but realAssets is empty
          setMessages(prev => [...prev, {
            id: Date.now() + '-text',
            role: 'assistant',
            content: "I couldn't find any assets matching your criteria.",
            type: 'text'
         }]);
      }

      // 3. Add the final text response
      if (data.text) {
         // Small delay after asset appears
         await new Promise(r => setTimeout(r, 600));
         setMessages(prev => [...prev, {
            id: Date.now() + '-text',
            role: 'assistant',
            content: data.text,
            type: 'text'
         }]);
      } else if (!data.hasAsset) {
          // Fallback text if nothing else
          setMessages(prev => [...prev, {
            id: Date.now() + '-text',
            role: 'assistant',
            content: "I couldn't process that request properly.",
            type: 'text'
         }]);
      }

    } catch (error) {
      console.error("Chat error:", error);
      // Fallback in case of API error
      setMessages(prev => prev.filter(m => m.id !== processingMsgId));
      setMessages(prev => [...prev, {
        id: Date.now() + '-err',
        role: 'assistant',
        content: "I'm having trouble connecting to the registry node. Please try again.",
        type: 'text'
      }]);
    } finally {
      setIsTyping(false);
    }
  };


  return (
    <div className="flex h-screen bg-[#0a0a0a] text-gray-100 font-sans selection:bg-indigo-500/30">
      {/* Left Sidebar - Wallet Info */}
      {isConnected && address && (
        <aside className="w-80 flex-shrink-0 border-r border-white/10 bg-black/30 backdrop-blur-sm overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Identity Section */}
            <div className="bg-[#141414] border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Identity</h3>
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-bold rounded border border-green-500/30">
                  Verified
                </span>
              </div>
              
              <div className="mb-4">
                <code className="text-sm font-mono text-white break-all">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </code>
              </div>

              <button className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-xs font-semibold rounded border border-indigo-500/30 transition-colors">
                BASE SEPOLIA
              </button>
            </div>

            {/* Balance Section */}
            <div className="bg-[#141414] border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Balance</h3>
                <button 
                  onClick={() => {
                    // Trigger balance refresh
                    const event = new Event('refreshBalances');
                    window.dispatchEvent(event);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingBalances ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="space-y-3">
                {/* ETH Balance */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-300">ETH</span>
                  <span className="text-lg font-semibold text-white">
                    {isLoadingBalances ? '...' : ethBalance}
                  </span>
                </div>

                {/* USDC Balance */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-300">USDC</span>
                  <span className="text-lg font-semibold text-white">
                    {isLoadingBalances ? '...' : usdcBalance}
                  </span>
                </div>
              </div>
            </div>

            {/* Network Info */}
            <div className="bg-[#141414] border border-white/10 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Network</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Chain</span>
                  <span className="text-white font-medium">Base Sepolia</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Chain ID</span>
                  <span className="text-white font-mono">84532</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex-none border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-lg tracking-tight">Imgate<span className="text-gray-500 font-normal">AI</span></span>
            </div>
            <div className="flex items-center gap-3">
              {!isConnected && <WalletButton />}
              <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
                Exit Demo
              </Link>
            </div>
          </div>
          </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-8 min-h-full pb-8">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-indigo-900/50 border border-indigo-500/30 flex-shrink-0 flex items-center justify-center mt-1">
                  {msg.type === 'processing' ? (
                     <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                  ) : (
                     <Sparkles className="w-4 h-4 text-indigo-400" />
                  )}
                </div>
              )}

              <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.type === 'text' && (
                  <div className={`px-4 py-3 rounded-2xl text-sm sm:text-base leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-sm' 
                      : 'bg-[#1a1a1a] border border-white/10 text-gray-200 rounded-tl-sm shadow-xl'
                  }`}>
                    {msg.content}
                  </div>
                )}

                {msg.type === 'tool-call' && (
                   <div className="font-mono text-xs sm:text-sm bg-[#0d0d0d] border border-indigo-500/20 text-indigo-400 p-3 rounded-lg w-full shadow-inner flex flex-col gap-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="font-bold">MCP Tool Execution</span>
                      </div>
                      <div>
                        <span className="text-purple-400">await</span> <span className="text-yellow-300">{msg.toolName}</span>(
                        <span className="text-orange-300">"{msg.toolInput}"</span>
                        )
                      </div>
                   </div>
                )}

                {msg.type === 'processing' && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-2xl rounded-tl-sm text-sm text-indigo-300">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    Searching decentralized registry...
                  </div>
                )}

                {msg.type === 'asset-result' && msg.data && (
                  <div className="flex gap-4 overflow-x-auto pb-4 w-full pr-4 snap-x">
                    {(Array.isArray(msg.data) ? msg.data : [msg.data]).map((item: any) => (
                      <div key={item.id} className="min-w-[320px] max-w-[320px] snap-center">
                        <AssetCard data={item} onPurchase={handlePurchase} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-green-500 to-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Purchase Successful!</h3>
                <p className="text-sm text-gray-400">Original image unlocked</p>
              </div>
            </div>

            <div className="bg-black/40 rounded-lg p-4 mb-4 border border-white/5">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Asset</div>
              <div className="text-white font-medium">{downloadData?.title}</div>
            </div>

            <div className="bg-black/40 rounded-lg p-4 mb-4 border border-white/5">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Transaction</div>
              <code className="text-xs font-mono text-indigo-400 break-all">{downloadData?.txHash}</code>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download Original
                  </>
                )}
              </button>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Input Area */}
        <footer className="flex-none p-4 sm:p-6 bg-gradient-to-t from-black via-black to-transparent">
          <div className="max-w-3xl mx-auto relative">
            <form 
               onSubmit={handleSendMessage}
               className="relative flex items-center gap-2 bg-[#1a1a1a] border border-white/10 rounded-2xl p-2 pl-4 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500/50 transition-all shadow-2xl"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Describe the image you need..."
                className="flex-1 bg-transparent border-none outline-none text-gray-100 placeholder-gray-500 text-base"
                disabled={isTyping}
              />
              <button 
                type="button" 
                className="p-2 text-gray-500 hover:text-white transition-colors"
                title="Upload reference"
              >
                 {/* Just a visual placeholder icon for 'upload' or 'attach' */}
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </button>
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
                  inputValue.trim() && !isTyping
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20' 
                    : 'bg-[#2a2a2a] text-gray-500 cursor-not-allowed'
                }`}
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            </form>
            <div className="text-center mt-3 text-xs text-gray-600 font-mono">
              Powered by Imgate Protocol • C2PA Verified • Base Mainnet
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
