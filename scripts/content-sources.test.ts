import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { journeyDirectory } from "./content-layout";
import { z } from "zod";
import { cityLayer, contentLayers, displayPath, journeyLayer, loadContentSources, parseCatalog, readJourneyCatalog, readJourneyManifests,
  requireCity, selectJourneys, storyFile } from "./content-sources";
import { writeContentMirror } from "./content-outputs";

let root: string;
const write = (relative: string, data: unknown) => {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, typeof data === "string" ? data : JSON.stringify(data));
  return file;
};
/** Register a journey folder with a manifest (extra keys follow the required ones). */
const manifest = (id: string, order: number, extra: Record<string, unknown> = {}) =>
  write(`content/journeys/${id}/manifest.json`, { schemaVersion: 1, order, id, ...extra });
const city = (layer: string, id: string) => {
  write(`${layer}/cities/${id}.json`, { id });
  write(`${layer}/travel/${id}.json`, { cityId: id });
  write(`${layer}/travel/${id}-settings.json`, { hotelPlaceId: "hotel" });
};

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "dreamscape-sources-"));
  write("content/battles/catalog.json", { schemaVersion: 1, battles: [{ id: "core_battle" }] });
  write("content/journeys/README.md", "notes");
  write("content/travel/research/ROUTES.csv", "a,b");
  write("content/stories/milano/cafe.ink", "core story");
  write("content/quizzes/duomo.json", {});
  city("content", "milano");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("content layers", () => {
  it("finds the core layer and every journey folder in manifest order, skipping dot folders", () => {
    manifest("uzbekistan", 10);
    manifest("golden_triangle", 20);
    mkdirSync(journeyDirectory(root, ".draft"), { recursive: true });
    expect(contentLayers(root).map(({ id, type, directory }) => [id, type, displayPath(root, directory)])).toEqual([
      ["core", "core", "content"],
      ["uzbekistan", "journey", "content/journeys/uzbekistan"],
      ["golden_triangle", "journey", "content/journeys/golden_triangle"],
    ]);
  });

  it("requires a manifest named after its folder with a unique integer order", () => {
    mkdirSync(journeyDirectory(root, "uzbekistan"), { recursive: true });
    expect(() => contentLayers(root)).toThrow(`Missing journey manifest: ${path.join(journeyDirectory(root, "uzbekistan"), "manifest.json")}`);
    manifest("uzbekistan", 10, { id: "samarkand" });
    expect(() => contentLayers(root)).toThrow(/Journey folder name must equal the manifest id: .*uzbekistan\/manifest\.json has id "samarkand"/);
    manifest("uzbekistan", 1.5);
    expect(() => contentLayers(root)).toThrow(/Journey manifest order must be an integer: .*uzbekistan/);
    manifest("uzbekistan", 10, { schemaVersion: 2 });
    expect(() => contentLayers(root)).toThrow(/Unsupported journey manifest schemaVersion in .*uzbekistan\/manifest\.json: 2/);
    manifest("uzbekistan", 10);
    manifest("golden_triangle", 10);
    expect(() => contentLayers(root)).toThrow(/Duplicate journey order 10: .*golden_triangle\/manifest\.json and .*uzbekistan\/manifest\.json/);
  });

  it("generates the journey catalog from the manifests without manifest-only keys", () => {
    manifest("uzbekistan", 30, { nameJa: "ウズベキスタン編", status: "preparing", authoring: { eventPrefix: "uz" } });
    manifest("milano", 10, { nameJa: "ミラノ編", status: "available" });
    const sources = loadContentSources(root);
    expect(sources.manifests.map((item) => [item.id, item.order])).toEqual([["milano", 10], ["uzbekistan", 30]]);
    const catalog = sources.catalogs["journeys/catalog.json"]!;
    expect(JSON.stringify(catalog.value)).toBe(JSON.stringify({ schemaVersion: 1, journeys: [
      { id: "milano", nameJa: "ミラノ編", status: "available" },
      { id: "uzbekistan", nameJa: "ウズベキスタン編", status: "preparing" },
    ] }));
    expect(catalog.provenance.items.journeys.map((file) => displayPath(root, file)))
      .toEqual(["content/journeys/milano/manifest.json", "content/journeys/uzbekistan/manifest.json"]);
    expect(readJourneyManifests(root).map((item) => item.id)).toEqual(["milano", "uzbekistan"]);
    // The generated catalog is validated like the former central file.
    expect(() => readJourneyCatalog(root)).toThrow(/"cities"[\s\S]*Invalid input: expected array, received undefined/);
  });

  it("explains how to register a journey when there is none", () => {
    expect(() => readJourneyCatalog(root)).toThrow("旅行編が登録されていません: content/journeys/<旅行編ID>/manifest.json を追加してください");
    expect(loadContentSources(root).manifests).toEqual([]);
  });

  it("rejects a leftover central journey catalog", () => {
    write("content/journeys/catalog.json", { schemaVersion: 1, journeys: [] });
    expect(() => loadContentSources(root)).toThrow(/Unknown content file: .*content\/journeys\/catalog\.json \(journeys are registered by content\/journeys\/<journeyId>\/manifest\.json\)/);
  });

  it("reads the current single-layer content as it is", () => {
    const sources = loadContentSources(root);
    expect(sources.layers.map((layer) => layer.id)).toEqual(["core"]);
    // Provided by a file: battles; generated: journeys; every other journey kind is empty, core-layer kinds are absent.
    const provided = Object.entries(sources.catalogs).filter(([, merged]) => merged.provenance.files.length).map(([kind]) => kind);
    expect(provided.sort()).toEqual(["battles/catalog.json"]);
    expect(Object.keys(sources.catalogs)).toContain("journeys/catalog.json");
    expect(Object.keys(sources.catalogs)).not.toContain("romance/balance.json");
    expect(sources.catalogs["battles/catalog.json"]!.value).toEqual({ schemaVersion: 1, battles: [{ id: "core_battle" }] });
    expect(sources.cities.map((item) => [item.id, item.layer, displayPath(root, item.travelFile), displayPath(root, item.settingsFile)]))
      .toEqual([["milano", "core", "content/travel/milano.json", "content/travel/milano-settings.json"]]);
    // Every data file is read once, here: Ink text, quiz and city JSON (unvalidated), and the city files' bytes.
    expect(sources.storyFiles).toEqual([{ id: "milano/cafe", file: path.join(root, "content/stories/milano/cafe.ink"), layer: "core", source: "core story" }]);
    expect(sources.quizFiles).toEqual([{ file: path.join(root, "content/quizzes/duomo.json"), layer: "core", sample: false, data: {} }]);
    const [milano] = sources.cities;
    expect([milano.data, milano.travel, milano.settings]).toEqual([{ id: "milano" }, { cityId: "milano" }, { hotelPlaceId: "hotel" }]);
    expect(milano.bytes.travel.toString("utf8")).toBe(readFileSync(path.join(root, "content/travel/milano.json"), "utf8"));
    expect(sources.publicRoots).toEqual([path.join(root, "public")]);
  });
});

