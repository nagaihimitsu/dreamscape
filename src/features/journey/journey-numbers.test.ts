import { describe, expect, it } from "vitest";
import { COUNT_UP_MS, countUpValue } from "./journey-numbers";

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
