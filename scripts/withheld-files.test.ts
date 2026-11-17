import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { journeyFiles, withheldFiles } from "./content-outputs";
import { JOURNEY_FILES_FILE, readJourneyFiles } from "./journey-files";
import { copyReleasedFiles, readWithheldFiles, WITHHELD_FILES_FILE, withheldFilesPlugin, withheldPaths, type WithheldFiles } from "./withheld-files";
import { derivedImageDirectory, derivedImageFile } from "../src/content/code-images";
import { journeyCatalogSchema, journeyFilesShip } from "../src/content/journey-catalog";

// User decision 2026-11-16: a production build leaves out the served files (photos, pictures, sounds) of each journey
// players cannot open yet, by its manifest status alone; the development server serves them all. Fictional journeys
// below; the last tests read this checkout's generated content (npm run content:build). The withheld files are those
// of the list of every journey's served files (scripts/journey-files.ts; 「オフラインで遊ぶ」 sorts the build by it,
// 2026-11-17) whose journey does not ship.

const repository = path.resolve(import.meta.dirname, "..");
let folder: string;
const write = (relative: string, data = "file") => {
  mkdirSync(path.dirname(path.join(folder, relative)), { recursive: true });
  writeFileSync(path.join(folder, relative), data);
};
const listFiles = (directory: string) => readdirSync(directory, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile())
  .map((entry) => path.relative(directory, path.join(entry.parentPath, entry.name)).split(path.sep).join("/")).sort();
beforeEach(() => { folder = mkdtempSync(path.join(tmpdir(), "dreamscape-withheld-")); });
afterEach(() => rmSync(folder, { recursive: true, force: true }));

const journeys = [
  { id: "trip", status: "available" as const },
  { id: "trip_b", status: "preparing" as const },
  { id: "trip_c", status: "preparing" as const },
];

describe("the rule", () => {
  it("ships the files of a journey players can open and of no other", () => {
    expect(journeyFilesShip({ status: "available" })).toBe(true);
    expect(journeyFilesShip({ status: "preparing" })).toBe(false);
  });

  it("lists every file a preparing journey's public/ folder serves and its photos' reduced copies, and nothing else", () => {
    const publicFiles = new Map<string, string | null>([
      ["assets/items/item.svg", null],
      ["assets/tourism/trip/tower.webp", "trip"],
      ["assets/tourism/b/harbour.webp", "trip_b"],
      ["assets/voice/b_line_01.mp3", "trip_b"],
      ["assets/album/b/first.webp", "trip_b"],
    ]);
    // The reduced copies sit in their journey's folder: trip's is no part of trip_b's, though one ID starts the other.
    const derived = [derivedImageFile("trip", "tower", "card"), derivedImageFile("trip_b", "harbour", "card"), derivedImageFile("trip_b", "harbour", "backdrop")];
    expect(withheldFiles(journeys, publicFiles, derived)).toEqual({ schemaVersion: 1, journeys: {
      trip_b: ["assets/album/b/first.webp", "assets/derived/trip_b/harbour.backdrop.webp", "assets/derived/trip_b/harbour.card.webp",
        "assets/tourism/b/harbour.webp", "assets/voice/b_line_01.mp3"],
      // A preparing journey without files is listed all the same: the dist check compares the journeys with the catalog.
      trip_c: [],
    } });
    expect(withheldFiles([journeys[0]], publicFiles, derived)).toEqual({ schemaVersion: 1, journeys: {} });
  });

  it("lists every journey's served files, playable or not, and gives the root public/ files to none", () => {
    const publicFiles = new Map<string, string | null>([
      ["assets/items/item.svg", null],
      ["assets/tourism/trip/tower.webp", "trip"],
      ["assets/voice/trip/line_01.mp3", "trip"],
      ["assets/tourism/b/harbour.webp", "trip_b"],
    ]);
    const derived = [derivedImageFile("trip", "tower", "card"), derivedImageFile("trip_b", "harbour", "card")];
    const owned = journeyFiles(journeys, publicFiles, derived);
    expect(owned).toEqual({ schemaVersion: 1, journeys: {
      trip: ["assets/derived/trip/tower.card.webp", "assets/tourism/trip/tower.webp", "assets/voice/trip/line_01.mp3"],
      trip_b: ["assets/derived/trip_b/harbour.card.webp", "assets/tourism/b/harbour.webp"],
      trip_c: [],
    } });
    // The catalog's order, and one source of ownership: the withheld files are this list's, for the journeys that do not ship.
    expect(Object.keys(journeyFiles([...journeys].reverse(), publicFiles, derived).journeys)).toEqual(["trip_c", "trip_b", "trip"]);
    expect(withheldFiles(journeys, publicFiles, derived)).toEqual({ schemaVersion: 1, journeys: { trip_b: owned.journeys.trip_b, trip_c: [] } });
    expect(Object.values(owned.journeys).flat()).not.toContain("assets/items/item.svg");
  });
});

