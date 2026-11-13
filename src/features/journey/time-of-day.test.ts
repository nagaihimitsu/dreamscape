import { describe, expect, it } from "vitest";
import { SCENE_TINT_STRENGTH, sceneTimeTint, titleArtTint, timeOfDayTint } from "./time-of-day";

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

describe("the title art's colour of the device's time of day", () => {
  it("is a faint warm wash in the morning, none by day, amber in the evening and deep blue at night", () => {
    const periods = Array.from({ length: 24 }, (_, hour) => titleArtTint(hour).period);
    expect(periods).toEqual([
      "night", "night", "night", "night", "night",
      "morning", "morning", "morning", "morning", "morning",
      "day", "day", "day", "day", "day", "day",
      "evening", "evening", "evening",
      "night", "night", "night", "night", "night",
    ]);
    expect(titleArtTint(7).color).toBe("rgba(255, 196, 140, 0.14)");
    expect(titleArtTint(12).color).toBeNull();
    expect(titleArtTint(17).color).toBe("rgba(255, 150, 50, 0.2)");
    expect(titleArtTint(22).color).toBe("rgba(18, 30, 78, 0.38)");
  });

  it("stays faint enough to leave the picture readable (opacity at most 0.4)", () => {
    for (let hour = 0; hour < 24; hour++) {
      const color = titleArtTint(hour).color;
      if (color) expect(alphaOf(color)).toBeLessThanOrEqual(0.4);
    }
  });

  it("wraps another hour into the day and counts an hour that is no number as midday", () => {
    expect(titleArtTint(24)).toEqual(titleArtTint(0));
    expect(titleArtTint(-1)).toEqual(titleArtTint(23));
    expect(titleArtTint(9.75).period).toBe("morning");
    expect(titleArtTint(Number.NaN)).toEqual({ period: "day", color: null });
  });
});

describe("a story scene's colour of the time of day (2026-11-13)", () => {
  it("is free time's colour at half its opacity: the evening's amber and the night's blue, none at midday", () => {
    expect(sceneTimeTint(at(16, 30), false)).toBe("rgba(255, 138, 51, 0.11)");
    expect(sceneTimeTint(at(21), false)).toBe("rgba(18, 30, 78, 0.21)");
    expect(sceneTimeTint(at(9), false)).toBe("rgba(214, 232, 255, 0.08)");
    expect(sceneTimeTint(at(12), false)).toBe("rgba(0, 0, 0, 0)");
    for (let minute = 0; minute < 24 * 60; minute += 10)
      expect(alphaOf(sceneTimeTint(minute, false))).toBeLessThanOrEqual(alphaOf(timeOfDayTint(minute)) * SCENE_TINT_STRENGTH + 0.001);
  });

  it("is none after the scene's # tint: off, at any hour", () => {
    for (const minute of [at(6), at(12), at(17), at(22)]) expect(sceneTimeTint(minute, true)).toBe("rgba(0, 0, 0, 0)");
  });

  it("keeps free time's own colour as it was (full strength by default)", () => {
    expect(timeOfDayTint(at(21), 1)).toBe(timeOfDayTint(at(21)));
    expect(timeOfDayTint(at(21), 0)).toBe("rgba(0, 0, 0, 0)");
  });
});
