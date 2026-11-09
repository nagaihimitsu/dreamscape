import { dataLanguageWarnings } from "./data-language";
import { describe, expect, it } from "vitest";
import { travelCatalogSchema, type TravelCatalog } from "../src/content/travel-schemas";
import { SAMPLE_SOURCE_URL } from "./sample-journey";
import {
  exportTransitDecisions, formatTransitCounts, inspectCityTransit, isFactSource, replaceTransitDecisions,
  transitLedgerFromDecisions, transitLedgerSchema, unsupportedTransitRoutes, type TransitLedger,
} from "./transit-ledger";

const fact = { publisher: "試験の交通局", title: "運賃表", url: "https://example.org/fare", checkedAt: "2026-11-04",
  claimType: "documented_fact" as const, claimJa: "試験用の事実の出典です。" };
const model = { publisher: "Dreamscape 試験", title: "ゲーム用の推定", url: "https://example.org/model", checkedAt: "2026-11-04",
  claimType: "hypothesis" as const, claimJa: "検証専用の推定値です。" };
const places = ["test_a", "test_b"].map((id) => ({ id, cityId: "test_city", nameJa: "試験地点", nameEn: "Test place",
  latitude: 41, longitude: 69, backgroundId: "test_bg", sources: [model] }));
const modes = ["tram", "taxi"];

/** Two places; walking both ways, a taxi both ways (game model with fact and hypothesis), no tram. */
function fixture(): { travel: TravelCatalog; ledger: TransitLedger } {
  const travel = travelCatalogSchema.parse({ cityId: "test_city", places, events: [], routes: places.flatMap((from) => places.flatMap((to) => [
    { fromPlaceId: from.id, toPlaceId: to.id, mode: "walk", minutes: from.id === to.id ? 0 : 10, cost: 0, sources: [model] },
    ...(from.id === to.id ? [] : [{ fromPlaceId: from.id, toPlaceId: to.id, mode: "taxi", minutes: 5, cost: 100,
      estimation: "game_model", sources: [fact, model] }]),
  ])) });
  const ledger: TransitLedger = { schemaVersion: 2, cityId: "test_city", sourceRefs: { fact, model },
    decisions: places.flatMap((from) => places.filter((to) => to.id !== from.id).flatMap((to) => modes.map((mode) => ({
      fromPlaceId: from.id, toPlaceId: to.id, mode, status: mode === "taxi" ? "available" as const : "not_applicable" as const,
      checkedAt: "2026-11-04", reasonJa: mode === "taxi" ? "ゲーム用の推定です。" : "路面電車は走っていません。",
      sourceRefs: mode === "taxi" ? ["model"] : ["fact"],
    })))) };
  return { travel, ledger };
}
const counts = (taxi: Partial<Record<string, number>>, tram: Partial<Record<string, number>>) => ({
  tram: { available: 0, not_suitable: 0, not_applicable: 0, inconclusive: 0, ...tram },
  taxi: { available: 0, not_suitable: 0, not_applicable: 0, inconclusive: 0, ...taxi },
});
const FILE = "content/journeys/test_trip/travel/test_city-transit.json";

