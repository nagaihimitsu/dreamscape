import path from "node:path";
import { describe, expect, it } from "vitest";
import { contentSourcesFromTree, contentTreeFromFiles, selectJourneys } from "./content-sources";
import { validateContent } from "./content-validation";

// validateContent works on loaded sources only: these tests build small
// content trees in memory (nothing below `root` exists) and check rejections
// without copying a fixture or running content:build.

const root = path.join(path.sep, "virtual", "dreamscape");
const json = (value: unknown) => JSON.stringify(value);
const journeyFolder = (id: string) => `content/journeys/${id}`;
const manifest = (id: string, order: number, status: "available" | "preparing", cityId: string) => json({
  schemaVersion: 1, order, id, nameJa: "テスト編", status, cities: [{ id: cityId, nameJa: "テスト市" }],
  currency: { code: "EUR", symbol: "€", unitJa: "ユーロ", unit: "whole" }, initialBudget: 100, intercityModes: [],
});
const city = (id: string) => json({
  schemaVersion: 1, id, countryCode: "IT", nameJa: "テスト市", themeJa: "旅の練習",
  firstClearReward: { rewardSourceId: `${id}_clear`, ap: 1 }, landmarkIdsPlanned: [], productionStatus: "prototype",
});
/**
 * Two journeys, `trip_a` (available) and `trip_b` (preparing), with one
 * prototype city each, a background and a progression; the core layer holds
 * the shared default background. Just enough for the layer checks and the first catalogs.
 */
function files(): Record<string, string | null> {
  const journeys: Record<string, string | null> = {};
  for (const [id, order, status, cityId] of [["trip_a", 10, "available", "a_city"], ["trip_b", 20, "preparing", "b_city"]] as const) {
    const folder = journeyFolder(id);
    journeys[`${folder}/manifest.json`] = manifest(id, order, status, cityId);
    journeys[`${folder}/cities/${cityId}.json`] = city(cityId);
    journeys[`${folder}/travel/${cityId}.json`] = json({ cityId, places: [], routes: [], events: [] });
    journeys[`${folder}/travel/${cityId}-settings.json`] = json({});
    journeys[`${folder}/romance/presentation.json`] = json({ schemaVersion: 1, backgrounds: { [`${id}_bg`]: {} } });
    journeys[`${folder}/progression/journey.json`] = json({ schemaVersion: 1,
      episodes: [{ id: `${id}_episode`, kind: "episode", cityId, landmarkId: `${id}_landmark`, requiredEpisodeIds: [], battleId: `${id}_battle`,
        titleJa: "見学", descriptionJa: "見学する。", clearTitleJa: "見学完了", clearDescriptionJa: "見学した。" }],
      rewards: [{ id: `${id}_reward`, episodeId: `${id}_episode`, trigger: "episode_clear", ap: 1, minScore: null, titleJa: "見学完了" }] });
  }
  return {
    "content/romance/presentation.json": json({ schemaVersion: 1, backgrounds: { default_scene: {} }, memories: {} }),
    "public/assets/items/item.svg": null,
    ...journeys,
  };
}
const load = (tree: Record<string, string | null>) => contentSourcesFromTree(contentTreeFromFiles(root, tree));

/** The error after the layer checks and the first catalogs: this minimal content has no tourism catalog. */
const NO_TOURISM = "Invalid content in tourism/catalog.json (no content layer provides it)";
/** trip_a's progression with an episode that has no title. */
const badProgression = (tree: Record<string, string | null>) => {
  const file = `${journeyFolder("trip_a")}/progression/journey.json`;
  const data = JSON.parse(tree[file]!);
  delete data.episodes[0].titleJa;
  return { ...tree, [file]: json(data) };
};

