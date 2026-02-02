import { NextRequest, NextResponse } from "next/server";
import { parseC2PAManifest } from "@/lib/c2pa";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse C2PA manifest
    const manifest = await parseC2PAManifest(buffer, file.type);

    return NextResponse.json({
      success: true,
      manifest,
    });
  } catch (error) {
    console.error("C2PA verification error:", error);
    return NextResponse.json(
      { 
        error: "Verification failed",
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
