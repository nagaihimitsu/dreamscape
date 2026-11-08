import { describe, expect, it } from "vitest";
import { localIssuePath, mergeCatalog, sourceFileOf, type CatalogSource } from "./catalog-merge";
import {
  absentCatalog, CATALOG_RULES, catalogRule, classifyContentFile, completeFragment, CORE_LAYER_KINDS, emptyCatalog, storyIdFromPath, trimFragment,
} from "./content-layout";

const core = (data: unknown, file = "content/x.json"): CatalogSource => ({ file, core: true, data });
const journey = (data: unknown, file: string): CatalogSource => ({ file, core: false, data });

describe("catalog merge", () => {
  it("starts a layer's missing catalog from an empty fragment that merges like no file", () => {
    expect(JSON.stringify(emptyCatalog("romance/presentation.json"))).toBe(JSON.stringify({ schemaVersion: 1, backgrounds: {}, memories: {} }));
    expect(JSON.stringify(emptyCatalog("presentation/characters.json")))
      .toBe(JSON.stringify({ schemaVersion: 1, battleCharacters: {}, characters: [], wardrobe: { cities: {}, scenes: {} } }));
    const rule = catalogRule("tourism/catalog.json");
    const base = { schemaVersion: 1, assets: [{ id: "a" }], landmarks: [], clues: [] };
    expect(mergeCatalog(rule, [core(base), journey(emptyCatalog("tourism/catalog.json"), "j.json")])!.value).toEqual(base);
    expect(JSON.stringify(emptyCatalog("learning/details.json"))).toBe(JSON.stringify({ schemaVersion: 1, questions: {} }));
    expect(() => emptyCatalog("romance/balance.json")).toThrow("romance/balance.json is provided as a whole file and has no empty fragment");
  });

  it("gives a journey kind that no layer provides an empty value, and none to a core-layer kind", () => {
    // So any journey folder can be removed: e.g. only Milan has encounters or English-note details.
    expect(JSON.stringify(absentCatalog("encounters/catalog.json"))).toBe(JSON.stringify({ schemaVersion: 1, items: [], encounters: [] }));
    expect(absentCatalog("presentation/reasoning-intros.json")).toEqual({ schemaVersion: 1, entries: [] });
    expect(JSON.stringify(absentCatalog("learning/details.json"))).toBe(JSON.stringify({ schemaVersion: 1, questions: {} }));
    // A new object each time, never one a caller could have changed.
    expect(absentCatalog("learning/details.json")).not.toBe(absentCatalog("learning/details.json"));
    for (const kind of ["romance/balance.json", "romance/presentation.json", "presentation/characters.json", "learning/word-meanings.json"] as const)
      expect(absentCatalog(kind)).toBeUndefined();
    // Whole files belong to the core layer, so absentCatalog never needs an empty whole file.
    for (const rule of CATALOG_RULES) if ("file" in rule) expect(CORE_LAYER_KINDS.has(rule.kind)).toBe(true);
  });

  it("completes a fragment that leaves keys out for editing and trims the keys that stay empty", () => {
    const fragment: Record<string, unknown> = { assets: [{ id: "a" }] };
    const added = completeFragment("tourism/catalog.json", fragment, 2);
    expect(JSON.stringify(fragment)).toBe(JSON.stringify({ assets: [{ id: "a" }], schemaVersion: 2, landmarks: [], clues: [] }));
    (fragment.clues as unknown[]).push({ id: "c" });
    expect(JSON.stringify(trimFragment(fragment, added))).toBe(JSON.stringify({ assets: [{ id: "a" }], clues: [{ id: "c" }] }));
    const complete = { schemaVersion: 1, assets: [], landmarks: [], clues: [] };
    expect(completeFragment("tourism/catalog.json", complete).size).toBe(0);
    expect(JSON.stringify(trimFragment(complete, new Map()))).toBe(JSON.stringify({ schemaVersion: 1, assets: [], landmarks: [], clues: [] }));
  });

  it("concatenates arrays core first and records which file supplied each entry", () => {
    const merged = mergeCatalog(catalogRule("battles/catalog.json"), [
      core({ schemaVersion: 1, battles: [{ id: "a" }, { id: "b" }] }, "core/battles.json"),
      journey({ battles: [{ id: "c" }], schemaVersion: 1 }, "gt/battles.json"),
      journey({ schemaVersion: 1, battles: [] }, "uz/battles.json"),
    ])!;
    // Output key order follows the merge table, not the fragment.
    expect(JSON.stringify(merged.value)).toBe(JSON.stringify({ schemaVersion: 1, battles: [{ id: "a" }, { id: "b" }, { id: "c" }] }));
    expect(merged.provenance.files).toEqual(["core/battles.json", "gt/battles.json", "uz/battles.json"]);
    expect(merged.provenance.items.battles).toEqual(["core/battles.json", "core/battles.json", "gt/battles.json"]);
    expect(sourceFileOf(merged.provenance, ["battles", 2, "id"])).toBe("gt/battles.json");
    expect(sourceFileOf(merged.provenance, ["schemaVersion"])).toBe("core/battles.json");
    expect(sourceFileOf(merged.provenance, [])).toBeUndefined();
  });

  it("turns a merged position into the position inside the entry's own file", () => {
    const merged = mergeCatalog(catalogRule("battles/catalog.json"), [
      core({ schemaVersion: 1, battles: [{ id: "a" }, { id: "b" }] }, "core/battles.json"),
      journey({ schemaVersion: 1, battles: [{ id: "c" }, { id: "d" }] }, "gt/battles.json"),
    ])!;
    expect(localIssuePath(merged.provenance, ["battles", 1, "id"])).toEqual(["battles", 1, "id"]);
    expect(localIssuePath(merged.provenance, ["battles", 2, "id"])).toEqual(["battles", 0, "id"]);
    expect(localIssuePath(merged.provenance, ["battles", 3, "scenes", 0])).toEqual(["battles", 1, "scenes", 0]);
    // Paths without a concatenated element, and records, keep their positions.
    expect(localIssuePath(merged.provenance, ["battles"])).toEqual(["battles"]);
    expect(localIssuePath(merged.provenance, ["schemaVersion"])).toEqual(["schemaVersion"]);
    const details = mergeCatalog(catalogRule("learning/details.json"), [
      journey({ schemaVersion: 1, questions: { a: { topics: [{}, {}] } } }, "mi/details.json"),
      journey({ schemaVersion: 1, questions: { b: { topics: [{}] } } }, "gt/details.json"),
    ])!;
    expect(localIssuePath(details.provenance, ["questions", "b", "topics", 0])).toEqual(["questions", "b", "topics", 0]);
  });

  it("returns nothing when no layer has the file and omits keys no layer sets", () => {
    expect(mergeCatalog(catalogRule("battles/catalog.json"), [])).toBeUndefined();
    const merged = mergeCatalog(catalogRule("tourism/catalog.json"), [journey({ clues: [] }, "gt/tourism.json")])!;
    expect(merged.value).toEqual({ clues: [] });
    expect(sourceFileOf(merged.provenance, ["schemaVersion"])).toBe("gt/tourism.json");
  });

  it("merges records in layer order and rejects a key defined twice, naming both files", () => {
    const rule = catalogRule("romance/presentation.json");
    const merged = mergeCatalog(rule, [
      core({ schemaVersion: 1, backgrounds: { cafe: { a: 1 } }, emotions: { calm: {} } }, "core/presentation.json"),
      journey({ backgrounds: { delhi: { a: 2 } }, memories: { m: {} } }, "gt/presentation.json"),
    ])!;
    expect(JSON.stringify(merged.value)).toBe(JSON.stringify({
      schemaVersion: 1, backgrounds: { cafe: { a: 1 }, delhi: { a: 2 } }, emotions: { calm: {} }, memories: { m: {} },
    }));
    expect(merged.provenance.keys.backgrounds).toEqual({ cafe: "core/presentation.json", delhi: "gt/presentation.json" });
    expect(sourceFileOf(merged.provenance, ["backgrounds", "delhi", "imagePath"])).toBe("gt/presentation.json");
    expect(() => mergeCatalog(rule, [
      core({ backgrounds: { cafe: {} } }, "core/presentation.json"),
      journey({ backgrounds: { cafe: {} } }, "gt/presentation.json"),
    ])).toThrow('Duplicate key "backgrounds.cafe" in romance/presentation.json: core/presentation.json and gt/presentation.json');
  });

  it("accepts a repeated dictionary word only when its meaning is identical", () => {
    const rule = catalogRule("learning/word-meanings.json");
    const merged = mergeCatalog(rule, [
      core({ schemaVersion: 1, words: { fort: { ja: "砦" }, tomb: { ja: "墓" } } }, "core/words.json"),
      journey({ words: { tomb: { ja: "墓" }, step: { ja: "段" } } }, "gt/words.json"),
    ])!;
    expect(Object.keys((merged.value as { words: object }).words)).toEqual(["fort", "tomb", "step"]);
    expect(merged.provenance.keys.words.tomb).toBe("core/words.json");
    expect(() => mergeCatalog(rule, [
      core({ words: { tomb: { ja: "墓" } } }, "core/words.json"),
      journey({ words: { tomb: { ja: "霊廟" } } }, "gt/words.json"),
    ])).toThrow('Duplicate key "words.tomb" in learning/word-meanings.json: core/words.json and gt/words.json');
  });

  it("keeps core-only keys out of journey layers", () => {
    expect(() => mergeCatalog(catalogRule("romance/progression.json"), [
      core({ schemaVersion: 1, stages: [] }, "core/progression.json"),
      journey({ stages: [], memoryCallbacks: [] }, "gt/progression.json"),
    ])).toThrow('Core-only key "stages" set in a journey layer: gt/progression.json');
  });

  it("rejects unknown keys, mismatched schema versions and wrong value types", () => {
    const rule = catalogRule("battles/catalog.json");
    expect(() => mergeCatalog(rule, [journey({ battles: [], extra: 1 }, "gt/battles.json")]))
      .toThrow('Unknown key "extra" in gt/battles.json');
    expect(() => mergeCatalog(rule, [
      core({ schemaVersion: 1, battles: [] }, "core/battles.json"),
      journey({ schemaVersion: 2, battles: [] }, "gt/battles.json"),
    ])).toThrow('Mismatched "schemaVersion" in battles/catalog.json: core/battles.json has 1, gt/battles.json has 2');
    expect(() => mergeCatalog(rule, [journey({ battles: {} }, "gt/battles.json")]))
      .toThrow('Expected an array for "battles" in gt/battles.json');
    expect(() => mergeCatalog(catalogRule("learning/translations.json"), [journey({ questions: [] }, "gt/t.json")]))
      .toThrow('Expected an object for "questions" in gt/t.json');
    expect(() => mergeCatalog(rule, [journey([], "gt/battles.json")])).toThrow("Expected a JSON object in gt/battles.json");
  });

  it("merges the nested wardrobe: regions and countries are shared, cities and scenes per layer", () => {
    const rule = catalogRule("presentation/characters.json");
    const merged = mergeCatalog(rule, [
      core({ schemaVersion: 1, characters: [{ id: "heroine" }], wardrobe: { regions: { eu: {} }, countries: { IT: {} }, cities: {}, scenes: {} } }, "core/characters.json"),
      journey({ wardrobe: { cities: { milano: { country: "IT" } } }, battleCharacters: { b: "enemy" } }, "milano/characters.json"),
    ])!;
    expect(JSON.stringify(merged.value)).toBe(JSON.stringify({
      schemaVersion: 1,
      battleCharacters: { b: "enemy" },
      characters: [{ id: "heroine" }],
      wardrobe: { regions: { eu: {} }, countries: { IT: {} }, cities: { milano: { country: "IT" } }, scenes: {} },
    }));
    expect(sourceFileOf(merged.provenance, ["wardrobe", "cities", "milano", "country"])).toBe("milano/characters.json");
    expect(sourceFileOf(merged.provenance, ["wardrobe", "regions", "eu"])).toBe("core/characters.json");
    expect(() => mergeCatalog(rule, [journey({ wardrobe: { countries: { IN: {} } } }, "gt/characters.json")]))
      .toThrow('Core-only key "wardrobe.countries" set in a journey layer: gt/characters.json');
    expect(() => mergeCatalog(rule, [journey({ wardrobe: { towns: {} } }, "gt/characters.json")]))
      .toThrow('Unknown key "wardrobe.towns" in gt/characters.json');
  });

  it("merges English-note details of several journeys per question, each with its own story", () => {
    const rule = catalogRule("learning/details.json");
    const milano = { schemaVersion: 1, questions: { milano_last_supper_q1: { storyId: "learning/milano_english" } } };
    const gt = { schemaVersion: 1, questions: { gt_question: { storyId: "learning/gt_english" } } };
    const merged = mergeCatalog(rule, [journey(milano, "milano/details.json"), journey(gt, "gt/details.json")])!;
    expect(JSON.stringify(merged.value)).toBe(JSON.stringify({
      schemaVersion: 1,
      questions: { milano_last_supper_q1: { storyId: "learning/milano_english" }, gt_question: { storyId: "learning/gt_english" } },
    }));
    // An error inside a question names the file that provides it.
    expect(sourceFileOf(merged.provenance, ["questions", "gt_question", "storyId"])).toBe("gt/details.json");
    expect(() => mergeCatalog(rule, [journey(milano, "milano/details.json"), journey(milano, "gt/details.json")]))
      .toThrow('Duplicate key "questions.milano_last_supper_q1" in learning/details.json: milano/details.json and gt/details.json');
    // The file has no story of its own any more.
    expect(() => mergeCatalog(rule, [journey({ ...milano, storyId: "learning/milano_english" }, "milano/details.json")]))
      .toThrow('Unknown key "storyId" in milano/details.json');
  });

  it("lets whole files come only from the core layer", () => {
    expect(mergeCatalog(catalogRule("romance/balance.json"), [core({ ap: 1 }, "core/balance.json")])!.value).toEqual({ ap: 1 });
    expect(() => mergeCatalog(catalogRule("romance/balance.json"), [journey({}, "gt/balance.json")]))
      .toThrow("Only the core layer may provide romance/balance.json: gt/balance.json");
    expect(() => mergeCatalog(catalogRule("romance/balance.json"), [core({}, "core/balance.json"), journey({}, "gt/balance.json")]))
      .toThrow("Only the core layer may provide romance/balance.json: gt/balance.json");
  });
});

