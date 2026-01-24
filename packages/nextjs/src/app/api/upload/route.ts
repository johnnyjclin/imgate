import { NextRequest, NextResponse } from "next/server";
import {
  generatePreview,
  calculateImageHash,
  validateImageFormat,
  getImageDimensions,
} from "@/lib/image-processing";
import { encryptFile, generateEncryptionKey } from "@/lib/encryption";
import { uploadToPinata } from "@/lib/pinata";
import { createAsset } from "@/lib/database";
import { ethers } from "ethers";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Get fields
    const file = formData.get("file") as File;
    const creatorAddress = formData.get("creatorAddress") as string;
    const priceUSDC = formData.get("priceUSDC") as string;
    const c2paData = formData.get("c2paData") as string | null;

    // Validate inputs
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!creatorAddress || !ethers.isAddress(creatorAddress)) {
      return NextResponse.json(
        { error: "Invalid creator address" },
        { status: 400 }
      );
    }

    if (!priceUSDC || isNaN(parseFloat(priceUSDC))) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 50MB)" },
        { status: 400 }
      );
    }

    // Read file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate image format
    const isValid = await validateImageFormat(buffer);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid image format. Supported: JPEG, PNG, WebP" },
        { status: 400 }
      );
    }

    // Get dimensions
    const dimensions = await getImageDimensions(buffer);

    // Calculate origin hash
    const originHash = calculateImageHash(buffer);

    // Generate preview
    console.log("Generating preview...");
    const previewBuffer = await generatePreview(buffer);

    // Encrypt original
    console.log("Encrypting original...");
    const encryptionKey = generateEncryptionKey();
    const encryptedBuffer = encryptFile(buffer, encryptionKey);

    // Upload to IPFS
    console.log("Uploading to IPFS...");
    const [previewCID, encryptedCID] = await Promise.all([
      uploadToPinata(previewBuffer, `preview-${file.name}`),
      uploadToPinata(encryptedBuffer, `encrypted-${file.name}`),
    ]);

    console.log("Preview CID:", previewCID);
    console.log("Encrypted CID:", encryptedCID);

    // Parse C2PA data if provided
    let c2paManifestPresent = false;
    let c2paSigner: string | undefined;
    let c2paSigningTime: string | undefined;
    let c2paClaims: any | undefined;

    if (c2paData) {
      try {
        const parsedC2PA = JSON.parse(c2paData);
        c2paManifestPresent = parsedC2PA.manifestPresent || false;
        c2paSigner = parsedC2PA.signer;
        c2paSigningTime = parsedC2PA.signingTime;
        c2paClaims = parsedC2PA.claims;
      } catch (error) {
        console.error("Error parsing C2PA data:", error);
      }
    }

    // Create asset in database
    const asset = await createAsset({
      creatorAddress,
      originHash,
      previewCID,
      encryptedCID,
      encryptionKey,
      priceUSDC,
      filename: file.name,
      width: dimensions.width,
      height: dimensions.height,
      c2paManifestPresent,
      c2paSigner,
      c2paSigningTime,
      c2paClaims,
    });

    return NextResponse.json({
      success: true,
      asset: {
        assetId: asset.assetId,
        slug: asset.slug,
        previewCID,
        shortUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${asset.slug}`,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}
