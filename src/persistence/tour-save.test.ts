import { afterEach, describe, expect, it } from "vitest";
import { getTour } from "../content";
import { finishEpisode, newJourney, playBattleToResult } from "../dev/scenario-builders";
import { installTourTestCity, testTour } from "../dev/test-tours";
import { validateGameState, type GameState } from "../domain/game";
import { applyPlayerAction, listPlayerActions, playerActionChange, type PlayerAction } from "../domain/player-action";
import { loadGame, SAVE_KEY, saveGame, type StorageLike } from ".";

// A booked or running tour (tour stage 2a, save v18) through save and load: every stop of the tour day reloads as it was
// (the post-step never runs on a load), and a record that disagrees with the day, the step, the place, the time, the tour's
// steps or the fare kept is refused, the original kept.

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
let cleanup = () => {};
afterEach(() => { cleanup(); cleanup = () => {}; });

const roll = () => 0;
const act = (state: GameState, action: PlayerAction) => validateGameState(applyPlayerAction(state, playerActionChange(action, roll), roll));
const first = (state: GameState, ...kinds: PlayerAction["kind"][]) =>
  kinds.map((kind) => listPlayerActions(state).find((action) => action.kind === kind)).find(Boolean)!;
const book = (state: GameState) => act(state, { kind: "book_tour", tourId: testTour.tourId, offerId: testTour.desk.id });
const rest = (state: GameState) => act(state, first(state, "rest"));
/** Save and load in a fresh slot: the same state comes back. */
function roundTrip(state: GameState): GameState {
  const storage = new MemoryStorage();
  expect(saveGame(storage, state)).toEqual({ ok: true });
  const loaded = loadGame(storage);
  expect(loaded).toEqual({ status: "loaded", state });
  return state;
}
/** Each stop of the visit until the tour is over: the guide, the observation, the battle, its result, the scenes after it. */
function visitStops(initial: GameState): GameState[] {
  const stops: GameState[] = [];
  let state = initial;
  for (let step = 0; state.tour?.status === "running"; step++) {
    expect(step).toBeLessThan(300);
    stops.push(state);
    if (state.activeBattle && state.activeBattle.phase !== "result") { state = playBattleToResult(state); continue; }
    state = act(state, first(state, "guide_choose", "guide_close", "observation_next", "encounter_answer", "encounter_choose", "encounter_finish",
      "encounter_next", "battle_leave"));
  }
  stops.push(state);
  return stops;
}

describe("a tour through save and load (save v18)", () => {
  it("reloads the booking, the hotel's morning scene before the tour, and every stop of the visit as they were", () => {
    cleanup = installTourTestCity();
    const booked = book(newJourney(testTour.journeyId));
    roundTrip(booked);
    const morning = rest(booked);
    expect(morning.activeEncounter?.encounterId).toBe("smp_mihon_hotel_morning");
    roundTrip(morning);
    let state = morning;
    for (let step = 0; state.tour?.status !== "running"; step++) {
      expect(step).toBeLessThan(50);
      state = act(state, first(state, "encounter_choose", "encounter_finish", "encounter_next"));
    }
    const stops = visitStops(state);
    expect(stops.some((stop) => stop.activeTourism?.phase === "guide")).toBe(true);
    expect(stops.some((stop) => stop.activeTourism?.phase === "exploring")).toBe(true);
    expect(stops.some((stop) => stop.activeBattle && stop.activeBattle.phase !== "result")).toBe(true);
    expect(stops.some((stop) => stop.activeBattle?.phase === "result")).toBe(true);
    for (const stop of stops) roundTrip(stop);
    expect(stops.at(-1)!.completedTourIds).toEqual([testTour.tourId]);
  });

  it("reloads a running tour at a scene after its visit's battle (the clock tower's encounter)", () => {
    cleanup = installTourTestCity({ place: "clock_tower", required: false });
    const morning = rest(book(newJourney(testTour.journeyId)));
    let state = morning;
    for (let step = 0; state.tour?.status !== "running"; step++) state = act(state, first(state, "encounter_choose", "encounter_finish", "encounter_next"));
    const stops = visitStops(state);
    const after = stops.filter((stop) => stop.activeEncounter && stop.occasion?.ran.includes("battle"));
    expect(after.length).toBeGreaterThan(0);
    for (const stop of after) roundTrip(stop);
  });

  it("refuses a record that disagrees with the day, the step, the place, the time, the steps, the fare kept or a tour-only place", () => {
    cleanup = installTourTestCity();
    const start = finishEpisode(newJourney(testTour.journeyId), "smp_mihon_main_clock_tower");
    const booked = book(start);
    const running = rest(booked);
    expect(running.tour?.status).toBe("running");
    const record = running.tour as Extract<GameState["tour"], { status: "running" }>;
    const tampered: [string, GameState][] = [
      ["a booking of yesterday with no scene open", { ...booked, travel: { ...booked.travel, day: booked.travel.day + 1 } }],
      ["a booking of another day", { ...booked, tour: { ...booked.tour!, bookedDay: booked.travel.day + 1 } }],
      ["a running tour on the booking day", { ...running, tour: { ...record, bookedDay: running.travel.day } }],
      ["a running tour at a leg", { ...running, tour: { ...record, step: 0 } }],
      ["a running tour past its steps", { ...running, tour: { ...record, step: 9 } }],
      ["a running tour away from its place", { ...running, travel: { ...running.travel, currentPlaceId: testTour.hotelPlaceId } }],
      ["a running tour at another time", { ...running, travel: { ...running.travel, minute: 700 } }],
      ["a running tour of other steps", { ...running, tour: { ...record, contentHash: "0" } }],
      ["a running tour keeping a fare home", { ...running, travel: { ...running.travel, returnReserve: 1 } }],
      ["a finished tour of no city", { ...start, completedTourIds: ["smp_mihon_tour_none"] }],
      ["a tour-only place without a tour", { ...start, travel: { ...start.travel, currentPlaceId: testTour.placeId } }],
    ];
    for (const [label, state] of tampered) {
      expect(() => validateGameState(state), label).toThrow();
      const storage = new MemoryStorage();
      const raw = JSON.stringify(state);
      storage.setItem(SAVE_KEY, raw);
      expect(loadGame(storage), label).toMatchObject({ status: "invalid", raw });
      expect(storage.getItem(SAVE_KEY)).toBe(raw);
    }
    expect(() => validateGameState({ ...running, tour: { ...record, contentHash: "0" } })).toThrow("ツアーの内容が更新されています。");
  });

  it("loads a booking whose offer changed its price or is gone (the price paid is saved)", () => {
    cleanup = installTourTestCity();
    const booked = book(newJourney(testTour.journeyId));
    const tour = getTour(testTour.tourId)!;
    const offers = tour.offers;
    try {
      tour.offers = offers.map((offer) => ({ ...offer, price: offer.price + 5 }));
      roundTrip(booked);
      tour.offers = offers.filter((offer) => offer.id !== testTour.desk.id);
      roundTrip(booked);
      expect(act(booked, { kind: "cancel_tour" }).travelBudget).toBe(booked.travelBudget + testTour.desk.price);
    } finally { tour.offers = offers; }
  });
});
