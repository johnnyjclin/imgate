import { SiweMessage } from "siwe";
import crypto from "crypto";

// Store nonces in memory (use Redis in production)
const nonces = new Map<string, { nonce: string; expiresAt: number }>();

// Clean up expired nonces every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [address, data] of nonces.entries()) {
    if (data.expiresAt < now) {
      nonces.delete(address);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate nonce for wallet authentication
 * @param address Wallet address
 * @returns Nonce string
 */
export function generateNonce(address: string): string {
  const nonce = crypto.randomBytes(16).toString("base64");
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  nonces.set(address.toLowerCase(), { nonce, expiresAt });
  return nonce;
}

/**
 * Verify nonce is valid and not expired
 * @param address Wallet address
 * @param nonce Nonce to verify
 * @returns true if valid
 */
export function verifyNonce(address: string, nonce: string): boolean {
  const stored = nonces.get(address.toLowerCase());
  if (!stored) return false;
  if (stored.expiresAt < Date.now()) {
    nonces.delete(address.toLowerCase());
    return false;
  }
  return stored.nonce === nonce;
}

/**
 * Consume nonce (delete after use to prevent replay)
 * @param address Wallet address
 */
export function consumeNonce(address: string): void {
  nonces.delete(address.toLowerCase());
}

/**
 * Verify SIWE message and signature
 * @param message SIWE message
 * @param signature Signature from wallet
 * @returns Verified address or null
 */
export async function verifySIWE(
  message: string,
  signature: string
): Promise<string | null> {
  try {
    const siweMessage = new SiweMessage(message);

    // Verify signature
    const fields = await siweMessage.verify({ signature });

    if (!fields.success) {
      return null;
    }

    // Verify nonce
    if (!verifyNonce(siweMessage.address, siweMessage.nonce)) {
      return null;
    }

    // Verify domain
    if (siweMessage.domain !== process.env.NEXT_PUBLIC_APP_URL?.replace("http://", "").replace("https://", "")) {
      return null;
    }

    // Verify expiration
    if (siweMessage.expirationTime && new Date(siweMessage.expirationTime) < new Date()) {
      return null;
    }

    // Consume nonce to prevent replay
    consumeNonce(siweMessage.address);

    return siweMessage.address;
  } catch (error) {
    console.error("SIWE verification error:", error);
    return null;
  }
}

/**
 * Create SIWE message for signing
 * @param address Wallet address
 * @param statement Purpose statement
 * @returns SIWE message object
 */
export function createSIWEMessage(
  address: string,
  statement: string = "Sign in to Imgate"
): {
  message: string;
  nonce: string;
} {
  const nonce = generateNonce(address);
  const domain = process.env.NEXT_PUBLIC_APP_URL?.replace("http://", "").replace("https://", "") || "localhost:3000";

  const siweMessage = new SiweMessage({
    domain,
    address,
    statement,
    uri: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    version: "1",
    chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532"),
    nonce,
    issuedAt: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
  });

  return {
    message: siweMessage.prepareMessage(),
    nonce,
  };
}
