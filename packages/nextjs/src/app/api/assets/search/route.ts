import { NextRequest, NextResponse } from "next/server";
import { searchAssets } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    const { assets, isFallback } = await searchAssets(query);

    // Filter out encryption keys before sending to client
    const safeAssets = assets.map(asset => {
      const { encryptionKey, ...safeAsset } = asset;
      // If fallback, maybe we hint it in the filename for the demo? 
      // No, let's just return isFallback flag
      return safeAsset;
    });

    return NextResponse.json({
      success: true,
      count: safeAssets.length,
      isFallback,
      assets: safeAssets
    });
  } catch (error) {
    console.error("Search assets error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
