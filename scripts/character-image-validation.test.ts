import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { validateCharacterImage } from "./character-image-validation";

let root: string;
const canvas = { width: 8, height: 12 };
const label = "heroine/south_europe_01/standing_01/neutral";
const imagePath = "assets/characters/heroine/test.png";
const png = (alpha: number, width = 8) =>
  sharp({ create: { width, height: 12, channels: 4, background: { r: 255, g: 255, b: 255, alpha } } }).png().toBuffer();

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "dreamscape-character-"));
  await mkdir(path.join(root, "public/assets/characters/heroine"), { recursive: true });
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe("registered character artwork", () => {
  it("accepts real transparent PNG and WebP on the specified shared canvas", async () => {
    await writeFile(path.join(root, "public", imagePath), await png(0.5));
    await expect(validateCharacterImage(root, imagePath, canvas, label)).resolves.toBeUndefined();
    const webpPath = imagePath.replace(".png", ".webp");
    await writeFile(path.join(root, "public", webpPath), await sharp(await png(0.5)).webp().toBuffer());
    await expect(validateCharacterImage(root, webpPath, canvas, label)).resolves.toBeUndefined();
  });

  it("reports the actual missing image and rejects malformed or renamed images", async () => {
    await expect(validateCharacterImage(root, imagePath, canvas, label)).rejects.toThrow(`Missing character image: ${label}/${imagePath}`);
    await writeFile(path.join(root, "public", imagePath), "not an image");
    await expect(validateCharacterImage(root, imagePath, canvas, label)).rejects.toThrow("Invalid character image");
    await writeFile(path.join(root, "public", imagePath), await sharp(await png(0.5)).webp().toBuffer());
    await expect(validateCharacterImage(root, imagePath, canvas, label)).rejects.toThrow("format does not match extension");
  });

  it("rejects a mismatched canvas and an entirely opaque reference image", async () => {
    await writeFile(path.join(root, "public", imagePath), await png(0.5, 7));
    await expect(validateCharacterImage(root, imagePath, canvas, label)).rejects.toThrow("dimensions do not match canvas 8x12");
    await writeFile(path.join(root, "public", imagePath), await png(1));
    await expect(validateCharacterImage(root, imagePath, canvas, label)).rejects.toThrow("no transparent pixels");
    const opaque = await sharp({ create: { width: 8, height: 12, channels: 3, background: "white" } }).png().toBuffer();
    await writeFile(path.join(root, "public", imagePath), opaque);
    await expect(validateCharacterImage(root, imagePath, canvas, label)).rejects.toThrow("no transparency");
  });

  it("rejects an entirely transparent image with no visible character", async () => {
    await writeFile(path.join(root, "public", imagePath), await png(0));
    await expect(validateCharacterImage(root, imagePath, canvas, label)).rejects.toThrow("entirely transparent");
  });
});
