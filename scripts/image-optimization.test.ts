import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { TourismAsset } from "../src/content/tourism-schemas";
import { contentSourcesFromTree, contentTreeFromFiles, type JourneyManifest } from "./content-sources";
import {
  hasShareAlikeStatement, markSampleCopies, noteAfterConversion, photoFormatOfPath, planPhoto, readObservationCards, tourismPhotos,
  tourismPhotoWarnings, webpPathOf,
} from "./image-optimization";

// The photo rule on its own, and on small content trees in memory (nothing below `root` exists).

describe("the photo rule", () => {
  const plan = (format: "jpeg" | "png" | "webp", width: number, height: number, observation = false) =>
    planPhoto({ format, width, height, observation });
  it("converts JPEG and PNG photos to WebP and resizes only photos that are not zoomed and lie outside 1600×1800", () => {
    expect(plan("jpeg", 1280, 960)).toEqual({ action: "convert", resize: false });
    expect(plan("png", 1600, 1800)).toEqual({ action: "convert", resize: false });
    expect(plan("jpeg", 1601, 900)).toEqual({ action: "convert", resize: true });
    expect(plan("jpeg", 1200, 1801)).toEqual({ action: "convert", resize: true });
    // Observation images keep their size: the viewer zooms them up to 5×.
    expect(plan("jpeg", 1920, 2560, true)).toEqual({ action: "convert", resize: false });
  });
  it("leaves WebP photos alone unless a photo that is not zoomed is too large", () => {
    expect(plan("webp", 1600, 1066)).toEqual({ action: "keep" });
    expect(plan("webp", 2560, 1422, true)).toEqual({ action: "keep" });
    expect(plan("webp", 2400, 1000)).toEqual({ action: "convert", resize: true });
  });
  it("reads the format from the served path and names the converted file", () => {
    expect([photoFormatOfPath("assets/tourism/a.jpg"), photoFormatOfPath("assets/tourism/a.jpeg"), photoFormatOfPath("assets/x/b.png"),
      photoFormatOfPath("assets/x/c.webp")]).toEqual(["jpeg", "jpeg", "png", "webp"]);
    expect(webpPathOf("assets/tourism/india/agra.fort.jpeg")).toBe("assets/tourism/india/agra.fort.webp");
    expect(webpPathOf("assets/tourism/dates/brera.webp")).toBe("assets/tourism/dates/brera.webp");
  });
});

describe("modification notes", () => {
  const lpNote = "Commons配信の1920×1143ピクセル版を使用。描き足し・色変更なし。表示時は端が切れる場合がある。";
  it("recognises the ways the notes say that the served photo keeps the licence", () => {
    for (const note of ["…この縮小版もCC BY-SA 4.0で提供します。", "…縮小版も原本と同じライセンスで提供。", "…画面上では端が切れる場合がある。ライセンスは元画像と同じ。",
      "…表示時は画面比率により端が切れる場合があります。CC BY-SA 4.0に従います。", "…加工版もCC BY-SA 4.0。", "CC BY-SA 3.0（このWebPも同条件）",
      // Milano's wording (6 notes): a later re-encode must not add a second share-alike sentence.
      "…縦横比を保ち1600px幅へ縮小しWebP変換。変換画像もCC BY-SA 3.0。",
      // The tool's wording (Luang Prabang): the statement follows the conversion sentence.
      `${lpNote}さらに同じ寸法のままWebP形式（品質80）に変換。変換版もCC BY-SA 4.0で提供。`])
      expect(hasShareAlikeStatement(note), note).toBe(true);
    expect(hasShareAlikeStatement(lpNote)).toBe(false);
  });
  it("does not count a statement before the conversion to WebP: it covers an earlier version (e.g. the Commons thumbnail)", () => {
    for (const note of ["…この縮小版もCC BY-SA 4.0で提供します。さらに縦横比を保って1600×1067pxに縮小し、WebP形式（品質80）に変換。",
      "…縮小版も原本と同じライセンスで提供。さらに同じ寸法のままWebP形式（品質80）に変換。",
      "…CC BY-SA 4.0に従います。さらに同じ寸法のままWebP形式（品質80）に変換。",
      // A second conversion (a WebP photo fitted into the box later) needs its own statement too.
      `${lpNote}さらに同じ寸法のままWebP形式（品質80）に変換。変換版もCC BY-SA 4.0で提供。さらに縦横比を保って1600×1067pxに縮小し、WebP形式（品質80）に変換。`])
      expect(hasShareAlikeStatement(note), note).toBe(false);
  });
  it("adds the conversion and, to every CC BY-SA note, the share-alike sentence after it", () => {
    expect(noteAfterConversion(lpNote, { licenseName: "CC BY-SA 4.0", rotated: false, resized: false, width: 1920, height: 1143 }))
      .toBe(`${lpNote}さらに同じ寸法のままWebP形式（品質80）に変換。変換版もCC BY-SA 4.0で提供。`);
    expect(noteAfterConversion(lpNote, { licenseName: "CC BY 2.0", rotated: false, resized: true, width: 1600, height: 1065 }))
      .toBe(`${lpNote}さらに縦横比を保って1600×1065pxに縮小し、WebP形式（品質80）に変換。`);
    // A statement earlier in the note names the version before this conversion.
    const withStatement = "幅1600px以内へ縮小。この縮小版もCC BY-SA 3.0で提供します。";
    expect(noteAfterConversion(withStatement, { licenseName: "CC BY-SA 3.0", rotated: false, resized: true, width: 1350, height: 1800 }))
      .toBe(`${withStatement}さらに縦横比を保って1350×1800pxに縮小し、WebP形式（品質80）に変換。変換版もCC BY-SA 3.0で提供。`);
    expect(noteAfterConversion(withStatement, { licenseName: "CC BY-SA 3.0", rotated: true, resized: false, width: 1200, height: 1600 }))
      .toBe(`${withStatement}さらにEXIFの向きの情報のとおりに画素の向きを直し、WebP形式（品質80）に変換。変換版もCC BY-SA 3.0で提供。`);
    const converted = noteAfterConversion(lpNote, { licenseName: "CC BY-SA 4.0", rotated: false, resized: false, width: 2400, height: 1600 });
    expect(noteAfterConversion(converted, { licenseName: "CC BY-SA 4.0", rotated: false, resized: true, width: 1600, height: 1067 }))
      .toBe(`${converted}さらに縦横比を保って1600×1067pxに縮小し、WebP形式（品質80）に変換。変換版もCC BY-SA 4.0で提供。`);
    expect(noteAfterConversion("Commons原本を使用。", { licenseName: "CC0 1.0", rotated: false, resized: false, width: 800, height: 600 }))
      .toBe("Commons原本を使用。さらに同じ寸法のままWebP形式（品質80）に変換。");
  });
});

