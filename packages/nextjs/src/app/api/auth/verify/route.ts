import { NextRequest, NextResponse } from "next/server";
import { verifySIWE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { message, signature } = await request.json();

    if (!message || !signature) {
      return NextResponse.json(
        { error: "Message and signature required" },
        { status: 400 }
      );
    }

    const address = await verifySIWE(message, signature);

    if (!address) {
      return NextResponse.json(
        { error: "Invalid signature or expired nonce" },
        { status: 401 }
      );
    }

    // In production, create JWT token here
    // For MVP, just return success with address
    return NextResponse.json({
      success: true,
      address,
    });
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
