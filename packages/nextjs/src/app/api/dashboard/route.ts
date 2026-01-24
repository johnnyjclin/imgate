import { NextRequest, NextResponse } from "next/server";
import { getAllPurchases, getAllAssets } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const purchases = await getAllPurchases();
    const assets = await getAllAssets();

    // Calculate total revenue
    let totalRevenue = 0n;
    purchases.forEach((p) => {
      totalRevenue += BigInt(p.amount);
    });

    // Calculate platform fee (5%)
    const platformFee = (totalRevenue * 5n) / 100n;
    const creatorEarnings = totalRevenue - platformFee;

    // Revenue by asset
    const assetRevenue = new Map<string, bigint>();
    purchases.forEach((p) => {
      const current = assetRevenue.get(p.assetId) || 0n;
      assetRevenue.set(p.assetId, current + BigInt(p.amount));
    });

    // Sort assets by revenue
    const rankedAssets = Array.from(assetRevenue.entries())
      .sort((a, b) => (b[1] > a[1] ? 1 : -1))
      .slice(0, 10)
      .map(([assetId, revenue]) => {
        const asset = assets.find((a) => a.assetId === assetId);
        return {
          assetId,
          slug: asset?.slug,
          filename: asset?.filename,
          revenue: revenue.toString(),
          purchaseCount: purchases.filter((p) => p.assetId === assetId).length,
        };
      });

    // Recent purchases (last 20)
    const recentPurchases = purchases
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20)
      .map((p) => {
        const asset = assets.find((a) => a.assetId === p.assetId);
        return {
          assetId: p.assetId,
          slug: asset?.slug,
          filename: asset?.filename,
          payer: p.payer,
          amount: p.amount,
          txHash: p.txHash,
          timestamp: p.timestamp,
        };
      });

    return NextResponse.json({
      totalRevenue: totalRevenue.toString(),
      platformFee: platformFee.toString(),
      creatorEarnings: creatorEarnings.toString(),
      totalPurchases: purchases.length,
      totalAssets: assets.length,
      topAssets: rankedAssets,
      recentPurchases,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
