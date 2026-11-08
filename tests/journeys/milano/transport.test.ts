// Milano's in-city transport (user decisions 15 and M1–M5, research p4/transport-milano.md, 3rd edition):
// walking, tram (lines 24 and 16, 8 directions) and taxi (plan B, 14 directions); the old rail and bus routes are gone.
import { describe, expect, it } from "vitest";
import { getCityContent } from "../../../src/content";
import { getJourney } from "../../../src/content/journeys";
import { inspectJourneyTransit } from "../../../scripts/journey-transit";
import { playBattleToResult } from "../../../src/dev/scenario-builders";
import { leaveBattleResult } from "../../../src/domain/chapter";
import { createGame, validateGameState, type GameState } from "../../../src/domain/game";
import { closeTourism, skipTourismGuide, startTourismBattle } from "../../../src/domain/tourism";
import { beginTravelEvent, finishTravelEventIfComplete, getTravelHomeRoutes, observeLocalLandmark, sleepAtHotel } from "../../../src/domain/travel-game";
import { composeHomeRoutes } from "../../../src/domain/travel-routes";
import { loadGame, saveGame, type StorageLike } from "../../../src/persistence";
import { zodIssues } from "../../fixtures/zod-issues";

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

  it("offers 19 ways home in 休む over the 13 places (rule a, user answer 5: 23 without it), one detour left", () => {
    const state = createGame();
    const hotel = state.travel.hotelPlaceId;
    const places = travel.places.filter((place) => place.id !== hotel);
    const lists = places.map((place) => getTravelHomeRoutes({ ...state, travel: { ...state.travel, currentPlaceId: place.id } }, place.id));
    expect(places).toHaveLength(13);
    expect(lists.flat()).toHaveLength(19);
    expect(places.reduce((sum, place) => sum + composeHomeRoutes(travel.routes, place.id, hotel).length, 0)).toBe(23);
    // The Duomo and the Last Supper lose their detours (not faster than walking home); Prada keeps the taxi to the
    // Duomo and the walk from there (28 min, 14 €: faster than walking, 46 min, and cheaper than the direct taxi, 17 €).
    expect(lists.flat().filter((option) => option.viaPlaceId).map((option) => `${option.fromPlaceId} ${option.mode} via ${option.viaPlaceId} ${option.minutes} ${option.cost}`))
      .toEqual(["p_prada taxi via p_duomo 28 14"]);
    expect(lists[places.findIndex((place) => place.id === "p_duomo")].map((option) => option.mode)).toEqual(["walk"]);
    expect(lists[places.findIndex((place) => place.id === "p_supper")].map((option) => option.mode)).toEqual(["tram", "walk"]);
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

  it("counts a tram ride that changes place (saved, kept overnight), never a walk or the ride home, and refuses undeclared counts", () => {
    /** Saved to and loaded from a slot of its own (the steps below branch from the same state). */
    const roundTrip = (state: GameState) => {
      const values = new Map<string, string>();
      const storage: StorageLike = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
      expect(saveGame(storage, state)).toEqual({ ok: true });
      expect(loadGame(storage)).toEqual({ status: "loaded", state });
      return state;
    };
    const start = createGame();
    expect(start.travel.rideCounts).toEqual({});
    expect(beginTravelEvent(start, "milano_duomo_episode", "walk", start.revision).travel.rideCounts).toEqual({});
    let state = roundTrip(beginTravelEvent(start, "milano_last_supper_episode", "tram", start.revision));
    expect(state.travel).toMatchObject({ currentPlaceId: "p_supper" });
    expect(state.travel.rideCounts).toEqual({ tram: 1 });
    // The visit to its result and back to free time; observing it again here is on foot.
    state = skipTourismGuide(state, state.revision);
    state = playBattleToResult(startTourismBattle(state, state.revision));
    state = roundTrip(leaveBattleResult(state, state.revision));
    expect(state.travel).toMatchObject({ currentPlaceId: "p_supper" });
    expect(state.travel.rideCounts).toEqual({ tram: 1 });
    // The ride home by tram is not counted, and the count stays in the city overnight.
    const slept = roundTrip(sleepAtHotel(state, "tram", state.revision));
    expect(slept.travel).toMatchObject({ currentPlaceId: "p_hotel", day: 2 });
    expect(slept.travel.rideCounts).toEqual({ tram: 1 });
    // A second tram ride (line 16 from the Last Supper to the Duomo) counts on.
    const again = roundTrip(beginTravelEvent(state, "milano_duomo_episode", "tram", state.revision));
    expect(again.travel).toMatchObject({ currentPlaceId: "p_duomo" });
    expect(again.travel.rideCounts).toEqual({ tram: 2 });
    // Leaving the Duomo's observation halfway and observing it again from here starts it on foot: no ride.
    let duomo = skipTourismGuide(again, again.revision);
    duomo = finishTravelEventIfComplete(duomo, closeTourism(duomo, duomo.revision));
    expect(duomo.travel.activeEvent).toBeNull();
    const local = roundTrip(observeLocalLandmark(duomo, "duomo_milano", duomo.revision));
    expect(local.activeTourism?.landmarkId).toBe("duomo_milano");
    expect(local.travel).toMatchObject({ currentPlaceId: "p_duomo" });
    expect(local.travel.rideCounts).toEqual({ tram: 2 });
    const tampered = (rideCounts: Record<string, number>) => ({ ...state, travel: { ...state.travel, rideCounts } });
    expect(validateGameState(tampered({ tram: 3, taxi: 1 })).travel.rideCounts).toEqual({ tram: 3, taxi: 1 });
    // Milano's old bus and rail routes are gone (M), walking is never counted.
    for (const counts of [{ bus: 1 }, { rail: 1 }, { walk: 1 }] as Record<string, number>[])
      expect(() => validateGameState(tampered(counts)), JSON.stringify(counts)).toThrow("乗り物に乗った回数の記録が一致しません。");
    // A count is a positive whole number (the schema refuses the rest).
    for (const [counts, issue] of [
      [{ tram: 0 }, { code: "too_small", path: ["travel", "rideCounts", "tram"] }],
      [{ tram: 1.5 }, { code: "invalid_type", path: ["travel", "rideCounts", "tram"], expected: "int" }],
      [{ tram: -1 }, { code: "too_small", path: ["travel", "rideCounts", "tram"] }],
    ] as const)
      expect(() => validateGameState(tampered(counts)), JSON.stringify(counts)).toThrow(zodIssues(issue));
  });
});
