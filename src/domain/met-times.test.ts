// When and where each person was first met (2026-11-26 user decision; met-times.ts): the action that first lists a person
// records the city, its day, the minute and the place. The sample journey's fictional 見本の街 declares リリ (the bookmark
// stall) and トーマ (the clock tower's talks); its market quiz's partner サラ is that quiz's own.
import { describe, expect, it } from "vitest";
import { getCityContent } from "../content";
import { cityStart } from "../dev/scenario-builders";
import { validateGameState, type GameState } from "./game";
import { metTimeOf } from "./met-times";
import { applyPlayerAction } from "./player-action";

const SAMPLE = "mihon";
const LILI = "smp_mihon_lili";
const TOMA = "smp_mihon_toma";
const start = (): GameState => cityStart(SAMPLE, ["航", "澪"]);
const otherPlace = (state: GameState) => getCityContent(SAMPLE).travel.places.find((place) => place.id !== state.travel.hotelPlaceId)!.id;
/** An action that finishes the encounter `id` at `placeId`, on day `day` at `minute`. */
const see = (id: string, at: { placeId: string; day: number; minute: number }) => (state: GameState): GameState => ({
  ...state, revision: state.revision + 1, seenEncounterIds: [...state.seenEncounterIds, id],
  travel: { ...state.travel, currentPlaceId: at.placeId, day: at.day, minute: at.minute },
});

describe("when and where each person was first met", () => {
  it("records the city, day, minute and place of the action that first meets a person, once", () => {
    const initial = start();
    const placeId = otherPlace(initial);
    const met = applyPlayerAction(initial, see("smp_mihon_bookmark_stall", { placeId, day: 2, minute: 14 * 60 + 20 }));
    expect(metTimeOf(met, LILI)).toEqual({ id: LILI, cityId: SAMPLE, day: 2, minute: 14 * 60 + 20, placeId });
    expect(validateGameState(met).metTimes).toEqual(met.metTimes);
    // Met again later (トーマ's talk, then the stall's scene again): only トーマ is new; リリ keeps her first time.
    const later = applyPlayerAction(met, see("smp_mihon_clock_gears", { placeId: initial.travel.hotelPlaceId, day: 3, minute: 600 }));
    expect(later.metTimes?.map((item) => item.id)).toEqual([...(initial.metTimes ?? []).map((item) => item.id), LILI, TOMA]);
    expect(metTimeOf(later, LILI)?.day).toBe(2);
    expect(metTimeOf(later, TOMA)).toMatchObject({ day: 3, minute: 600, placeId: initial.travel.hotelPlaceId });
  });

  it("records a quiz's own partner by the quiz", () => {
    const initial = start();
    const played = applyPlayerAction(initial, (state) => ({ ...state, revision: state.revision + 1,
      battleRecords: [{ battleId: "smp_mihon_special_b_market", attempts: 1, firstScore: 1, bestScore: 1, lastScore: 1 }] }));
    expect(metTimeOf(played, "quiz:smp_mihon_special_b_market")).toMatchObject({ cityId: SAMPLE, placeId: initial.travel.currentPlaceId });
  });

  it("never gives the people a save had met before it kept times the time of a later action", () => {
    const { metTimes: _none, ...old } = { ...start(), seenEncounterIds: ["smp_mihon_bookmark_stall"] };
    const next = applyPlayerAction(old, see("smp_mihon_clock_gears", { placeId: old.travel.hotelPlaceId, day: 1, minute: 700 }));
    expect(metTimeOf(next, LILI)).toBeUndefined();
    expect(next.metTimes?.map((item) => item.id)).toEqual([TOMA]);
  });

  it("refuses a save whose record names a person, city or place this build does not know", () => {
    const state = applyPlayerAction(start(), see("smp_mihon_bookmark_stall", { placeId: otherPlace(start()), day: 1, minute: 600 }));
    const record = metTimeOf(state, LILI)!;
    for (const wrong of [{ id: "smp_mihon_nobody" }, { cityId: "delhi" }, { placeId: "nowhere" }])
      expect(() => validateGameState({ ...state, metTimes: [{ ...record, ...wrong }] })).toThrow();
    expect(() => validateGameState({ ...state, metTimes: [record, record] })).toThrow();
  });
});
