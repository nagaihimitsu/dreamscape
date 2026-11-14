import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  STEP_PICK_AUTO_LEAD_MS, STEP_PICK_GUARD_MS, stepPickAutoRecord, stepPickCounted, stepPickEnding, stepPickFairness, stepPickRules, stepPickStepOf,
  stepPickSteps, stepPickThresholds, type StepPickEnding, type StepPickRecord, type StepPickTuning,
} from "./engine";

// The step_pick engine in its own words (docs/13 6.2): presses move the steps on (never time), the push gap, the push
// limit, the idle end, its fairness, and that 「おまかせ」 reaches every ending.

const TUNING: StepPickTuning = { pushesPerStep: [2, 2], pushLimit: 5, pushGapMs: 350, idleMs: 12000 };
const take = (pushes: number[], ms: number): StepPickRecord => ({ pushes, end: { kind: "take", ms } });

describe("the step_pick engine", () => {
  it("moves the steps on by counted pushes only, two a step here, the last step staying", () => {
    expect(stepPickSteps(TUNING)).toBe(3);
    expect(stepPickThresholds(TUNING)).toEqual([0, 2, 4]);
    expect([0, 1, 2, 3, 4, 5, 9].map((count) => stepPickStepOf(count, TUNING))).toEqual([0, 0, 1, 1, 2, 2, 2]);
    // Time alone changes nothing: a take long after the start, with no push, takes the first step.
    expect(stepPickEnding(take([], 11000), TUNING)).toEqual({ kind: "take", step: 0 });
  });

  it("counts a push only at least the push gap after the last counted one (no mashing)", () => {
    expect(stepPickCounted([1000, 1100, 1349, 1350, 1360, 2000], TUNING)).toEqual([1000, 1350, 2000]);
    expect(stepPickCounted([1000, 900, -5, Number.NaN, 1400], TUNING)).toEqual([1000, 1400]);
    expect(stepPickEnding(take([1000, 1100, 1200], 2000), TUNING)).toEqual({ kind: "take", step: 0 });
    expect(stepPickEnding(take([1000, 1400], 2000), TUNING)).toEqual({ kind: "take", step: 1 });
  });

  it("takes the step on show when taken, leaves on a leave, ends at the push limit, and runs out after the idle time", () => {
    expect(stepPickEnding(take([1000, 1500, 2000, 2500], 3000), TUNING)).toEqual({ kind: "take", step: 2 });
    // A take before a push counts the pushes before it only.
    expect(stepPickEnding(take([1000, 1500, 4000], 3000), TUNING)).toEqual({ kind: "take", step: 1 });
    expect(stepPickEnding({ pushes: [1000], end: { kind: "leave", ms: 1200 } }, TUNING)).toEqual({ kind: "leave" });
    // The fifth push: the other side gives up, whatever came after.
    expect(stepPickEnding(take([1000, 1500, 2000, 2500, 3000], 3500), TUNING)).toEqual({ kind: "out" });
    expect(stepPickEnding({ pushes: [1000, 1500, 2000, 2500, 3000], end: null }, TUNING)).toEqual({ kind: "out" });
    // Nothing done for the idle time (from the start, or from the last push) ends it with nothing.
    expect(stepPickEnding({ pushes: [], end: null }, TUNING)).toEqual({ kind: "none" });
    expect(stepPickEnding(take([], 12000), TUNING)).toEqual({ kind: "none" });
    expect(stepPickEnding(take([1000], 12999), TUNING)).toEqual({ kind: "take", step: 0 });
    expect(stepPickEnding(take([1000, 13500], 14000), TUNING)).toEqual({ kind: "none" });
    // A record of no shape reads as nothing done.
    expect(stepPickEnding(null, TUNING)).toEqual({ kind: "none" });
    expect(stepPickEnding({ pushes: "x", end: { kind: "jump", ms: 1 } } as never, TUNING)).toEqual({ kind: "none" });
  });

  it("plays 「おまかせ」 to every ending, after the start's guard, its presses wider apart than the push gap", () => {
    const endings: StepPickEnding[] = [{ kind: "take", step: 0 }, { kind: "take", step: 1 }, { kind: "take", step: 2 }, { kind: "leave" }, { kind: "out" }, { kind: "none" }];
    for (const ending of endings) expect(stepPickEnding(stepPickAutoRecord(ending, TUNING), TUNING), JSON.stringify(ending)).toEqual(ending);
    expect(stepPickAutoRecord({ kind: "take", step: 1 }, TUNING)).toEqual({ pushes: [1000, 1700], end: { kind: "take", ms: 2400 } });
    expect(STEP_PICK_AUTO_LEAD_MS).toBeGreaterThan(STEP_PICK_GUARD_MS);
  });

  it("is fair: the last step can be taken before the push limit, deliberate presses count, time to decide", () => {
    expect(stepPickFairness(TUNING)).toEqual([]);
    expect(stepPickFairness({ ...TUNING, pushLimit: 4 }).join()).toContain("push limit 4");
    expect(stepPickFairness({ ...TUNING, pushGapMs: 900 }).join()).toContain("drops deliberate presses");
    expect(stepPickFairness({ ...TUNING, idleMs: 3000 }).join()).toContain("time to decide");
    expect(stepPickFairness({ ...TUNING, pushesPerStep: [] })[0]).toContain("not a step_pick tuning");
    expect(stepPickFairness({ ...TUNING, pushLimit: null })).toEqual([]);
  });

  it("makes a skin's rules from its table: a step's outcome, the leave's, the push limit's, the run-out's", () => {
    const rules = stepPickRules<object, "high" | "mid" | "low" | "gone">(TUNING, { steps: ["high", "mid", "low"], leave: "gone", out: "gone", none: "gone" });
    expect(rules.outcomeOf(take([], 600), {})).toBe("high");
    expect(rules.outcomeOf(take([1000, 1400, 1800, 2200], 2600), {})).toBe("low");
    expect(rules.outcomeOf({ pushes: [], end: null }, {})).toBe("gone");
    // 「おまかせ」 to the leave's outcome presses the leave button (sooner than staring him out or waiting).
    expect(rules.autoRecord("gone", {})).toEqual({ pushes: [], end: { kind: "leave", ms: 1000 } });
    expect(() => stepPickRules(TUNING, { steps: ["high", "mid"], leave: "gone", out: "gone", none: "gone" })).toThrow("2 step outcomes for 3 steps");
  });

  it("keeps its rules pure: no randomness, clock, DOM or React", () => {
    const source = readFileSync(new URL("./engine.ts", import.meta.url), "utf8");
    for (const banned of ["Math.random", "crypto", "Date.now", "performance.now", "from \"react\"", "content/generated"]) expect(source).not.toContain(banned);
  });
});
