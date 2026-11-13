import { describe, expect, it } from "vitest";
import { cueTapFairness } from "../engines/cue_tap/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { clothFlap } from "./definition";
import { CLOTH_END_MS, CLOTH_FIELD, CLOTH_NICHE_MS, CLOTH_START_MS, CLOTH_TUNING, clothFlapRules } from "./rules";

describeMiniGameRules(clothFlap, clothFlapRules, { records: [null, 0, CLOTH_START_MS, CLOTH_END_MS, CLOTH_END_MS + 1, Number.NaN] });

describe("the flap's timing", () => {
  const { cleanMs, nearMs } = CLOTH_TUNING;
  const outcome = (ms: number | null) => clothFlapRules.outcomeOf(ms, {});

  it("spreads it right in front of her, too early before and too late after, however far off; frozen without a tap", () => {
    expect(outcome(CLOTH_NICHE_MS)).toBe("perfect");
    expect(outcome(CLOTH_NICHE_MS - cleanMs)).toBe("perfect");
    expect(outcome(CLOTH_NICHE_MS + cleanMs)).toBe("perfect");
    expect(outcome(CLOTH_NICHE_MS - cleanMs - 1)).toBe("early");
    expect(outcome(CLOTH_NICHE_MS - nearMs - 1)).toBe("early");
    // One step early, or before she has even started down: she sees it coming.
    expect(outcome(CLOTH_NICHE_MS - CLOTH_FIELD.stepMs)).toBe("early");
    expect(outcome(0)).toBe("early");
    expect(outcome(CLOTH_NICHE_MS + cleanMs + 1)).toBe("late");
    // One step past, or her last step: behind her back.
    expect(outcome(CLOTH_NICHE_MS + CLOTH_FIELD.stepMs)).toBe("late");
    expect(outcome(CLOTH_END_MS)).toBe("late");
    expect(outcome(null)).toBe("frozen");
    expect(outcome(CLOTH_END_MS + 1)).toBe("frozen");
  });

  it("is fair on a phone, her foot lands in front of the niche at the moment, and she goes on down before the end", () => {
    expect(cueTapFairness(CLOTH_TUNING)).toEqual([]);
    expect(CLOTH_NICHE_MS).toBe(CLOTH_START_MS + CLOTH_FIELD.stepMs * CLOTH_FIELD.stepsToNiche);
    expect(CLOTH_END_MS).toBeGreaterThan(CLOTH_NICHE_MS + CLOTH_FIELD.stepMs * CLOTH_FIELD.stepsPast);
    // A step is wider than the near window: one step early or late is never perfect.
    expect(CLOTH_FIELD.stepMs).toBeGreaterThan(nearMs);
  });
});
