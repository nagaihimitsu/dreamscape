import { beforeAll, describe, expect, it } from "vitest";
import { getJourney } from "../../../src/content/journeys";
import { cityStart } from "../../../src/dev/scenario-builders";
import { journeyNumbers } from "../../../src/features/journey/journey-numbers";

// 旅の数字 (2026-11-13) on the sample journey (fictional; one city, €100 to start, no calendar): read from the game's
// own records and this device's words only.

beforeAll(() => {
  if (!getJourney("sample_trip")) throw new Error("見本の旅（sample_trip）が生成物にありません。npm run content:build -- --with-sample を実行してください。");
});

describe("the sample journey in numbers", () => {
  it("starts at the first day with nothing yet, the hotel where nothing happened yet not counted", () => {
    expect(journeyNumbers(cityStart("mihon"), [])).toEqual({
      days: 1, eventPlaces: 0, people: 0, localWords: 0, photos: 0, spent: { amount: 0, textJa: "€0" },
    });
  });

  it("counts the places where something happened, the words learned, the photos, the money spent and the days, never the rides", () => {
    const start = cityStart("mihon");
    const later = {
      ...start,
      travelBudget: start.travelBudget - 30,
      visitedLandmarkIds: ["mihon_clock_tower"],
      album: [{ imageId: "smp_album_clock_tower", cityId: "mihon", day: 2, minute: 600, placeId: "mihon_clock_tower",
        storyId: "places/smp_mihon_clock_tower.smp_mihon_date_tower_square" }],
      travel: { ...start.travel, day: 2, rideCounts: { rental_bicycle: 2 } },
    };
    const numbers = journeyNumbers(later, ["smp_mihon_word_trisol", "smp_mihon_word_trisol"]);
    expect(numbers).toMatchObject({ days: 2, eventPlaces: 1, localWords: 1, photos: 1, spent: { amount: 30, textJa: "€30" } });
    expect(numbers).not.toHaveProperty("rides");
  });

  it("never reads a relationship value", () => {
    const start = cityStart("mihon");
    expect(journeyNumbers({ ...start, affection: 99, trust: 99, spark: 99 }, [])).toEqual(journeyNumbers(start, []));
  });

  it("never shows spending below nothing (a scene may give money)", () => {
    const start = cityStart("mihon");
    expect(journeyNumbers({ ...start, travelBudget: start.travelBudget + 20 }, []).spent).toEqual({ amount: 0, textJa: "€0" });
  });
});
