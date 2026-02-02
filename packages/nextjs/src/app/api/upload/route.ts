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
    const avatar = formData.get("avatar") as File | null;
    const creatorAddress = formData.get("creatorAddress") as string;
    const paymentAddress = formData.get("paymentAddress") as string; // New field
    const priceUSDC = formData.get("priceUSDC") as string;
    const c2paData = formData.get("c2paData") as string | null;
    
    // Get promotional metadata fields
    const creatorName = formData.get("creatorName") as string | null;
    const twitterHandle = formData.get("twitterHandle") as string | null;
    const creatorBio = formData.get("creatorBio") as string | null;
    const description = formData.get("description") as string | null;

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
    let previewBuffer = await generatePreview(buffer);

    // Sign Preview ONLY at upload time (preview is public on IPFS)
    // Original will be signed JIT at download time
    console.log("Signing Preview with C2PA...");
    try {
      const { embedPaywallAssertion } = await import("@/lib/c2pa");
      
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
        amount: priceUSDC,
        currency: "USDC",
        recipient: paymentAddress || creatorAddress,
        network: 'base-sepolia'
      };
      
      const creatorInfo = {
        name: creatorName || undefined,
        twitter: twitterHandle || undefined,
        bio: creatorBio || undefined,
        description: description || undefined
      };

      previewBuffer = await embedPaywallAssertion(
        previewBuffer,
        paywallInfo,
        signerConfig,
        creatorInfo
      );
      console.log("✅ Preview C2PA signed. Buffer size:", previewBuffer.length);
    } catch (err) {
      console.error("⚠️ Preview C2PA signing failed (proceeding without):", err);
    }

    // Original: No signing at upload (will be signed JIT at download)
    const processedBuffer = buffer;

    // Encrypt original
    console.log("Encrypting original...");
    const encryptionKey = generateEncryptionKey();
    const encryptedBuffer = encryptFile(processedBuffer, encryptionKey);

    // Upload to IPFS
    console.log("Uploading to IPFS...");
    const uploadPromises = [
      uploadToPinata(previewBuffer, `preview-${file.name}`),
      uploadToPinata(encryptedBuffer, `encrypted-${file.name}`),
    ];
    
    // Upload avatar if provided
    let avatarCID: string | undefined;
    if (avatar) {
      console.log("Uploading avatar to IPFS...");
      const avatarBuffer = Buffer.from(await avatar.arrayBuffer());
      uploadPromises.push(
        uploadToPinata(avatarBuffer, `avatar-${creatorAddress}`).then(cid => {
          avatarCID = cid;
          return cid;
        })
      );
    }
    
    const [previewCID, encryptedCID] = await Promise.all(uploadPromises);

    console.log("Preview CID:", previewCID);
    console.log("Encrypted CID:", encryptedCID);
    if (avatarCID) console.log("Avatar CID:", avatarCID);

    // Parse C2PA data if provided, or create enhanced manifest with promotional metadata
    let c2paManifestPresent = false;
    let c2paSigner: string | undefined;
    let c2paSigningTime: string | undefined;
    let c2paClaims: any | undefined;

    if (c2paData) {
      try {
        const parsedC2PA = JSON.parse(c2paData);
        c2paManifestPresent = parsedC2PA.manifestPresent || false;
        c2paSigner = parsedC2PA.signature?.issuer;
        c2paSigningTime = parsedC2PA.signature?.time;
        // Store the full parsed object efficiently
        c2paClaims = {
          actions: parsedC2PA.actions,
          generativeInfo: parsedC2PA.generativeInfo,
          ingredients: parsedC2PA.ingredients,
          assertions: parsedC2PA.assertions,
          claimGenerator: parsedC2PA.claimGenerator,
          claimGeneratorInfo: parsedC2PA.claimGeneratorInfo // Include version info
        };
      } catch (error) {
        console.error("Error parsing C2PA data:", error);
      }
    }

    // If promotional metadata is provided, create/enhance C2PA manifest
    if (creatorName || twitterHandle || creatorBio) {
      const { createMockC2PAManifest } = await import("@/lib/c2pa");
      const enhancedManifest = createMockC2PAManifest(file.name, {
        creatorName: creatorName || undefined,
        twitterHandle: twitterHandle || undefined,
        creatorBio: creatorBio || undefined,
      });
      
      // Use enhanced manifest data
      c2paManifestPresent = true;
      c2paSigner = enhancedManifest.signature?.issuer;
      c2paSigningTime = enhancedManifest.signature?.time;
      c2paClaims = {
          actions: enhancedManifest.actions,
          generativeInfo: enhancedManifest.generativeInfo,
          ingredients: enhancedManifest.ingredients,
          assertions: enhancedManifest.assertions,
          claimGenerator: enhancedManifest.claimGenerator,
          claimGeneratorInfo: enhancedManifest.claimGeneratorInfo
      };
      
      console.log("Enhanced C2PA manifest with promotional metadata:", {
        creatorName,
        twitterHandle,
        creatorBio,
        assertionsCount: enhancedManifest.assertions?.length
      });
    }

    // Create asset in database
    const asset = await createAsset({
      creatorAddress,
      paymentAddress: paymentAddress || creatorAddress, // Store payment address
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
      // Include promotional metadata if provided
      ...(creatorName && { creatorName }),
      ...(twitterHandle && { twitterHandle }),
      ...(creatorBio && { creatorBio }),
      ...(description && { description }), // Add description field
      ...(avatarCID && { creatorAvatar: avatarCID }), // Add avatar CID
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
