import { existsSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TourismAsset } from "../src/content/tourism-schemas";
import { assemblePublicDirectory } from "./content-outputs";
import { SAMPLE_JOURNEY_DIRECTORY, SAMPLE_JOURNEY_ID } from "./content-layout";
import { contentSourcesFromTree, loadContentSources, selectJourneys, type ContentSources } from "./content-sources";
import { validateContent } from "./content-validation";
import { derivedImageList, encodeDerivedImage, prepareDerivedImages } from "./derived-images";

// The reduced copies of the free-time photos (UI spec §4.2) and the city
// backdrop field they serve (§4.1).

const asset = (id: string, isPlaceholder = false) => ({ id, path: `assets/tourism/${id}.jpg`, isPlaceholder }) as TourismAsset;
const photo = (width: number, height: number) => sharp({ create: { width, height, channels: 3, background: "#6f8faf" } }).jpeg().toBuffer();

let directory: string;
beforeAll(() => {
  directory = mkdtempSync(path.join(tmpdir(), "dreamscape-derived-"));
});
afterAll(() => rmSync(directory, { recursive: true, force: true }));

describe("derived photo copies", () => {
  it("lists a card per place photo and a backdrop per city backdrop, once each, under the journey that provides the photo", () => {
    const assets = [asset("a_tower"), asset("a_square"), asset("a_draft", true), asset("b_bridge")];
    const images = derivedImageList({
      content: {
        assets,
        landmarks: [{ id: "tower", imageAssetId: "a_tower" }, { id: "draft", imageAssetId: "a_draft" }],
        backgrounds: { square_bg: { imageAssetId: "a_square" }, plain_bg: {} },
      },
      cities: [
        {
          city: { backdropAssetId: "a_tower" }, hotelPlaceId: "p_hotel",
          places: [
            { id: "p_tower", landmarkIds: ["tower"], backgroundId: "plain_bg" },
            { id: "p_again", landmarkIds: ["tower"], backgroundId: "plain_bg" },
            // A placeholder landmark photo falls back to the background's photo.
            { id: "p_draft", landmarkIds: ["draft"], backgroundId: "square_bg" },
            { id: "p_plain", backgroundId: "plain_bg" },
            { id: "p_hotel", backgroundId: "square_bg" },
          ] as never,
        },
        { city: { backdropAssetId: "a_draft" }, hotelPlaceId: "q_hotel", places: [{ id: "q_hotel", backgroundId: "plain_bg" }] as never },
      ],
      journeyOf: new Map([["a_tower", "trip_a"], ["a_square", "trip_a"], ["a_draft", "trip_a"], ["b_bridge", "trip_b"]]),
      publicFiles: new Map(assets.map((item) => [item.path, `/photos/${item.id}.jpg`])),
    });
    expect(images.map((image) => [image.path, image.source])).toEqual([
      ["assets/derived/trip_a/a_tower.card.webp", "/photos/a_tower.jpg"],
      ["assets/derived/trip_a/a_square.card.webp", "/photos/a_square.jpg"],
      ["assets/derived/trip_a/a_tower.backdrop.webp", "/photos/a_tower.jpg"],
    ]);
  });

  it("makes a 240×160 card and a backdrop of at most 1280 px that is never enlarged", async () => {
    const wide = await photo(2000, 1000);
    expect(await sharp(await encodeDerivedImage(wide, "card")).metadata()).toMatchObject({ format: "webp", width: 240, height: 160 });
    expect(await sharp(await encodeDerivedImage(wide, "backdrop")).metadata()).toMatchObject({ format: "webp", width: 1280, height: 640 });
    expect(await sharp(await encodeDerivedImage(await photo(600, 900), "backdrop")).metadata()).toMatchObject({ width: 600, height: 900 });
  });

  it("encodes a copy once and takes it from the cache until the photo changes", async () => {
    const cache = path.join(directory, "cache");
    const source = path.join(directory, "tower.jpg");
    writeFileSync(source, await photo(800, 600));
    const images = [{ path: "assets/derived/trip_a/a_tower.card.webp", kind: "card" as const, assetId: "a_tower", source }];
    const first = await prepareDerivedImages(images, cache);
    expect(first).toMatchObject({ made: 1, reused: 0 });
    const file = first.files.get(images[0].path)!;
    const written = statSync(file).mtimeMs;
    const second = await prepareDerivedImages(images, cache);
    expect(second).toMatchObject({ made: 0, reused: 1 });
    expect(second.files.get(images[0].path)).toBe(file);
    // The modification time stays (within the millisecond assemblePublicDirectory compares), so the served copy is not copied again.
    expect(Math.abs(statSync(file).mtimeMs - written)).toBeLessThan(1);
    writeFileSync(source, await photo(800, 500));
    const changed = await prepareDerivedImages(images, cache);
    expect(changed).toMatchObject({ made: 1, reused: 0 });
    expect(changed.files.get(images[0].path)).not.toBe(file);
    expect(readdirSync(cache).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  it("are served from the generated public folder and removed from it when no photo needs them", () => {
    const served = path.join(directory, "served");
    const copy = path.join(directory, "copy.webp");
    writeFileSync(copy, "webp");
    assemblePublicDirectory(new Map([["assets/derived/trip_a/a_tower.card.webp", copy]]), served);
    expect(existsSync(path.join(served, "assets/derived/trip_a/a_tower.card.webp"))).toBe(true);
    assemblePublicDirectory(new Map(), served);
    expect(existsSync(path.join(served, "assets/derived"))).toBe(false);
  });
});

describe("city backdrop field", () => {
  const repository = path.resolve(".");
  const prefix = `${SAMPLE_JOURNEY_DIRECTORY}/`;
  let sample: ContentSources;
  /** The sample journey alone with one of its JSON files changed. */
  const sampleWith = (file: string, change: (value: any) => void) => {
    const treePath = `${prefix}${file}`;
    const value = JSON.parse(sample.tree.files.get(treePath)!.toString("utf8"));
    change(value);
    return contentSourcesFromTree({ ...sample.tree, files: new Map([...sample.tree.files, [treePath, Buffer.from(JSON.stringify(value))]]) });
  };
  beforeAll(() => {
    sample = selectJourneys(loadContentSources(repository, { extraJourneyDirectories: [SAMPLE_JOURNEY_DIRECTORY] }), [SAMPLE_JOURNEY_ID]);
  });

  it("names a tourism asset; a placeholder is accepted (journey:new marks every copied photo so)", () => {
    expect(() => validateContent(sampleWith("cities/mihon.json", (city) => { city.backdropAssetId = "smp_img_missing"; }))).toThrow(
      `Unknown city backdrop asset: ${prefix}cities/mihon.json backdropAssetId "smp_img_missing" is not an asset of tourism/catalog.json`,
    );
    expect(() => validateContent(sampleWith("tourism/catalog.json", (catalog) => {
      for (const item of catalog.assets) item.isPlaceholder = true;
    }))).not.toThrow();
  });
});
