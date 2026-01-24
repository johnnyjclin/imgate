import { NextRequest, NextResponse } from "next/server";
import { getAssetBySlug } from "@/lib/database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const asset = await getAssetBySlug(slug);

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Don't expose encryption key
    const { encryptionKey, ...publicAsset } = asset;

    return NextResponse.json(publicAsset);
  } catch (error) {
    console.error("Get asset error:", error);
    return NextResponse.json(
      { error: "Failed to fetch asset" },
      { status: 500 }
    );
  }
}
