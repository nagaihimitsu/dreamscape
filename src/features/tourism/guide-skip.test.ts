import { describe, expect, it } from "vitest";
import { guideEndLabel, guideSkipDestination } from "./guide-skip";

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

describe("the button on a guide's last line", () => {
  it("starts the observation where one follows the guide", () => {
    expect(guideEndLabel({ guideStoryId: "g" }, false)).toBe("観察を始める");
    expect(guideEndLabel({ guideStoryId: "g", observation: true, order: ["guide", "observe", "battle"] }, false)).toBe("観察を始める");
  });

  it("goes on to the quiz at a landmark without an observation, or where the order puts the quiz next", () => {
    expect(guideEndLabel({ guideStoryId: "g", observation: false }, false)).toBe("クイズへ進む");
    expect(guideEndLabel({ guideStoryId: "g", observation: false, order: ["guide", "battle"] }, false)).toBe("クイズへ進む");
    expect(guideEndLabel({ guideStoryId: "g", order: ["guide", "battle", "observe"] }, false)).toBe("クイズへ進む");
  });

  it("says 「次へ」 when the guide is the visit's last part", () => {
    expect(guideEndLabel({ guideStoryId: "g", order: ["observe", "battle", "guide"] }, false)).toBe("次へ");
    expect(guideEndLabel({ guideStoryId: "g", observation: false, order: ["battle", "guide"] }, false)).toBe("次へ");
  });

  it("goes back to the observation for a guide read again from there", () => {
    expect(guideEndLabel({ guideStoryId: "g", order: ["guide", "battle", "observe"] }, true)).toBe("観察を始める");
  });
});
