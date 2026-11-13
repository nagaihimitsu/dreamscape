// 「行った場所」 on the city maps (2026-11-11 user decision): which places the existing records say the party has been
// to, in the sample journey's fictional 見本の街 (hotel, clock tower, market, library).
import { describe, expect, it } from "vitest";
import { encounters } from "../../content/encounters";
import { cityStart } from "../../dev/scenario-builders";
import type { GameState } from "../../domain/game";
import { trailPlaceIds, visitedPlaceIds } from "./visited-places";

const SAMPLE = "mihon";
const start = () => cityStart(SAMPLE);
const travel = (state: GameState, change: Partial<GameState["travel"]>): GameState => ({ ...state, travel: { ...state.travel, ...change } });

describe("the places the party has been to", () => {
  it("is the hotel alone when the city starts", () => {
    expect(visitedPlaceIds(start())).toEqual(["mihon_hotel"]);
  });

  it("adds where the party is and the places moved to today, in the city's place order", () => {
    expect(visitedPlaceIds(travel(start(), { todayPlaceIds: ["mihon_library", "mihon_market"] })))
      .toEqual(["mihon_hotel", "mihon_market", "mihon_library"]);
    expect(visitedPlaceIds(travel(start(), { currentPlaceId: "mihon_market" }))).toEqual(["mihon_hotel", "mihon_market"]);
  });

  it("keeps the places of earlier days through their landmarks, guides, dates and map events", () => {
    const state = start();
    expect(visitedPlaceIds({ ...state, visitedLandmarkIds: ["mihon_library"] })).toEqual(["mihon_hotel", "mihon_library"]);
    expect(visitedPlaceIds({ ...state, completedGuideIds: ["mihon_market"] })).toEqual(["mihon_hotel", "mihon_market"]);
    // The date's destination (the tower square) is at the clock tower; so is its map event.
    expect(visitedPlaceIds({ ...state, playedDateIds: ["smp_mihon_date_tower_square"] })).toEqual(["mihon_hotel", "mihon_clock_tower"]);
    expect(visitedPlaceIds({ ...state, completedEpisodeIds: ["smp_mihon_main_clock_tower"] })).toEqual(["mihon_hotel", "mihon_clock_tower"]);
    const record = { battleId: "smp_mihon_special_b_market", attempts: 1, firstScore: 1, bestScore: 1, lastScore: 1 };
    expect(visitedPlaceIds({ ...state, battleRecords: [record] })).toEqual(["mihon_hotel", "mihon_market"]);
  });

  it("counts an encounter seen at a landmark's visit, and not one never seen", () => {
    const seen = encounters.encounters.find((encounter) => encounter.id === "smp_mihon_clock_gears");
    expect(seen?.landmarkId).toBe("mihon_clock_tower");
    expect(visitedPlaceIds({ ...start(), seenEncounterIds: ["smp_mihon_clock_gears"] })).toEqual(["mihon_hotel", "mihon_clock_tower"]);
    expect(visitedPlaceIds({ ...start(), seenEncounterIds: [] })).toEqual(["mihon_hotel"]);
  });

  it("leaves on the map's trail only the places been to that the map marks no other way", () => {
    const state = { ...travel(start(), { currentPlaceId: "mihon_market" }), visitedLandmarkIds: ["mihon_library"] };
    // The hotel and the market are marked as the hotel and the current place; the clock tower has an open event.
    expect(trailPlaceIds(state, ["mihon_hotel", "mihon_market", "mihon_clock_tower"])).toEqual(["mihon_library"]);
    expect(trailPlaceIds(state, ["mihon_hotel", "mihon_market", "mihon_library"])).toEqual([]);
  });
});