describe("validateContent on sources in memory", () => {
  it("asks for a journey folder when there is none", () => {
    const core = Object.fromEntries(Object.entries(files()).filter(([file]) => !file.startsWith("content/journeys/")));
    expect(() => validateContent(load(core))).toThrow("旅行編が登録されていません");
  });

  it("checks the layers, then parses the merged catalogs", () => {
    expect(() => validateContent(load(files()))).toThrow(NO_TOURISM);
  });

  it("names the layer file of an invalid catalog entry", () => {
    expect(() => validateContent(load(badProgression(files()))))
      .toThrow(`Invalid content in ${path.join(root, journeyFolder("trip_a"), "progression/journey.json")}: `);
  });

  it("rejects a reference to another journey's content, naming both files", () => {
    const tree = { ...files(), [`${journeyFolder("trip_b")}/travel/b_city-settings.json`]: json({ storyBackgroundAssetId: "trip_a_bg" }) };
    expect(() => validateContent(load(tree))).toThrow(
      'Reference to another layer: content/journeys/trip_b/travel/b_city-settings.json storyBackgroundAssetId "trip_a_bg" is the background defined in content/journeys/trip_a/romance/presentation.json; a journey folder may only refer to its own content and the core layer.',
    );
  });

  it("requires the shared default background from the core layer", () => {
    const missing = "Missing default background: content/romance/presentation.json must define backgrounds.default_scene";
    const withoutDefault = { ...files(), "content/romance/presentation.json": json({ schemaVersion: 1, backgrounds: {}, memories: {} }) };
    expect(() => validateContent(load(withoutDefault))).toThrow(missing);
    // A journey's copy would leave every other journey without it.
    const inJourney = { ...withoutDefault,
      [`${journeyFolder("trip_a")}/romance/presentation.json`]: json({ schemaVersion: 1, backgrounds: { trip_a_bg: {}, default_scene: {} } }) };
    expect(() => validateContent(load(inJourney))).toThrow(missing);
  });

  it("rejects a city file the journey's manifest does not list", () => {
    const tree = { ...files(), [`${journeyFolder("trip_b")}/cities/c_city.json`]: city("c_city"),
      [`${journeyFolder("trip_b")}/travel/c_city.json`]: json({ cityId: "c_city" }), [`${journeyFolder("trip_b")}/travel/c_city-settings.json`]: json({}) };
    expect(() => validateContent(load(tree)))
      .toThrow("City file outside its journey: content/journeys/trip_b/cities/c_city.json (c_city is not listed in content/journeys/trip_b/manifest.json)");
  });

  it("rejects a city file whose travel file is missing, when the content is loaded", () => {
    const tree = files();
    delete tree[`${journeyFolder("trip_b")}/travel/b_city.json`];
    expect(() => load(tree)).toThrow(`Cannot read JSON ${path.join(root, journeyFolder("trip_b"), "travel/b_city.json")}`);
  });
});

describe("one journey layer with the core layer (selectJourneys)", () => {
  it("is the content without the other journey folders", () => {
    const tree = files();
    const withoutA = Object.fromEntries(Object.entries(tree).filter(([file]) => !file.startsWith(`${journeyFolder("trip_a")}/`)));
    expect(selectJourneys(load(tree), ["trip_b"])).toEqual(load(withoutA));
    expect(() => selectJourneys(load(tree), ["trip_c"])).toThrow("Unknown journey folder: trip_c");
  });

  it("reports only the selected layers' problems", () => {
    const sources = load(badProgression(files()));
    expect(() => validateContent(selectJourneys(sources, ["trip_a"]))).toThrow("trip_a/progression/journey.json");
    expect(() => validateContent(selectJourneys(sources, ["trip_b"]))).toThrow(NO_TOURISM);
  });

  it("drops a cross-journey reference together with the journey it points to", () => {
    const tree = { ...files(), [`${journeyFolder("trip_b")}/travel/b_city-settings.json`]: json({ storyBackgroundAssetId: "trip_a_bg" }) };
    expect(() => validateContent(load(tree))).toThrow("Reference to another layer");
    // trip_b alone: the background is just unknown, which the later checks report.
    expect(() => validateContent(selectJourneys(load(tree), ["trip_b"]))).toThrow(NO_TOURISM);
  });
});
