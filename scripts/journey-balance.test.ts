import { describe, expect, it } from "vitest";
import type { SceneEntry, SceneOption } from "../src/content/scene-schemas";
import { compileInk } from "./ink-validation";
import { formatJourneyBalance, hotelRoundTrip, journeyBalance, sceneBalance, walkOptionPaths, type BalanceInput } from "./journey-balance";

// balance:report (the numeric balance pass): the money, AP and relationship sums of a tiny one-city journey, the range of
// one path through a scene, and the choice points the Ink walk finds.

const scene = (id: string, kind: SceneEntry["kind"], options: SceneOption[], done: SceneEntry["done"] = {}, main?: SceneEntry["main"]): SceneEntry => ({
  id, kind, cityId: "x", story: { storyId: `places/${id}`, knot: id }, ...(main ? { main } : {}), at: kind === "talk" ? [{ hotel: "x_hotel" }] : [],
  ...(kind === "talk" ? { priority: 1 } : {}), order: 0, repeat: "once", people: [], options, done, conds: [], knots: [id], fingerprint: "test", origin: "place" });
const option = (id: string, tags: Omit<SceneOption, "id" | "knot"> = {}): SceneOption => ({ id, knot: "k", ...tags });
const profile = { id: "warm", baseChance: 50, positive: { affection: [1, 3], trust: [0, 1], spark: [1, 1] }, negative: { affection: [-1, 0], trust: [-1, 0], spark: [0, 0] } } as const;

const date = scene("x_date_park", "date", [option("joke", { profile: "warm" }), option("tea", { money: -20, rel: { trust: 1 } }), option("walk", { rel: { affection: 1 } })],
  { money: -30 }, { date: "x_date_park" });
const input: BalanceInput = {
  journey: { id: "x_trip", nameJa: "見本の旅", cities: [{ id: "x", nameJa: "見本の街" }], initialBudget: 1000, currency: { code: "XXX", symbol: "¤" },
    initialState: { ap: 1, affection: 0, trust: 0, spark: 0 } },
  cities: [{ cityId: "x", initialBudget: 0, hotelPlaceId: "x_hotel", lodgingCost: 0,
    places: [{ id: "x_hotel", nameJa: "宿" }, { id: "x_tower", nameJa: "塔" }, { id: "x_park", nameJa: "公園" }, { id: "x_ruin", nameJa: "遺跡", access: "tour" }],
    events: [{ id: "x_main_tower", placeId: "x_tower", category: "main", titleJa: "塔", admissionCost: 100 },
      { id: "x_main_ruin", placeId: "x_ruin", category: "main", titleJa: "遺跡", admissionCost: 50 },
      { id: "x_date_park", placeId: "x_park", category: "date", titleJa: "公園" }],
    routes: [{ fromPlaceId: "x_hotel", toPlaceId: "x_tower", mode: "walk", cost: 0 }, { fromPlaceId: "x_hotel", toPlaceId: "x_tower", mode: "taxi", cost: 40 },
      { fromPlaceId: "x_tower", toPlaceId: "x_hotel", mode: "taxi", cost: 60 }, { fromPlaceId: "x_hotel", toPlaceId: "x_park", mode: "taxi", cost: 10 },
      { fromPlaceId: "x_park", toPlaceId: "x_hotel", mode: "taxi", cost: 10 }] }],
  tours: [{ id: "x_tour_ruin", cityId: "x", titleJa: "遺跡ツアー", offers: [{ id: "desk", sellerJa: "宿", price: 300 }, { id: "web", sellerJa: "サイト", price: 350 }],
    steps: [{ kind: "leg" }, { kind: "event", eventId: "x_main_ruin" }, { kind: "leg" }] }],
  scenes: [date, scene("x_main_tower_battle", "battle", [], { money: -200, items: ["x_cup"] }, { battle: "x_main_tower_battle" }),
    scene("x_hotel_talk", "talk", [option("pay", { money: -500 }), option("refuse", { rel: { trust: -1 } })])],
  episodes: [{ id: "x_main_tower", cityId: "x" }],
  rewards: [{ id: "x_main_tower_clear", episodeId: "x_main_tower", trigger: "episode_clear", ap: 2, titleJa: "クリア" },
    { id: "x_main_tower_score", episodeId: "x_main_tower", trigger: "battle_score", ap: 1, titleJa: "得点" }],
  dates: [{ id: "x_date_park", chapterId: "x", kind: "normal", apCost: 2, titleJa: "公園" }],
  romance: { stages: [{ stage: 1, minAffection: 0, minTrust: 0, minSpark: 0, minCompletedDates: 0 }, { stage: 2, minAffection: 1, minTrust: 0, minSpark: 0, minCompletedDates: 1 }],
    confession: { minAffection: 4, minTrust: 1, minSpark: 1, minCompletedDates: 1 } },
  profiles: [profile], apCap: 12, items: [{ id: "x_cup", nameJa: "茶碗" }],
  // The date has two choice points: joke or tea first, then walk or nothing.
  paths: { x_date_park: { paths: [["joke", "walk"], ["tea", "walk"], ["joke"], ["tea"]] } },
};

