import { describe, expect, it } from "vitest";
import delhiTravel from "../content/generated/content/travel/delhi.json";
import agraTravel from "../content/generated/content/travel/agra.json";
import { travelCatalogSchema } from "../content/travel-schemas";
import { completedCity } from "../dev/scenario-builders";
import { loadGame, saveGame } from "../persistence";
import { leaveForNextCity } from "./city-travel";
import { createGame, validateGameState } from "./game";
import { DAY_START, getGameWeekday, planTravelEvent } from "./travel";
import { sleepAtHotel, waitForTravel } from "./travel-game";

const memoryStorage = () => {
  const map = new Map<string, string>();
  return { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
};

describe("fictional travel calendar", () => {
  it("applies the drafted Lotus Monday and Taj Friday closures", () => {
    const lotus = travelCatalogSchema.parse(delhiTravel).places.find((item) => item.id === "delhi_lotus_temple")!;
    const taj = travelCatalogSchema.parse(agraTravel).places.find((item) => item.id === "agra_taj_mahal")!;
    expect(lotus.closedWeekdays).toEqual([0]);
    expect(taj.closedWeekdays).toEqual([4]);
    for (const [place, weekday] of [[lotus, 0], [taj, 4]] as const) {
      const snapshot = { currentPlaceId: "hotel", hotelPlaceId: "hotel", day: 1, minute: 600, ap: 3, travelBudget: 10, weekday };
      const event = { id: "fixture_event", placeId: place.id, activityMinutes: 30, apCost: 0 };
      const outward = { fromPlaceId: "hotel", toPlaceId: place.id, mode: "walk" as const, minutes: 5, cost: 0 };
      const back = { ...outward, fromPlaceId: place.id, toPlaceId: "hotel" };
      expect(planTravelEvent(snapshot, event, outward, back, place)).toEqual({ ok: false, reason: "closed_day" });
    }
  });

  it("keeps weekdays through waiting, overnight and save/load without adding a calendar to Milan", () => {
    const milan = createGame();
    expect(milan.travel.calendar).toBeUndefined();
    expect(validateGameState(milan)).toEqual(milan);
    const state = validateGameState({ ...milan, travel: { ...milan.travel,
      calendar: { journeyDay: 1, cityStartJourneyDay: 1, startWeekday: 0 } } });
    const waited = waitForTravel(state, 30, state.revision);
    expect(waited).not.toBe(state);
    expect(getGameWeekday(waited.travel.calendar)).toBe(0);
    const rested = sleepAtHotel(waited, "walk", waited.revision);
    expect(rested.travel.day).toBe(2);
    expect(rested.travel.calendar).toEqual({ journeyDay: 2, cityStartJourneyDay: 1, startWeekday: 0 });
    expect(getGameWeekday(rested.travel.calendar)).toBe(1);
    const storage = memoryStorage();
    expect(saveGame(storage, rested).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: rested });
    expect(() => validateGameState({ ...rested, travel: { ...rested.travel,
      calendar: { ...rested.travel.calendar, journeyDay: 9 } } })).toThrow("Travel day and journey calendar disagree");
  });

  // 2026-11-13 user decision: the next city starts the next morning, so the clock never goes back on a departure.
  it("starts the next city the next morning: its day 1 at 9:00, the journey day and the weekday one on", () => {
    const cleared = completedCity("delhi");
    // The report: Delhi left on its third day at 13:00, a Wednesday.
    const delhi = validateGameState({ ...cleared, travel: { ...cleared.travel, day: 3, minute: 13 * 60,
      calendar: { ...cleared.travel.calendar!, journeyDay: 3, cityStartJourneyDay: 1 } } });
    expect(getGameWeekday(delhi.travel.calendar)).toBe(2);
    const agra = leaveForNextCity(delhi);
    expect(agra.currentCityId).toBe("agra");
    expect(agra.travel).toMatchObject({ day: 1, minute: DAY_START, calendar: { journeyDay: 4, cityStartJourneyDay: 4, startWeekday: 0 } });
    expect(getGameWeekday(agra.travel.calendar)).toBe(3);
    const storage = memoryStorage();
    expect(saveGame(storage, agra).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: agra });
    // A journey without a calendar keeps none; no journey day past the safe integers.
    const { calendar: _calendar, ...plain } = delhi.travel;
    expect(leaveForNextCity({ ...delhi, travel: plain }).travel).toMatchObject({ day: 1, minute: DAY_START });
    expect(leaveForNextCity({ ...delhi, travel: plain }).travel.calendar).toBeUndefined();
    const last = { ...delhi, travel: { ...delhi.travel, calendar: { ...delhi.travel.calendar!, journeyDay: Number.MAX_SAFE_INTEGER } } };
    expect(leaveForNextCity(last)).toBe(last);
  });
});
