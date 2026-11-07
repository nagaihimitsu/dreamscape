// Milano's in-city transport (user decisions 15 and M1–M5, research p4/transport-milano.md, 3rd edition):
// walking, tram (lines 24 and 16, 8 directions) and taxi (plan B, 14 directions); the old rail and bus routes are gone.
import { describe, expect, it } from "vitest";
import { getCityContent } from "../../../src/content";
import { getJourney } from "../../../src/content/journeys";
import { inspectJourneyTransit } from "../../../scripts/journey-transit";

const { travel } = getCityContent("milano");
const pairs = (mode: string) => travel.routes.filter((route) => route.mode === mode && route.fromPlaceId !== route.toPlaceId)
  .map((route) => `${route.fromPlaceId}>${route.toPlaceId}`).sort();

describe("Milano transport", () => {
  it("declares tram and taxi besides walking, and no route uses another mode", () => {
    expect(getJourney("milano")!.transportModes).toEqual([
      { id: "tram", nameJa: "路面電車", movingJa: "路面電車で移動中", kind: "tram" },
      { id: "taxi", nameJa: "タクシー", movingJa: "タクシーで移動中", kind: "car" },
    ]);
    expect([...new Set(travel.routes.map((route) => route.mode))].sort()).toEqual(["taxi", "tram", "walk"]);
  });

  it("has the decided tram routes: 24 Duomo⇄Prada and hotel⇄Prada, 16 Duomo⇄Last Supper and hotel⇄Last Supper (M2), 5 € for two (M5)", () => {
    expect(pairs("tram")).toEqual(["p_duomo>p_prada", "p_duomo>p_supper", "p_hotel>p_prada", "p_hotel>p_supper",
      "p_prada>p_duomo", "p_prada>p_hotel", "p_supper>p_duomo", "p_supper>p_hotel"]);
    const tram = (from: string, to: string) => travel.routes.find((route) => route.mode === "tram" && route.fromPlaceId === from && route.toPlaceId === to)!;
    // The longer of the weekday and Sunday estimates, rounded up (M3), from the unrounded estimates:
    // the Last Supper → hotel Sunday estimate is 2 + 480 / 33 / 2 + 6.75 + 1 = 17.02 min (shown as
    // 17.0 in the research's one-decimal table), so 18, not 17.
    expect([tram("p_duomo", "p_prada").minutes, tram("p_prada", "p_duomo").minutes, tram("p_hotel", "p_prada").minutes, tram("p_prada", "p_hotel").minutes])
      .toEqual([35, 35, 40, 38]);
    expect([tram("p_duomo", "p_supper").minutes, tram("p_supper", "p_duomo").minutes, tram("p_hotel", "p_supper").minutes, tram("p_supper", "p_hotel").minutes])
      .toEqual([22, 23, 18, 18]);
    for (const route of travel.routes.filter((item) => item.mode === "tram")) {
      expect(route.cost).toBe(5);
      expect(route.transferNote).toMatch(route.fromPlaceId === "p_prada" || route.toPlaceId === "p_prada" ? /^24番・ミッソーリ/u : /^16番$/u);
    }
    // Line 24 has no Duomo stop: it is boarded at Missori (the corrected stop record).
    expect(tram("p_duomo", "p_prada").transferNote).toBe("24番・ミッソーリから乗る");
  });

  it("has the plan B taxis only: hotel and Duomo to and from the four far places, 14 directions (M1), one daytime fare (M4)", () => {
    const far = ["p_darsena", "p_navigli", "p_prada", "p_supper"];
    const expected = ["p_duomo", "p_hotel"].flatMap((near) => far.flatMap((place) => [`${near}>${place}`, `${place}>${near}`]))
      .filter((pair) => pair !== "p_hotel>p_supper" && pair !== "p_supper>p_hotel").sort();
    expect(pairs("taxi")).toEqual(expected);
    expect(pairs("taxi")).toHaveLength(14);
    const taxi = (from: string, to: string) => travel.routes.find((route) => route.mode === "taxi" && route.fromPlaceId === from && route.toPlaceId === to)!;
    expect([taxi("p_duomo", "p_prada").minutes, taxi("p_duomo", "p_prada").cost]).toEqual([19, 13]);
    expect([taxi("p_prada", "p_hotel").minutes, taxi("p_prada", "p_hotel").cost]).toEqual([26, 17]);
    expect(taxi("p_duomo", "p_supper").transferNote).toBe("近くの車道から乗り、ルッフィーニ通りで降りる");
  });

  it("supports every tram and taxi route with a documented fact and a game estimate, and keeps a ready ledger", () => {
    for (const route of travel.routes.filter((item) => item.mode !== "walk")) {
      expect(route.estimation).toBe("game_model");
      expect(route.sources.some((source) => source.claimType === "documented_fact")).toBe(true);
      expect(route.sources.some((source) => source.claimType === "hypothesis")).toBe(true);
      // The pages that answered 403 are no longer cited.
      expect(route.sources.some((source) => /fondazioneprada|www\.comune\.milano\.it|yesmilano|rome2rio/u.test(source.url))).toBe(false);
    }
    expect(inspectJourneyTransit(process.cwd(), "milano")).toMatchObject({ modes: ["tram", "taxi"], cities: [{ cityId: "milano", directions: 182,
      decisions: 364, ready: true, unsupportedRoutes: [],
      counts: { tram: { available: 8, not_suitable: 174, not_applicable: 0, inconclusive: 0 }, taxi: { available: 14, not_suitable: 168, not_applicable: 0, inconclusive: 0 } } }] });
  });
});
