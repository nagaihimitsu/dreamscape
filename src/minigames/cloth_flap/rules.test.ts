import { describe, expect, it } from "vitest";
import { cueTapFairness, cueTapOutcome } from "../engines/cue_tap/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { clothFlap } from "./definition";
import { CLOTH_END_MS, CLOTH_FIELD, CLOTH_NICHE_MS, CLOTH_START_MS, CLOTH_TUNING, clothFlapRules } from "./rules";

describeMiniGameRules(clothFlap, clothFlapRules, { records: [null, 0, CLOTH_START_MS, CLOTH_END_MS, CLOTH_END_MS + 1, Number.NaN] });

describe("the flap's timing", () => {
  const { cleanEarlyMs, cleanLateMs, nearEarlyMs } = CLOTH_TUNING;
  const outcome = (ms: number | null) => clothFlapRules.outcomeOf(ms, {});

  it("spreads it right in front of her, too early before and too late after, however far off; frozen without a tap", () => {
    expect(outcome(CLOTH_NICHE_MS)).toBe("perfect");
    expect(outcome(CLOTH_NICHE_MS - cleanEarlyMs)).toBe("perfect");
    expect(outcome(CLOTH_NICHE_MS + cleanLateMs)).toBe("perfect");
    expect(outcome(CLOTH_NICHE_MS - cleanEarlyMs - 1)).toBe("early");
    expect(outcome(CLOTH_NICHE_MS - nearEarlyMs - 1)).toBe("early");
    // One step early, or as she starts down: she sees it coming.
    expect(outcome(CLOTH_NICHE_MS - CLOTH_FIELD.stepMs)).toBe("early");
    expect(outcome(CLOTH_START_MS)).toBe("early");
    expect(outcome(CLOTH_NICHE_MS + cleanLateMs + 1)).toBe("late");
    // One step past, or her last step: behind her back.
    expect(outcome(CLOTH_NICHE_MS + CLOTH_FIELD.stepMs)).toBe("late");
    expect(outcome(CLOTH_END_MS)).toBe("late");
    expect(outcome(null)).toBe("frozen");
    expect(outcome(CLOTH_END_MS + 1)).toBe("frozen");
    // Before she starts down, a tap does not count (the play records none, and the player can still spread it).
    expect(cueTapOutcome(0, CLOTH_TUNING)).toBe("none");
    expect(cueTapOutcome(CLOTH_START_MS - 1, CLOTH_TUNING)).toBe("none");
  });

  it("is fair on a phone, the gold step's beat is her fifth, and she goes on down before the end", () => {
    expect(cueTapFairness(CLOTH_TUNING)).toEqual([]);
    expect(CLOTH_NICHE_MS).toBe(CLOTH_START_MS + CLOTH_FIELD.stepMs * CLOTH_FIELD.stepsToNiche);
    expect(CLOTH_END_MS).toBeGreaterThan(CLOTH_NICHE_MS + CLOTH_FIELD.stepMs * CLOTH_FIELD.stepsPast);
    // She stands on each step for the clean window and still takes a real step (not a jump) down to the next.
    expect(CLOTH_FIELD.stepMs - cleanEarlyMs - cleanLateMs).toBeGreaterThanOrEqual(180);
  });
});
