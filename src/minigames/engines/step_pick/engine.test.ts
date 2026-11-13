import { describe, expect, it } from "vitest";
import {
  STEP_PICK_GUARD_MS, STEP_PICK_MIN_STEP_MS, stepPickAutoRecord, stepPickEnd, stepPickEnding, stepPickFairness, stepPickRules, stepPickStarts,
  stepPickStepAt, type StepPickEnding, type StepPickTuning,
} from "./engine";

// The step_pick engine in its own words (docs/13 6.2): which step a take lands on, how a play ends, its fairness, and that
// 「おまかせ」 reaches every ending.

const TUNING: StepPickTuning = { stepsMs: [1600, 1400, 2400] };

describe("the step_pick engine", () => {
  it("shows each step for its time, one after another, and ends after the last", () => {
    expect(stepPickStarts(TUNING)).toEqual([0, 1600, 3000]);
    expect(stepPickEnd(TUNING)).toBe(5400);
    expect([0, 1599, 1600, 2999, 3000, 5399, 5400].map((ms) => stepPickStepAt(ms, TUNING))).toEqual([0, 0, 1, 1, 2, 2, 3]);
  });

  it("ends on the step on show when taken, on a leave, or when the steps run out", () => {
    expect(stepPickEnding({ kind: "take", ms: 1599 }, TUNING)).toEqual({ kind: "take", step: 0 });
    expect(stepPickEnding({ kind: "take", ms: 1600 }, TUNING)).toEqual({ kind: "take", step: 1 });
    expect(stepPickEnding({ kind: "take", ms: 5399 }, TUNING)).toEqual({ kind: "take", step: 2 });
    expect(stepPickEnding({ kind: "leave", ms: 4000 }, TUNING)).toEqual({ kind: "leave" });
    expect(stepPickEnding(null, TUNING)).toEqual({ kind: "none" });
    // After the end nothing counts; a take before the start (never sent by the play) takes the first step.
    expect(stepPickEnding({ kind: "take", ms: 5400 }, TUNING)).toEqual({ kind: "none" });
    expect(stepPickEnding({ kind: "leave", ms: 5400 }, TUNING)).toEqual({ kind: "none" });
    expect(stepPickEnding({ kind: "take", ms: -5 }, TUNING)).toEqual({ kind: "take", step: 0 });
    expect(stepPickEnding({ kind: "take", ms: Number.NaN }, TUNING)).toEqual({ kind: "none" });
  });

  it("plays 「おまかせ」 to every ending, a take in the middle of its step", () => {
    const endings: StepPickEnding[] = [{ kind: "take", step: 0 }, { kind: "take", step: 1 }, { kind: "take", step: 2 }, { kind: "leave" }, { kind: "none" }];
    for (const ending of endings) expect(stepPickEnding(stepPickAutoRecord(ending, TUNING), TUNING), JSON.stringify(ending)).toEqual(ending);
    expect(stepPickAutoRecord({ kind: "take", step: 1 }, TUNING)).toEqual({ kind: "take", ms: 2300 });
  });

  it("is fair: every step on show long enough to decide, the first one after the start's double-tap guard", () => {
    expect(stepPickFairness(TUNING)).toEqual([]);
    expect(stepPickFairness({ stepsMs: [1600, STEP_PICK_MIN_STEP_MS - 1] })).toHaveLength(1);
    expect(stepPickFairness({ stepsMs: [STEP_PICK_GUARD_MS + STEP_PICK_MIN_STEP_MS - 1, 1200] })).toHaveLength(1);
    expect(stepPickFairness({ stepsMs: [1600] })[0]).toContain("not a step_pick tuning");
  });

  it("makes a skin's rules from its table: a step's outcome, the leave's, the run-out's", () => {
    const rules = stepPickRules<object, "high" | "mid" | "low" | "gone">(TUNING, { steps: ["high", "mid", "low"], leave: "gone", none: "gone" });
    expect(rules.outcomeOf({ kind: "take", ms: 100 }, {})).toBe("high");
    expect(rules.outcomeOf({ kind: "take", ms: 3100 }, {})).toBe("low");
    expect(rules.outcomeOf(null, {})).toBe("gone");
    // 「おまかせ」 to the leave's outcome presses the leave button (sooner than letting the steps run out).
    expect(rules.autoRecord("gone", {})).toEqual({ kind: "leave", ms: 800 });
    expect(() => stepPickRules(TUNING, { steps: ["high", "mid"], leave: "gone", none: "gone" })).toThrow("2 step outcomes for 3 steps");
  });
});
