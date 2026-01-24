import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Generate encryption key for an asset
 * @returns Base64 encoded key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString("base64");
}

/**
 * Encrypt file buffer
 * @param buffer File buffer to encrypt
 * @param key Base64 encoded encryption key
 * @returns Encrypted buffer
 */
export function encryptFile(buffer: Buffer, key: string): Buffer {
  try {
    // Decode key
    const keyBuffer = Buffer.from(key, "base64");

    // Generate random IV and salt
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(buffer),
      cipher.final(),
    ]);

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Combine: salt + iv + authTag + encrypted data
    return Buffer.concat([salt, iv, authTag, encrypted]);
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt file");
  }
}

/**
 * Decrypt file buffer
 * @param encryptedBuffer Encrypted file buffer
 * @param key Base64 encoded encryption key
 * @returns Decrypted buffer
 */
export function decryptFile(encryptedBuffer: Buffer, key: string): Buffer {
  try {
    // Decode key
    const keyBuffer = Buffer.from(key, "base64");

    // Extract components
    const salt = encryptedBuffer.subarray(0, SALT_LENGTH);
    const iv = encryptedBuffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = encryptedBuffer.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    );
    const encrypted = encryptedBuffer.subarray(
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    );

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt file");
  }
}

/**
 * Encrypt file for browser decryption
 * Returns key and encrypted data separately for client-side decryption
 */
export function encryptForBrowser(buffer: Buffer): {
  encryptedBuffer: Buffer;
  key: string;
  iv: string;
} {
  const key = crypto.randomBytes(KEY_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedBuffer: Buffer.concat([authTag, encrypted]),
    key: key.toString("base64"),
    iv: iv.toString("base64"),
  };
}
