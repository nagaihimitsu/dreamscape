import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, utimesSync } from "node:fs";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { derivedImageFile, type DerivedImageKind } from "../src/content/code-images";
import { chooseCityBackdrop, choosePlacePhoto, type PhotoContent } from "../src/content/photo-choice";
import type { TourismAsset } from "../src/content/tourism-schemas";
import type { TravelPlace } from "../src/content/travel-schemas";
import { requireServedFile } from "./public-assets";

// Reduced copies of the photos the free-time screen shows (UI spec §4.2): a
// `card` for every photo a place's row can show (photo-choice.ts
// choosePlacePhoto) and a `backdrop` for every city backdrop. content:build
// makes them after the content is valid and serves them from the generated
// public folder only (content-outputs.ts); they never enter content/ or git.
// The copies are kept in a cache (node_modules/.cache, beside the Ink
// validation cache) keyed by the SHA-256 of the source file and the settings
// below, so a build only encodes new or changed photos; the served copies that
// no photo needs any more are removed like every other generated public file.

/** How each copy is made. A change here (or in libvips) gives every copy a new cache key. */
export const DERIVED_IMAGE_SETTINGS = {
  /** A 240×160 cover crop (target ≤ 20 KiB). */
  card: { width: 240, height: 160, fit: "cover", withoutEnlargement: false, quality: 68 },
  /** The longest side 1280 px, never enlarged (target ≤ 200 KiB). */
  backdrop: { width: 1280, height: 1280, fit: "inside", withoutEnlargement: true, quality: 60 },
} as const satisfies Record<DerivedImageKind, { width: number; height: number; fit: "cover" | "inside"; withoutEnlargement: boolean; quality: number }>;

/** Bump when the way a copy is encoded changes outside the settings. */
const cacheFormat = 1;
/** Cached copies kept (about 20 KiB a card, up to 200 KiB a backdrop); beyond this the least recently used are removed. */
const keptEntries = 600;
const repositoryRoot = path.resolve(import.meta.dirname, "..");
export const DERIVED_IMAGE_CACHE_DIRECTORY = path.join(repositoryRoot, "node_modules", ".cache", "dreamscape", "derived-images");

export type DerivedImage = {
  /** The served path (code-images.ts derivedImageFile). */
  path: string;
  kind: DerivedImageKind;
  assetId: string;
  /** The source photo on disk. */
  source: string;
};

/**
 * Every copy the game can ask for: a card per place photo, a backdrop per
 * city backdrop, once per served path. `journeyOf` maps an asset ID to the
 * journey that provides it (image-rights.ts imageJourneyIndex).
 */
export function derivedImageList(input: {
  content: PhotoContent;
  cities: readonly { city: { backdropAssetId?: string }; places: readonly TravelPlace[]; hotelPlaceId: string }[];
  journeyOf: ReadonlyMap<string, string>;
  publicFiles: ReadonlyMap<string, string>;
}): DerivedImage[] {
  const images = new Map<string, DerivedImage>();
  const add = (asset: TourismAsset | null, kind: DerivedImageKind) => {
    if (!asset) return;
    const journeyId = input.journeyOf.get(asset.id);
    if (!journeyId) throw new Error(`Tourism image without a journey: ${asset.id}`);
    const served = derivedImageFile(journeyId, asset.id, kind);
    if (!images.has(served)) images.set(served, { path: served, kind, assetId: asset.id, source: requireServedFile(input.publicFiles, asset.path) });
  };
  for (const { city, places, hotelPlaceId } of input.cities) {
    for (const place of places) add(choosePlacePhoto(input.content, place, hotelPlaceId), "card");
    add(chooseCityBackdrop(input.content.assets, city), "backdrop");
  }
  return [...images.values()];
}

/** Encode one copy of `bytes` (a JPEG, PNG or WebP photo). */
export async function encodeDerivedImage(bytes: Buffer, kind: DerivedImageKind): Promise<Buffer> {
  const { width, height, fit, withoutEnlargement, quality } = DERIVED_IMAGE_SETTINGS[kind];
  return sharp(bytes).rotate().resize({ width, height, fit, withoutEnlargement }).webp({ quality }).toBuffer();
}

const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");

/**
 * Make sure every copy is in the cache (encoding the missing ones) and return
 * the served path → cached file map for the generated public folder, with how
 * many copies were encoded and reused.
 */
export async function prepareDerivedImages(
  images: readonly DerivedImage[],
  cacheDirectory = DERIVED_IMAGE_CACHE_DIRECTORY,
): Promise<{ files: Map<string, string>; made: number; reused: number }> {
  mkdirSync(cacheDirectory, { recursive: true });
  removeLeastRecentlyUsed(cacheDirectory, keptEntries);
  const sources = new Map<string, Promise<{ bytes: Buffer; hash: string }>>();
  const readSource = (file: string) => {
    if (!sources.has(file)) sources.set(file, readFile(file).then((bytes) => ({ bytes, hash: sha256(bytes) })));
    return sources.get(file)!;
  };
  let made = 0;
  let reused = 0;
  const entries = await Promise.all(images.map(async (image): Promise<[string, string]> => {
    const { bytes, hash } = await readSource(image.source);
    const key = sha256(`${cacheFormat}\n${hash}\n${image.kind}\n${JSON.stringify(DERIVED_IMAGE_SETTINGS[image.kind])}\nvips ${sharp.versions.vips}`);
    const file = path.join(cacheDirectory, `${key}.webp`);
    if (existsSync(file)) {
      reused += 1;
      // The access time records the use (least recently used first out); the modification time stays, so the
      // served copy is not copied again (seconds as numbers keep sub-millisecond precision; a Date would round).
      utimesSync(file, Date.now() / 1000, statSync(file).mtimeMs / 1000);
    } else {
      // Written under a temporary name and renamed, so a parallel build never reads half a file.
      const temporary = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
      await writeFile(temporary, await encodeDerivedImage(bytes, image.kind));
      await rename(temporary, file);
      made += 1;
    }
    return [image.path, file];
  }));
  return { files: new Map(entries), made, reused };
}

function removeLeastRecentlyUsed(directory: string, limit: number) {
  const entries = readdirSync(directory).filter((name) => name.endsWith(".webp"));
  if (entries.length <= limit) return;
  entries.map((name) => ({ file: path.join(directory, name), used: statSync(path.join(directory, name)).atimeMs }))
    .sort((left, right) => left.used - right.used)
    .slice(0, entries.length - limit)
    .forEach(({ file }) => rmSync(file, { force: true }));
}
