import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { TourismAsset } from "../src/content/tourism-schemas";
import type { ContentWarning } from "./content-report";
import { displayPath, type ContentSources, type JourneyManifest } from "./content-sources";
import { authoringFolder, authoringProfileOf } from "./journey-authoring";
import { requireServedFile, servedFile } from "./public-assets";

// How tourism photos are served: as WebP. (The portraits: further below, PORTRAIT_WEBP.)
// A photo the observation viewer zooms (up to 5×) keeps its size; any other
// photo fits in 1600×1800 px (portrait photos keep the width a 3× phone
// screen needs). JPEG and PNG photos are re-encoded as WebP (quality 80),
// keeping their colour profile; a WebP photo stays as it is unless it is too
// large for a photo that is not zoomed. `npm run images:optimize`
// (optimize-images.ts) applies the rule; content:build warns about photos
// that do not follow it yet. Placeholder images (isPlaceholder), the sample
// journey's images and copies of them are never converted: journey:readiness
// recognises copied sample images by their bytes (sample-journey.ts).

/** The box every photo that is not zoomed fits in. */
export const PHOTO_BOX = { width: 1600, height: 1800 } as const;
/** WebP quality of converted photos (sharp/libwebp scale 1–100). */
export const PHOTO_QUALITY = 80;

export type PhotoFormat = "jpeg" | "png" | "webp";
/** What happens to a photo: kept as it is, or written as WebP (resized into PHOTO_BOX or at the same size). */
export type PhotoPlan = { action: "keep" } | { action: "convert"; resize: boolean };

/** The served path's format, by its extension (the catalog schema allows .jpg/.jpeg/.png/.webp only). */
export function photoFormatOfPath(assetPath: string): PhotoFormat {
  const extension = path.posix.extname(assetPath).toLowerCase();
  return extension === ".webp" ? "webp" : extension === ".png" ? "png" : "jpeg";
}

/** The photo's path once converted: the same folder and name with `.webp`. */
export function webpPathOf(assetPath: string): string {
  return assetPath.slice(0, assetPath.length - path.posix.extname(assetPath).length) + ".webp";
}

export function planPhoto(photo: { format: PhotoFormat; width: number; height: number; observation: boolean }): PhotoPlan {
  const resize = !photo.observation && (photo.width > PHOTO_BOX.width || photo.height > PHOTO_BOX.height);
  return photo.format === "webp" && !resize ? { action: "keep" } : { action: "convert", resize };
}

/**
 * Whether a modification note says that the served photo is shared under the
 * same licence (e.g. 「変換版もCC BY-SA 4.0で提供。」, 「変換画像もCC BY-SA 3.0。」,
 * 「この縮小版もCC BY-SA 4.0で提供します。」, 「ライセンスは元画像と同じ。」,
 * 「CC BY-SA 4.0に従います。」). The statement has to come after the note's
 * last conversion to WebP (the step that made the served file): one before it
 * covers an earlier version only, such as the Commons thumbnail. A note that
 * names no WebP conversion may state it anywhere.
 */
export function hasShareAlikeStatement(note: string): boolean {
  const lastConversion = note.lastIndexOf("WebP");
  return /版も|変換画像も|同じライセンス|元画像と同じ|同条件|に従います/u.test(lastConversion < 0 ? note : note.slice(lastConversion));
}

/**
 * The modification note after a conversion: the note plus one sentence on the
 * EXIF orientation applied to the pixels (if any), the resize and the format,
 * and, for a share-alike licence (CC BY-SA), that the converted photo keeps
 * that licence (hasShareAlikeStatement: a statement earlier in the note covers
 * an earlier version, so every conversion adds one after its own sentence).
 */
export function noteAfterConversion(note: string, change: { licenseName: string; rotated: boolean; resized: boolean; width: number; height: number }): string {
  const format = `WebP形式（品質${PHOTO_QUALITY}）に変換。`;
  const converted = `${note}さらに${change.rotated ? "EXIFの向きの情報のとおりに画素の向きを直し、" : ""}` +
    (change.resized ? `縦横比を保って${change.width}×${change.height}pxに縮小し、${format}` : change.rotated ? format : `同じ寸法のまま${format}`);
  const shareAlike = /BY-SA/u.test(change.licenseName) && !hasShareAlikeStatement(converted) ? `変換版も${change.licenseName}で提供。` : "";
  return `${converted}${shareAlike}`;
}

