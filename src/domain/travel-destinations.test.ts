import { describe, expect, it } from "vitest";
import { createGame } from "./game";
import { beginTravelEvent, getTravelEventAvailability, isCompletedTravelEvent, isTravelEventUnlocked, isUnclearedMainTravelEvent, getTravelSleepOptions, sleepAtHotel } from "./travel-game";
import { getNextTravelWaitTime, getTravelDestinations } from "./travel-destinations";
import { groupDestinationEvents, selectNearbyDestinations } from "./travel";

describe("main travel event completion", () => {
  it("does not offer or restart completed episodes, special battles or ordinary dates", () => {
    const initial = createGame();
    expect(isUnclearedMainTravelEvent(initial, "milano_duomo_episode")).toBe(true);
    expect(isUnclearedMainTravelEvent(initial, "milano_la_scala_b01")).toBe(true);
    expect(isUnclearedMainTravelEvent(initial, "milano_walk_01")).toBe(false);
    const completed = {
      ...initial,
      completedEpisodeIds: ["milano_duomo_episode"],
      battleRecords: [{ battleId: "milano_la_scala_b01", attempts: 1, firstScore: 0, bestScore: 0, lastScore: 0 }],
      playedDateIds: ["milano_cafe_01"],
    };
    expect(isUnclearedMainTravelEvent(completed, "milano_duomo_episode")).toBe(false);
    expect(isUnclearedMainTravelEvent(completed, "milano_la_scala_b01")).toBe(false);
    for (const id of ["milano_duomo_episode", "milano_la_scala_b01", "milano_cafe_01"]) {
      expect(isCompletedTravelEvent(completed, id)).toBe(true);
      expect(getTravelEventAvailability(completed, id, "walk").available).toBe(false);
      expect(beginTravelEvent(completed, id, "walk", completed.revision)).toBe(completed);
    }
    expect(isCompletedTravelEvent({ ...initial, playedDateIds: ["milano_confession_01", "milano_recovery_01"] }, "milano_confession_01")).toBe(false);
    expect(isCompletedTravelEvent({ ...initial, playedDateIds: ["milano_confession_01", "milano_recovery_01"] }, "milano_recovery_01")).toBe(false);
  });

  it("counts an unlocked, uncompleted finale as the guaranteed main event", () => {
    const initial = createGame();
    expect(isTravelEventUnlocked(initial, "milano_finale")).toBe(false);
    const ready = {
      ...initial,
      completedEpisodeIds: ["milano_duomo_episode", "milano_galleria_episode", "milano_last_supper_episode", "milano_castello_episode"],
      battleRecords: ["milano_la_scala_b01", "milano_brera_c01"].map((battleId) => ({ battleId, attempts: 1, firstScore: 0, bestScore: 0, lastScore: 0 })),
    };
    expect(isTravelEventUnlocked(ready, "milano_finale")).toBe(true);
    expect(isUnclearedMainTravelEvent(ready, "milano_finale")).toBe(true);
    expect(getTravelEventAvailability(ready, "milano_finale", "walk").available).toBe(true);
    const dates = Array.from({ length: 5 }, (_, i) => ({ id: `date_${i}`, placeId: `place_${i}`, category: "date" as const, walkMinutes: i + 1, available: true, unclearedMain: false }));
    const finale = { id: "milano_finale", placeId: "p_darsena", category: "main" as const, walkMinutes: 30, available: true, unclearedMain: isUnclearedMainTravelEvent(ready, "milano_finale") };
    const result = selectNearbyDestinations(groupDestinationEvents([...dates, finale]));
    expect(result.nearby[4].id).toBe("p_darsena");
    expect(result.recommendedMainId).toBe("p_darsena");
    expect(isUnclearedMainTravelEvent({ ...ready, completedEpisodeIds: [...ready.completedEpisodeIds, "milano_finale"] }, "milano_finale")).toBe(false);
  });
});


describe("travel menu planning", () => {
  it("keeps an unvisited destination and its route while hiding a completed event", () => {
    const initial = createGame();
    const state = { ...initial, completedEpisodeIds: ["milano_galleria_episode"] };
    const before = structuredClone(state);
    const menu = getTravelDestinations(state);
    expect(menu.current?.id).toBe("p_hotel");
    expect(menu.candidates.some((event) => event.id === "milano_galleria_episode")).toBe(false);
    const duomo = menu.candidates.find((event) => event.id === "milano_duomo_episode");
    expect(duomo).toMatchObject({ placeId: "p_duomo", walkMinutes: 7, available: true });
    expect(duomo?.routes).toContainEqual(expect.objectContaining({ fromPlaceId: "p_hotel", toPlaceId: "p_duomo", mode: "walk", minutes: 7, cost: 0 }));
    expect(menu.places.find((place) => place.id === "p_duomo")?.events).toContain(duomo);
    expect(state).toEqual(before);
  });

  it("offers the evening wait shortcut but no shortcut past closing time", () => {
    const initial = createGame();
    expect(getNextTravelWaitTime({ ...initial, travel: { ...initial.travel, minute: 18 * 60 - 1 } })).toBe(18 * 60);
    expect(getNextTravelWaitTime({ ...initial, travel: { ...initial.travel, minute: 21 * 60 } })).toBeNull();
  });

  it("uses the displayed overnight plan when returning too late for ordinary travel", () => {
    const initial = createGame();
    const state = { ...initial, travel: { ...initial.travel, currentPlaceId: "p_duomo", minute: 21 * 60 - 1 } };
    const option = getTravelSleepOptions(state).find(({ route }) => route.mode === "walk" && !route.viaPlaceId)!;
    expect(option.plan.ok).toBe(true);
    if (!option.plan.ok) throw new Error("Expected an emergency return plan");
    const rested = sleepAtHotel(state, option.route.mode, state.revision, null);
    expect(rested.travelBudget).toBe(option.plan.remainingBudget);
    expect(rested.travel).toMatchObject({ currentPlaceId: "p_hotel", day: option.plan.nextDay, minute: option.plan.nextMinute });
    expect(rested.revision).toBe(state.revision + 1);
  });
});
