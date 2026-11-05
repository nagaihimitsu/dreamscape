import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { journeyDirectory } from "./content-layout";
import { contentLayers, displayPath, loadContentSources, writeContentMirror } from "./content-sources";

let root: string;
const write = (relative: string, data: unknown) => {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, typeof data === "string" ? data : JSON.stringify(data));
  return file;
};
const city = (layer: string, id: string) => {
  write(`${layer}/cities/${id}.json`, { id });
  write(`${layer}/travel/${id}.json`, { cityId: id });
  write(`${layer}/travel/${id}-settings.json`, { hotelPlaceId: "hotel" });
};

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "dreamscape-sources-"));
  write("content/battles/catalog.json", { schemaVersion: 1, battles: [{ id: "core_battle" }] });
  write("content/journeys/catalog.json", { schemaVersion: 1, journeys: [] });
  write("content/journeys/README.md", "notes");
  write("content/travel/research/ROUTES.csv", "a,b");
  write("content/stories/milano/cafe.ink", "core story");
  write("content/quizzes/duomo.json", {});
  city("content", "milano");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("content layers", () => {
  it("finds the core layer and every journey folder, skipping dot folders", () => {
    mkdirSync(journeyDirectory(root, "uzbekistan"), { recursive: true });
    mkdirSync(journeyDirectory(root, "golden_triangle"), { recursive: true });
    mkdirSync(journeyDirectory(root, ".draft"), { recursive: true });
    expect(contentLayers(root).map(({ id, type, directory }) => [id, type, displayPath(root, directory)])).toEqual([
      ["core", "core", "content"],
      ["golden_triangle", "journey", "content/journeys/golden_triangle"],
      ["uzbekistan", "journey", "content/journeys/uzbekistan"],
    ]);
  });

  it("reads the current single-layer content as it is", () => {
    const sources = loadContentSources(root);
    expect(sources.layers.map((layer) => layer.id)).toEqual(["core"]);
    expect(Object.keys(sources.catalogs).sort()).toEqual(["battles/catalog.json", "journeys/catalog.json"]);
    expect(sources.catalogs["battles/catalog.json"]!.value).toEqual({ schemaVersion: 1, battles: [{ id: "core_battle" }] });
    expect(sources.cities.map((item) => [item.id, item.layer, displayPath(root, item.travelFile), displayPath(root, item.settingsFile)]))
      .toEqual([["milano", "core", "content/travel/milano.json", "content/travel/milano-settings.json"]]);
    expect(sources.storyFiles).toEqual([{ id: "milano/cafe", file: path.join(root, "content/stories/milano/cafe.ink"), layer: "core" }]);
    expect(sources.publicRoots).toEqual([path.join(root, "public")]);
  });
});

