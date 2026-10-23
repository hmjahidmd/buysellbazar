import sharp from 'sharp';
import crypto from 'crypto';
import logger from '../../config/logger';

export interface ProcessedMediaResult {
  url: string;
  thumbnailUrl: string;
  perceptualHash: string;
  width: number;
  height: number;
}

/**
 * Generates an SVG watermark badge buffer with "BuySell BD Verified" logo and text
 */
const createWatermarkSvg = (width: number, height: number): Buffer => {
  const badgeWidth = Math.min(Math.round(width * 0.35), 260);
  const badgeHeight = Math.round(badgeWidth * 0.22);
  const fontSize = Math.round(badgeHeight * 0.38);

  const svg = `
    <svg width="${badgeWidth}" height="${badgeHeight}" viewBox="0 0 ${badgeWidth} ${badgeHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" rx="6" fill="#006A4E" fill-opacity="0.75"/>
      <circle cx="${badgeHeight * 0.5}" cy="${badgeHeight * 0.5}" r="${badgeHeight * 0.3}" fill="#FFB800" fill-opacity="0.9"/>
      <text x="${badgeHeight}" y="${badgeHeight * 0.62}" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="${fontSize}" fill="#FFFFFF" fill-opacity="0.95">BuySell BD Verified</text>
    </svg>
  `;
  return Buffer.from(svg);
};

/**
 * Computes a simple 64-bit gradient Difference Hash (dHash) from an image buffer
 * for perceptual similarity matching and repost fraud detection.
 */
export const calculateDHash = async (imageBuffer: Buffer): Promise<string> => {
  try {
    // Resize to 9x8 grayscale image (72 pixels)
    const { data } = await sharp(imageBuffer)
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let hashBinary = '';
    // Compare adjacent pixels in each row (8 comparisons per row * 8 rows = 64 bits)
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const left = data[row * 9 + col];
        const right = data[row * 9 + col + 1];
        hashBinary += left > right ? '1' : '0';
      }
    }

    // Convert 64-bit binary to 16-character hex string
    let hexHash = '';
    for (let i = 0; i < 64; i += 4) {
      const nibble = hashBinary.substring(i, i + 4);
      hexHash += parseInt(nibble, 2).toString(16);
    }

    return hexHash;
  } catch (error) {
    logger.warn('Failed to calculate dHash, falling back to sha256 of buffer: ', error);
    return crypto.createHash('sha256').update(imageBuffer).digest('hex').substring(0, 16);
  }
};

/**
 * Processes an uploaded image buffer:
 * 1. Optimizes & converts to WebP (quality 85%)
 * 2. Overlays translucent "BuySell BD Verified" watermark
 * 3. Generates 200x200 square thumbnail
 * 4. Calculates perceptual dHash
 */
export const processListingImage = async (
  inputBuffer: Buffer,
  filenamePrefix: string
): Promise<ProcessedMediaResult> => {
  try {
    const metadata = await sharp(inputBuffer).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    // Calculate perceptual hash before watermarking
    const perceptualHash = await calculateDHash(inputBuffer);

    // Create watermark buffer sized appropriately
    const watermarkBuffer = createWatermarkSvg(width, height);

    // Process main image: Resize if oversized (max 1920x1080), composite watermark, convert to WebP
    const mainImageBuffer = await sharp(inputBuffer)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .composite([
        {
          input: watermarkBuffer,
          gravity: 'southeast',
        },
      ])
      .webp({ quality: 85 })
      .toBuffer();

    // Process thumbnail: 200x200 cover
    const thumbnailBuffer = await sharp(inputBuffer)
      .resize(200, 200, { fit: 'cover', position: 'centre' })
      .webp({ quality: 80 })
      .toBuffer();

    // In local dev/mock mode, we return mock media CDN URLs (or base64 / s3 url in production)
    const uniqueId = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const url = `/uploads/listings/${filenamePrefix}_${uniqueId}.webp`;
    const thumbnailUrl = `/uploads/listings/thumb_${filenamePrefix}_${uniqueId}.webp`;

    return {
      url,
      thumbnailUrl,
      perceptualHash,
      width,
      height,
    };
  } catch (error) {
    logger.error('Image processing failure in mediaProcessor: ', error);
    throw new Error('Image optimization and watermarking failed.');
  }
};

export default {
  calculateDHash,
  processListingImage,
};
