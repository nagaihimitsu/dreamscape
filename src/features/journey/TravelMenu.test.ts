import { describe, expect, it } from "vitest";
import { formatEndingWindows } from "./travel-time";

describe("displaying travel ending windows", () => {
  it("omits the midnight lower bound for a single ending deadline", () => {
    expect(formatEndingWindows([{ start: 0, end: 1155 }])).toBe("19:15まで");
  });

  it("preserves nonzero lower bounds and separate windows", () => {
    expect(formatEndingWindows([{ start: 600, end: 900 }])).toBe("10:00〜15:00");
    expect(formatEndingWindows([{ start: 0, end: 900 }, { start: 960, end: 1155 }])).toBe("00:00〜15:00・16:00〜19:15");
  });
});
