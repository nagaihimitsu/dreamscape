import { describe, expect, it } from "vitest";
import { moneyLength, placeNameIsCut, weekdayLabel } from "./journey-hud-text";

describe("header text", () => {
  it("names the game's weekday in short and in full", () => {
    expect(weekdayLabel(0)).toEqual({ short: "（月）", spoken: "ゲーム内の月曜日" });
    expect(weekdayLabel(6)).toEqual({ short: "（日）", spoken: "ゲーム内の日曜日" });
  });

  it("sets a long budget smaller, by its characters", () => {
    expect(moneyLength("€60")).toBe("regular");
    expect(moneyLength("₹30,000")).toBe("regular");
    expect(moneyLength("₭2,000,000")).toBe("long");
    expect(moneyLength("soʻm 4,000,000")).toBe("longer");
  });

  // Heights measured in Chromium (Noto Serif JP served locally) on the place line of the header
  // with 「ドゥオモ広場」, which fits: its glyphs reach 1–2 px past the line. A cut name is a line more.
  it("counts a place name as cut only when a line of it is hidden, not when its glyphs reach past the line", () => {
    expect(placeNameIsCut({ scrollHeight: 17, clientHeight: 16, lineHeight: 16.25 })).toBe(false); // 320 px, 100 %
    expect(placeNameIsCut({ scrollHeight: 22, clientHeight: 20, lineHeight: 20.125 })).toBe(false); // 844 × 390, 115 %
    expect(placeNameIsCut({ scrollHeight: 28, clientHeight: 26, lineHeight: 26.25 })).toBe(false); // 844 × 390, 150 %
    expect(placeNameIsCut({ scrollHeight: 37, clientHeight: 35, lineHeight: 35 })).toBe(false); // 667 × 375, 200 %
    expect(placeNameIsCut({ scrollHeight: 33, clientHeight: 16, lineHeight: 16.25 })).toBe(true); // two lines at 100 %
    expect(placeNameIsCut({ scrollHeight: 79, clientHeight: 26, lineHeight: 26.25 })).toBe(true); // three lines at 150 %
  });

  it("falls back on the line's own height when the line height is not a length", () => {
    expect(placeNameIsCut({ scrollHeight: 18, clientHeight: 16, lineHeight: Number.NaN })).toBe(false);
    expect(placeNameIsCut({ scrollHeight: 32, clientHeight: 16, lineHeight: Number.NaN })).toBe(true);
  });
});
