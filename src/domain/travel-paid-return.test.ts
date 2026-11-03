import { describe, expect, it } from "vitest";
import { getCityContent } from "../content";
import { createGame } from "./game";
import { beginTravelEvent, getTravelEventAvailability, sleepAtHotel } from "./travel-game";

describe("a destination with no walking route home", () => {
  it("reserves the registered return fare before travel and can return to the hotel", () => {
    // Temporarily replace this one route in memory, leaving production data intact.
    const routes = getCityContent("milano").travel.routes;
    const saved = [...routes];
    try {
      const index = routes.findIndex((item) => item.fromPlaceId === "p_duomo" && item.toPlaceId === "p_hotel" && item.mode === "walk");
      expect(index).toBeGreaterThanOrEqual(0);
      const taxi = { ...routes[index], mode: "taxi" as const, cost: 10 };
      // Exclude transfer alternatives so this test has one paid route home.
      routes.splice(0, routes.length, ...saved.filter((item) => item.fromPlaceId !== "p_duomo" || item.toPlaceId === "p_duomo"), taxi);
      const initial = createGame();
      const insufficient = { ...initial, travelBudget: 9 };
      expect(getTravelEventAvailability(insufficient, "milano_duomo_episode", "walk").available).toBe(false);
      expect(beginTravelEvent(insufficient, "milano_duomo_episode", "walk", insufficient.revision)).toBe(insufficient);
      const enough = { ...initial, travelBudget: 10 };
      const started = beginTravelEvent(enough, "milano_duomo_episode", "walk", enough.revision);
      expect(started.travel.currentPlaceId).toBe("p_duomo");
      expect(started.travel.returnReserve).toBe(10);
      expect(started.travelBudget).toBe(10);
      // Once the scene is over, the already-reserved fare pays for the return.
      const afterScene = { ...started, activeTourism: null, activeBattle: null,
        travel: { ...started.travel, minute: started.travel.activeEvent!.endMinute, activeEvent: null } };
      const home = sleepAtHotel(afterScene, "taxi", afterScene.revision);
      expect(home.travel.currentPlaceId).toBe("p_hotel");
      expect(home.travelBudget).toBe(0);
      expect(home.travel.day).toBe(2);
    } finally {
      routes.splice(0, routes.length, ...saved);
    }
  });
});
