import { describe, expect, it } from "vitest";
import { getCityContent } from "../content";
import { travelEventSchema } from "../content/travel-schemas";
import { loadGame, saveGame } from "../persistence";
import { createGame } from "./game";
import { beginTravelEvent, getTravelEventAvailability, isTravelEventUnlocked } from "./travel-game";

describe("ticketed travel", () => {
  it("charges admission only on starting a scene and protects the return fare across save and load", () => {
    const { travel } = getCityContent("milano");
    const eventsBefore = [...travel.events];
    const routesBefore = [...travel.routes];
    try {
      const index = travel.events.findIndex((event) => event.id === "milano_duomo_episode");
      expect(index).toBeGreaterThanOrEqual(0);
      travel.events[index] = { ...travel.events[index], admissionCost: 20 };
      const walkHome = travel.routes.find((route) => route.fromPlaceId === "p_duomo" && route.toPlaceId === "p_hotel" && route.mode === "walk")!;
      travel.routes.splice(0, travel.routes.length,
        ...routesBefore.filter((route) => route.fromPlaceId !== "p_duomo" || route.toPlaceId === "p_duomo"),
        { ...walkHome, mode: "taxi", cost: 10 });
      const initial = { ...createGame(), travelBudget: 29 };
      const denied = getTravelEventAvailability(initial, "milano_duomo_episode", "walk");
      expect(denied.available).toBe(false);
      expect(denied.reason).toContain("入場");
      expect(beginTravelEvent(initial, "milano_duomo_episode", "walk", initial.revision)).toBe(initial);
      const enough = { ...initial, travelBudget: 30 };
      const started = beginTravelEvent(enough, "milano_duomo_episode", "walk", enough.revision);
      expect(started.travelBudget).toBe(10);
      expect(started.travel.returnReserve).toBe(10);
      expect(started.activeTourism).not.toBeNull();
      const values = new Map<string, string>();
      const storage = { getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => { values.set(key, value); } };
      expect(saveGame(storage, started).ok).toBe(true);
      const loaded = loadGame(storage);
      expect(loaded.status).toBe("loaded");
      if (loaded.status !== "loaded") throw new Error("Expected to reload the ticketed scene");
      expect(loaded.state.travelBudget).toBe(10);
      expect(beginTravelEvent(loaded.state, "milano_duomo_episode", "walk", loaded.state.revision)).toBe(loaded.state);
      expect(beginTravelEvent(started, "milano_duomo_episode", "walk", enough.revision)).toBe(started);
    } finally {
      travel.events.splice(0, travel.events.length, ...eventsBefore);
      travel.routes.splice(0, travel.routes.length, ...routesBefore);
    }
  });

  it("rejects negative or non-integral admission values", () => {
    const event = getCityContent("milano").travel.events[0];
    expect(travelEventSchema.safeParse({ ...event, admissionCost: -1 }).success).toBe(false);
    expect(travelEventSchema.safeParse({ ...event, admissionCost: 1.5 }).success).toBe(false);
  });

  it("never launches a pending event, even if it shares an existing scene ID", () => {
    const events = getCityContent("milano").travel.events;
    const index = events.findIndex((event) => event.id === "milano_duomo_episode");
    const original = events[index];
    try {
      events[index] = { ...original, contentStatus: "pending_content", admissionCost: 20 };
      const state = createGame();
      expect(isTravelEventUnlocked(state, original.id)).toBe(false);
      expect(getTravelEventAvailability(state, original.id, "walk")).toEqual({ available: false, reason: "この出来事は制作中です。" });
      expect(beginTravelEvent(state, original.id, "walk", state.revision)).toBe(state);
      expect(state.travelBudget).toBe(60);
    } finally {
      events[index] = original;
    }
  });
});