const root = path.join(path.sep, "virtual", "dreamscape");
const json = (value: unknown) => JSON.stringify(value);
const asset = (id: string, assetPath: string, width: number, height: number, isPlaceholder = false): TourismAsset => ({
  id, path: assetPath, width, height, altJa: "試験用の写真。", isPlaceholder, sourceUrl: `https://commons.wikimedia.org/wiki/File:${id}.jpg`,
  licenseName: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", creditJa: "写真：試験", modificationJa: "試験用。",
  checkedAt: "2026-11-08",
});
/** One journey folder with a tourism catalog and its served photos (paths only). */
function journeyFiles(folder: string, id: string, order: number, assets: TourismAsset[]): Record<string, string | null> {
  return {
    [`${folder}/manifest.json`]: json({ schemaVersion: 1, order, id, status: "preparing", cities: [{ id: `${id}_city`, nameJa: "テスト市" }] }),
    [`${folder}/cities/${id}_city.json`]: json({ id: `${id}_city` }),
    [`${folder}/travel/${id}_city.json`]: json({ cityId: `${id}_city`, places: [], events: [] }),
    [`${folder}/travel/${id}_city-settings.json`]: json({}),
    [`${folder}/tourism/catalog.json`]: json({ schemaVersion: 1, assets }),
    ...Object.fromEntries(assets.map((item) => [`${folder}/public/${item.path}`, null])),
  };
}

describe("tourism photos of the loaded content and their warnings", () => {
  const trip = [asset("t_jpeg", "assets/tourism/t/big.jpg", 1920, 1280), asset("t_zoom", "assets/tourism/t/zoom.jpg", 1920, 2560),
    asset("t_card", "assets/tourism/t/card.jpg", 1920, 2560), asset("t_webp", "assets/tourism/t/fine.webp", 1600, 1066),
    asset("t_wide", "assets/tourism/t/wide.webp", 2400, 1000), asset("t_placeholder", "assets/tourism/t/placeholder.png", 2400, 1600, true)];
  const sample = [asset("s_photo", "assets/tourism/s/sample.png", 240, 160)];
  const sources = contentSourcesFromTree(contentTreeFromFiles(root, {
    ...journeyFiles("content/journeys/trip", "trip", 10, trip),
    ...journeyFiles("authoring/templates/sample_trip", "sample_trip", 9000, sample),
  }, { sample_trip: "authoring/templates/sample_trip" }));
  const cards = [{ journeyId: "trip", file: path.join(root, "authoring/journeys/trip/drafts/observation-cards.json"),
    images: { trip_card_place: { path: "assets/tourism/t/card.jpg", sha256: "0".repeat(64) } } }];
  const photos = tourismPhotos(sources, { assets: [...trip, ...sample], landmarks: [{ imageAssetId: "t_zoom" }] }, cards);

  it("knows each photo's catalog, journey, file, use and skip", () => {
    expect(photos.map((photo) => [photo.asset.id, photo.journeyId, photo.observation, photo.skip ?? null])).toEqual([
      ["t_jpeg", "trip", false, null], ["t_zoom", "trip", true, null], ["t_card", "trip", true, null], ["t_webp", "trip", false, null],
      ["t_wide", "trip", false, null], ["t_placeholder", "trip", false, "placeholder"], ["s_photo", "sample_trip", false, "sample"]]);
    expect(photos[0].catalogFile).toBe(path.join(root, "content/journeys/trip/tourism/catalog.json"));
    expect(photos[0].file).toBe(path.join(root, "content/journeys/trip/public/assets/tourism/t/big.jpg"));
  });
  it("warns about every photo the conversion would change, with the command, but never about placeholders or the sample", () => {
    const warnings = tourismPhotoWarnings(sources, photos);
    expect(warnings.every((warning) => warning.kind === "tourism-photo")).toBe(true);
    expect(warnings.map((warning) => warning.message)).toEqual([
      "観光写真を軽くできます: content/journeys/trip/tourism/catalog.json の \"t_jpeg\"（assets/tourism/t/big.jpg、JPEG 1920×1280）。" +
        "npm run images:optimize -- --journey trip --write で、WebPにして1600×1800pxの枠に収めます。",
      "観光写真を軽くできます: content/journeys/trip/tourism/catalog.json の \"t_zoom\"（assets/tourism/t/zoom.jpg、JPEG 1920×2560）。" +
        "npm run images:optimize -- --journey trip --write で、観察で拡大する写真なので同じ大きさのままWebPにします。",
      "観光写真を軽くできます: content/journeys/trip/tourism/catalog.json の \"t_card\"（assets/tourism/t/card.jpg、JPEG 1920×2560）。" +
        "npm run images:optimize -- --journey trip --write で、観察で拡大する写真なので同じ大きさのままWebPにします。",
      "観光写真を軽くできます: content/journeys/trip/tourism/catalog.json の \"t_wide\"（assets/tourism/t/wide.webp、WebP 2400×1000）。" +
        "npm run images:optimize -- --journey trip --write で、WebPにして1600×1800pxの枠に収めます。",
    ]);
  });
});

