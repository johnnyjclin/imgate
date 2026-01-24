import { NextRequest, NextResponse } from "next/server";
import { createSIWEMessage } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const { message, nonce } = createSIWEMessage(address);

    return NextResponse.json({ message, nonce });
  } catch (error) {
    console.error("Generate nonce error:", error);
    return NextResponse.json(
      { error: "Failed to generate nonce" },
      { status: 500 }
    );
  }
}
