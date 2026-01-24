'use client';

import { useState, useEffect } from 'react';
import { WalletButton } from '@/components/WalletButton';
import Link from 'next/link';
import { formatUnits } from 'viem';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    );
  }

  const totalRevenue = data ? parseFloat(formatUnits(BigInt(data.totalRevenue), 6)) : 0;
  const platformFee = data ? parseFloat(formatUnits(BigInt(data.platformFee), 6)) : 0;
  const creatorEarnings = data ? parseFloat(formatUnits(BigInt(data.creatorEarnings), 6)) : 0;

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
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Dashboard
            </Link>
            <WalletButton />
          </div>
        </div>
      </nav>

        <main className="max-w-7xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Revenue Dashboard
        </h1>
        <p className="text-gray-600 mb-8">
          Transparent onchain revenue tracking
        </p>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
            <div className="text-3xl font-bold text-gray-900">
              {totalRevenue.toFixed(2)}
              <span className="text-lg text-gray-600 ml-1">USDC</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-sm text-gray-600 mb-1">Creator Earnings (95%)</div>
            <div className="text-3xl font-bold text-green-600">
              {creatorEarnings.toFixed(2)}
              <span className="text-lg text-gray-600 ml-1">USDC</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-sm text-gray-600 mb-1">Platform Fee (5%)</div>
            <div className="text-3xl font-bold text-indigo-600">
              {platformFee.toFixed(2)}
              <span className="text-lg text-gray-600 ml-1">USDC</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-sm text-gray-600 mb-1">Total Purchases</div>
            <div className="text-3xl font-bold text-gray-900">
              {data?.totalPurchases || 0}
            </div>
          </div>
        </div>

        {/* Top Assets */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-bold mb-4">Top Selling Images</h2>
          {data?.topAssets && data.topAssets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Image</th>
                    <th className="text-left py-3 px-4">Revenue</th>
                    <th className="text-left py-3 px-4">Purchases</th>
                    <th className="text-left py-3 px-4">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topAssets.map((asset: any) => (
                    <tr key={asset.assetId} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm">
                        {asset.filename || asset.slug}
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        {parseFloat(formatUnits(BigInt(asset.revenue), 6)).toFixed(2)} USDC
                      </td>
                      <td className="py-3 px-4">{asset.purchaseCount}</td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/${asset.slug}`}
                          className="text-indigo-600 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600">No purchases yet</p>
          )}
        </div>

        {/* Recent Purchases */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Recent Purchases</h2>
          {data?.recentPurchases && data.recentPurchases.length > 0 ? (
            <div className="space-y-3">
              {data.recentPurchases.map((purchase: any, index: number) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{purchase.filename || purchase.slug}</div>
                    <div className="text-sm text-gray-600 font-mono">
                      {purchase.payer.slice(0, 6)}...{purchase.payer.slice(-4)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {parseFloat(formatUnits(BigInt(purchase.amount), 6)).toFixed(2)} USDC
                    </div>
                    <a
                      href={`https://sepolia.basescan.org/tx/${purchase.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      View TX
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No purchases yet</p>
          )}
        </div>

        {/* Why This Matters */}
        <div className="mt-8 bg-indigo-50 border-2 border-indigo-200 p-6 rounded-lg">
          <h3 className="text-xl font-bold text-indigo-900 mb-3">
            💡 Transparent Onchain Revenue
          </h3>
          <p className="text-indigo-800">
            All transactions are verifiable on Base Sepolia blockchain. Platform
            automatically splits 5% fee and 95% creator earnings. No hidden
            costs, no surprise deductions.
          </p>
        </div>
        </main>
      </div>
  );
}