describe("copies of sample images", () => {
  let directory: string | undefined;
  afterEach(() => { if (directory) rmSync(directory, { recursive: true, force: true }); });
  it("leaves a PNG photo with the bytes of a sample image to journey:readiness: no conversion, no warning", () => {
    directory = mkdtempSync(path.join(tmpdir(), "dreamscape-sample-copy-"));
    const write = (name: string, text: string) => {
      writeFileSync(path.join(directory!, name), text);
      return path.join(directory!, name);
    };
    const sampleBytes = "the bytes of a sample image";
    const sources = contentSourcesFromTree(contentTreeFromFiles(root, journeyFiles("content/journeys/trip", "trip", 10, [])));
    const photo = (id: string, file: string, skip?: "placeholder") => ({ asset: asset(id, `assets/tourism/t/${path.basename(file)}`, 240, 160),
      catalogFile: path.join(root, "content/journeys/trip/tourism/catalog.json"), journeyId: "trip", file, observation: false, skip });
    const marked = markSampleCopies([photo("t_copy", write("copy.png", sampleBytes)), photo("t_own", write("own.png", "a photo of the journey")),
      photo("t_jpeg", write("copy.jpg", sampleBytes)), photo("t_placeholder", write("placeholder.png", sampleBytes), "placeholder")],
    new Set([createHash("sha256").update(sampleBytes).digest("hex")]));
    expect(marked.map((item) => [item.asset.id, item.skip ?? null])).toEqual([["t_copy", "sample-copy"], ["t_own", null], ["t_jpeg", null],
      ["t_placeholder", "placeholder"]]);
    expect(tourismPhotoWarnings(sources, marked).map((warning) => warning.message.match(/"(t_[a-z]+)"/u)?.[1])).toEqual(["t_own", "t_jpeg"]);
  });
});

describe("reading the observation cards", () => {
  let directory: string | undefined;
  afterEach(() => { if (directory) rmSync(directory, { recursive: true, force: true }); });
  const manifest = (id: string, authoring?: object): JourneyManifest => ({ id, order: 10, directory: "", file: `content/journeys/${id}/manifest.json`,
    data: { id, ...(authoring ? { authoring } : {}) } });
  const profile = (id: string) => ({ eventPrefix: id, observationFile: `authoring/journeys/${id}/drafts/observation-cards.json`, imageDirectory: `assets/tourism/${id}` });

  it("reads the cards each manifest names, skips missing files and, for a warning, files it cannot read", () => {
    directory = mkdtempSync(path.join(tmpdir(), "dreamscape-cards-"));
    const write = (id: string, text: string) => {
      const file = path.join(directory!, profile(id).observationFile);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, text);
    };
    write("trip", json({ schemaVersion: 1, clues: [], images: { trip_place: { path: "assets/tourism/trip/a.jpg", sha256: "a".repeat(64) } } }));
    write("broken", "{ not json");
    const manifests = [manifest("trip", profile("trip")), manifest("none"), manifest("missing", profile("missing")), manifest("broken", profile("broken"))];
    expect(readObservationCards(directory, manifests, "skip")).toEqual([{ journeyId: "trip", file: path.join(directory, profile("trip").observationFile),
      images: { trip_place: { path: "assets/tourism/trip/a.jpg", sha256: "a".repeat(64) } } }]);
    expect(() => readObservationCards(directory!, manifests, "throw")).toThrow("観察資料を読めません: authoring/journeys/broken/drafts/observation-cards.json");
  });
});
