import { describe, expect, it } from "vitest";
import { cityStart } from "../../dev/scenario-builders";
import { COUNT_UP_MS, countUpValue, journeyNumbers } from "./journey-numbers";

// 旅の数字 leaves out a kind of number the journey's content has none of (2026-11-13), never a lasting 0.
describe("the lines a journey's numbers show", () => {
  it("leaves out the words of the country and the album where the journey has none (Milano)", () => {
    const numbers = journeyNumbers(cityStart("milano"), []);
    expect(numbers.localWords).toBeNull();
    expect(numbers.photos).toBeNull();
    expect(numbers.people).toBe(0);
  });

  it("keeps them where the journey has them, at 0 before any (the Golden Triangle)", () => {
    expect(journeyNumbers(cityStart("delhi"), [])).toMatchObject({ localWords: 0, photos: 0 });
  });
});

// 旅の数字's count up (2026-11-13): quick, eased, whole numbers, ending on the number itself.

describe("the count up of a journey's number", () => {
  it("starts at 0, rises eased out in whole numbers and ends on the number", () => {
    expect(countUpValue(12, 0)).toBe(0);
    const middle = countUpValue(12, COUNT_UP_MS / 2);
    expect(middle).toBeGreaterThan(6);
    expect(middle).toBeLessThan(12);
    expect(Number.isInteger(countUpValue(12, 123))).toBe(true);
    expect(countUpValue(12, COUNT_UP_MS)).toBe(12);
    expect(countUpValue(12, COUNT_UP_MS * 3)).toBe(12);
  });

  it("never goes past the number nor below 0, and shows it at once without a length", () => {
    for (let elapsed = -50; elapsed <= COUNT_UP_MS + 50; elapsed += 25) {
      const value = countUpValue(30000, elapsed);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(30000);
    }
    expect(countUpValue(7, 0, 0)).toBe(7);
  });
});