/** A journey's observation cards (authoring.observationFile) as far as the photos are concerned: landmark → image record. */
export type ObservationCards = { journeyId: string; file: string; images: Record<string, { path: string; sha256: string }> };
const cardsSchema = z.object({ images: z.record(z.string(), z.object({ path: z.string(), sha256: z.string() }).loose()) }).loose();

/**
 * The observation cards of every journey whose manifest names a cards file
 * that exists (journey:scaffold turns their images into the landmarks'
 * images when a city is released, so they are observation images before the
 * tourism catalog has landmarks). `onInvalid: "skip"` leaves out a file that
 * is not valid JSON of that shape (for a warning); "throw" refuses it.
 */
export function readObservationCards(root: string, manifests: readonly JourneyManifest[], onInvalid: "skip" | "throw"): ObservationCards[] {
  return manifests.flatMap((manifest): ObservationCards[] => {
    const profile = authoringProfileOf(manifest.data, manifest.file);
    const file = profile && path.resolve(root, profile.observationFile);
    if (!file || !existsSync(file)) return [];
    try {
      return [{ journeyId: manifest.id, file, images: cardsSchema.parse(JSON.parse(readFileSync(file, "utf8"))).images }];
    } catch (error) {
      if (onInvalid === "skip") return [];
      throw new Error(`観察資料を読めません: ${displayPath(root, file)}`, { cause: error });
    }
  });
}

/**
 * Why a photo is never converted: a placeholder (isPlaceholder), an image of
 * the sample journey (authoring/templates/), or a file with the bytes of a
 * sample image (markSampleCopies).
 */
export type PhotoSkip = "placeholder" | "sample" | "sample-copy";
/** A tourism photo of the loaded content: its record, the catalog file and journey that provide it, its file, and its use. */
export type TourismPhoto = {
  asset: TourismAsset;
  /** The tourism/catalog.json that holds the record (absolute). */
  catalogFile: string;
  /** The journey folder that provides the record, if any (the core layer has none). */
  journeyId: string | undefined;
  /** The served file (absolute). */
  file: string;
  /** Zoomed in the observation viewer: a landmark's image, or the image of an observation card. */
  observation: boolean;
  skip: PhotoSkip | undefined;
};

/**
 * The tourism photos of the loaded content, in catalog order. `assets` are
 * the validated records of the merged tourism catalog (same order as its
 * provenance), `landmarkImageIds` the landmarks' imageAssetId.
 */
export function tourismPhotos(
  sources: ContentSources,
  catalog: { assets: readonly TourismAsset[]; landmarks: readonly { imageAssetId: string }[] },
  cards: readonly ObservationCards[],
): TourismPhoto[] {
  const files = sources.catalogs["tourism/catalog.json"]?.provenance.items.assets ?? [];
  const landmarkImages = new Set(catalog.landmarks.map((landmark) => landmark.imageAssetId));
  const cardImages = new Set(cards.flatMap((card) => Object.values(card.images).map((image) => path.posix.normalize(image.path))));
  const templates = path.join(sources.root, "authoring", "templates") + path.sep;
  return catalog.assets.map((asset, index): TourismPhoto => {
    const catalogFile = files[index];
    return {
      asset, catalogFile,
      journeyId: sources.manifests.find((manifest) => catalogFile.startsWith(manifest.directory + path.sep))?.id,
      file: requireServedFile(sources.publicFiles, asset.path),
      observation: landmarkImages.has(asset.id) || cardImages.has(path.posix.normalize(asset.path)),
      skip: asset.isPlaceholder ? "placeholder" : catalogFile.startsWith(templates) ? "sample" : undefined,
    };
  });
}

/**
 * Mark the PNG photos whose file has the bytes of a sample image
 * (sampleMarks().imageHashes): `journey:new` copies the sample's PNG images,
 * and journey:readiness finds a copy left by its bytes, so converting it would
 * hide that it still has to be replaced. Reads only those PNG files.
 */
