import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  CUE_TAP_OUTCOMES, cueTapAutoRecord, cueTapEnd, cueTapFairness, cueTapMeter, cueTapMoment, cueTapOutcome, cueTapRules, cueTapStart,
  cueTapTuningSchema, cueTapZones, type CueTapTuning,
} from "./engine";

// The cue_tap engine's rules in its own words (docs/13 6.2): a skin's test passes its tuning through cueTapFairness.
const tuning: CueTapTuning = { leadMs: 1000, approachMs: 1000, cleanMs: 80, nearMs: 200, noneAfterMs: 600 };
const moment = cueTapMoment(tuning);

describe("the cue_tap engine", () => {
  it("is clean around the moment, early or late a little off, a miss further off, none without a tap in time", () => {
    expect(cueTapOutcome(moment, tuning)).toBe("clean");
    expect(cueTapOutcome(moment - tuning.cleanMs, tuning)).toBe("clean");
    expect(cueTapOutcome(moment + tuning.cleanMs, tuning)).toBe("clean");
    expect(cueTapOutcome(moment - tuning.cleanMs - 1, tuning)).toBe("early");
    expect(cueTapOutcome(moment - tuning.nearMs, tuning)).toBe("early");
    expect(cueTapOutcome(moment + tuning.cleanMs + 1, tuning)).toBe("late");
    expect(cueTapOutcome(moment + tuning.nearMs, tuning)).toBe("late");
    expect(cueTapOutcome(moment - tuning.nearMs - 1, tuning)).toBe("miss");
    expect(cueTapOutcome(moment + tuning.nearMs + 1, tuning)).toBe("miss");
    // A tap before the thing starts coming is a tap too: a miss. So is one right at the end.
    expect(cueTapOutcome(0, tuning)).toBe("miss");
    expect(cueTapOutcome(cueTapEnd(tuning), tuning)).toBe("miss");
    expect(cueTapOutcome(null, tuning)).toBe("none");
    expect(cueTapOutcome(cueTapEnd(tuning) + 1, tuning)).toBe("none");
    expect(cueTapOutcome(Number.NaN, tuning)).toBe("none");
  });

  it("taps 「おまかせ」 at a time that does each outcome", () => {
    for (const outcome of CUE_TAP_OUTCOMES) expect(cueTapOutcome(cueTapAutoRecord(outcome, tuning), tuning), outcome).toBe(outcome);
  });

  it("moves the needle from the start of the approach to the end, the clean zone inside the near one around the moment", () => {
    expect(cueTapMeter(0, tuning)).toBe(0);
    expect(cueTapMeter(cueTapStart(tuning), tuning)).toBe(0);
    expect(cueTapMeter(cueTapEnd(tuning), tuning)).toBe(1);
    expect(cueTapMeter(cueTapEnd(tuning) + 500, tuning)).toBe(1);
    const { near, clean } = cueTapZones(tuning);
    expect(near[0]).toBeLessThan(clean[0]);
    expect(clean[0]).toBeLessThan(cueTapMeter(moment, tuning));
    expect(cueTapMeter(moment, tuning)).toBeLessThan(clean[1]);
    expect(clean[1]).toBeLessThan(near[1]);
    expect(near[1]).toBeLessThan(1);
  });

  it("calls a tuning unfair when a phone's tap lag, the start's double tap or the end would decide the play", () => {
    expect(cueTapFairness(tuning)).toEqual([]);
    expect(cueTapFairness({ ...tuning, cleanMs: 40 }).join()).toContain("cleanMs 40");
    expect(cueTapFairness({ ...tuning, nearMs: 120 }).join()).toContain("less than twice cleanMs");
    expect(cueTapFairness({ ...tuning, leadMs: 300 }).join()).toContain("double-tap guard");
    expect(cueTapFairness({ ...tuning, noneAfterMs: 150 }).join()).toContain("inside the near window");
    expect(() => cueTapTuningSchema.parse({ ...tuning, cleanMs: -1 })).toThrow();
  });

  it("gives a skin its outcomes through a table, and 「おまかせ」 to each of them", () => {
    const rules = cueTapRules<object, "hit" | "drop">(tuning, { clean: "hit", early: "hit", late: "drop", miss: "drop", none: "drop" });
    expect(rules.outcomeOf(moment, {})).toBe("hit");
    expect(rules.outcomeOf(null, {})).toBe("drop");
    for (const outcome of ["hit", "drop"] as const) expect(rules.outcomeOf(rules.autoRecord(outcome, {}), {})).toBe(outcome);
  });

  it("keeps its rules pure: no randomness, clock, DOM or React", () => {
    const source = readFileSync(new URL("./engine.ts", import.meta.url), "utf8");
    for (const banned of ["Math.random", "crypto", "Date.now", "performance.now", "from \"react\"", "content/generated"]) expect(source).not.toContain(banned);
  });
});