describe("loadContentSources with journey layers", () => {
  beforeEach(() => {
    // Manifest order (not folder name) decides the layer order.
    manifest("golden_triangle", 20);
    manifest("milano", 30);
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
    expect(sources.catalogs["journeys/catalog.json"]!.value).toEqual({ schemaVersion: 1, journeys: [{ id: "golden_triangle" }, { id: "milano" }] });
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

  it("parses a merged catalog naming the layer file of a bad entry, and finds cities and stories", () => {
    const sources = loadContentSources(root);
    const schema = z.object({ schemaVersion: z.literal(1), battles: z.array(z.object({ id: z.string().regex(/^[a-z_]+$/) })) });
    expect(parseCatalog(sources, schema, "battles/catalog.json").battles).toHaveLength(2);
    // The second (journey layer) entry becomes invalid.
    sources.catalogs["battles/catalog.json"]!.value = { schemaVersion: 1, battles: [{ id: "core_battle" }, { id: "Bad ID" }] };
    expect(() => parseCatalog(sources, schema, "battles/catalog.json"))
      .toThrow(`Invalid content in ${path.join(root, "content/journeys/golden_triangle/battles/catalog.json")}: `);
    // Positions are those inside each file; every file with a bad entry is named on its own line.
    sources.catalogs["battles/catalog.json"]!.value = { schemaVersion: 1, battles: [{ id: "Core" }, { id: "Bad ID" }] };
    const message = (() => {
      try {
        parseCatalog(sources, schema, "battles/catalog.json");
      } catch (error) {
        return (error as Error).message;
      }
    })()!;
    const lines = message.split("\n").filter((line) => line.startsWith("Invalid content in "));
    expect(lines).toEqual([
      `Invalid content in ${path.join(root, "content/battles/catalog.json")}: [`,
      `Invalid content in ${path.join(root, "content/journeys/golden_triangle/battles/catalog.json")}: [`,
    ]);
    const [core, journey] = message.split("\nInvalid content in ").map((part) => JSON.parse(part.slice(part.indexOf(": [") + 2)));
    expect(core.map((issue: { path: unknown }) => issue.path)).toEqual([["battles", 0, "id"]]);
    expect(journey.map((issue: { path: unknown }) => issue.path)).toEqual([["battles", 0, "id"]]);
    // A core-layer kind no layer provides is missing; a journey kind is empty (see absentCatalog).
    expect(() => parseCatalog(sources, schema, "romance/balance.json")).toThrow("Missing content file: romance/balance.json (no content layer provides it)");
    expect(sources.catalogs["romance/balance.json"]).toBeUndefined();
    expect(sources.catalogs["tourism/catalog.json"]).toEqual({
      value: { schemaVersion: 1, assets: [], landmarks: [], clues: [] }, provenance: { files: [], items: {}, keys: {}, values: {} },
    });
    expect(sources.catalogs["learning/details.json"]!.value).toEqual({ schemaVersion: 1, questions: {} });
    expect(() => parseCatalog(sources, z.object({ assets: z.array(z.unknown()).min(1) }).strip(), "tourism/catalog.json"))
      .toThrow("Invalid content in tourism/catalog.json (no content layer provides it): ");
    expect(displayPath(root, requireCity(sources, "delhi").settingsFile)).toBe("content/journeys/golden_triangle/travel/delhi-settings.json");
    expect(() => requireCity(sources, "rome")).toThrow("Missing content file: cities/rome.json (no content layer provides it)");
    expect(storyFile(sources, "milano/cafe_03")).toBe(path.join(root, "content/journeys/milano/stories/milano/cafe_03.ink"));
    expect(storyFile(sources, "milano/missing")).toBeUndefined();
  });

  it("finds the layer that owns a city, or that will hold a journey's new city", () => {
    manifest("golden_triangle", 20, { cities: [{ id: "delhi" }, { id: "agra" }] });
    manifest("milano", 30, { cities: [{ id: "milano" }] });
    manifest("uzbekistan", 40, { cities: [{ id: "tashkent" }] });
    const sources = loadContentSources(root);
    expect(cityLayer(sources, "delhi").id).toBe("golden_triangle");
    expect(cityLayer(sources, "milano").id).toBe("core");
    // A new city goes next to its journey's existing cities, else into the journey's own folder.
    expect(cityLayer(sources, "agra").id).toBe("golden_triangle");
    expect(journeyLayer(sources, "milano").id).toBe("core");
    expect(cityLayer(sources, "tashkent")).toEqual({ id: "uzbekistan", type: "journey", directory: journeyDirectory(root, "uzbekistan") });
    expect(() => cityLayer(sources, "rome")).toThrow("Register city rome in exactly one journey");
    expect(() => journeyLayer(sources, "unknown")).toThrow("Unknown journey: unknown");
    city("content", "agra");
    expect(() => journeyLayer(loadContentSources(root), "golden_triangle"))
      .toThrow("Journey cities must live in one content layer: golden_triangle (core, golden_triangle)");
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
    expect(JSON.parse(readFileSync(path.join(mirror, "journeys/catalog.json"), "utf8"))).toEqual({ schemaVersion: 1, journeys: [] });

    // Unchanged files are not rewritten (no needless reloads of a running dev server).
    const unchanged = path.join(mirror, "cities/milano.json");
    utimesSync(unchanged, new Date(2000, 0, 1), new Date(2000, 0, 1));
    write("content/battles/catalog.json", { schemaVersion: 1, battles: [] });
    writeContentMirror(loadContentSources(root), mirror);
    expect(statSync(unchanged).mtime.getFullYear()).toBe(2000);
    expect(JSON.parse(readFileSync(path.join(mirror, "battles/catalog.json"), "utf8"))).toEqual({ schemaVersion: 1, battles: [] });
  });
});

describe("extra journey folders", () => {
  /** A journey folder outside content/journeys/, like the sample journey. */
  const extra = (id: string, order: number) => {
    write(`authoring/templates/${id}/manifest.json`, { schemaVersion: 1, order, id });
    write(`authoring/templates/${id}/battles/catalog.json`, { schemaVersion: 1, battles: [{ id: `${id}_battle` }] });
    write(`authoring/templates/${id}/stories/battles/${id}.ink`, "story");
    write(`authoring/templates/${id}/public/assets/tourism/${id}/spot.png`, "png");
    write(`authoring/templates/${id}/README.md`, "notes");
  };

  it("loads a folder outside content/journeys/ as one more journey layer, only when asked", () => {
    manifest("milan", 10);
    extra("sample", 9000);
    const options = { extraJourneyDirectories: ["authoring/templates/sample"] };
    expect(loadContentSources(root).manifests.map((item) => item.id)).toEqual(["milan"]);
    expect(readJourneyManifests(root, options).map((item) => item.id)).toEqual(["milan", "sample"]);
    const sources = loadContentSources(root, options);
    expect(sources.tree.extraJourneyFolders).toEqual({ sample: "authoring/templates/sample" });
    expect(sources.layers.map(({ id, directory }) => [id, displayPath(root, directory)])).toEqual([
      ["core", "content"], ["milan", "content/journeys/milan"], ["sample", "authoring/templates/sample"],
    ]);
    expect(sources.catalogs["battles/catalog.json"]!.provenance.items.battles.map((file) => displayPath(root, file)))
      .toEqual(["content/battles/catalog.json", "authoring/templates/sample/battles/catalog.json"]);
    expect(storyFile(sources, "battles/sample")).toBe(path.join(root, "authoring/templates/sample/stories/battles/sample.ink"));
    expect(sources.publicFiles.get("assets/tourism/sample/spot.png"))
      .toBe(path.join(root, "authoring/templates/sample/public/assets/tourism/sample/spot.png"));
    // An absolute path inside the root names the same folder.
    expect(loadContentSources(root, { extraJourneyDirectories: [path.join(root, "authoring/templates/sample")] }).tree.extraJourneyFolders)
      .toEqual({ sample: "authoring/templates/sample" });
    // selectJourneys keeps the extra folder only when it is selected.
    expect(selectJourneys(sources, ["sample"]).layers.map((layer) => layer.id)).toEqual(["core", "sample"]);
    expect(selectJourneys(sources, ["milan"]).tree.extraJourneyFolders).toBeUndefined();
    expect(selectJourneys(sources, ["milan"]).publicFiles.has("assets/tourism/sample/spot.png")).toBe(false);
  });

  it("rejects a folder that is missing, outside the root, inside content/ or named like another journey", () => {
    manifest("sample", 10);
    extra("sample", 9000);
    expect(() => loadContentSources(root, { extraJourneyDirectories: ["authoring/templates/sample"] }))
      .toThrow("Journey folder sample exists twice: content/journeys/sample and authoring/templates/sample");
    expect(() => readJourneyManifests(root, { extraJourneyDirectories: ["authoring/templates/missing"] })).toThrow("Missing extra journey folder");
    expect(() => loadContentSources(root, { extraJourneyDirectories: ["content/extra"] })).toThrow("outside content/");
    expect(() => loadContentSources(root, { extraJourneyDirectories: ["../elsewhere"] })).toThrow("must lie inside");
  });
});