describe("balance:report", () => {
  it("takes one path's options and the scene's end, a profile at either end of its ranges", () => {
    const balance = sceneBalance(date, "date", input);
    expect(balance.money).toEqual({ min: -50, max: -30 });
    expect(balance.rel.affection).toEqual({ min: -1, max: 4 });
    expect(balance.rel.trust).toEqual({ min: -1, max: 1 });
    expect(balance.rel.spark).toEqual({ min: 0, max: 1 });
    // The profile's mean at 50%: affection 0.5 × 2 + 0.5 × −0.5 = 0.75, plus the walk's +1.
    expect(balance.expected.affection).toEqual({ min: 0, max: 1.75 });
    // Without walked paths, the options are one choice point.
    expect(sceneBalance({ ...date, id: "unwalked" }, "date", input).rel.affection).toEqual({ min: -1, max: 3 });
  });

  it("counts a round trip's cheapest and dearest fares, a tour once at its offers, and the scenes' payments", () => {
    expect(hotelRoundTrip(input.cities[0], "x_tower")).toEqual({ min: 60, max: 100 });
    expect(hotelRoundTrip(input.cities[0], "x_ruin")).toBeUndefined();
    const report = journeyBalance(input);
    const [city] = report.cities;
    expect(city.events.find((event) => event.id === "x_main_ruin")?.cost).toEqual({ min: 300, max: 350 });
    expect(city.spend).toMatchObject({ mainVisits: { min: 460, max: 550 }, mainScenes: { min: 200, max: 200 }, dateVisits: { min: 20, max: 20 },
      dateScenes: { min: 30, max: 50 }, inserted: { min: 0, max: 500 } });
    expect(report.spend).toEqual({ min: 710, max: 1320 });
    expect(report.budget).toBe(1000);
    // AP: the starting AP and the sure rewards at the least, the score reward too at the most, less the date.
    expect(city.ap.gained).toEqual({ min: 3, max: 4 });
    expect(city.ap.left).toEqual({ min: 1, max: 2 });
  });

  it("tells where a romance threshold can be met, by the expected change and never for sure", () => {
    const [stage2, confession] = journeyBalance(input).thresholds;
    expect(stage2).toMatchObject({ label: "段階2", reachableIn: "x", expectedBestIn: "x" });
    expect(stage2.alwaysIn).toBeUndefined();
    expect(confession).toMatchObject({ label: "告白の成功", reachableIn: "x" });
    expect(confession.expectedBestIn).toBeUndefined();
    const text = formatJourneyBalance(input, journeyBalance(input)).join("\n");
    expect(text).toContain("| 見本の街 | ¤460〜¤550 | ¤200 | ¤20 | ¤30〜¤50 | ¤0〜¤500 | ¤0 | ¤710〜¤1,320 |");
    expect(text).toContain("# on_done: | −¤200 |  | 茶碗 |");
  });

  it("finds the option IDs of every path through an Ink knot", () => {
    const compiled = compileInk(["EXTERNAL cond(text)",
      "=== x_date_park ===", "一つ目。",
      "* [冗談 # option: joke] -> second", "* [お茶 # option: tea] -> second",
      "= second", "{ cond(\"flag x_rain\"): 雨。 }",
      "* [歩く # option: walk] -> END", "* [黙る] -> END",
    ].join("\n"));
    const walked = walkOptionPaths({ compiled, start: "x_date_park", conds: ["flag x_rain"], romance: false, itemIds: [], memoryIds: [] });
    expect(walked.truncated).toBe(false);
    expect(walked.paths.map((path) => path.join(" ")).sort()).toEqual(["joke", "joke walk", "tea", "tea walk"]);
  });
});
