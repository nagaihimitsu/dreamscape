import { describe, expect, it } from "vitest";
import { createGame } from "./game";
import { beginTravelEvent, getTravelEventAvailability, isCompletedTravelEvent, isTravelEventUnlocked, isUnclearedMainTravelEvent } from "./travel-game";
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
