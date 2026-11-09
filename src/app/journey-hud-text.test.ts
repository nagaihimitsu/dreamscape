import { describe, expect, it } from "vitest";
import { moneyLength, weekdayLabel } from "./journey-hud-text";

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
});
