import { describe, expect, it } from "vitest";
import delhiTravel from "../content/generated/content/travel/delhi.json";
import agraTravel from "../content/generated/content/travel/agra.json";
import { travelCatalogSchema } from "../content/travel-schemas";
import { loadGame, saveGame } from "../persistence";
import { createGame, validateGameState } from "./game";
import { getGameWeekday, planTravelEvent } from "./travel";
import { sleepAtHotel, waitForTravel } from "./travel-game";

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
    const map = new Map<string, string>();
    const storage = { getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => { map.set(key, value); } };
    expect(saveGame(storage, rested).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: rested });
    expect(() => validateGameState({ ...rested, travel: { ...rested.travel,
      calendar: { ...rested.travel.calendar, journeyDay: 9 } } })).toThrow("Travel day and journey calendar disagree");
  });
});