describe("content file layout", () => {
  it("classifies data files by their layer-relative path", () => {
    expect(classifyContentFile("battles/catalog.json", "journey")).toEqual({ type: "catalog", kind: "battles/catalog.json" });
    // The journey catalog is generated from the manifests; no layer provides it.
    expect(classifyContentFile("journeys/catalog.json", "core")).toEqual({ type: "unknown" });
    expect(classifyContentFile("journeys/catalog.json", "journey")).toEqual({ type: "unknown" });
    expect(classifyContentFile("manifest.json", "journey")).toEqual({ type: "manifest" });
    expect(classifyContentFile("manifest.json", "core")).toEqual({ type: "unknown" });
    expect(classifyContentFile("cities/delhi.json", "journey")).toEqual({ type: "city", id: "delhi" });
    expect(classifyContentFile("cities/old/delhi.json", "core")).toEqual({ type: "unknown" });
    expect(classifyContentFile("travel/delhi.json", "core")).toEqual({ type: "travel", cityId: "delhi", part: "routes" });
    expect(classifyContentFile("travel/delhi-settings.json", "core")).toEqual({ type: "travel", cityId: "delhi", part: "settings" });
    expect(classifyContentFile("travel/delhi-transit.json", "journey")).toEqual({ type: "travel", cityId: "delhi", part: "transit" });
    expect(classifyContentFile("stories/dates/milano_date_cafe.ink", "journey")).toEqual({ type: "story", id: "dates/milano_date_cafe" });
    expect(classifyContentFile("quizzes/x.example.json", "core")).toEqual({ type: "quiz", example: true });
    expect(classifyContentFile("quizzes/sub/x.json", "core")).toEqual({ type: "quiz", example: false });
    expect(classifyContentFile("travel/research/routes.csv", "core")).toEqual({ type: "other" });
    expect(classifyContentFile("travel/README.md", "core")).toEqual({ type: "other" });
    expect(classifyContentFile("battles/.draft.json", "core")).toEqual({ type: "other" });
    expect(classifyContentFile("battles/extra.json", "core")).toEqual({ type: "unknown" });
    expect(classifyContentFile("stories/x.json", "core")).toEqual({ type: "unknown" });
    expect(classifyContentFile("public/assets/tourism/a.webp", "journey")).toEqual({ type: "public" });
    expect(classifyContentFile("public/a.webp", "journey")).toEqual({ type: "unknown" });
    expect(classifyContentFile("public/assets/a.webp", "core")).toEqual({ type: "other" });
    expect(storyIdFromPath("stories/arrivals/agra.ink")).toBe("arrivals/agra");
    expect(storyIdFromPath("quizzes/agra.json")).toBeUndefined();
  });
});
