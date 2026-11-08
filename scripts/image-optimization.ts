import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { TourismAsset } from "../src/content/tourism-schemas";
import type { ContentWarning } from "./content-report";
import { displayPath, type ContentSources, type JourneyManifest } from "./content-sources";
import { authoringProfileOf } from "./journey-authoring";
import { requireServedFile } from "./public-assets";

// How tourism photos are served: as WebP.
// A photo the observation viewer zooms (up to 5×) keeps its size; any other
// photo fits in 1600×1800 px (portrait photos keep the width a 3× phone
// screen needs). JPEG and PNG photos are re-encoded as WebP (quality 80),
// keeping their colour profile; a WebP photo stays as it is unless it is too
// large for a photo that is not zoomed. `npm run images:optimize`
// (optimize-images.ts) applies the rule; content:build warns about photos
// that do not follow it yet. Placeholder images (isPlaceholder) and the sample
// journey's images are never converted: journey:readiness recognises copied
// sample images by their bytes (sample-journey.ts).

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
 * Whether a modification note already says that the adapted photo is shared
 * under the same licence (e.g. 「この縮小版もCC BY-SA 4.0で提供します。」,
 * 「縮小版も原本と同じライセンスで提供。」, 「ライセンスは元画像と同じ。」,
 * 「CC BY-SA 4.0に従います。」).
 */
export function hasShareAlikeStatement(note: string): boolean {
  return /版も|同じライセンス|元画像と同じ|同条件|に従います/u.test(note);
}

/**
 * The modification note after a conversion: the note plus one sentence on the
 * EXIF orientation applied to the pixels (if any), the resize and the format, and, for a share-alike licence (CC BY-SA) whose note
 * does not yet say so, that the converted photo keeps that licence.
 */
export function noteAfterConversion(note: string, change: { licenseName: string; rotated: boolean; resized: boolean; width: number; height: number }): string {
  const format = `WebP形式（品質${PHOTO_QUALITY}）に変換。`;
  const sentence = `さらに${change.rotated ? "EXIFの向きの情報のとおりに画素の向きを直し、" : ""}` +
    (change.resized ? `縦横比を保って${change.width}×${change.height}pxに縮小し、${format}` : change.rotated ? format : `同じ寸法のまま${format}`);
  const shareAlike = /BY-SA/u.test(change.licenseName) && !hasShareAlikeStatement(note) ? `変換版も${change.licenseName}で提供。` : "";
  return `${note}${sentence}${shareAlike}`;
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

/** Why a photo is never converted: a placeholder (isPlaceholder) or an image of the sample journey (authoring/templates/). */
export type PhotoSkip = "placeholder" | "sample";
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
