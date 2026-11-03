import { describe, expect, it } from "vitest";
import { getDirection, getGameWeekday, getTimePeriod, groupDestinationEvents, planOvernight, planTravel, planTravelEvent, selectNearbyDestinations } from "./travel";

const date = (id: string, walkMinutes: number) => ({ id, placeId: id, category: "date" as const, walkMinutes, available: true, unclearedMain: false });
const main = (id: string, walkMinutes: number) => ({ id, placeId: id, category: "main" as const, walkMinutes, available: true, unclearedMain: true });
const select = (events: Array<ReturnType<typeof date> | ReturnType<typeof main>>) => selectNearbyDestinations(groupDestinationEvents(events));

describe("travel destination selection", () => {
  it("keeps the five nearest when a main destination is already among them", () => {
    const input = [date("a", 1), main("b", 2), date("c", 3), date("d", 4), date("e", 5), main("f", 6)];
    const result = select([...input].reverse());
    expect(result.nearby.map((x) => x.id)).toEqual(["a", "b", "c", "d", "e"]);
    expect(result.other.map((x) => x.id)).toEqual(["f"]);
  });

  it("replaces only the fifth date with the closest available main and retains the date in other", () => {
    const input = [date("a", 1), date("b", 2), date("c", 3), date("d", 4), date("e", 5), date("f", 6), main("far", 10), main("nearest-main", 8)];
    const original = [...input];
    const result = select(input);
    expect(result.nearby.map((x) => x.id)).toEqual(["a", "b", "c", "d", "nearest-main"]);
    expect(result.other.map((x) => x.id)).toEqual(["e", "f", "far"]);
    expect(input).toEqual(original);
    expect(result.nearby[4]?.walkMinutes).toBe(8);
  });

  it("does not invent entries or require a main when none is available", () => {
    expect(select([date("c", 3), date("a", 1), date("b", 2)]).nearby.map((x) => x.id)).toEqual(["a", "b", "c"]);
    const onlyDates = Array.from({ length: 6 }, (_, index) => date(`date-${index}`, index));
    const result = select(onlyDates);
    expect(result.nearby).toHaveLength(5);
    expect(result.other.map((x) => x.id)).toEqual(["date-5"]);
  });

  it("orders ties deterministically without rounding away different travel times", () => {
    const a = date("a", 1.04), b = date("b", 1.04), c = date("c", 1.03);
    const ids = (items: typeof a[]) => select(items).nearby.map((x) => x.id);
    expect(ids([b, a, c])).toEqual(["c", "a", "b"]);
    expect(ids([a, c, b])).toEqual(["c", "a", "b"]);
  });

  it("treats completed main events as revisitable but not as the guarantee", () => {
    const completed = { ...main("cleared", 1), unclearedMain: false };
    const result = select([completed, date("b", 2), date("c", 3), date("d", 4), date("e", 5), main("uncleared", 8)]);
    expect(result.nearby.map((x) => x.id)).toEqual(["cleared", "b", "c", "d", "uncleared"]);
    expect(result.other.map((x) => x.id)).toEqual(["e"]);
    expect(result.recommendedMainId).toBe("uncleared");
  });

  it("groups events at the same place and counts only an available uncleared main", () => {
    const events = [
      { ...main("art_main", 2), placeId: "art", available: false },
      { ...date("art_date", 2), placeId: "art" },
      date("b", 3), date("c", 4), date("d", 5), date("e", 6), main("far", 10),
    ];
    const result = select(events);
    expect(result.nearby.map((place) => place.id)).toEqual(["art", "b", "c", "d", "far"]);
    expect(result.nearby[0].events.map((event) => event.id)).toEqual(["art_main", "art_date"]);
    expect(result.nearby[0].hasAvailableUnclearedMain).toBe(false);
    expect(result.other.map((place) => place.id)).toEqual(["e"]);
    const openMain = select([{ ...events[0], available: true }, ...events.slice(1)]);
    expect(openMain.nearby.map((place) => place.id)).toEqual(["art", "b", "c", "d", "e"]);
    expect(openMain.recommendedMainId).toBeNull();
  });

  it("keeps unavailable places in the other list and refuses inconsistent grouped routes", () => {
    const unavailable = { ...main("closed", 1), available: false };
    const result = select([unavailable, date("near", 2)]);
    expect(result.nearby.map((place) => place.id)).toEqual(["near"]);
    expect(result.other.map((place) => place.id)).toEqual(["closed"]);
    expect(() => groupDestinationEvents([{ ...date("one", 1), placeId: "shared" }, { ...date("two", 2), placeId: "shared" }])).toThrow();
  });

  it("keeps destinations without an authored walking route without inventing walking times", () => {
    const otherMode = { ...date("taxi_only", 0), walkMinutes: null };
    const busOnly = { ...date("bus_only", 0), walkMinutes: null };
    const result = selectNearbyDestinations(groupDestinationEvents([otherMode, date("walk", 12), busOnly]));
    expect(result.nearby.map((place) => place.id)).toEqual(["walk", "bus_only", "taxi_only"]);
    expect(result.nearby[1].walkMinutes).toBeNull();
    expect(() => groupDestinationEvents([{ ...otherMode, placeId: "shared" }, { ...date("walk2", 2), placeId: "shared" }])).toThrow();
  });
});