export function markSampleCopies(photos: readonly TourismPhoto[], sampleImageHashes: ReadonlySet<string>): TourismPhoto[] {
  return photos.map((photo) => photo.skip || photoFormatOfPath(photo.asset.path) !== "png" ||
    !sampleImageHashes.has(createHash("sha256").update(readFileSync(photo.file)).digest("hex")) ? photo : { ...photo, skip: "sample-copy" });
}

const formatNames: Record<PhotoFormat, string> = { jpeg: "JPEG", png: "PNG", webp: "WebP" };

/**
 * content:build's warning for each photo that npm run images:optimize would
 * convert (format by the path's extension, size from the record, which
 * content:build checks against the file). Never an error: the photo works,
 * it is only heavier than needed.
 */
export function tourismPhotoWarnings(sources: ContentSources, photos: readonly TourismPhoto[]): ContentWarning[] {
  return photos.flatMap((photo): ContentWarning[] => {
    const format = photoFormatOfPath(photo.asset.path);
    const plan = planPhoto({ format, width: photo.asset.width, height: photo.asset.height, observation: photo.observation });
    if (photo.skip || plan.action === "keep") return [];
    const size = `${formatNames[format]} ${photo.asset.width}×${photo.asset.height}`;
    const fix = plan.resize ? `WebPにして${PHOTO_BOX.width}×${PHOTO_BOX.height}pxの枠に収めます`
      : `${photo.observation ? "観察で拡大する写真なので" : ""}同じ大きさのままWebPにします`;
    const command = `npm run images:optimize -- ${photo.journeyId ? `--journey ${photo.journeyId} ` : ""}--write`;
    return [{ kind: "tourism-photo", message: `観光写真を軽くできます: ${displayPath(sources.root, photo.catalogFile)} の "${photo.asset.id}"` +
      `（${photo.asset.path}、${size}）。${command} で、${fix}。` }];
  });
}

// How the standing pictures (the portraits of presentation/characters.json) are served (2026-11-13 user decision
// 「軽い版を配る」): the drawn original stays lossless (PNG) in the authoring folder of the layer whose catalog names
// the portrait, never served, and the served file is a lossy WebP copy of it with the transparency kept exactly
// (PORTRAIT_WEBP). Lossless portraits (about 300–900 KB each) filled a slow phone link in a new journey's first ~40 s;
// the copies are about 80 % smaller, with no difference visible at phone size. A copy keeps the served path, so
// nothing that names it changes. `npm run images:optimize` makes the copies from the originals (optimize-images.ts);
// content:build warns about a portrait still served lossless. The sample journey's portraits are left alone.

/** sharp's WebP settings of a served portrait: lossy colour, lossless alpha (alphaQuality 100), sharp RGB→YUV conversion. */
export const PORTRAIT_WEBP = { quality: 85, alphaQuality: 100, smartSubsample: true, effort: 6 } as const;

/** A portrait the character catalogs name: its served path and file, and where its lossless original lives. */
export type Portrait = {
  /** The served path (assets/…), as characters.json names it. */
  assetPath: string;
  /** The journey whose characters.json names it (undefined: the shared content/presentation/characters.json). */
  journeyId: string | undefined;
  /** The served file (absolute): the loaded public file, or where that layer would serve it. */
  file: string;
  /** The lossless original (absolute; portraitOriginalOf). */
  original: string;
  /** Named by the sample journey (authoring/templates/): never converted. */
  sample: boolean;
};

/**
 * Where the lossless original of a served portrait lives: the same path below `assets/` in the authoring folder of
 * the layer (authoring/ for the shared layer, authoring/journeys/<journeyId>/ for a journey), as a PNG. For example
 * golden_triangle's assets/characters/gt_kamla/neutral.webp → authoring/journeys/golden_triangle/characters/gt_kamla/neutral.png.
 */