describe("the list and the production build's copy", () => {
  const list: WithheldFiles = { schemaVersion: 1, journeys: { trip_b: ["assets/tourism/b/harbour.webp", "assets/derived/trip_b/harbour.card.webp"], trip_c: [] } };

  it("reads the list content:build writes, and says what to run when it is missing or malformed", () => {
    expect(() => readWithheldFiles(folder)).toThrow(`${WITHHELD_FILES_FILE} がありません。先に npm run content:build を実行してください。`);
    write(WITHHELD_FILES_FILE, JSON.stringify({ schemaVersion: 1, journeys: { trip_b: "assets" } }));
    expect(() => readWithheldFiles(folder)).toThrow("の形が違います。npm run content:build で生成し直してください。");
    write(WITHHELD_FILES_FILE, JSON.stringify(list));
    expect(readWithheldFiles(folder)).toEqual(list);
    expect([...withheldPaths(list)]).toEqual([["assets/tourism/b/harbour.webp", "trip_b"], ["assets/derived/trip_b/harbour.card.webp", "trip_b"]]);
  });

  it("reads the list of every journey's files the same way", () => {
    expect(() => readJourneyFiles(folder)).toThrow(`${JOURNEY_FILES_FILE} がありません。先に npm run content:build を実行してください。`);
    write(JOURNEY_FILES_FILE, JSON.stringify({ schemaVersion: 2, journeys: {} }));
    expect(() => readJourneyFiles(folder)).toThrow(`${JOURNEY_FILES_FILE} の形が違います。npm run content:build で生成し直してください。`);
    write(JOURNEY_FILES_FILE, JSON.stringify({ schemaVersion: 1, journeys: { trip: ["assets/tourism/trip/tower.webp"], trip_c: [] } }));
    expect(readJourneyFiles(folder)).toEqual({ schemaVersion: 1, journeys: { trip: ["assets/tourism/trip/tower.webp"], trip_c: [] } });
  });

  it("copies the generated public folder without the withheld files", () => {
    for (const file of ["assets/items/item.svg", "assets/tourism/trip/tower.webp", "assets/tourism/b/harbour.webp", "assets/derived/trip_b/harbour.card.webp"])
      write(`public/${file}`);
    expect(copyReleasedFiles(path.join(folder, "public"), path.join(folder, "dist"), new Set(withheldPaths(list).keys()))).toEqual({ copied: 2, withheld: 2 });
    expect(listFiles(path.join(folder, "dist"))).toEqual(["assets/items/item.svg", "assets/tourism/trip/tower.webp"]);
  });

  it("is a production build's plugin in place of Vite's own copy of the public folder", () => {
    const plugin = withheldFilesPlugin();
    expect(plugin.apply).toBe("build");
    expect((plugin.config as () => unknown)()).toEqual({ build: { copyPublicDir: false } });
    write("public/assets/items/item.svg");
    write("public/assets/tourism/b/harbour.webp");
    write(WITHHELD_FILES_FILE, JSON.stringify(list));
    (plugin.configResolved as (config: unknown) => void)({ root: folder, publicDir: path.join(folder, "public"), build: { outDir: "dist" } });
    (plugin.writeBundle as () => void)();
    expect(listFiles(path.join(folder, "dist"))).toEqual(["assets/items/item.svg"]);
  });
});

describe("the generated content", () => {
  const catalog = journeyCatalogSchema.parse(JSON.parse(readFileSync(path.join(repository, "src/content/generated/content/journeys/catalog.json"), "utf8")));
  const withheld = readWithheldFiles(repository);
  const served = listFiles(path.join(repository, "src/content/generated/public"));

  it("withholds exactly the journeys of the catalog whose files do not ship, each with every file of its public/ folder and its reduced copies", () => {
    expect(Object.keys(withheld.journeys)).toEqual(catalog.journeys.filter((journey) => !journeyFilesShip(journey)).map((journey) => journey.id));
    for (const [journeyId, paths] of Object.entries(withheld.journeys)) {
      const own = path.join(repository, "content/journeys", journeyId, "public");
      const expected = [...(existsSync(own) ? listFiles(own) : []), ...served.filter((file) => file.startsWith(derivedImageDirectory(journeyId)))].sort();
      expect(paths, journeyId).toEqual(expected);
      for (const file of paths) expect(served, file).toContain(file);
    }
  });

  it("lists every journey of the catalog with every file of its public/ folder and its reduced copies, and the withheld ones are exactly those lists", () => {
    const owned = readJourneyFiles(repository);
    expect(Object.keys(owned.journeys)).toEqual(catalog.journeys.map((journey) => journey.id));
    for (const [journeyId, paths] of Object.entries(owned.journeys)) {
      const own = path.join(repository, "content/journeys", journeyId, "public");
      // (A journey outside content/journeys/, the sample one, serves its files from its own folder: its copies are checked.)
      const expected = [...(existsSync(own) ? listFiles(own) : paths.filter((file) => !file.startsWith(derivedImageDirectory(journeyId)))),
        ...served.filter((file) => file.startsWith(derivedImageDirectory(journeyId)))].sort();
      expect(paths, journeyId).toEqual(expected);
      for (const file of paths) expect(served, file).toContain(file);
    }
    for (const [journeyId, paths] of Object.entries(withheld.journeys)) expect(paths, journeyId).toEqual(owned.journeys[journeyId]);
    // No file belongs to two journeys, and no root public/ file to any.
    const all = Object.values(owned.journeys).flat();
    expect(new Set(all).size).toBe(all.length);
    for (const file of listFiles(path.join(repository, "public"))) expect(all.includes(file), file).toBe(false);
  });

  it("withholds no file of a journey players can open, nor of the root public/", () => {
    const shipped = new Set(withheldPaths(withheld).keys());
    for (const journey of catalog.journeys.filter(journeyFilesShip)) {
      const own = path.join(repository, "content/journeys", journey.id, "public");
      for (const file of existsSync(own) ? listFiles(own) : []) expect(shipped.has(file), file).toBe(false);
      expect(served.filter((file) => file.startsWith(derivedImageDirectory(journey.id)) && shipped.has(file))).toEqual([]);
    }
    for (const file of listFiles(path.join(repository, "public"))) expect(shipped.has(file), file).toBe(false);
  });
});
