import { describe, expect, it } from "vitest";
import { getCityContent } from "../content";
import { createGame } from "./game";
import { beginTravelEvent, finishTravelEventIfComplete, getTravelEventAvailability, sleepAtHotel, waitForTravel } from "./travel-game";
import { closeTourism } from "./tourism";
import { loadGame, saveGame, type StorageLike } from "../persistence";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

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
      const afterScene = { ...started, activeTourism: null, activeBattle: null, occasion: null,
        travel: { ...started.travel, minute: started.travel.activeEvent!.endMinute, activeEvent: null } };
      const home = sleepAtHotel(afterScene, "taxi", afterScene.revision);
      expect(home.travel.currentPlaceId).toBe("p_hotel");
      expect(home.travelBudget).toBe(0);
      expect(home.travel.day).toBe(2);
    } finally {
      routes.splice(0, routes.length, ...saved);
    }
  });

  it("reserves, reloads and pays the chosen cheaper connection without substituting a direct route", () => {
    const routes = getCityContent("milano").travel.routes;
    const saved = [...routes];
    try {
      const template = saved.find((item) => item.fromPlaceId === "p_duomo" && item.toPlaceId === "p_hotel" && item.mode === "walk")!;
      expect(saved.some((item) => item.fromPlaceId === "p_galleria" && item.toPlaceId === "p_hotel" && item.mode === "walk" && item.minutes === 5)).toBe(true);
      const direct = { ...template, mode: "taxi" as const, minutes: 10, cost: 10 };
      const connection = { ...template, toPlaceId: "p_galleria", mode: "taxi" as const, minutes: 15, cost: 4 };
      routes.splice(0, routes.length, ...saved.filter((item) => item.fromPlaceId !== "p_duomo" || item.toPlaceId === "p_duomo"), direct, connection);

      const base = { ...createGame(), travelBudget: 4 };
      const availability = getTravelEventAvailability(base, "milano_duomo_episode", "walk");
      expect(availability.available).toBe(true);
      expect(availability.plan?.returnReserve).toBe(4);
      const started = beginTravelEvent(base, "milano_duomo_episode", "walk", base.revision);
      expect(started.travel.returnReserve).toBe(4);
      const storage = new MemoryStorage();
      expect(saveGame(storage, started).ok).toBe(true);
      const loaded = loadGame(storage);
      if (loaded.status !== "loaded") throw new Error("Expected active travel to load");
      expect(loaded.state).toEqual(started);
      expect(beginTravelEvent(loaded.state, "milano_duomo_episode", "walk", base.revision)).toBe(loaded.state);
      const complete = finishTravelEventIfComplete(loaded.state, closeTourism(loaded.state, loaded.state.revision));
      const waited = waitForTravel(complete, 30, complete.revision);
      expect(waited.travel.returnReserve).toBe(4);
      expect(saveGame(storage, waited, started).ok).toBe(true);
      const resumed = loadGame(storage);
      if (resumed.status !== "loaded") throw new Error("Expected return reservation to load");
      expect(sleepAtHotel(resumed.state, "taxi", resumed.state.revision, null)).toBe(resumed.state);
      expect(sleepAtHotel(resumed.state, "taxi", resumed.state.revision, "missing_place")).toBe(resumed.state);
      const home = sleepAtHotel(resumed.state, "taxi", resumed.state.revision, "p_galleria");
      expect(home.travel.currentPlaceId).toBe("p_hotel");
      expect(home.travelBudget).toBe(0);
      expect(home.travel.day).toBe(2);
      expect(sleepAtHotel(home, "taxi", resumed.state.revision, "p_galleria")).toBe(home);
      expect(saveGame(storage, home, resumed.state).ok).toBe(true);
      expect(loadGame(storage)).toEqual({ status: "loaded", state: home });

      // With enough money, explicit direct and via selections charge exactly
      // the displayed fare; the older mode-only call keeps choosing the fastest feasible route.
      const funded = { ...resumed.state, travelBudget: 20 };
      expect(sleepAtHotel(funded, "taxi", funded.revision, null).travelBudget).toBe(0);
      expect(sleepAtHotel(funded, "taxi", funded.revision, "p_galleria").travelBudget).toBe(6);
      expect(sleepAtHotel(funded, "taxi", funded.revision).travelBudget).toBe(0);
      expect(sleepAtHotel(resumed.state, "taxi", resumed.state.revision).travel.currentPlaceId).toBe("p_hotel");

      // The slow return is unaffordable in time, not just in money.
      const late = { ...funded, travel: { ...funded.travel, minute: 20 * 60 + 45, returnReserve: 10 } };
      expect(sleepAtHotel(late, "taxi", late.revision, "p_galleria")).toBe(late);
      expect(sleepAtHotel(late, "taxi", late.revision, null).travel.currentPlaceId).toBe("p_hotel");
      const nearClose = { ...createGame(), travelBudget: 10, travel: { ...createGame().travel, minute: 19 * 60 + 27 } };
      expect(getTravelEventAvailability(nearClose, "milano_duomo_episode", "walk").plan?.returnReserve).toBe(10);
    } finally {
      routes.splice(0, routes.length, ...saved);
    }
  });
});

describe("the reason of a destination that no way home lets the party take", () => {
  // In memory: from the Duomo, a slow walk home (60 min) and a fast taxi (10 min, 10).
  function withWaysHome(check: () => void) {
    const routes = getCityContent("milano").travel.routes;
    const saved = [...routes];
    try {
      const walk = saved.find((item) => item.fromPlaceId === "p_duomo" && item.toPlaceId === "p_hotel" && item.mode === "walk")!;
      routes.splice(0, routes.length, ...saved.filter((item) => item.fromPlaceId !== "p_duomo" || item.toPlaceId !== "p_hotel"),
        { ...walk, minutes: 60 }, { ...walk, mode: "taxi" as const, minutes: 10, cost: 10 });
      check();
    } finally {
      routes.splice(0, routes.length, ...saved);
    }
  }
  const at = (minute: number, travelBudget: number) => ({ ...createGame(), travelBudget, travel: { ...createGame().travel, minute } });
  // Leaving the hotel at 19:28, the visit (a 7-minute walk there, 75 minutes) ends at 20:50: the taxi is home by 21:00.
  const lastTaxi = 19 * 60 + 28;

  it("names both when the walk home is too late and the taxi, in time, too dear", () => withWaysHome(() => {
    expect(getTravelEventAvailability(at(lastTaxi, 9), "milano_duomo_episode", "walk")).toEqual({ available: false,
      reason: "今日はホテルへの帰路を含めると時間が足りません（速い乗り物で帰るには予算が足りません）。" });
    expect(getTravelEventAvailability(at(lastTaxi, 10), "milano_duomo_episode", "walk").plan?.returnReserve).toBe(10);
  }));

  it("names the time alone when the taxi would be late too, whatever the money", () => withWaysHome(() => {
    expect(getTravelEventAvailability(at(lastTaxi + 1, 9), "milano_duomo_episode", "walk")).toEqual({ available: false,
      reason: "今日はホテルへの帰路を含めると時間が足りません。" });
    expect(getTravelEventAvailability(at(lastTaxi + 1, 10), "milano_duomo_episode", "walk").available).toBe(false);
  }));
});
