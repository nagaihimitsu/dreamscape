// Rentals on the sample journey's optional part 「乗り物（貸し自転車）」: the
// rental bicycle is declared with `"rental": true`, rented at the hotel
// (travel/mihon-settings.json rentals) and ridden until the party leaves
// the city. Without it every place is reached on foot.
import { describe, expect, it } from "vitest";
import { getCityContent } from "../../../src/content";
import { departToNextCity } from "../../../src/domain/city-travel";
import { createGame, validateGameState, type GameState } from "../../../src/domain/game";
import { listPlayerActions, playerActionChange } from "../../../src/domain/player-action";
import { getRentalOffers, getUsableRoutes, isTransportModeUsable, rentalReason, rentTransport } from "../../../src/domain/transport";
import { DAY_END } from "../../../src/domain/travel";
import { getTravelDestinations } from "../../../src/domain/travel-destinations";
import { beginTravelEvent, getTravelEventAvailability, getTravelHomeRoutes, getTravelSleepOptions, sleepAtHotel } from "../../../src/domain/travel-game";
import { minimumHomeFare } from "../../../src/domain/travel-routes";
import { completedCity } from "../../../src/dev/scenario-builders";
import { loadGame, saveGame, type StorageLike } from "../../../src/persistence";

const BIKE = "rental_bicycle";
const EPISODE = "smp_mihon_main_clock_tower";
const TOWER = "mihon_clock_tower";
const HOTEL = "mihon_hotel";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
const start = () => createGame("旅人", "相手", { journeyId: "sample_trip" });
const offer = () => getCityContent("mihon").travelSettings.rentals!.find((item) => item.modeId === BIKE)!;

