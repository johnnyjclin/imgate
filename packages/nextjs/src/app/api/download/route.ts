import { NextRequest, NextResponse } from "next/server";
import { verifyPurchase } from "@/lib/contract";
import { getAssetById } from "@/lib/database";
import { getIPFSUrl } from "@/lib/pinata";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("assetId");
    const payer = searchParams.get("payer");

    if (!assetId || !payer) {
      return NextResponse.json(
        { error: "assetId and payer required" },
        { status: 400 }
      );
    }

    // Get asset
    const asset = await getAssetById(assetId);
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Verify purchase
    const purchase = await verifyPurchase(assetId, payer);

    if (!purchase || !purchase.isValid) {
      return NextResponse.json(
        { error: "No valid purchase found or license expired" },
        { status: 403 }
      );
    }

    // Return download info (IPFS CID + decryption key)
    return NextResponse.json({
      success: true,
      encryptedCID: asset.encryptedCID,
      encryptionKey: asset.encryptionKey,
      ipfsUrl: getIPFSUrl(asset.encryptedCID),
      filename: asset.filename,
      expiresAt: purchase.expiresAt,
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Download failed" },
      { status: 500 }
    );
  }
}
