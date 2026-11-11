import { describe, expect, it } from "vitest";
import { timeOfDayTint } from "./time-of-day";

const at = (hours: number, minutes = 0) => hours * 60 + minutes;
const alphaOf = (color: string) => Number(/, ([\d.]+)\)$/u.exec(color)![1]);

describe("the free-time background's colour of the time of day", () => {
  it("is pale and cool in the morning, none at midday, warm in the late afternoon and deep blue at night", () => {
    expect(timeOfDayTint(at(9))).toBe("rgba(214, 232, 255, 0.16)");
    expect(timeOfDayTint(at(12))).toBe("rgba(0, 0, 0, 0)");
    expect(timeOfDayTint(at(16, 30))).toBe("rgba(255, 138, 51, 0.22)");
    expect(timeOfDayTint(at(21))).toBe("rgba(18, 30, 78, 0.42)");
  });

  it("passes from one to the next: a tint fading out keeps its hue, and 18:00 is halfway to the night", () => {
    expect(timeOfDayTint(at(10, 45))).toBe("rgba(214, 232, 255, 0.08)");
    expect(timeOfDayTint(at(15))).toBe("rgba(255, 138, 51, 0.11)");
    expect(timeOfDayTint(at(18))).toBe("rgba(99, 67, 69, 0.32)");
    // The opacity changes step by step through the evening, never jumping.
    let previous = alphaOf(timeOfDayTint(at(17, 20)));
    for (let minute = at(17, 21); minute <= at(18, 40); minute++) {
      const alpha = alphaOf(timeOfDayTint(minute));
      expect(alpha).toBeGreaterThanOrEqual(previous);
      expect(alpha - previous).toBeLessThan(0.01);
      previous = alpha;
    }
  });

  it("wraps past midnight (a late return) and is the night before dawn", () => {
    expect(timeOfDayTint(at(24, 30))).toBe(timeOfDayTint(at(0, 30)));
    expect(timeOfDayTint(at(0, 30))).toBe("rgba(18, 30, 78, 0.42)");
    expect(timeOfDayTint(-30)).toBe(timeOfDayTint(at(23, 30)));
  });
});
