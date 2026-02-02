import { NextRequest, NextResponse } from "next/server";
import { verifyPurchase } from "@/lib/contract";
import { getAssetById } from "@/lib/database";
import { getIPFSUrl } from "@/lib/pinata";
import { decryptFile } from "@/lib/encryption";
import { embedPaywallAssertion } from "@/lib/c2pa";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("assetId");
    const payer = searchParams.get("payer");
    const mode = searchParams.get("mode") || "info"; // "info" (default) or "direct"

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

    // IMPORTANT: If mode is 'direct', we download, decrypt, sign, and return the file
    if (mode === "direct") {
       console.log("Processing direct download request...");
       
       // 1. Fetch encrypted file
       const ipfsUrl = getIPFSUrl(asset.encryptedCID);
       const ipfsRes = await fetch(ipfsUrl);
       if (!ipfsRes.ok) throw new Error("Failed to fetch from IPFS");
       
       const encryptedBuffer = Buffer.from(await ipfsRes.arrayBuffer());
       
       // 2. Decrypt
       const decryptedBuffer = decryptFile(encryptedBuffer, asset.encryptionKey);
       
       // 3. Inject C2PA (Just-In-Time)
       // We can inject the specific Buyer info here if we wanted!
       const c2paKey = process.env.C2PA_PRIVATE_KEY;
       const c2paCert = process.env.C2PA_CERTIFICATE;
       
       let signerConfig: any = { useTestSigner: true };
       if (c2paKey && c2paCert) {
           const formattedKey = c2paKey.includes('\\n') ? c2paKey.replace(/\\n/g, '\n') : c2paKey;
           const formattedCert = c2paCert.includes('\\n') ? c2paCert.replace(/\\n/g, '\n') : c2paCert;
           signerConfig = {
              privateKey: formattedKey,
              certificate: formattedCert,
              useTestSigner: false
           };
       }

       const paywallInfo = {
            amount: asset.priceUSDC,
            currency: "USDC",
            recipient: (asset as any).creatorAddress, 
            network: 'base-sepolia'
       };
       
       const creatorInfo = {
            name: (asset as any).creatorName,
            twitter: (asset as any).twitterHandle,
            bio: (asset as any).creatorBio,
            description: (asset as any).description
       };

       console.log("Embedding C2PA for download...");
       const signedBuffer = await embedPaywallAssertion(
            decryptedBuffer,
            paywallInfo,
            signerConfig,
            creatorInfo
       );
       
       // 4. Return file stream
       return new NextResponse(new Uint8Array(signedBuffer), {
         headers: {
           "Content-Type": "image/jpeg", // Assume JPEG for now or store mime type
           "Content-Disposition": `attachment; filename="${asset.filename}"`,
           "Content-Length": signedBuffer.length.toString()
         }
       });
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
