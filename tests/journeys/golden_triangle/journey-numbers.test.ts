import { describe, expect, it } from "vitest";
import { cityStart } from "../../../src/dev/scenario-builders";
import { journeyNumbers } from "../../../src/features/journey/journey-numbers";

// 旅の数字 (2026-11-13) on a journey of several cities: every number is the whole journey's. The rides (and, without a
// calendar, the days) are kept per city, so they are the journey's only while the party is still in its first city.

describe("the numbers of a journey of several cities", () => {
  it("in the first city: the calendar's day and the rides so far", () => {
    const delhi = cityStart("delhi");
    const numbers = journeyNumbers({ ...delhi, travel: { ...delhi.travel, rideCounts: { auto_rickshaw: 2, metro: 3 } } }, []);
    expect(numbers.days).toBe(1);
    expect(numbers.rides).toMatchObject([{ modeId: "metro", count: 3 }, { modeId: "auto_rickshaw", count: 2 }]);
  });

  it("after leaving a city: the calendar still tells the days, the rides are not known for the journey", () => {
    const agra = cityStart("agra");
    expect(agra.travel.calendar).toBeDefined();
    // Agra's second day, the journey's fourth (Delhi took two).
    const later = { ...agra, travel: { ...agra.travel, day: 2, calendar: { ...agra.travel.calendar!, cityStartJourneyDay: 3, journeyDay: 4 },
      rideCounts: { auto_rickshaw: 2 } } };
    const numbers = journeyNumbers(later, []);
    expect(numbers.days).toBe(4);
    expect(numbers.rides).toBeNull();
  });

  it("after leaving a city without a calendar: the city's day is not the journey's, so no days", () => {
    const agra = cityStart("agra");
    const { calendar: _calendar, ...travel } = agra.travel;
    expect(journeyNumbers({ ...agra, travel: { ...travel, day: 2 } }, []).days).toBeNull();
  });
});
