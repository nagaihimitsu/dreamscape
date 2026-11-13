import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp, { type Sharp } from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TourismAsset } from "../src/content/tourism-schemas";
import {
  markSampleCopies, portraitOriginalOf, webpCompressionOf, type ObservationCards, type PhotoSkip, type Portrait, type TourismPhoto,
} from "./image-optimization";
import { applyPhotoSteps, applyPortraitSteps, planPhotos, planPortraits } from "./optimize-images";
import { jsonText } from "./sample-journey";

// npm run images:optimize on a small journey folder of photos made here (no repository content).

let root: string;
let outside: string;
const folder = "content/journeys/demo";
const servedDirectory = () => path.join(root, folder, "public");
const catalogFile = () => path.join(root, folder, "tourism/catalog.json");
const cardsFile = () => path.join(root, "authoring/journeys/demo/drafts/observation-cards.json");
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const lpNote = "Commons配信の版を使用。描き足し・色変更なし。";

function record(id: string, file: string, width: number, height: number, extra: Partial<TourismAsset> = {}): TourismAsset {
  return { id, path: `assets/tourism/demo/${file}`, width, height, altJa: "試験用の写真。", isPlaceholder: false,
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${id}.jpg`, licenseName: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0",
    creditJa: "写真：試験", modificationJa: lpNote, checkedAt: "2026-11-08", ...extra };
}
/**
 * A photo: one flat colour, or (`detailed`) gradients with fine detail, which
 * make each WebP quality and effort give different bytes (a flat colour
 * encodes to the same bytes at effort 4 and 6).
 */
async function image(file: string, width: number, height: number, encode: (image: Sharp) => Sharp, detailed = false): Promise<Buffer> {
  const pixels = Buffer.alloc(detailed ? width * height * 3 : 0);
  if (detailed) for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = (y * width + x) * 3;
    pixels[index] = Math.floor((x * 255) / width);
    pixels[index + 1] = Math.floor((y * 255) / height);
    pixels[index + 2] = ((x + y) * 7) % 256;
  }
  const source = detailed ? sharp(pixels, { raw: { width, height, channels: 3 } })
    : sharp({ create: { width, height, channels: 3, background: { r: 120, g: 150, b: 190 } } });
  const bytes = await encode(source).toBuffer();
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, bytes);
  return bytes;
}
const served = (assetPath: string) => path.join(servedDirectory(), assetPath);
/** The photos as tourismPhotos would give them, read from the folder on disk (observation = an image of the cards). */
function photos(skips: Record<string, PhotoSkip> = {}): TourismPhoto[] {
  const catalog = JSON.parse(readFileSync(catalogFile(), "utf8")) as { assets: TourismAsset[] };
  const cardPaths = new Set(Object.values(cards()[0].images).map((item) => item.path));
  return catalog.assets.map((asset) => ({ asset, catalogFile: catalogFile(), journeyId: "demo", file: served(asset.path),
    observation: cardPaths.has(asset.path), skip: asset.isPlaceholder ? "placeholder" : skips[asset.id] }));
}
const cards = (): ObservationCards[] =>
  [{ journeyId: "demo", file: cardsFile(), images: JSON.parse(readFileSync(cardsFile(), "utf8")).images }];

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "dreamscape-images-"));
  outside = mkdtempSync(path.join(tmpdir(), "dreamscape-images-linked-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
});

describe("npm run images:optimize", () => {
  it("converts by the rule, rewrites the records, the cards and the files, and a second run changes nothing", async () => {
    await image(served("assets/tourism/demo/big.jpg"), 2000, 1000, (item) => item.withIccProfile("p3").jpeg());
    const zoom = await image(served("assets/tourism/demo/zoom.jpg"), 2000, 1500, (item) => item.jpeg(), true);
    const fine = await image(served("assets/tourism/demo/fine.webp"), 800, 600, (item) => item.webp());
    const placeholder = await image(served("assets/tourism/demo/placeholder.png"), 2400, 1600, (item) => item.png());
    const sampleCopy = await image(served("assets/tourism/demo/copy.png"), 240, 160, (item) => item.png());
    const sample = await image(served("assets/tourism/demo/sample.png"), 240, 161, (item) => item.png());
    // EXIF orientation 6 (rotated 90°): browsers show it 200×300, and so does the converted file.
    await image(served("assets/tourism/demo/tilted.jpg"), 300, 200, (item) => item.jpeg().withMetadata({ orientation: 6 }));
    // A served file may be a link to a file elsewhere (the test fixtures link the repository's photos): never written through.
    const linked = await image(path.join(outside, "wide.webp"), 2400, 1000, (item) => item.webp());
    symlinkSync(path.join(outside, "wide.webp"), served("assets/tourism/demo/wide.webp"));
    const assets = [
      record("demo_big", "big.jpg", 2000, 1000, { licenseName: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0" }),
      // A share-alike statement before the conversion names the earlier version: the conversion adds one after its sentence.
      record("demo_zoom", "zoom.jpg", 2000, 1500, { licenseName: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
        modificationJa: `${lpNote}この縮小版もCC BY-SA 3.0で提供します。` }),
      record("demo_fine", "fine.webp", 800, 600),
      record("demo_placeholder", "placeholder.png", 2400, 1600, { isPlaceholder: true }), record("demo_copy", "copy.png", 240, 160),
      record("demo_sample", "sample.png", 240, 161), record("demo_tilted", "tilted.jpg", 300, 200), record("demo_wide", "wide.webp", 2400, 1000),
    ];
    mkdirSync(path.dirname(catalogFile()), { recursive: true });
    writeFileSync(catalogFile(), jsonText({ schemaVersion: 1, assets, landmarks: [], clues: [] }));
    mkdirSync(path.dirname(cardsFile()), { recursive: true });
    const cardData = { schemaVersion: 1, clues: [{ id: "demo_clue" }], images: { demo_place: { path: "assets/tourism/demo/zoom.jpg", sha256: sha256(zoom) } },
      provenance: { demo_clue: { needsFurtherResearch: false } } };
    writeFileSync(cardsFile(), jsonText(cardData));

    const steps = await planPhotos(markSampleCopies(photos({ demo_sample: "sample" }), new Set([sha256(sampleCopy)])));
    expect(steps.map((step) => [step.photo.asset.id, step.format, step.outcome])).toEqual([
      ["demo_big", "jpeg", { kind: "convert", resize: true, path: "assets/tourism/demo/big.webp" }],
      ["demo_zoom", "jpeg", { kind: "convert", resize: false, path: "assets/tourism/demo/zoom.webp" }],
      ["demo_fine", "webp", { kind: "keep" }],
      ["demo_placeholder", "png", { kind: "skip", reason: "placeholder" }],
      ["demo_copy", "png", { kind: "skip", reason: "sample-copy" }],
      ["demo_sample", "png", { kind: "skip", reason: "sample" }],
      ["demo_tilted", "jpeg", { kind: "convert", resize: false, path: "assets/tourism/demo/tilted.webp" }],
      ["demo_wide", "webp", { kind: "convert", resize: true, path: "assets/tourism/demo/wide.webp" }],
    ]);
    const written = await applyPhotoSteps(root, steps, cards());

    expect(Object.fromEntries([...written].map(([id, item]) => [id, [item.path, item.width, item.height]]))).toEqual({
      demo_big: ["assets/tourism/demo/big.webp", 1600, 800], demo_zoom: ["assets/tourism/demo/zoom.webp", 2000, 1500],
      demo_tilted: ["assets/tourism/demo/tilted.webp", 200, 300], demo_wide: ["assets/tourism/demo/wide.webp", 1600, 667],
    });
    const expected = assets.map((item) => {
      const change = written.get(item.id);
      if (!change) return item;
      const sentence = item.id === "demo_tilted" ? "さらにEXIFの向きの情報のとおりに画素の向きを直し、WebP形式（品質80）に変換。"
        : change.width === item.width && change.height === item.height ? "さらに同じ寸法のままWebP形式（品質80）に変換。"
          : `さらに縦横比を保って${change.width}×${change.height}pxに縮小し、WebP形式（品質80）に変換。`;
      return { ...item, path: change.path, width: change.width, height: change.height,
        modificationJa: `${item.modificationJa}${sentence}${item.licenseName.includes("BY-SA") ? `変換版も${item.licenseName}で提供。` : ""}` };
    });
    expect(readFileSync(catalogFile(), "utf8")).toBe(jsonText({ schemaVersion: 1, assets: expected, landmarks: [], clues: [] }));
    const zoomWebp = readFileSync(served("assets/tourism/demo/zoom.webp"));
    expect(readFileSync(cardsFile(), "utf8")).toBe(jsonText({ ...cardData,
      images: { demo_place: { path: "assets/tourism/demo/zoom.webp", sha256: sha256(zoomWebp) } } }));
    for (const removed of ["big.jpg", "zoom.jpg", "tilted.jpg"]) expect(existsSync(served(`assets/tourism/demo/${removed}`)), removed).toBe(false);
    for (const [file, bytes] of [["fine.webp", fine], ["placeholder.png", placeholder], ["copy.png", sampleCopy], ["sample.png", sample]] as const)
      expect(readFileSync(served(`assets/tourism/demo/${file}`)).equals(bytes), file).toBe(true);
    // The link is replaced by the converted file; the file it pointed to is unchanged.
    expect(lstatSync(served("assets/tourism/demo/wide.webp")).isSymbolicLink()).toBe(false);
    expect(readFileSync(path.join(outside, "wide.webp")).equals(linked)).toBe(true);
    // The colour profile stays (here Display P3); the format and size are what the records say.
    // The encoder settings (quality 80, effort 6; colour profile kept, EXIF orientation applied): the written file is
    // byte for byte what sharp makes with them from the original (the zoomed photo keeps its size; its detail makes
    // another quality or effort give other bytes).
    expect(readFileSync(served("assets/tourism/demo/zoom.webp")).equals(
      await sharp(zoom).autoOrient().keepIccProfile().webp({ quality: 80, effort: 6 }).toBuffer())).toBe(true);
    const big = await sharp(served("assets/tourism/demo/big.webp")).metadata();
    expect([big.format, big.width, big.height, (big.icc?.length ?? 0) > 0]).toEqual(["webp", 1600, 800, true]);
    const tilted = await sharp(served("assets/tourism/demo/tilted.webp")).metadata();
    expect([tilted.format, tilted.width, tilted.height, tilted.orientation ?? 1]).toEqual(["webp", 200, 300, 1]);

    const again = await planPhotos(markSampleCopies(photos({ demo_sample: "sample" }), new Set([sha256(sampleCopy)])));
    expect(again.filter((step) => step.outcome.kind === "convert")).toEqual([]);
  });

  it("refuses two photos that would become the same WebP (a.jpg and a.png), before writing anything", async () => {
    const jpeg = await image(served("assets/tourism/demo/a.jpg"), 400, 300, (item) => item.jpeg());
    const png = await image(served("assets/tourism/demo/a.png"), 300, 200, (item) => item.png());
    mkdirSync(path.dirname(catalogFile()), { recursive: true });
    const catalogText = jsonText({ schemaVersion: 1, assets: [record("demo_a_jpeg", "a.jpg", 400, 300), record("demo_a_png", "a.png", 300, 200)] });
    writeFileSync(catalogFile(), catalogText);
    mkdirSync(path.dirname(cardsFile()), { recursive: true });
    writeFileSync(cardsFile(), jsonText({ images: {} }));
    const steps = await planPhotos(photos());
    await expect(applyPhotoSteps(root, steps, cards())).rejects.toThrow(
      "変換後のファイル名が重なります: assets/tourism/demo/a.webp（assets/tourism/demo/a.jpg と assets/tourism/demo/a.png）。どちらかの写真の名前を変えてから、もう一度実行してください。");
    expect(readFileSync(catalogFile(), "utf8")).toBe(catalogText);
    expect(readFileSync(served("assets/tourism/demo/a.jpg")).equals(jpeg)).toBe(true);
    expect(readFileSync(served("assets/tourism/demo/a.png")).equals(png)).toBe(true);
    expect(existsSync(served("assets/tourism/demo/a.webp"))).toBe(false);
  });

  it("refuses a converted name that is already taken, before writing anything", async () => {
    await image(served("assets/tourism/demo/a.jpg"), 400, 300, (item) => item.jpeg());
    const left = await image(served("assets/tourism/demo/a.webp"), 10, 10, (item) => item.webp());
    mkdirSync(path.dirname(catalogFile()), { recursive: true });
    const catalogText = jsonText({ schemaVersion: 1, assets: [record("demo_a", "a.jpg", 400, 300)] });
    writeFileSync(catalogFile(), catalogText);
    mkdirSync(path.dirname(cardsFile()), { recursive: true });
    writeFileSync(cardsFile(), jsonText({ images: {} }));
    const steps = await planPhotos(photos());
    await expect(applyPhotoSteps(root, steps, cards())).rejects.toThrow(
      "変換後のファイル名がすでに使われています: assets/tourism/demo/a.webp。前回の変換が途中で止まった場合は、カタログにないそのファイルを消してから、もう一度実行してください。");
    expect(readFileSync(catalogFile(), "utf8")).toBe(catalogText);
    expect(existsSync(served("assets/tourism/demo/a.jpg"))).toBe(true);
    expect(readFileSync(served("assets/tourism/demo/a.webp")).equals(left)).toBe(true);
  });
});

describe("npm run images:optimize on the portraits", () => {
  /** A small figure: a coloured gradient inside a soft-edged ellipse on a transparent canvas. */
  async function figure(file: string, encode: (image: Sharp) => Sharp, hue = 0): Promise<Buffer> {
    const width = 48, height = 72;
    const pixels = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const distance = Math.hypot((x - width / 2) / (width / 2.4), (y - height / 2) / (height / 2.2));
      pixels[index] = (hue + x * 5) % 256;
      pixels[index + 1] = (y * 3) % 256;
      pixels[index + 2] = ((x + y) * 7) % 256;
      pixels[index + 3] = Math.round(255 * Math.min(1, Math.max(0, (1 - distance) * 6)));
    }
    const bytes = await encode(sharp(pixels, { raw: { width, height, channels: 4 } })).toBuffer();
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, bytes);
    return bytes;
  }
  const alpha = async (input: string | Buffer) => (await sharp(input).ensureAlpha().extractChannel(3).raw().toBuffer());
  const pixels = async (input: string | Buffer) => (await sharp(input).ensureAlpha().raw().toBuffer());
  const portrait = (assetPath: string, journeyId: string | undefined, sample = false): Portrait => ({
    assetPath, journeyId, sample,
    file: path.join(root, journeyId ? `content/journeys/${journeyId}/public` : "public", assetPath),
    original: path.join(root, portraitOriginalOf(assetPath, journeyId)),
  });

  it("makes each served portrait a lossy WebP of its lossless original, with the same alpha, and a second run writes nothing", async () => {
    const shared = portrait("assets/characters/heroine/a/neutral.webp", undefined);
    const fresh = portrait("assets/characters/d_new/neutral.webp", "demo");
    const kept = portrait("assets/characters/d_kept/neutral.webp", "demo");
    const lossyOnly = portrait("assets/characters/d_lossy/neutral.webp", "demo");
    const png = portrait("assets/characters/d_png/neutral.png", "demo");
    const sample = portrait("assets/characters/s_guide/neutral.webp", "sample_trip", true);
    const original = await figure(shared.original, (item) => item.png());
    const losslessServed = await figure(shared.file, (item) => item.webp({ lossless: true }));
    await figure(fresh.original, (item) => item.png(), 90);
    // A lossless served picture without an original: it becomes the original (PNG, same pixels) before the light copy.
    const keptServed = await figure(kept.file, (item) => item.webp({ lossless: true }), 40);
    const lossyServed = await figure(lossyOnly.file, (item) => item.webp({ quality: 80 }), 120);
    const pngServed = await figure(png.file, (item) => item.png(), 160);
    const sampleServed = await figure(sample.file, (item) => item.webp({ lossless: true }), 200);

    const steps = planPortraits([shared, fresh, kept, lossyOnly, png, sample]);
    expect(steps.map((step) => [step.portrait.assetPath, step.served, step.hasOriginal, step.outcome.kind === "skip" ? step.outcome.reason : "make"]))
      .toEqual([
        [shared.assetPath, "lossless", true, "make"], [fresh.assetPath, "missing", true, "make"], [kept.assetPath, "lossless", false, "make"],
        [lossyOnly.assetPath, "lossy", false, "no-original"], [png.assetPath, "other", false, "png-path"], [sample.assetPath, "lossless", false, "sample"],
      ]);
    expect(steps[0].bytes).toBe(losslessServed.length);
    const written = await applyPortraitSteps(steps);
    expect([...written.keys()]).toEqual([shared.assetPath, fresh.assetPath, kept.assetPath]);
    expect(written.get(shared.assetPath)).toEqual({ before: losslessServed.length, after: readFileSync(shared.file).length, changed: true, keptOriginal: false });
    expect(written.get(fresh.assetPath)).toMatchObject({ before: 0, changed: true, keptOriginal: false });
    expect(written.get(kept.assetPath)).toMatchObject({ before: keptServed.length, changed: true, keptOriginal: true });
    for (const item of [shared, fresh, kept]) {
      const bytes = readFileSync(item.file);
      expect(webpCompressionOf(bytes)).toBe("lossy");
      expect((await alpha(bytes)).equals(await alpha(item.original))).toBe(true);
    }
    expect(readFileSync(shared.original).equals(original)).toBe(true);
    expect((await sharp(kept.original).metadata()).format).toBe("png");
    expect((await pixels(kept.original)).equals(await pixels(keptServed))).toBe(true);
    expect(readFileSync(lossyOnly.file).equals(lossyServed)).toBe(true);
    expect(readFileSync(png.file).equals(pngServed)).toBe(true);
    expect(readFileSync(sample.file).equals(sampleServed)).toBe(true);
    expect([lossyOnly, png, sample].some((item) => existsSync(item.original))).toBe(false);

    const lightCopies = [shared, fresh, kept].map((item) => readFileSync(item.file));
    const again = await applyPortraitSteps(planPortraits([shared, fresh, kept]));
    expect([...again.values()].map((item) => [item.changed, item.keptOriginal])).toEqual([[false, false], [false, false], [false, false]]);
    expect([shared, fresh, kept].every((item, index) => readFileSync(item.file).equals(lightCopies[index]))).toBe(true);
  });

  it("makes the served copy again when the original is redrawn", async () => {
    const item = portrait("assets/characters/d_redrawn/neutral.webp", "demo");
    await figure(item.original, (image) => image.png());
    await applyPortraitSteps(planPortraits([item]));
    const first = readFileSync(item.file);
    await figure(item.original, (image) => image.png(), 128);
    const written = await applyPortraitSteps(planPortraits([item]));
    expect(written.get(item.assetPath)).toMatchObject({ before: first.length, changed: true });
    expect(readFileSync(item.file).equals(first)).toBe(false);
  });
});
