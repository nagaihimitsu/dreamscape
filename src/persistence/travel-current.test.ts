import { describe, expect, it } from "vitest";
import { getCityContent } from "../content";
import { createGame, type GameState } from "../domain/game";
import { leaveBattle } from "../domain/battle";
import { playBattleToResult } from "../dev/scenario-builders";
import { closeTourism, openTourism, skipTourismGuide, startTourismBattle } from "../domain/tourism";
import { beginTravelEvent, finishTravelEventIfComplete, getTravelEventAvailability, getTravelHomeRoutes, sleepAtHotel, waitForTravel } from "../domain/travel-game";
import { loadGame, SAVE_KEY, saveGame, type StorageLike } from "./index";

const milanoTravelCatalog = getCityContent("milano").travel;

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

/** Skip the guide and win the battle; GameApp settles the map event at the result (so does the builder). */
function completeMainEvent(initial: GameState): GameState {
  const explored = skipTourismGuide(initial, initial.revision);
  return playBattleToResult(startTourismBattle(explored, explored.revision));
}

describe("current travel save and concurrency", () => {
  it("rejects an unregistered directed mode without charging or moving", () => {
    const state = createGame();
    expect(milanoTravelCatalog.routes.some((route) => route.fromPlaceId === "p_hotel" && route.toPlaceId === "p_duomo" && route.mode === "bus")).toBe(false);
    expect(getTravelEventAvailability(state, "milano_duomo_episode", "bus").available).toBe(false);
    expect(beginTravelEvent(state, "milano_duomo_episode", "bus", state.revision)).toBe(state);
  });

  it("resumes a reserved scene without consuming the route twice and settles its time once", () => {
    const storage = new MemoryStorage();
    const initial = createGame();
    const started = beginTravelEvent(initial, "milano_duomo_episode", "walk", initial.revision);
    const route = milanoTravelCatalog.routes.find((item) => item.fromPlaceId === "p_hotel" && item.toPlaceId === "p_duomo" && item.mode === "walk")!;
    expect(started.travel.currentPlaceId).toBe("p_duomo");
    expect(started.travel.minute).toBe(initial.travel.minute + route.minutes);
    expect(started.travelBudget).toBe(initial.travelBudget - route.cost);
    expect(started.travel.activeEvent?.eventId).toBe("milano_duomo_episode");
    expect(saveGame(storage, initial).ok).toBe(true);
    expect(saveGame(storage, started, initial).ok).toBe(true);
    const loaded = loadGame(storage);
    expect(loaded.status).toBe("loaded");
    if (loaded.status !== "loaded") throw new Error("travel save did not load");
    expect(loaded.state).toEqual(started);
    expect(beginTravelEvent(loaded.state, "milano_duomo_episode", "walk", initial.revision)).toBe(loaded.state);
    expect(beginTravelEvent(loaded.state, "milano_duomo_episode", "walk", loaded.state.revision)).toBe(loaded.state);
    const endMinute = loaded.state.travel.activeEvent!.endMinute;
    const completed = completeMainEvent(loaded.state);
    expect(completed.travel.minute).toBe(endMinute);
    expect(completed.travel.activeEvent).toBeNull();
    expect(finishTravelEventIfComplete(loaded.state, completed)).toBe(completed);
    expect(saveGame(storage, completed, started).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: completed });
  });

  it("keeps the first committed travel branch when a second tab uses a stale snapshot", () => {
    const storage = new MemoryStorage();
    const initial = createGame();
    const first = beginTravelEvent(initial, "milano_duomo_episode", "walk", initial.revision);
    const second = beginTravelEvent(initial, "milano_galleria_episode", "walk", initial.revision);
    expect(first.travel.activeEvent?.eventId).toBe("milano_duomo_episode");
    expect(second.travel.activeEvent?.eventId).toBe("milano_galleria_episode");
    expect(saveGame(storage, initial).ok).toBe(true);
    expect(saveGame(storage, first, initial).ok).toBe(true);
    const committed = storage.getItem(SAVE_KEY);
    expect(saveGame(storage, second, initial).ok).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(committed);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: first });
  });

  it.each(["unknown-place", "unknown-event", "wrong-scene", "past-end"])(
    "protects a mismatched travel save (%s) from loading or overwriting",
    (kind) => {
      const storage = new MemoryStorage();
      const initial = createGame();
      const state = structuredClone(beginTravelEvent(initial, "milano_duomo_episode", "walk", initial.revision));
      if (kind === "unknown-place") state.travel.currentPlaceId = "missing_place";
      if (kind === "unknown-event") state.travel.activeEvent!.eventId = "missing_event";
      if (kind === "wrong-scene") state.activeTourism = null;
      if (kind === "past-end") state.travel.activeEvent!.endMinute = state.travel.minute - 1;
      const raw = JSON.stringify(state);
      storage.setItem(SAVE_KEY, raw);
      expect(loadGame(storage)).toMatchObject({ status: "invalid", raw });
      expect(saveGame(storage, initial).ok).toBe(false);
      expect(storage.getItem(SAVE_KEY)).toBe(raw);
    },
  );

  it("charges the date AP once and preserves the same active date after reload", () => {
    const storage = new MemoryStorage();
    const initial = createGame();
    const tourist = beginTravelEvent(initial, "milano_duomo_episode", "walk", initial.revision);
    const result = completeMainEvent(tourist);
    const menu = leaveBattle(result, result.revision);
    expect(getTravelEventAvailability(menu, "milano_san_satiro_date_01", "walk").available).toBe(true);
    const date = beginTravelEvent(menu, "milano_san_satiro_date_01", "walk", menu.revision, () => 1);
    expect(date.activeDate?.dateId).toBe("milano_san_satiro_date_01");
    expect(date.ap).toBe(menu.ap - 2);
    expect(saveGame(storage, menu).ok).toBe(true);
    expect(saveGame(storage, date, menu).ok).toBe(true);
    const loaded = loadGame(storage);
    expect(loaded.status).toBe("loaded");
    if (loaded.status !== "loaded") throw new Error("date save did not load");
    expect(loaded.state).toEqual(date);
    expect(beginTravelEvent(loaded.state, "milano_san_satiro_date_01", "walk", menu.revision)).toBe(loaded.state);
    expect(loaded.state.ap).toBe(date.ap);
  });

  it("allows a free walk and basic lodging with zero budget without taking AP", () => {
    const initial = createGame();
    const state = { ...initial, ap: 3, travelBudget: 0, travel: { ...initial.travel, currentPlaceId: "p_duomo", minute: 21 * 60 } };
    const slept = sleepAtHotel(state, "walk", state.revision);
    expect(slept.travel).toMatchObject({ currentPlaceId: state.travel.hotelPlaceId, day: 2, minute: 9 * 60 });
    expect(slept.travelBudget).toBe(0);
    expect(slept.ap).toBe(3);
  });

  it("permits waiting up to 21:00 at the hotel, but not beyond it", () => {
    const initial = createGame();
    const state = { ...initial, travel: { ...initial.travel, minute: 20 * 60 + 30 } };
    const waited = waitForTravel(state, 30, state.revision);
    expect(waited.travel.minute).toBe(21 * 60);
    expect(waitForTravel(waited, 1, waited.revision)).toBe(waited);
    expect(waitForTravel({ ...state, travel: { ...state.travel, minute: 20 * 60 + 31 } }, 30, state.revision).travel.minute).toBe(20 * 60 + 31);
  });

  it("reserves an actual two-leg paid return when walking would be too late, reloads and pays once", () => {
    const homeRoutes = getTravelHomeRoutes("p_prada", "p_hotel", "milano");
    const rail = homeRoutes.find((route) => route.mode === "rail")!;
    const walk = homeRoutes.find((route) => route.mode === "walk")!;
    const firstLeg = milanoTravelCatalog.routes.find((route) => route.fromPlaceId === "p_prada" && route.toPlaceId === "p_duomo" && route.mode === "rail")!;
    const secondLeg = milanoTravelCatalog.routes.find((route) => route.fromPlaceId === "p_duomo" && route.toPlaceId === "p_hotel" && route.mode === "walk")!;
    expect(rail.viaPlaceId).toBe("p_duomo");
    expect(rail.minutes).toBe(firstLeg.minutes + secondLeg.minutes);
    expect(rail.cost).toBe(firstLeg.cost + secondLeg.cost);

    const initial = createGame();
    const atPrada = { ...initial, ap: 3, travelBudget: rail.cost, travel: { ...initial.travel, currentPlaceId: "p_prada", minute: 19 * 60 + 50 } };
    const reserved = waitForTravel(atPrada, 30, atPrada.revision);
    expect(reserved).not.toBe(atPrada);
    expect(reserved.travel.minute + walk.minutes).toBeGreaterThan(21 * 60);
    expect(reserved.travel.minute + rail.minutes).toBeLessThanOrEqual(21 * 60);
    expect(reserved.travel.returnReserve).toBe(rail.cost);
    expect(reserved.travelBudget).toBe(atPrada.travelBudget);

    const storage = new MemoryStorage();
    expect(saveGame(storage, atPrada).ok).toBe(true);
    expect(saveGame(storage, reserved, atPrada).ok).toBe(true);
    const stale = waitForTravel(atPrada, 10, atPrada.revision);
    expect(saveGame(storage, stale, atPrada).ok).toBe(false);
    const loaded = loadGame(storage);
    expect(loaded.status).toBe("loaded");
    if (loaded.status !== "loaded") throw new Error("reserved travel save did not load");
    expect(loaded.state).toEqual(reserved);
    const slept = sleepAtHotel(loaded.state, "rail", loaded.state.revision);
    expect(slept.travelBudget).toBe(0);
    expect(slept.travel).toMatchObject({ currentPlaceId: "p_hotel", day: 2, minute: 540, returnReserve: 0 });
    expect(slept.ap).toBe(atPrada.ap);
    expect(sleepAtHotel(slept, "rail", loaded.state.revision)).toBe(slept);
    expect(saveGame(storage, slept, loaded.state).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: slept });
  });

  it("protects a save whose fare reserve was reduced below the required return fare", () => {
    const initial = createGame();
    const atPrada = { ...initial, ap: 3, travelBudget: 5,
      travel: { ...initial.travel, currentPlaceId: "p_prada", minute: 19 * 60 + 50 } };
    const reserved = waitForTravel(atPrada, 30, atPrada.revision);
    expect(reserved.travel.returnReserve).toBeGreaterThan(0);
    const storage = new MemoryStorage();
    const raw = JSON.stringify({ ...reserved, travel: { ...reserved.travel, returnReserve: 0 } });
    storage.setItem(SAVE_KEY, raw);
    expect(loadGame(storage)).toMatchObject({ status: "invalid", raw });
    expect(saveGame(storage, initial).ok).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(raw);
  });

  it("disallows a late return when an affordable on-time route exists", () => {
    const initial = createGame();
    const state = { ...initial, ap: 3, travelBudget: 5,
      travel: { ...initial.travel, currentPlaceId: "p_prada", minute: 20 * 60 + 20, returnReserve: 5 } };
    expect(sleepAtHotel(state, "walk", state.revision)).toBe(state);
    expect(sleepAtHotel(state, "rail", state.revision).travel.day).toBe(2);
  });

  it("settles an interrupted visit before a new visit is started at the same place", () => {
    const initial = createGame();
    const first = beginTravelEvent(initial, "milano_duomo_episode", "walk", initial.revision);
    const firstEnd = first.travel.activeEvent!.endMinute;
    const interrupted = finishTravelEventIfComplete(first, closeTourism(first, first.revision));
    expect(interrupted.travel.activeEvent).toBeNull();
    expect(interrupted.travel.minute).toBe(firstEnd);
    const second = beginTravelEvent(interrupted, "milano_duomo_episode", "walk", interrupted.revision);
    expect(second.activeTourism).not.toBeNull();
    expect(second.travel.minute).toBe(firstEnd);
    expect(second.travel.activeEvent!.endMinute).toBeGreaterThan(firstEnd);
    const guided = skipTourismGuide(second, second.revision);
    const battle = startTourismBattle(guided, guided.revision);
    expect(battle.activeBattle?.battleId).toBe("milano_duomo_01");
    expect(battle.travel.activeEvent?.eventId).toBe("milano_duomo_episode");
  });

  it("returns from observation to the same battle without consuming time or restarting the fight", () => {
    const initial = createGame();
    let state = beginTravelEvent(initial, "milano_duomo_episode", "walk", initial.revision);
    state = skipTourismGuide(state, state.revision);
    state = startTourismBattle(state, state.revision);
    const before = state;
    const observing = finishTravelEventIfComplete(before, openTourism(before, "duomo_milano"));
    expect(observing.activeTourism?.landmarkId).toBe("duomo_milano");
    expect(observing.activeBattle?.runId).toBe(before.activeBattle?.runId);
    expect(observing.travel).toEqual(before.travel);
    const resumed = finishTravelEventIfComplete(observing, startTourismBattle(observing, observing.revision));
    expect(resumed.activeTourism).toBeNull();
    expect(resumed.activeBattle?.runId).toBe(before.activeBattle?.runId);
    expect(resumed.travel).toEqual(before.travel);
    expect(resumed.travelBudget).toBe(before.travelBudget);
  });
});
