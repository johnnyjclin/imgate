import { NextRequest, NextResponse } from "next/server";
import { verifyPurchase } from "@/lib/contract";
import { getAssetById } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const { assetId, payer } = await request.json();

    if (!assetId || !payer) {
      return NextResponse.json(
        { error: "assetId and payer required" },
        { status: 400 }
      );
    }

    // Verify asset exists
    const asset = await getAssetById(assetId);
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Verify purchase onchain
    const purchase = await verifyPurchase(assetId, payer);

    if (!purchase) {
      return NextResponse.json(
        { error: "No purchase found", hasAccess: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      hasAccess: purchase.isValid,
      expiresAt: purchase.expiresAt,
      txHash: purchase.txHash,
    });
  } catch (error) {
    console.error("Verify access error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