describe("rental transport (sample journey)", () => {
  it("lists the bicycle route before renting, with the reason, and keeps it out of the ways home and the reserve", () => {
    const state = start();
    expect(state.travel.rentedModeIds).toEqual([]);
    expect(isTransportModeUsable(state, "walk")).toBe(true);
    expect(isTransportModeUsable(state, BIKE)).toBe(false);
    expect(isTransportModeUsable(state, "no_such_mode")).toBe(false);
    expect(getUsableRoutes(state).some((route) => route.mode === BIKE)).toBe(false);
    expect(rentalReason("mihon", BIKE)).toBe("貸し自転車は滞在先で借りると乗れます。");
    expect(getTravelEventAvailability(state, EPISODE, BIKE)).toEqual({ available: false, reason: "貸し自転車は滞在先で借りると乗れます。" });
    expect(beginTravelEvent(state, EPISODE, BIKE, state.revision)).toBe(state);
    const tower = { ...state, travel: { ...state.travel, currentPlaceId: TOWER } };
    expect(getTravelHomeRoutes(tower, TOWER).map((route) => route.mode)).toEqual(["walk"]);
    expect(minimumHomeFare(getUsableRoutes(tower), TOWER, HOTEL, tower.travel.minute)).toBe(0);
    // The menu still shows the route (with its reason); only walking is offered as an action.
    const event = getTravelDestinations(state).candidates.find((item) => item.id === EPISODE)!;
    expect(event.routes.map((route) => route.mode).sort()).toEqual([BIKE, "walk"]);
    expect(event.available).toBe(true);
    expect(listPlayerActions(state).filter((action) => action.kind === "travel" && action.eventId === EPISODE))
      .toEqual([{ kind: "travel", eventId: EPISODE, mode: "walk" }]);
  });

  it("takes the event's reason from a usable route, never the rental reason, when the event is closed", () => {
    const late = { ...start(), travel: { ...start().travel, minute: DAY_END - 1 } };
    const event = getTravelDestinations(late).candidates.find((item) => item.id === EPISODE)!;
    expect(event.available).toBe(false);
    expect(event.unavailableReason).toBe(getTravelEventAvailability(late, EPISODE, "walk").reason);
    expect(event.unavailableReason).not.toBe(rentalReason("mihon", BIKE));
  });

  it("offers the rental at the hotel only, and refuses a stale revision, a scene, the end of the day and money kept for the way back", () => {
    const state = start();
    expect(getRentalOffers(state)).toEqual([{ offer: offer(), mode: expect.objectContaining({ id: BIKE, nameJa: "貸し自転車", rental: true }), available: true, reason: "" }]);
    expect(listPlayerActions(state)).toContainEqual({ kind: "rent", modeId: BIKE });
    expect(rentTransport(state, BIKE, state.revision - 1)).toBe(state);
    expect(rentTransport(state, "walk", state.revision)).toBe(state);
    const atTower = { ...state, travel: { ...state.travel, currentPlaceId: TOWER } };
    expect(getRentalOffers(atTower)).toEqual([]);
    expect(rentTransport(atTower, BIKE, atTower.revision)).toBe(atTower);
    const late = { ...state, travel: { ...state.travel, minute: DAY_END } };
    expect(getRentalOffers(late)[0]).toMatchObject({ available: false, reason: "今日はもう借りられません。" });
    expect(rentTransport(late, BIKE, late.revision)).toBe(late);
    const poor = { ...state, travelBudget: offer().cost - 1 };
    expect(getRentalOffers(poor)[0]).toMatchObject({ available: false, reason: "旅行予算が足りません。" });
    const reserved = { ...state, travelBudget: offer().cost + 2, travel: { ...state.travel, returnReserve: 3 } };
    expect(getRentalOffers(reserved)[0]).toMatchObject({ available: false, reason: "帰りの交通費（€3）を確保しているため、今は借りられません。" });
    expect(rentTransport(reserved, BIKE, reserved.revision)).toBe(reserved);
    const busy = beginTravelEvent(state, EPISODE, "walk", state.revision);
    const back = { ...busy, travel: { ...busy.travel, currentPlaceId: HOTEL } };
    expect(getRentalOffers(back)[0]).toMatchObject({ available: false, reason: "途中の場面を終えてから借りられます。" });
  });

  it("charges once, then the bicycle is ridden like any mode and stays rented after sleeping", () => {
    const state = start();
    const rented = playerActionChange({ kind: "rent", modeId: BIKE }, () => 0)(state);
    expect(rented.travelBudget).toBe(state.travelBudget - offer().cost);
    expect(rented.travel.rentedModeIds).toEqual([BIKE]);
    expect(rented.revision).toBe(state.revision + 1);
    expect(rented.travel.minute).toBe(state.travel.minute);
    expect(validateGameState(JSON.parse(JSON.stringify(rented)))).toEqual(rented);
    // Rented already: no second offer, no second charge.
    expect(getRentalOffers(rented)).toEqual([]);
    expect(rentTransport(rented, BIKE, rented.revision)).toBe(rented);
    expect(listPlayerActions(rented)).not.toContainEqual({ kind: "rent", modeId: BIKE });
    expect(listPlayerActions(rented)).toContainEqual({ kind: "travel", eventId: EPISODE, mode: BIKE });
    const bike = getCityContent("mihon").travel.routes.find((route) => route.fromPlaceId === HOTEL && route.toPlaceId === TOWER && route.mode === BIKE)!;
    const moved = beginTravelEvent(rented, EPISODE, BIKE, rented.revision);
    expect(moved.travel).toMatchObject({ currentPlaceId: TOWER, minute: rented.travel.minute + bike.minutes, rentedModeIds: [BIKE] });
    const tower = { ...rented, travel: { ...rented.travel, currentPlaceId: TOWER } };
    expect(getTravelHomeRoutes(tower, TOWER).map((route) => route.mode).sort()).toEqual([BIKE, "walk"]);
    const slept = sleepAtHotel(tower, BIKE, tower.revision, null);
    expect(slept.travel).toMatchObject({ currentPlaceId: HOTEL, day: 2, rentedModeIds: [BIKE] });
    expect(getTravelSleepOptions(slept).map(({ route }) => route.mode)).toEqual(["walk"]);
  });

  it("saves and resumes a rental in the v14 save, and refuses a tampered record", () => {
    const rented = rentTransport(start(), BIKE, 0);
    const storage = new MemoryStorage();
    expect(saveGame(storage, rented).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: rented });
    const tampered = (rentedModeIds: string[]) => ({ ...rented, travel: { ...rented.travel, rentedModeIds } });
    expect(() => validateGameState(tampered(["walk"]))).toThrow("借りた乗り物の記録が一致しません。");
    expect(() => validateGameState(tampered(["no_such_mode"]))).toThrow("借りた乗り物の記録が一致しません。");
    expect(() => validateGameState(tampered([BIKE, BIKE]))).toThrow();
    const { rentedModeIds: _rented, ...travelWithout } = rented.travel;
    expect(() => validateGameState({ ...rented, travel: travelWithout } as unknown as GameState)).toThrow();
  });

  it("returns every rental when the party leaves for the next city", () => {
    const cleared = completedCity("delhi");
    const before = { ...cleared, travel: { ...cleared.travel, rentedModeIds: [BIKE] } };
    const after = departToNextCity(before, before.revision);
    expect(after.currentCityId).not.toBe("delhi");
    expect(after.travel.rentedModeIds).toEqual([]);
  });
});