describe("travel direction and time", () => {
  const origin = { latitude: 45, longitude: 9 };
  it.each([
    [{ latitude: 46, longitude: 9 }, "北"],
    [{ latitude: 44, longitude: 9 }, "南"],
    [{ latitude: 45, longitude: 10 }, "東"],
    [{ latitude: 45, longitude: 8 }, "西"],
    [{ latitude: 46, longitude: 10 }, "北東"],
    [{ latitude: 44, longitude: 10 }, "南東"],
    [{ latitude: 44, longitude: 8 }, "南西"],
    [{ latitude: 46, longitude: 8 }, "北西"],
  ])("uses geographic position to determine the direction %j", (point, expected) => {
    expect(getDirection(origin, point)).toBe(expected);
  });

  it("uses place IDs to distinguish the current location from distinct places at the same coordinates", () => {
    const gallery = { ...origin, id: "gallery" };
    expect(getDirection(gallery, { ...gallery })).toBe("現在地");
    expect(getDirection(gallery, { ...gallery, id: "museum" })).toBe("方角不明");
    expect(getDirection(origin, origin)).toBe("方角不明");
  });

  it.each([
    [22.499, "北"], [22.501, "北東"], [67.499, "北東"], [67.501, "東"],
    [337.499, "北西"], [337.501, "北"],
  ])("rounds geographic bearing %f° to %s at sector boundaries", (bearing, expected) => {
    const angle = bearing * Math.PI / 180;
    const distance = Math.PI / 180;
    const destination = {
      latitude: Math.asin(Math.cos(angle) * Math.sin(distance)) * 180 / Math.PI,
      longitude: Math.atan2(Math.sin(angle) * Math.sin(distance), Math.cos(distance)) * 180 / Math.PI,
    };
    expect(getDirection({ latitude: 0, longitude: 0 }, destination)).toBe(expected);
  });

  it.each([
    [8 * 60 + 59, "closed"], [9 * 60, "day"], [17 * 60 + 59, "day"],
    [18 * 60, "night"], [20 * 60 + 59, "night"], [21 * 60, "closed"],
  ])("classifies minute %i as %s", (minute, period) => {
    expect(getTimePeriod(minute)).toBe(period);
  });
});


