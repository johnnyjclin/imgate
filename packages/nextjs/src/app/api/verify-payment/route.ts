import { NextRequest, NextResponse } from "next/server";
import { getAssetById, createPurchase } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const { assetId, payer, txHash, amount } = await request.json();

    console.log('Verify payment request:', { assetId, payer, txHash, amount });

    if (!assetId || !payer || !txHash) {
      return NextResponse.json(
        { error: "assetId, payer, and txHash required", success: false },
        { status: 400 }
      );
    }

    // Verify asset exists
    const asset = await getAssetById(assetId);
    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found", success: false },
        { status: 404 }
      );
    }

    // Create purchase record in database
    // For demo purposes, we trust the client's approval transaction
    // In production, you should verify the transaction on-chain
    const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000; // 1 year access

    try {
      await createPurchase({
        assetId,
        payer: payer.toLowerCase(),
        amount: amount || asset.priceUSDC,
        txHash: txHash,
        expiresAt: expiresAt,
        timestamp: Date.now()
      });

      console.log('Purchase recorded successfully');
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Continue even if DB write fails (purchase was approved on-chain)
    }

    // Return download access immediately
    return NextResponse.json({
      success: true,
      hasAccess: true,
      expiresAt: Math.floor(expiresAt / 1000),
      txHash: txHash,
      download: {
        assetId: assetId, // Add assetId for download API
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${asset.encryptedCID}`,
        encryptionKey: asset.encryptionKey,
        filename: asset.filename,
        mimeType: 'image/jpeg',
        c2paManifestPresent: asset.c2paManifestPresent
      }
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return NextResponse.json(
      { 
        error: "Payment verification failed: " + (error as Error).message,
        success: false 
      },
      { status: 500 }
    );
  }
}