export function portraitOriginalOf(assetPath: string, journeyId: string | undefined): string {
  const below = assetPath.replace(/^assets\//u, "");
  return `${journeyId ? authoringFolder(journeyId) : "authoring/"}${below.slice(0, below.length - path.posix.extname(below).length)}.png`;
}

type CharacterPictures = { characters: readonly { imagePath: string | null; variants: readonly { imagePath: string | null }[];
  costumes?: readonly { poses: readonly { expressions: Record<string, string> }[] }[] }[] };

/**
 * The raster portraits (.png, .webp; not the SVG placeholders) the merged character catalog names (each character's
 * imagePath, its variants' and its costumes' expressions), once each, in catalog order. `catalog` is the validated
 * merged catalog (same order as its provenance, which gives the layer of each character).
 */
export function portraitsOf(sources: ContentSources, catalog: CharacterPictures): Portrait[] {
  const files = sources.catalogs["presentation/characters.json"]?.provenance.items.characters ?? [];
  const templates = path.join(sources.root, "authoring", "templates") + path.sep;
  const seen = new Set<string>();
  return catalog.characters.flatMap((character, index): Portrait[] => {
    const catalogFile = files[index] ?? "";
    const manifest = sources.manifests.find((item) => catalogFile.startsWith(item.directory + path.sep));
    const paths = [character.imagePath, ...character.variants.map((variant) => variant.imagePath),
      ...(character.costumes ?? []).flatMap((costume) => costume.poses.flatMap((pose) => Object.values(pose.expressions)))];
    return paths.flatMap((assetPath): Portrait[] => {
      if (!assetPath || !/\.(?:png|webp)$/iu.test(assetPath) || seen.has(assetPath)) return [];
      seen.add(assetPath);
      return [{
        assetPath, journeyId: manifest?.id,
        file: servedFile(sources.publicFiles, assetPath) ?? path.join(manifest?.directory ?? sources.root, "public", assetPath),
        original: path.join(sources.root, portraitOriginalOf(assetPath, manifest?.id)),
        sample: catalogFile.startsWith(templates),
      }];
    });
  });
}

/** How WebP bytes are compressed, by their first image chunk (VP8 lossy, VP8L lossless); undefined when they are no WebP. */
export function webpCompressionOf(bytes: Uint8Array): "lossy" | "lossless" | undefined {
  const ascii = (start: number) => String.fromCharCode(...bytes.subarray(start, start + 4));
  if (bytes.length < 12 || ascii(0) !== "RIFF" || ascii(8) !== "WEBP") return undefined;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const chunk = ascii(offset);
    if (chunk === "VP8 ") return "lossy";
    if (chunk === "VP8L") return "lossless";
    const size = (bytes[offset + 4] | (bytes[offset + 5] << 8) | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24)) >>> 0;
    offset += 8 + size + (size & 1);
  }
  return undefined;
}

/**
 * content:build's warning for each portrait served lossless that npm run images:optimize would make light: a PNG path
 * (to rename to .webp first), or a lossless WebP. `compressionOf` reads a served WebP file (webpCompressionOf of its
 * bytes). Never an error: the portrait works, it is only heavier than needed.
 */
export function portraitWarnings(sources: ContentSources, portraits: readonly Portrait[],
  compressionOf: (file: string) => "lossy" | "lossless" | undefined): ContentWarning[] {
  return portraits.flatMap((portrait): ContentWarning[] => {
    const png = photoFormatOfPath(portrait.assetPath) === "png";
    if (portrait.sample || (!png && compressionOf(portrait.file) !== "lossless")) return [];
    const command = `npm run images:optimize -- ${portrait.journeyId ? `--journey ${portrait.journeyId} ` : ""}--write`;
    const original = displayPath(sources.root, portrait.original);
    const light = `配信用の軽い版（非可逆のWebP 品質${PORTRAIT_WEBP.quality}、透明度はそのまま）`;
    return [{ kind: "portrait", message: png
      ? `立ち絵を軽くできます: ${portrait.assetPath}（PNG）。characters.json と own-artwork.json のパスを .webp にし、元の絵を ${original} に置いてから、` +
        `${command} で${light}を作ります。`
      : `立ち絵を軽くできます: ${portrait.assetPath}（可逆のWebP）。${command} で、元の絵 ${original} から${light}にします` +
        "（元の絵がなければ、今の絵をそこへPNGで残します）。" }];
  });
}
