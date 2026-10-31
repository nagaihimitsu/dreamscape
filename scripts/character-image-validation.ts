import path from "node:path";
import { access } from "node:fs/promises";
import sharp, { type Sharp, type Metadata, type ChannelStats } from "sharp";

/** Validate registered final artwork, not the legacy reference/placeholder art. */
export async function validateCharacterImage(
  root: string,
  imagePath: string,
  canvas: { width: number; height: number },
  label: string,
): Promise<void> {
  const file = path.join(root, "public", imagePath);
  try {
    await access(file);
  } catch {
    throw new Error(`Missing character image: ${label}/${imagePath}`);
  }

  // Decode the real contents; changing the extension of a white reference
  // image is not sufficient to register it as production artwork.
  let image: Sharp;
  let metadata: Metadata;
  try {
    image = sharp(file, { failOn: "error" });
    metadata = await image.metadata();
  } catch (error) {
    throw new Error(`Invalid character image: ${label}/${imagePath}`, { cause: error });
  }
  const expectedFormat = path.extname(imagePath).slice(1).toLowerCase();
  if ((expectedFormat !== "png" && expectedFormat !== "webp") || metadata.format !== expectedFormat)
    throw new Error(`Character image format does not match extension: ${label}/${imagePath}`);
  if (metadata.width !== canvas.width || metadata.height !== canvas.height)
    throw new Error(`Character image dimensions do not match canvas ${canvas.width}x${canvas.height}: ${label}/${imagePath} (${metadata.width}x${metadata.height})`);
  if (!metadata.hasAlpha)
    throw new Error(`Character image has no transparency: ${label}/${imagePath}`);
  let alpha: ChannelStats;
  try {
    const { channels } = await image.stats();
    alpha = channels[channels.length - 1];
  } catch (error) {
    throw new Error(`Character image could not be decoded: ${label}/${imagePath}`, { cause: error });
  }
  if (alpha.min === 255)
    throw new Error(`Character image has no transparent pixels: ${label}/${imagePath}`);
  if (alpha.max === 0)
    throw new Error(`Character image is entirely transparent: ${label}/${imagePath}`);
}
