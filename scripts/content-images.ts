import { readFile } from "node:fs/promises";
import sharp from "sharp";
import type { TourismCatalog } from "../src/content/tourism-schemas";
import { validateCharacterImage } from "./character-image-validation";
import type { CharacterImage } from "./presentation-validation";
import { requireServedFile } from "./public-assets";

// The contents of the content's image files. validateContent checks that
// every image a catalog names is served (from the loaded file list); these
// checks decode the files themselves, so they read the disk and run after
// the content is valid.

/**
 * Every tourism image is a JPEG, PNG or WebP file whose size matches its
 * catalog entry. Checked once per build; validateTourism checks each city's
 * use of the images.
 */
export async function checkTourismImages(publicFiles: ReadonlyMap<string, string>, assets: TourismCatalog["assets"]): Promise<void> {
  for (const asset of assets) {
    const bytes = await readFile(requireServedFile(publicFiles, asset.path));
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
    const png = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp =
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP";
    if (!jpeg && !png && !webp)
      throw new Error(`Invalid tourism image: ${asset.path}`);
    let dimensions: { width?: number; height?: number };
    try {
      dimensions = await sharp(bytes).metadata();
    } catch {
      throw new Error(`Invalid tourism image: ${asset.path}`);
    }
    if (dimensions.width !== asset.width || dimensions.height !== asset.height)
      throw new Error(`Tourism image dimensions do not match: ${asset.id}/${asset.path}`);
  }
}

/** Decode the costume images (validateCharacters lists them), then the tourism images. */
export async function checkContentImages(
  publicFiles: ReadonlyMap<string, string>,
  images: { characters: readonly CharacterImage[]; tourismAssets: TourismCatalog["assets"] },
): Promise<void> {
  for (const image of images.characters) await validateCharacterImage(image.file, image.imagePath, image.canvas, image.label);
  await checkTourismImages(publicFiles, images.tourismAssets);
}
