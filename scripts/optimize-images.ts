import { createHash } from "node:crypto";
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { tourismCatalogSchema } from "../src/content/tourism-schemas";
import { displayPath, loadContentSources, parseCatalog } from "./content-sources";
import {
  markSampleCopies, noteAfterConversion, PHOTO_BOX, PHOTO_QUALITY, planPhoto, readObservationCards, tourismPhotos, webpPathOf,
  type ObservationCards, type PhotoFormat, type PhotoSkip, type TourismPhoto,
} from "./image-optimization";
import { jsonText, sampleMarks } from "./sample-journey";

// npm run images:optimize (optimize-images-cli.ts): converts the tourism
// photos by the rule of image-optimization.ts. planPhotos reads each file and
// decides; applyPhotoSteps writes the WebP files, the catalog records (path,
// width, height, modificationJa) and the observation cards (path, sha256),
// then removes the old files. Sources and check dates stay: the conversion
// does not re-check where a photo comes from.

export type PhotoStep = {
  photo: TourismPhoto;
  /** The file as it is: format, stored size (as the catalog records it) and bytes. */
  format: PhotoFormat; width: number; height: number; bytes: number;
  /** An EXIF orientation other than "upright": browsers show the photo turned or mirrored, and the conversion turns the pixels. */
  rotated: boolean;
  /** The size as shown (after the EXIF orientation), which the rule applies to. */
  shown: { width: number; height: number };
  outcome: { kind: "skip"; reason: PhotoSkip } | { kind: "keep" } | { kind: "convert"; resize: boolean; path: string };
};
/** A converted photo: its new path, size and bytes. */
export type PhotoWrite = { path: string; width: number; height: number; bytes: number };

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const formats = new Set<string>(["jpeg", "png", "webp"]);

/** What npm run images:optimize would do with each photo (reads the files, writes nothing). */
export async function planPhotos(photos: readonly TourismPhoto[]): Promise<PhotoStep[]> {
  const steps: PhotoStep[] = [];
  for (const photo of photos) {
    const bytes = readFileSync(photo.file);
    const meta = await sharp(bytes).metadata();
    if (!formats.has(meta.format) || !meta.width || !meta.height)
      throw new Error(`観光写真の形式を読めません: ${photo.asset.path}（JPEG・PNG・WebP のどれでもない）`);
    const file = { format: meta.format as PhotoFormat, width: meta.width, height: meta.height, bytes: bytes.length,
      rotated: (meta.orientation ?? 1) !== 1, shown: meta.autoOrient ?? { width: meta.width, height: meta.height } };
    const plan = planPhoto({ format: file.format, ...file.shown, observation: photo.observation });
    steps.push({ photo, ...file, outcome: photo.skip ? { kind: "skip", reason: photo.skip } : plan.action === "keep" ? { kind: "keep" }
      : { kind: "convert", resize: plan.resize, path: webpPathOf(photo.asset.path) } });
  }
  return steps;
}

