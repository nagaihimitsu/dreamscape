import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { characterCatalogSchema } from "../src/content/character-assets";
import { tourismCatalogSchema } from "../src/content/tourism-schemas";
import { displayPath, loadContentSources, parseCatalog, type ContentSources } from "./content-sources";
import {
  markSampleCopies, noteAfterConversion, PHOTO_BOX, PHOTO_QUALITY, photoFormatOfPath, planPhoto, PORTRAIT_WEBP, portraitsOf,
  readObservationCards, tourismPhotos, webpCompressionOf, webpPathOf,
  type ObservationCards, type PhotoFormat, type PhotoSkip, type Portrait, type TourismPhoto,
} from "./image-optimization";
import { jsonText, sampleMarks } from "./sample-journey";

// npm run images:optimize (optimize-images-cli.ts): converts the tourism
// photos by the rule of image-optimization.ts. planPhotos reads each file and
// decides; applyPhotoSteps writes the WebP files, the catalog records (path,
// width, height, modificationJa) and the observation cards (path, sha256),
// then removes the old files. Sources and check dates stay: the conversion
// does not re-check where a photo comes from. It also makes the light copies
// of the portraits (below).

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

// The portraits (image-optimization.ts PORTRAIT_WEBP): planPortraits reads each served file and decides; applyPortraitSteps
// encodes each from its lossless original (keeping a lossless served picture that has no original there as the original
// first) and writes the served copy when its bytes change. The encoding is deterministic, so a second run writes nothing.

/** What happens to a portrait: made light from its original, or left as it is (and why). */
export type PortraitStep = {
  portrait: Portrait;
  /** The served file as it is: missing, a lossy or lossless WebP (anything else: the PNG paths and broken files are left alone). */
  served: "missing" | "lossy" | "lossless" | "other";
  /** The served file's bytes (0: missing). */
  bytes: number;
  /** The lossless original exists (authoring/…). */
  hasOriginal: boolean;
  outcome: { kind: "make" } | { kind: "skip"; reason: "sample" | "png-path" | "no-original" };
};
/** A portrait made light: its bytes before (0: there was no file) and after, and whether the file changed. */
export type PortraitWrite = { before: number; after: number; changed: boolean; keptOriginal: boolean };

/** What npm run images:optimize would do with each portrait (reads the served files, writes nothing). */
export function planPortraits(portraits: readonly Portrait[]): PortraitStep[] {
  return portraits.map((portrait): PortraitStep => {
    const bytes = existsSync(portrait.file) ? readFileSync(portrait.file) : undefined;
    const served = !bytes ? "missing" : webpCompressionOf(bytes) ?? "other";
    const hasOriginal = existsSync(portrait.original);
    const skip = portrait.sample ? "sample" : photoFormatOfPath(portrait.assetPath) !== "webp" ? "png-path"
      : !hasOriginal && served !== "lossless" ? "no-original" : undefined;
    return { portrait, served, bytes: bytes?.length ?? 0, hasOriginal, outcome: skip ? { kind: "skip", reason: skip } : { kind: "make" } };
  });
}

/**
 * Make the portraits planned to `make` light: keep a lossless served picture without an original as the original
 * (PNG, the same pixels), encode each original by PORTRAIT_WEBP, and write the served file when its bytes change.
 * Returns the portraits by served path.
 */
export async function applyPortraitSteps(steps: readonly PortraitStep[]): Promise<Map<string, PortraitWrite>> {
  const makes = steps.filter((step) => step.outcome.kind === "make");
  for (const step of makes.filter((item) => !item.hasOriginal)) {
    mkdirSync(path.dirname(step.portrait.original), { recursive: true });
    replaceFile(step.portrait.original, await sharp(readFileSync(step.portrait.file)).png({ compressionLevel: 9 }).toBuffer());
  }
  // libuv runs a few encodings at once (each takes a second or two at effort 6).
  const encoded = await Promise.all(makes.map((step) => sharp(step.portrait.original).webp(PORTRAIT_WEBP).toBuffer()));
  const written = new Map<string, PortraitWrite>();
  makes.forEach((step, index) => {
    const data = encoded[index];
    const before = existsSync(step.portrait.file) ? readFileSync(step.portrait.file) : undefined;
    const changed = !before || !before.equals(data);
    if (changed) {
      mkdirSync(path.dirname(step.portrait.file), { recursive: true });
      replaceFile(step.portrait.file, data);
    }
    written.set(step.portrait.assetPath, { before: before?.length ?? 0, after: data.length, changed, keptOriginal: !step.hasOriginal });
  });
  return written;
}

/** The repository's content, with the journey `journeyId` (if given) checked to exist. */
function loadSources(root: string, journeyId?: string): ContentSources {
  const sources = loadContentSources(root);
  if (journeyId && !sources.manifests.some((manifest) => manifest.id === journeyId))
    throw new Error(`旅行編「${journeyId}」がありません（content/journeys/<旅行編ID>/manifest.json）。`);
  return sources;
}

/** The photos of the repository's content (all journeys, or one), with the observation cards the conversion updates. */
export function loadPhotos(root: string, journeyId?: string, sources = loadSources(root, journeyId)): { photos: TourismPhoto[]; cards: ObservationCards[] } {
  const cards = readObservationCards(root, sources.manifests, "throw");
  const photos = tourismPhotos(sources, parseCatalog(sources, tourismCatalogSchema, "tourism/catalog.json"), cards)
    .filter((photo) => !journeyId || photo.journeyId === journeyId);
  return { photos: markSampleCopies(photos, sampleMarks().imageHashes), cards };
}

/** The portraits of the repository's content (all journeys and the shared layer, or one journey's). */
export function loadPortraits(root: string, journeyId?: string, sources = loadSources(root, journeyId)): Portrait[] {
  return portraitsOf(sources, parseCatalog(sources, characterCatalogSchema, "presentation/characters.json"))
    .filter((portrait) => !journeyId || portrait.journeyId === journeyId);
}

/** Plan (and with `write`, apply) the conversion of the repository's photos and portraits. */
export async function optimizeImages(root: string, options: { journeyId?: string; write: boolean }): Promise<{
  steps: PhotoStep[]; written: Map<string, PhotoWrite>; portraitSteps: PortraitStep[]; portraitsWritten: Map<string, PortraitWrite>;
}> {
  const sources = loadSources(root, options.journeyId);
  const { photos, cards } = loadPhotos(root, options.journeyId, sources);
  const steps = await planPhotos(photos);
  const portraitSteps = planPortraits(loadPortraits(root, options.journeyId, sources));
  const written = options.write ? await applyPhotoSteps(root, steps, cards) : new Map<string, PhotoWrite>();
  return { steps, written, portraitSteps, portraitsWritten: options.write ? await applyPortraitSteps(portraitSteps) : new Map() };
}
