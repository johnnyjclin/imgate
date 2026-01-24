import pinataSDK from "@pinata/sdk";
import { Readable } from "stream";

if (!process.env.PINATA_API_KEY || !process.env.PINATA_SECRET_API_KEY) {
  throw new Error("Missing Pinata credentials in environment variables");
}

const pinata = new pinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_SECRET_API_KEY
);

export default pinata;

/**
 * Upload file to IPFS via Pinata
 * @param file File buffer
 * @param filename Original filename
 * @returns IPFS hash (CID)
 */
export async function uploadToPinata(
  file: Buffer,
  filename: string
): Promise<string> {
  try {
    // Convert Buffer to ReadableStream
    const stream = Readable.from(file);
    
    // Add 60s timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Upload to Pinata timed out')), 60000);
    });

    const pinPromise = pinata.pinFileToIPFS(stream, {
      pinataMetadata: {
        name: filename,
      },
    });

    const result = await Promise.race([pinPromise, timeoutPromise]) as any;
    return result.IpfsHash;
  } catch (error) {
    console.error("Error uploading to Pinata:", error);
    throw new Error("Failed to upload to IPFS: " + (error as Error).message);
  }
}

/**
 * Upload JSON metadata to IPFS
 * @param metadata JSON object
 * @param name Metadata name
 * @returns IPFS hash (CID)
 */
export async function uploadJSONToPinata(
  metadata: Record<string, any>,
  name: string
): Promise<string> {
  try {
    // Add 30s timeout for JSON
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('JSON upload check timed out')), 30000);
    });

    const pinPromise = pinata.pinJSONToIPFS(metadata, {
      pinataMetadata: {
        name,
      },
    });

    const result = await Promise.race([pinPromise, timeoutPromise]) as any;
    return result.IpfsHash;
  } catch (error) {
    console.error("Error uploading JSON to Pinata:", error);
    throw new Error("Failed to upload metadata to IPFS");
  }
}

/**
 * Get IPFS gateway URL
 * @param cid IPFS CID
 * @returns Full gateway URL
 */
export function getIPFSUrl(cid: string): string {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}
