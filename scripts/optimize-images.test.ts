import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp, { type Sharp } from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TourismAsset } from "../src/content/tourism-schemas";
import { markSampleCopies, type ObservationCards, type PhotoSkip, type TourismPhoto } from "./image-optimization";
import { applyPhotoSteps, planPhotos } from "./optimize-images";
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
async function image(file: string, width: number, height: number, encode: (image: Sharp) => Sharp): Promise<Buffer> {
  const bytes = await encode(sharp({ create: { width, height, channels: 3, background: { r: 120, g: 150, b: 190 } } })).toBuffer();
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
    const zoom = await image(served("assets/tourism/demo/zoom.jpg"), 2000, 1500, (item) => item.jpeg());
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
      record("demo_zoom", "zoom.jpg", 2000, 1500), record("demo_fine", "fine.webp", 800, 600),
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
        modificationJa: `${lpNote}${sentence}${item.licenseName === "CC BY-SA 4.0" ? "変換版もCC BY-SA 4.0で提供。" : ""}` };
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
    const big = await sharp(served("assets/tourism/demo/big.webp")).metadata();
    expect([big.format, big.width, big.height, (big.icc?.length ?? 0) > 0]).toEqual(["webp", 1600, 800, true]);
    const tilted = await sharp(served("assets/tourism/demo/tilted.webp")).metadata();
    expect([tilted.format, tilted.width, tilted.height, tilted.orientation ?? 1]).toEqual(["webp", 200, 300, 1]);

    const again = await planPhotos(markSampleCopies(photos({ demo_sample: "sample" }), new Set([sha256(sampleCopy)])));
    expect(again.filter((step) => step.outcome.kind === "convert")).toEqual([]);
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