describe("per-city transit ledger", () => {
  it("has one decision per ordered pair and declared mode, counted per mode and status", () => {
    const { travel, ledger } = fixture();
    expect(inspectCityTransit(travel, ledger, modes, FILE)).toEqual({ cityId: "test_city", directions: 2, decisions: 4,
      counts: counts({ available: 2 }, { not_applicable: 2 }), ready: true, missingWalks: [] });
  });

  it("builds an inconclusive decision but does not call the city ready", () => {
    const { travel, ledger } = fixture();
    ledger.decisions.find((decision) => decision.mode === "tram")!.status = "inconclusive";
    expect(inspectCityTransit(travel, ledger, modes, FILE)).toMatchObject({ ready: false,
      counts: counts({ available: 2 }, { not_applicable: 1, inconclusive: 1 }) });
  });

  it("requires a decision for every direction and mode and refuses one for an undeclared mode", () => {
    const { travel, ledger } = fixture();
    expect(() => inspectCityTransit(travel, { ...ledger, decisions: ledger.decisions.slice(1) }, modes, FILE))
      .toThrow(`判断のない方向があります: test_a → test_b（tram）: ${FILE}（Undecided transit direction: test_a → test_b（tram））`);
    expect(() => inspectCityTransit(travel, ledger, ["taxi"], FILE)).toThrow("Decision for an undeclared mode: test_a → test_b（tram）");
    expect(() => inspectCityTransit(travel, ledger, ["walk", ...modes], FILE)).toThrow("Walking is not a transit ledger mode");
  });

  it("lists the directions without a walking route instead of refusing them (content:build warns)", () => {
    const { travel, ledger } = fixture();
    const noWalk = { ...travel, routes: travel.routes.filter((route) => !(route.mode === "walk" && route.fromPlaceId === "test_b" && route.toPlaceId === "test_a")) };
    expect(inspectCityTransit(noWalk, ledger, modes, FILE)).toMatchObject({ ready: true, decisions: 4, missingWalks: ["test_b → test_a"] });
  });

  it("keeps available and route in step, both ways", () => {
    const { travel, ledger } = fixture();
    const noRoute = { ...travel, routes: travel.routes.filter((route) => !(route.mode === "taxi" && route.fromPlaceId === "test_a")) };
    expect(() => inspectCityTransit(noRoute, ledger, modes, FILE)).toThrow("Transit decision and route disagree: test_a → test_b（taxi）");
    const extraRoute = { ...travel, routes: [...travel.routes, { ...travel.routes.find((route) => route.mode === "taxi")!, mode: "tram" }] };
    expect(() => inspectCityTransit(extraRoute, ledger, modes, FILE)).toThrow(/経路があるのに判断が not_applicable です: test_a → test_b（tram）/u);
  });

  it("refuses a duplicate, a same-place or foreign pair, another city and an unresolved source", () => {
    const { travel, ledger } = fixture();
    const [first] = ledger.decisions;
    for (const decisions of [[...ledger.decisions, first], [...ledger.decisions, { ...first, toPlaceId: "test_a" }],
      [...ledger.decisions, { ...first, toPlaceId: "elsewhere" }]])
      expect(() => inspectCityTransit(travel, { ...ledger, decisions }, modes, FILE)).toThrow("Invalid or duplicate transit direction");
    expect(() => inspectCityTransit(travel, { ...ledger, cityId: "other_city" }, modes, FILE)).toThrow("Transit city mismatch");
    expect(() => inspectCityTransit(travel, { ...ledger, decisions: [{ ...first, sourceRefs: ["constructor"] }, ...ledger.decisions.slice(1)] }, modes, FILE))
      .toThrow("Unresolved transit source");
  });

  it("asks for a documented fact behind every decision that is not available; the sample's stand-in counts", () => {
    const { travel, ledger } = fixture();
    const onlyModel = { ...ledger, decisions: ledger.decisions.map((decision) => ({ ...decision, sourceRefs: ["model"] })) };
    expect(() => inspectCityTransit(travel, onlyModel, modes, FILE))
      .toThrow("A not_applicable decision needs a documented fact: test_a → test_b（tram）");
    const sample = { ...model, url: SAMPLE_SOURCE_URL };
    expect(inspectCityTransit(travel, { ...onlyModel, sourceRefs: { ...ledger.sourceRefs, model: sample } }, modes, FILE).ready).toBe(true);
    expect(isFactSource(fact)).toBe(true);
    expect(isFactSource(model)).toBe(false);
    expect(isFactSource(sample)).toBe(true);
    // A field note committed to the repository is cited like any documented source.
    expect(isFactSource({ claimType: "documented_fact", url: "https://github.com/nagaihimitsu/dreamscape/blob/main/authoring/journeys/x/research/field-note.md" })).toBe(true);
  });

  it("refuses a bad date, an unknown status and the old format; a non-Japanese reason is only a warning", () => {
    const { travel, ledger } = fixture();
    const [first] = ledger.decisions;
    for (const bad of [{ ...first, checkedAt: "2026-07" }, { ...first, status: "unconfirmed" }])
      expect(() => inspectCityTransit(travel, { ...ledger, decisions: [bad, ...ledger.decisions.slice(1)] }, modes, FILE))
        .toThrow(`交通判断台帳の形式が違います: ${FILE}（Invalid transit ledger）`);
    expect(() => inspectCityTransit(travel, { ...ledger, schemaVersion: 1 }, modes, FILE)).toThrow("Invalid transit ledger");
    // The reason's language is content:build's data-language warning (decision 32).
    const english = { ...ledger, decisions: [{ ...first, reasonJa: "no tram" }, ...ledger.decisions.slice(1)] };
    expect(inspectCityTransit(travel, english, modes, FILE)).toBeDefined();
    expect(dataLanguageWarnings(transitLedgerSchema, english, FILE).map((warning) => [warning.kind, warning.message]))
      .toEqual([["data-language", `日本語の欄に日本語がありません：${FILE} の decisions[0].reasonJa「no tram」。画面はこの欄を日本語の文として出します（止めません）。`]]);
  });

  it("lists routes of declared modes without a game estimate backed by a documented fact", () => {
    const { travel } = fixture();
    expect(unsupportedTransitRoutes(travel, modes)).toEqual([]);
    const taxi = travel.routes.filter((route) => route.mode === "taxi");
    const weakened = { ...travel, routes: [...travel.routes.filter((route) => route.mode !== "taxi"),
      { ...taxi[0], sources: [model] }, { ...taxi[1], estimation: undefined }] };
    expect(unsupportedTransitRoutes(weakened, modes).map((route) => route.fromPlaceId)).toEqual(["test_a", "test_b"]);
    // Walking is the game model itself, and an undeclared mode is refused elsewhere.
    expect(unsupportedTransitRoutes(weakened, ["tram"])).toEqual([]);
  });

  it("exports decisions with their sources and takes them back, keeping checkedAt", () => {
    const { travel, ledger } = fixture();
    const exported = exportTransitDecisions(ledger);
    expect(exported[0]).toMatchObject({ cityId: "test_city", mode: "tram", checkedAt: "2026-11-04", sources: [fact] });
    expect(replaceTransitDecisions(ledger, exported)).toBe(ledger);
    exported[0].reasonJa += "（編集）";
    const replaced = replaceTransitDecisions(ledger, exported);
    expect(exportTransitDecisions(replaced)).toEqual(exported);
    expect(inspectCityTransit(travel, replaced, modes, FILE).ready).toBe(true);
    expect(transitLedgerFromDecisions("test_city", exported)).toEqual(replaced);
    expect(() => replaceTransitDecisions({ ...ledger, cityId: "other_city" }, exported)).toThrow("Transit decision belongs to another city");
  });

  it("formats the counts per mode in Japanese", () => {
    expect(formatTransitCounts(counts({ available: 2 }, { not_applicable: 1, inconclusive: 1 }), (mode) => ({ tram: "路面電車", taxi: "タクシー" })[mode]!))
      .toEqual(["路面電車: 走っていない 1、特定できず 1", "タクシー: 使う 2"]);
  });
});