describe("loadContentSources with journey layers", () => {
  beforeEach(() => {
    write("content/journeys/golden_triangle/battles/catalog.json", { schemaVersion: 1, battles: [{ id: "gt_battle" }] });
    write("content/journeys/golden_triangle/stories/battles/gt.ink", "gt");
    write("content/journeys/golden_triangle/stories/milano/cafe-2.ink", "gt");
    write("content/journeys/golden_triangle/quizzes/duomo.json", {});
    write("content/journeys/golden_triangle/public/assets/tourism/india/a.webp", "image");
    write("content/journeys/golden_triangle/README.md", "notes");
    city("content/journeys/golden_triangle", "delhi");
    write("content/journeys/milano/stories/milano/cafe_03.ink", "milano");
  });

  it("merges catalogs in layer order with the real file of every entry", () => {
    const sources = loadContentSources(root);
    expect(sources.layers.map((layer) => layer.id)).toEqual(["core", "golden_triangle", "milano"]);
    const battles = sources.catalogs["battles/catalog.json"]!;
    expect(battles.value).toEqual({ schemaVersion: 1, battles: [{ id: "core_battle" }, { id: "gt_battle" }] });
    expect(battles.provenance.items.battles.map((file) => displayPath(root, file))).toEqual([
      "content/battles/catalog.json", "content/journeys/golden_triangle/battles/catalog.json",
    ]);
  });

  it("orders stories and quizzes by relative path (with extension), then layer", () => {
    const sources = loadContentSources(root);
    // "cafe-2.ink" sorts before "cafe.ink" because "-" precedes ".".
    expect(sources.storyFiles.map((story) => [story.id, story.layer])).toEqual([
      ["battles/gt", "golden_triangle"],
      ["milano/cafe-2", "golden_triangle"],
      ["milano/cafe", "core"],
      ["milano/cafe_03", "milano"],
    ]);
    // The same quiz file name in two layers is allowed (quiz IDs are checked by the pipeline).
    expect(sources.quizFiles.map((quiz) => [displayPath(root, quiz.file), quiz.layer])).toEqual([
      ["content/quizzes/duomo.json", "core"],
      ["content/journeys/golden_triangle/quizzes/duomo.json", "golden_triangle"],
    ]);
    expect(sources.cities.map((item) => [item.id, item.layer, displayPath(root, item.travelFile)])).toEqual([
      ["delhi", "golden_triangle", "content/journeys/golden_triangle/travel/delhi.json"],
      ["milano", "core", "content/travel/milano.json"],
    ]);
    expect(sources.publicRoots).toEqual([path.join(root, "public"), path.join(root, "content/journeys/golden_triangle/public")]);
  });

  it("rejects a story ID or a city defined by two layers", () => {
    write("content/journeys/milano/stories/battles/gt.ink", "again");
    expect(() => loadContentSources(root)).toThrow(
      `Duplicate story ID battles/gt: ${path.join(root, "content/journeys/golden_triangle/stories/battles/gt.ink")} and ${path.join(root, "content/journeys/milano/stories/battles/gt.ink")}`,
    );
    rmSync(path.join(root, "content/journeys/milano/stories/battles/gt.ink"));
    city("content/journeys/milano", "delhi");
    expect(() => loadContentSources(root)).toThrow(/Duplicate city file: .*golden_triangle\/cities\/delhi\.json and .*milano\/cities\/delhi\.json/);
  });

  it("requires travel files to sit next to their city", () => {
    write("content/journeys/milano/travel/delhi.json", {});
    expect(() => loadContentSources(root)).toThrow(/Travel file without a city in the same layer: .*milano\/travel\/delhi\.json/);
  });

  it("rejects data files outside the layout and images outside public/assets", () => {
    write("content/journeys/milano/battles/extra.json", {});
    expect(() => loadContentSources(root)).toThrow(/Unknown content file: .*milano\/battles\/extra\.json/);
    rmSync(path.join(root, "content/journeys/milano/battles"), { recursive: true });
    write("content/journeys/milano/journeys/catalog.json", {});
    expect(() => loadContentSources(root)).toThrow(/Unknown content file: .*milano\/journeys\/catalog\.json/);
    rmSync(path.join(root, "content/journeys/milano/journeys"), { recursive: true });
    write("content/journeys/milano/public/logo.svg", "<svg/>");
    expect(() => loadContentSources(root)).toThrow(/Unknown content file: .*milano\/public\/logo\.svg/);
  });

  it("reports merge conflicts and unreadable JSON with the file", () => {
    write("content/journeys/milano/battles/catalog.json", { schemaVersion: 2, battles: [] });
    expect(() => loadContentSources(root)).toThrow(/Mismatched "schemaVersion" in battles\/catalog\.json/);
    write("content/journeys/milano/battles/catalog.json", '{"battles":');
    expect(() => loadContentSources(root)).toThrow(`Cannot read JSON ${path.join(root, "content/journeys/milano/battles/catalog.json")}`);
    write("content/journeys/milano/battles/catalog.json", { schemaVersion: 1, battles: [] });
    write("content/journeys/milano/romance/balance.json", {});
    expect(() => loadContentSources(root)).toThrow(/Only the core layer may provide romance\/balance\.json/);
  });
});

describe("writeContentMirror", () => {
  it("writes catalogs formatted, copies city files byte for byte and removes stale files", () => {
    write("content/travel/milano.json", '{ "cityId":"milano" }');
    const mirror = path.join(root, "src/content/generated/content");
    write("src/content/generated/content/old/stale.json", {});
    write("src/content/generated/content/cities/rome.json", {});
    writeContentMirror(loadContentSources(root), mirror);
    expect(readFileSync(path.join(mirror, "battles/catalog.json"), "utf8"))
      .toBe(`${JSON.stringify({ schemaVersion: 1, battles: [{ id: "core_battle" }] }, null, 2)}\n`);
    expect(readFileSync(path.join(mirror, "travel/milano.json"), "utf8")).toBe('{ "cityId":"milano" }');
    expect(existsSync(path.join(mirror, "travel/milano-settings.json"))).toBe(true);
    expect(existsSync(path.join(mirror, "old"))).toBe(false);
    expect(existsSync(path.join(mirror, "cities/rome.json"))).toBe(false);
    expect(existsSync(path.join(mirror, "quizzes"))).toBe(false);

    // Unchanged files are not rewritten (no needless reloads of a running dev server).
    const unchanged = path.join(mirror, "cities/milano.json");
    utimesSync(unchanged, new Date(2000, 0, 1), new Date(2000, 0, 1));
    write("content/battles/catalog.json", { schemaVersion: 1, battles: [] });
    writeContentMirror(loadContentSources(root), mirror);
    expect(statSync(unchanged).mtime.getFullYear()).toBe(2000);
    expect(JSON.parse(readFileSync(path.join(mirror, "battles/catalog.json"), "utf8"))).toEqual({ schemaVersion: 1, battles: [] });
  });
});
