'use client';

import { WalletButton } from '@/components/WalletButton';
import Link from 'next/link';

export default function Home() {
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
              className="text-gray-700 hover:text-indigo-600 font-medium"
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

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Transparent Image Licensing
              <br />
              <span className="text-indigo-600">Built Onchain</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              License your images with transparent onchain revenue, C2PA
              provenance verification, and gasless USDC payments on Base.
            </p>

            <div className="flex justify-center gap-4 mb-16">
              <Link
                href="/upload"
                className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                Start Uploading
              </Link>
              <Link
                href="/dashboard"
                className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold border-2 border-indigo-600 hover:bg-indigo-50 transition"
              >
                View Revenue
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-2">C2PA Provenance</h3>
              <p className="text-gray-600">
                Verify authenticity and track how images were created.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-2">Encrypted IPFS</h3>
              <p className="text-gray-600">
                Secure, decentralized storage with protected originals.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-2">Onchain Revenue</h3>
              <p className="text-gray-600">
                Transparent payouts and onchain licensing records.
              </p>
            </div>
          </div>

          <div className="mt-16 bg-white p-8 rounded-lg shadow-md max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">Why Imgate?</h3>
            <div className="text-left space-y-3 text-gray-700">
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>
                  <strong>vs Stock Photos:</strong> 95% creator earnings (vs
                  15-30% on Shutterstock)
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>
                  <strong>vs NFT Marketplaces:</strong> Pure licensing model,
                  not collectibles
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>
                  <strong>Gasless Payments:</strong> Users pay only USDC, no
                  ETH needed (via Paymaster)
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>
                  <strong>Permanent Storage:</strong> Images stored on IPFS,
                  encrypted for security
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
  );
}
