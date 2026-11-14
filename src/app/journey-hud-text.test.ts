import { describe, expect, it } from "vitest";
import { autoSaveLine, moneyLength, weekdayLabel } from "./journey-hud-text";

describe("header text", () => {
  it("names the game's weekday in short and in full", () => {
    expect(weekdayLabel(0)).toEqual({ short: "（月）", spoken: "ゲーム内の月曜日" });
    expect(weekdayLabel(6)).toEqual({ short: "（日）", spoken: "ゲーム内の日曜日" });
  });

  it("sets a long budget smaller, by its characters", () => {
    expect(moneyLength("€60")).toBe("regular");
    expect(moneyLength("₹30,000")).toBe("regular");
    // A seven-digit amount is long whatever its currency, like Laos' kip.
    expect(moneyLength("₹3,000,000")).toBe("long");
    expect(moneyLength("₭2,000,000")).toBe("long");
    expect(moneyLength("soʻm 4,000,000")).toBe("longer");
  });

  // The menu's line under セーブ・ロード while saving is automatic (2026-11-14): a time ago, never a clock time.
  it("says how long ago the game was last saved automatically", () => {
    const now = 1_800_000_000_000;
    expect(autoSaveLine(null, now)).toBe("自動保存：オン");
    expect(autoSaveLine(now - 59_000, now)).toBe("自動保存：たった今");
    expect(autoSaveLine(now + 5_000, now)).toBe("自動保存：たった今");
    expect(autoSaveLine(now - 3 * 60_000, now)).toBe("自動保存：3分前");
    expect(autoSaveLine(now - 59 * 60_000, now)).toBe("自動保存：59分前");
    expect(autoSaveLine(now - 125 * 60_000, now)).toBe("自動保存：2時間前");
  });
});
