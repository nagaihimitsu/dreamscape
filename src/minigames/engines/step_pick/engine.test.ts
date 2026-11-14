import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  STEP_PICK_AUTO_LEAD_MS, STEP_PICK_GUARD_MS, stepPickAutoRecord, stepPickCounted, stepPickEnding, stepPickFairness, stepPickRules, stepPickStanding,
  stepPickStepOf, stepPickStretchAt,
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

// Moods (round 3): the other side's routine for where the play stands; a push lands, bounces or calls a bluff by its mood.
describe("the step_pick moods", () => {
  const closed = (ms: number, look = "boast") => ({ mood: "closed" as const, ms, look });
  const open = (ms: number) => ({ mood: "open" as const, ms, look: "wobble" });
  const MOODS: StepPickTuning = {
    pushesPerStep: [2, 1], pushLimit: null, pushGapMs: 350, idleMs: 12000,
    moods: {
      routines: [
        [[closed(1000), open(1000)], [closed(500), open(1000), closed(800), open(900)]],
        [[closed(600, "turn"), { mood: "feint", ms: 1000, look: "peek" }, closed(1000), open(1000)]],
        [[closed(1000, "floor")]],
      ],
      patience: 2,
    },
  };
  const standing = (pushes: number[]) => stepPickStanding(pushes, MOODS);

  it("runs a routine in order, its last two then taking turns (one alone stays)", () => {
    const routine = MOODS.moods!.routines[0][1];
    expect([0, 499, 500, 1499, 1500, 2299, 2300, 3199, 3200, 3999, 4000, 4900].map((ms) => stepPickStretchAt(routine, ms).index)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6]);
    expect(stepPickStretchAt(routine, 3999).stretch.look).toBe("boast");
    expect(stepPickStretchAt(routine, 4000).stretch.mood).toBe("open");
    expect(stepPickStretchAt(MOODS.moods!.routines[2][0], 99999).stretch.look).toBe("floor");
  });

  it("lands a push in an open mood (enough of them move the step on and start its routine), bounces one in a closed mood", () => {
    expect(standing([1200]).results).toEqual(["landed"]);
    expect(standing([1200]).standing).toMatchObject({ step: 0, landed: 1, since: 1200 });
    // The routine after a landed push starts at it: 500 ms closed, then open.
    expect(standing([1200, 1600]).results).toEqual(["landed", "bounced"]);
    expect(standing([1200, 1800]).standing).toMatchObject({ step: 1, landed: 0, since: 1800 });
    // A bounce leaves the routine as it was (no new `since`).
    expect(standing([300]).standing).toMatchObject({ step: 0, landed: 0, bounces: 1, since: 0 });
    // Time alone moves nothing: a take after a long wait takes the first step.
    expect(stepPickEnding(take([], 11000), MOODS)).toEqual({ kind: "take", step: 0 });
  });

  it("calls a bluff with a push in its feint (the step moves on at once), and bounces one as it turns away", () => {
    const atOne = [1200, 1800];
    expect(standing([...atOne, 1800 + 700]).results.at(-1)).toBe("called");
    expect(standing([...atOne, 1800 + 700]).standing.step).toBe(2);
    expect(standing([...atOne, 1800 + 400]).results.at(-1)).toBe("bounced");
    // At the last step every push bounces.
    expect(standing([...atOne, 2500, 3200]).results.at(-1)).toBe("bounced");
  });

  it("ends the play when its patience is spent (out), else as without moods", () => {
    expect(stepPickEnding({ pushes: [100, 500], end: null }, MOODS)).toEqual({ kind: "out" });
    expect(stepPickEnding(take([100, 1200, 1800], 2200), MOODS)).toEqual({ kind: "take", step: 1 });
    expect(stepPickEnding({ pushes: [1200], end: { kind: "leave", ms: 1500 } }, MOODS)).toEqual({ kind: "leave" });
    expect(stepPickEnding({ pushes: [], end: null }, MOODS)).toEqual({ kind: "none" });
  });

  it("plays 「おまかせ」 to every ending with moods: pushes in its openings (and its feint), or in its closed moods for out", () => {
    const endings: StepPickEnding[] = [{ kind: "take", step: 0 }, { kind: "take", step: 1 }, { kind: "take", step: 2 }, { kind: "leave" }, { kind: "out" }, { kind: "none" }];
    for (const ending of endings) expect(stepPickEnding(stepPickAutoRecord(ending, MOODS), MOODS), JSON.stringify(ending)).toEqual(ending);
    const two = stepPickAutoRecord({ kind: "take", step: 2 }, MOODS);
    expect(standing([...two.pushes]).results).toEqual(["landed", "landed", "called"]);
    expect(two.pushes[0]).toBeGreaterThan(STEP_PICK_GUARD_MS);
  });

  it("is fair only with openings long enough to read, that come back, before doing nothing ends it", () => {
    expect(stepPickFairness(MOODS)).toEqual([]);
    const routines = MOODS.moods!.routines;
    expect(stepPickFairness({ ...MOODS, pushLimit: 5 }).join()).toContain("a push limit with moods");
    expect(stepPickFairness({ ...MOODS, moods: { ...MOODS.moods!, routines: [routines[0], [[closed(600), open(500)]], routines[2]] } }).join()).toContain("no time to read it");
    expect(stepPickFairness({ ...MOODS, moods: { ...MOODS.moods!, routines: [routines[0], [[open(1000), closed(600), closed(900)]], routines[2]] } }).join()).toContain("never open");
    expect(stepPickFairness({ ...MOODS, moods: { ...MOODS.moods!, routines: [[[closed(9500), open(1000)], routines[0][1]], routines[1], routines[2]] } }).join()).toContain("first opens after 9500");
    expect(stepPickFairness({ ...MOODS, moods: { ...MOODS.moods!, routines: [routines[0], routines[1]] } }).join()).toContain("2 steps of routines for 3 steps");
    expect(stepPickFairness({ ...MOODS, moods: { ...MOODS.moods!, routines: [[routines[0][0]], routines[1], routines[2]] } }).join()).toContain("1 routines for its 2 landed pushes");
  });
});
