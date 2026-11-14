import { describe, expect, it } from "vitest";
import { guideSkipDestination } from "./guide-skip";

describe("where a guide's 「案内をとばす」 leads", () => {
  it("names the visit's next main part after the guide", () => {
    expect(guideSkipDestination({ guideStoryId: "g" }, false)).toBe("観察へ");
    expect(guideSkipDestination({ guideStoryId: "g", observation: false }, false)).toBe("クイズへ");
    expect(guideSkipDestination({ guideStoryId: "g", order: ["guide", "battle", "observe"] }, false)).toBe("クイズへ");
  });

  it("names nothing when the guide is the visit's last part", () => {
    expect(guideSkipDestination({ guideStoryId: "g", order: ["observe", "battle", "guide"] }, false)).toBe("");
  });

  it("goes back to the observation for a guide read again from there", () => {
    expect(guideSkipDestination({ guideStoryId: "g", order: ["guide", "battle", "observe"] }, true)).toBe("観察へ");
  });
});