/** The photo encoded as WebP by the rule (colour profile kept, EXIF orientation applied to the pixels). */
async function encode(step: PhotoStep & { outcome: { kind: "convert" } }): Promise<{ data: Buffer; width: number; height: number }> {
  let image = sharp(readFileSync(step.photo.file)).autoOrient().keepIccProfile();
  if (step.outcome.resize) image = image.resize(PHOTO_BOX.width, PHOTO_BOX.height, { fit: "inside", withoutEnlargement: true, kernel: "lanczos3" });
  const { data, info } = await image.webp({ quality: PHOTO_QUALITY, effort: 6 }).toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Write a file in place of another (or of a symbolic link) without writing through it. */
function replaceFile(file: string, data: string | Uint8Array): void {
  const temporary = `${file}.images-optimize-${process.pid}`;
  writeFileSync(temporary, data);
  renameSync(temporary, file);
}

/**
 * Convert the photos planned to `convert`: write each WebP next to its old
 * file, then the catalog records and the observation cards, then remove the
 * old files. Refuses before writing anything when a new path is taken (by
 * another photo's record or by a file) or shared by two converted photos.
 * Returns the written photos by asset ID.
 */
export async function applyPhotoSteps(root: string, steps: readonly PhotoStep[], cards: readonly ObservationCards[]): Promise<Map<string, PhotoWrite>> {
  const converts = steps.filter((step): step is PhotoStep & { outcome: { kind: "convert" } } => step.outcome.kind === "convert");
  const taken = new Set(steps.map((step) => step.photo.asset.path));
  const target = (step: (typeof converts)[number]) => path.join(path.dirname(step.photo.file), path.posix.basename(step.outcome.path));
  // Two photos that differ only in their extension (a.jpg and a.png) would both become a.webp: the second would overwrite the first.
  const shared = [...new Set(converts.map((step) => step.outcome.path))]
    .filter((webp) => converts.filter((step) => step.outcome.path === webp).length > 1);
  if (shared.length)
    throw new Error(`変換後のファイル名が重なります: ${shared.map((webp) => `${webp}（${converts.filter((step) => step.outcome.path === webp)
      .map((step) => step.photo.asset.path).join(" と ")}）`).join(", ")}。どちらかの写真の名前を変えてから、もう一度実行してください。`);
  const clashes = converts.filter((step) => step.outcome.path !== step.photo.asset.path && (taken.has(step.outcome.path) || existsSync(target(step))));
  if (clashes.length)
    throw new Error(`変換後のファイル名がすでに使われています: ${clashes.map((step) => step.outcome.path).join(", ")}。` +
      "前回の変換が途中で止まった場合は、カタログにないそのファイルを消してから、もう一度実行してください。");
  const encoded = new Map<string, Awaited<ReturnType<typeof encode>>>();
  for (const step of converts) encoded.set(step.photo.asset.id, await encode(step));
  for (const step of converts) replaceFile(target(step), encoded.get(step.photo.asset.id)!.data);

  const written = new Map<string, PhotoWrite>();
  for (const catalogFile of new Set(converts.map((step) => step.photo.catalogFile))) {
    const catalogSteps = converts.filter((step) => step.photo.catalogFile === catalogFile);
    const catalog = JSON.parse(readFileSync(catalogFile, "utf8")) as { assets: Record<string, unknown>[] };
    for (const step of catalogSteps) {
      const record = catalog.assets.find((asset) => asset.id === step.photo.asset.id);
      if (!record) throw new Error(`カタログに観光写真「${step.photo.asset.id}」がありません: ${displayPath(root, catalogFile)}`);
      const { data, width, height } = encoded.get(step.photo.asset.id)!;
      const resized = width !== step.shown.width || height !== step.shown.height;
      Object.assign(record, { path: step.outcome.path, width, height, modificationJa: noteAfterConversion(step.photo.asset.modificationJa,
        { licenseName: step.photo.asset.licenseName, rotated: step.rotated, resized, width, height }) });
      written.set(step.photo.asset.id, { path: step.outcome.path, width, height, bytes: data.length });
    }
    replaceFile(catalogFile, jsonText(catalog));
  }
  const newImage = new Map(converts.map((step) => [step.photo.asset.path, { path: step.outcome.path, sha256: sha256(encoded.get(step.photo.asset.id)!.data) }]));
  for (const card of cards) {
    if (!Object.values(card.images).some((image) => newImage.has(image.path))) continue;
    const data = JSON.parse(readFileSync(card.file, "utf8")) as { images: Record<string, Record<string, unknown>> };
    for (const image of Object.values(data.images)) {
      const replacement = typeof image.path === "string" ? newImage.get(image.path) : undefined;
      if (replacement) Object.assign(image, replacement);
    }
    replaceFile(card.file, jsonText(data));
  }
  for (const step of converts) if (step.outcome.path !== step.photo.asset.path) rmSync(step.photo.file);
  return written;
}

/** The photos of the repository's content (all journeys, or one), with the observation cards the conversion updates. */
export function loadPhotos(root: string, journeyId?: string): { photos: TourismPhoto[]; cards: ObservationCards[] } {
  const sources = loadContentSources(root);
  if (journeyId && !sources.manifests.some((manifest) => manifest.id === journeyId))
    throw new Error(`旅行編「${journeyId}」がありません（content/journeys/<旅行編ID>/manifest.json）。`);
  const cards = readObservationCards(root, sources.manifests, "throw");
  const photos = tourismPhotos(sources, parseCatalog(sources, tourismCatalogSchema, "tourism/catalog.json"), cards)
    .filter((photo) => !journeyId || photo.journeyId === journeyId);
  return { photos: markSampleCopies(photos, sampleMarks().imageHashes), cards };
}

/** Plan (and with `write`, apply) the conversion of the repository's photos. */
export async function optimizeImages(root: string, options: { journeyId?: string; write: boolean }): Promise<{ steps: PhotoStep[]; written: Map<string, PhotoWrite> }> {
  const { photos, cards } = loadPhotos(root, options.journeyId);
  const steps = await planPhotos(photos);
  return { steps, written: options.write ? await applyPhotoSteps(root, steps, cards) : new Map() };
}
