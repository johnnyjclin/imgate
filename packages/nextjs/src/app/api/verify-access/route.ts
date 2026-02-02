import { NextRequest, NextResponse } from "next/server";
import { verifyPurchase, verifyTransactionOnChain } from "@/lib/contract";
import { getAssetById, createPurchase } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const { assetId, payer, txHash } = await request.json();

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

    // 1. Try standard verification (DB check)
    let purchase = await verifyPurchase(assetId, payer);

    // 2. If not found in DB, checks txHash if provided (x402 style "Payment Payload" verification)
    if ((!purchase || !purchase.isValid) && txHash) {
        console.log(`Verifying tx ${txHash} on-chain...`);
        const result = await verifyTransactionOnChain(txHash, assetId, payer);
        
        if (result.isValid) {
            console.log("On-chain verification successful, registering purchase...");
            // Register success to DB so next time verifyPurchase works fast
            const expiresAt = result.expiresAt ? result.expiresAt * 1000 : Date.now() + 24 * 60 * 60 * 1000;
            
            await createPurchase({
                assetId,
                payer: payer.toLowerCase(),
                amount: result.amount || "0",
                txHash: txHash,
                expiresAt: expiresAt,
                timestamp: Date.now()
            });

            purchase = {
                isValid: true,
                expiresAt: Math.floor(expiresAt / 1000),
                txHash,
                amount: result.amount || "0"
            };
        }
    }

    if (!purchase || !purchase.isValid) {
      return NextResponse.json(
        { error: "No purchase found", hasAccess: false },
        { status: 404 }
      );
    }

    // 3. Return Access Info AND Download instructions (Data Access)
    // This allows the client to immediately unlock the content
    return NextResponse.json({
      hasAccess: true,
      expiresAt: purchase.expiresAt,
      txHash: purchase.txHash,
      // Provide download/decryption context immediately
      download: {
          ipfsUrl: `https://gateway.pinata.cloud/ipfs/${asset.encryptedCID}`,
          encryptionKey: asset.encryptionKey, // Client receives this securely over HTTPS
          filename: asset.filename,
          mimeType: 'image/jpeg', // Could be dynamic
          c2paManifestPresent: asset.c2paManifestPresent
      }
    });
  } catch (error) {
    console.error("Verify access error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