describe("travel planning", () => {
  const snapshot = { currentPlaceId: "hotel", hotelPlaceId: "hotel", minute: 9 * 60, day: 1, ap: 4, travelBudget: 10 };
  const walk = { fromPlaceId: "hotel", toPlaceId: "gallery", mode: "walk" as const, minutes: 15, cost: 0 };
  const walkHome = { fromPlaceId: "gallery", toPlaceId: "hotel", mode: "walk" as const, minutes: 15, cost: 0 };
  const date = { id: "gallery-date", placeId: "gallery", activityMinutes: 60, apCost: 2 };
  const place = { id: "gallery" };

  it("plans free walking with a zero budget without mutating the input", () => {
    const zero = { ...snapshot, travelBudget: 0 };
    const before = structuredClone(zero);
    expect(planTravel(zero, walk)).toEqual({ ok: true, arrivalMinute: 9 * 60 + 15, remainingBudget: 0 });
    expect(zero).toEqual(before);
  });

  it("rejects a route from a different current location and paid travel above budget", () => {
    expect(planTravel(snapshot, { ...walk, fromPlaceId: "elsewhere" }).ok).toBe(false);
    expect(planTravel(snapshot, { ...walk, mode: "taxi", cost: 11 }).ok).toBe(false);
    expect(snapshot.travelBudget).toBe(10);
  });

  it("plans an explicitly supplied tram route and deducts its game fare", () => {
    expect(planTravel(snapshot, { ...walk, mode: "tram", minutes: 35, cost: 5 }))
      .toEqual({ ok: true, arrivalMinute: 9 * 60 + 35, remainingBudget: 5 });
  });

  it("allows arrival at 21:00 but does not start travel at or after closing", () => {
    const oneMinute = { ...walk, minutes: 1 };
    expect(planTravel({ ...snapshot, minute: 20 * 60 + 59 }, oneMinute).ok).toBe(true);
    expect(planTravel({ ...snapshot, minute: 21 * 60 }, oneMinute)).toEqual({ ok: false, reason: "time" });
  });

  it("tests the event against arrival time and preserves the input on rejection", () => {
    const late = { ...snapshot, minute: 17 * 60 + 50 };
    const nightOnly = { ...date, startWindows: [{ start: 18 * 60, end: 22 * 60 }] };
    expect(planTravelEvent(late, nightOnly, walk, walkHome, place)).toEqual({
      ok: true, arrivalMinute: 18 * 60 + 5, endMinute: 19 * 60 + 5,
      returnMinute: 19 * 60 + 20, remainingBudget: 10, remainingAp: 2,
    });
    expect(planTravelEvent(snapshot, nightOnly, walk, walkHome, place).ok).toBe(false);
    expect(late.minute).toBe(17 * 60 + 50);
    expect(late.ap).toBe(4);
  });

  it("refuses an activity when activity and return would exceed 21:00 or AP is insufficient", () => {
    expect(planTravelEvent({ ...snapshot, minute: 19 * 60 + 31 }, date, walk, walkHome, place).ok).toBe(false);
    expect(planTravelEvent({ ...snapshot, minute: 19 * 60 + 30 }, date, walk, walkHome, place).ok).toBe(true);
    expect(planTravelEvent({ ...snapshot, ap: 1 }, date, walk, walkHome, place).ok).toBe(false);
  });

  it("accepts a paid return if it fits the budget after outward travel without charging it yet", () => {
    const outbound = { ...walk, mode: "bus" as const, cost: 3 };
    const railHome = { ...walkHome, mode: "rail" as const, minutes: 5, cost: 4 };
    const late = { ...snapshot, minute: 19 * 60 + 40 };
    expect(planTravelEvent(late, date, outbound, walkHome, place)).toEqual({ ok: false, reason: "time" });
    expect(planTravelEvent(late, date, outbound, railHome, place)).toEqual({
      ok: true, arrivalMinute: 19 * 60 + 55, endMinute: 20 * 60 + 55,
      returnMinute: 21 * 60, remainingBudget: 7, remainingAp: 2,
    });
    expect(planTravelEvent({ ...late, travelBudget: 6 }, date, outbound, railHome, place))
      .toEqual({ ok: false, reason: "budget" });
    expect(late.travelBudget).toBe(10);
  });

  it("charges the two-person admission once while retaining the return fare", () => {
    const outward = { ...walk, mode: "taxi" as const, cost: 3 };
    const home = { ...walkHome, mode: "taxi" as const, cost: 4 };
    const ticketed = { ...date, admissionCost: 5 };
    expect(planTravelEvent({ ...snapshot, travelBudget: 11 }, ticketed, outward, home, place)).toEqual({ ok: false, reason: "budget" });
    expect(planTravelEvent({ ...snapshot, travelBudget: 12 }, ticketed, outward, home, place)).toMatchObject({ ok: true, remainingBudget: 4, remainingAp: 2 });
    expect(planTravelEvent(snapshot, { ...date, admissionCost: -1 }, walk, walkHome, place)).toEqual({ ok: false, reason: "invalid" });
    expect(planTravelEvent(snapshot, { ...date, admissionCost: Number.MAX_SAFE_INTEGER + 1 }, walk, walkHome, place)).toEqual({ ok: false, reason: "invalid" });
    expect(snapshot.travelBudget).toBe(10);
  });

  it("allows a basic overnight stay with no budget or AP loss", () => {
    const zero = { ...snapshot, currentPlaceId: "gallery", travelBudget: 0 };
    const before = structuredClone(zero);
    const result = planOvernight(zero, walkHome, 5);
    expect(result).toEqual({
      ok: true, arrivalMinute: 9 * 60 + 15, nextDay: 2, nextMinute: 9 * 60,
      remainingBudget: 0, remainingAp: 4, usedAssistance: true,
    });
    expect(zero).toEqual(before);
  });

  it("supports back-to-back events at one place with no extra travel", () => {
    const atGallery = { ...snapshot, currentPlaceId: "gallery" };
    const noMove = { fromPlaceId: "gallery", toPlaceId: "gallery", mode: "walk" as const, minutes: 0, cost: 0 };
    const result = planTravelEvent(atGallery, date, noMove, walkHome, place);
    expect(result).toEqual({ ok: true, arrivalMinute: 9 * 60, endMinute: 10 * 60,
      returnMinute: 10 * 60 + 15, remainingBudget: 10, remainingAp: 2 });
    expect(planTravel(atGallery, { ...noMove, minutes: 1 }).ok).toBe(false);
    expect(planTravel(atGallery, { ...noMove, mode: "taxi", cost: 1 }).ok).toBe(false);
  });

  it("enforces separate start and ending windows based on arrival and completion", () => {
    const fixed = { ...date, startWindows: [{ start: 10 * 60, end: 12 * 60 }],
      endWindows: [{ start: 10 * 60, end: 12 * 60 }] };
    expect(planTravelEvent({ ...snapshot, minute: 9 * 60 + 45 }, fixed, walk, walkHome, place).ok).toBe(true);
    expect(planTravelEvent({ ...snapshot, minute: 11 * 60 }, fixed, walk, walkHome, place).ok).toBe(false);
    expect(planTravelEvent({ ...snapshot, minute: 11 * 60 + 45 }, fixed, walk, walkHome, place).ok).toBe(false);
  });

  it("checks the venue is open at arrival and belongs to the event", () => {
    const venue = { id: "gallery", openingWindows: [{ start: 10 * 60, end: 18 * 60 }] };
    expect(planTravelEvent(snapshot, date, walk, walkHome, venue)).toEqual({ ok: false, reason: "closed" });
    expect(planTravelEvent({ ...snapshot, minute: 9 * 60 + 45 }, date, walk, walkHome, venue).ok).toBe(true);
    expect(planTravelEvent({ ...snapshot, minute: 17 * 60 + 45 }, date, walk, walkHome, venue)).toEqual({ ok: false, reason: "closed" });
    expect(planTravelEvent(snapshot, date, walk, walkHome, { id: "another" }).ok).toBe(false);
  });

  it("uses fictional journey weekdays for Monday and Friday closures", () => {
    expect(getGameWeekday({ journeyDay: 1, startWeekday: 0 })).toBe(0);
    expect(getGameWeekday({ journeyDay: 5, startWeekday: 0 })).toBe(4);
    expect(getGameWeekday({ journeyDay: 8, startWeekday: 0 })).toBe(0);
    const lotus = { ...place, closedWeekdays: [0] };
    const taj = { ...place, closedWeekdays: [4] };
    expect(planTravelEvent({ ...snapshot, weekday: 0 }, date, walk, walkHome, lotus)).toEqual({ ok: false, reason: "closed_day" });
    expect(planTravelEvent({ ...snapshot, weekday: 1 }, date, walk, walkHome, lotus).ok).toBe(true);
    expect(planTravelEvent({ ...snapshot, weekday: 4 }, date, walk, walkHome, taj)).toEqual({ ok: false, reason: "closed_day" });
    expect(planTravelEvent({ ...snapshot, weekday: 5 }, date, walk, walkHome, taj).ok).toBe(true);
    expect(planTravelEvent(snapshot, date, walk, walkHome, taj)).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects fractional clock, route, event and opening-window minutes", () => {
    expect(planTravel({ ...snapshot, minute: 540.5 }, walk).ok).toBe(false);
    expect(planTravel(snapshot, { ...walk, minutes: 15.5 }).ok).toBe(false);
    expect(planTravelEvent(snapshot, { ...date, activityMinutes: 60.5 }, walk, walkHome, place).ok).toBe(false);
    expect(planTravelEvent(snapshot, date, walk, walkHome,
      { ...place, openingWindows: [{ start: 540.5, end: 600 }] }).ok).toBe(false);
  });

  it("permits returning after an unexpectedly late event without charging AP or creating money", () => {
    const late = { ...snapshot, currentPlaceId: "gallery", minute: 22 * 60 + 30, travelBudget: 3 };
    expect(planOvernight(late, walkHome, 5)).toEqual({
      ok: true, arrivalMinute: 22 * 60 + 45, nextDay: 2, nextMinute: 9 * 60,
      remainingBudget: 0, remainingAp: 4, usedAssistance: true,
    });
  });

  it("requires normal returns to arrive by 21:00 while preserving the late-scene rescue", () => {
    const away = { ...snapshot, currentPlaceId: "gallery" };
    expect(planOvernight({ ...away, minute: 20 * 60 + 45 }, walkHome, 0).ok).toBe(true);
    expect(planOvernight({ ...away, minute: 20 * 60 + 46 }, walkHome, 0)).toEqual({ ok: false, reason: "time" });
    expect(planOvernight({ ...away, minute: 21 * 60 }, walkHome, 0).ok).toBe(true);
    expect(planOvernight({ ...away, minute: 21 * 60 + 1 }, walkHome, 0).ok).toBe(true);
  });

  it("does not move the clock backwards when a return reaches the following morning", () => {
    const late = { ...snapshot, currentPlaceId: "gallery", minute: 24 * 60 + 9 * 60 - 15 };
    expect(planOvernight(late, walkHome, 0)).toEqual({ ok: false, reason: "time" });
  });
});
