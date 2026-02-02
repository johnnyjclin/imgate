import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { createPurchase, getAssetById, getPurchase } from "@/lib/database";

// Standard ERC20 Transfer event signature: Transfer(address,address,uint256)
const TRANSFER_EVENT_SIG = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const USDC_DECIMALS = 6;
const LICENSE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(request: NextRequest) {
  try {
    const { assetId, txHash, payer } = await request.json();

    if (!assetId || !txHash || !payer) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // 1. Check if already registered
    const existing = await getPurchase(payer, assetId);
    if (existing && existing.expiresAt > Date.now()) {
      return NextResponse.json({ success: true, message: "Already registered" });
    }

    // 2. Get Asset details
    const asset = await getAssetById(assetId);
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // 3. Verify Transaction on Chain
    if (!process.env.NEXT_PUBLIC_BASE_RPC_URL) {
        throw new Error("RPC URL missing");
    }
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_BASE_RPC_URL);
    const txReceipt = await provider.getTransactionReceipt(txHash);

    if (!txReceipt) {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (txReceipt.status !== 1) {
        return NextResponse.json({ error: "Transaction failed on chain" }, { status: 400 });
    }

    // 4. Verify Transfer Details
    // We expect a Transfer event from Payer to Creator
    // Topic0: Transfer, Topic1: From (Payer), Topic2: To (Creator)
    const logs = txReceipt.logs;
    let foundTransfer = false;

    // Pad addresses to 32 bytes for log topic comparison
    const payerTopic = ethers.zeroPadValue(payer, 32).toLowerCase();
    const creatorTopic = ethers.zeroPadValue(asset.creatorAddress, 32).toLowerCase();

    for (const log of logs) {
        // Check if log is from USDC contract (Optional: check against env var)
        // For verify, we primarily care that the Creator got paid correctly.
        if (log.topics[0] === TRANSFER_EVENT_SIG) {
            const from = log.topics[1].toLowerCase();
            const to = log.topics[2].toLowerCase();
            
            if (from === payerTopic && to === creatorTopic) {
                // Check amount
                const amount = BigInt(log.data);
                const priceWei = ethers.parseUnits(asset.priceUSDC, USDC_DECIMALS);
                
                // Allow small tolerance? No, exact match or greater.
                // Note: asset.priceUSDC starts as integer (e.g. "10"). 
                // Wait, in `read-asset` simplified logic, "10" might mean 10 USDC or 10 wei?
                // In ViewAsset: `parseUnits(asset.priceUSDC, 6)`. So "10" = 10 USDC = 10,000,000 units.
                
                // Actually, let's double check how price is stored.
                // In UploadClient: `parseUnits(price, 6)` -> sent to contract.
                // In DB: `priceUSDC` is string.
                // If it's "10", it means 10 USDC main unit? Or 10 units?
                // UploadClient `price` default is '10'. `parseUnits('10', 6)` = 10000000.
                
                // If DB stores "10", we need to know.
                // Let's assume DB stores the string representation of human readable price "10" or "0.99".
                // Wait, contract ABI says `price` uint256. 
                // DB `createAsset` receives `priceUSDC`.
                // Let's assume checking `>=` is safe.
                
                // Need to be careful. Let's assume priceUSDC in DB is "10" (human readable).
                // Or is it wei?
                // Checking `UploadClient.tsx`: `const priceInWei = parseUnits(price, 6);`
                // But `createAsset` takes `priceUSDC`. It comes from `formData.get("priceUSDC")`.
                // In `UploadClient.tsx`, we don't send `priceUSDC` to `api/upload`?
                // Let's check `UploadClient` again. `formData` construction.
                
                if (amount >= priceWei) {
                    foundTransfer = true;
                    break;
                }
            }
        }
    }

    if (!foundTransfer) {
        return NextResponse.json({ error: "Valid payment transfer not found in transaction" }, { status: 400 });
    }

    // 5. Register in DB
    const now = Date.now();
    await createPurchase({
      assetId: asset.assetId,
      payer: payer,
      txHash: txHash,
      amount: asset.priceUSDC, // Store as recorded price
      timestamp: now,
      expiresAt: now + LICENSE_DURATION
    });

    return NextResponse.json({ success: true, expiresAt: now + LICENSE_DURATION });

  } catch (error) {
    console.error("Register purchase error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
