import sharp from "sharp";
import crypto from "crypto";

const WATERMARK_TEXT = "IMGATE PREVIEW";
const PREVIEW_WIDTH = 512;
const COMPRESSION_QUALITY = 70;

/**
 * Generate low-res watermarked preview from original image
 * @param originalBuffer Original image buffer
 * @returns Preview image buffer
 */
export async function generatePreview(
  originalBuffer: Buffer
): Promise<Buffer> {
  try {
    // Get original metadata first for dimensions
    const originalMetadata = await sharp(originalBuffer).metadata();
    const aspectRatio = (originalMetadata.height || PREVIEW_WIDTH) / (originalMetadata.width || PREVIEW_WIDTH);
    const width = PREVIEW_WIDTH;
    const height = Math.floor(PREVIEW_WIDTH * aspectRatio);

    // Calculate watermark size
    const fontSize = Math.floor(width / 20);

    // Create watermark SVG with correct dimensions
    const watermarkSvg = `
      <svg width="${width}" height="${height}">
        <text
          x="50%"
          y="50%"
          font-family="Arial"
          font-size="${fontSize}"
          font-weight="bold"
          fill="rgba(255, 255, 255, 0.5)"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          ${WATERMARK_TEXT}
        </text>
      </svg>
    `;

    // Resize, watermark, and compress in single operation
    const preview = await sharp(originalBuffer)
      .resize(PREVIEW_WIDTH, null, {
        withoutEnlargement: true,
        fit: "inside",
      })
      .composite([
        {
          input: Buffer.from(watermarkSvg),
          gravity: "center",
        },
      ])
      .jpeg({ quality: COMPRESSION_QUALITY })
      .toBuffer();

    return preview;
  } catch (error) {
    console.error("Error generating preview:", error);
    throw new Error("Failed to generate preview image");
  }
}

/**
 * Calculate SHA-256 hash of image
 * @param buffer Image buffer
 * @returns Hex hash string
 */
export function calculateImageHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Validate image file type
 * @param buffer Image buffer
 * @returns true if valid image format
 */
export async function validateImageFormat(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    const validFormats = ["jpeg", "jpg", "png", "webp"];
    return validFormats.includes(metadata.format || "");
  } catch {
    return false;
  }
}

/**
 * Get image dimensions
 * @param buffer Image buffer
 * @returns Width and height
 */
export async function getImageDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}
