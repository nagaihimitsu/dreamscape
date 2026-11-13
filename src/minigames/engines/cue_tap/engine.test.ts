import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  CUE_TAP_OUTCOMES, cueTapAutoRecord, cueTapCounts, cueTapEnd, cueTapFairness, cueTapLateMissRecord, cueTapMeter, cueTapMoment, cueTapOutcome, cueTapRules,
  cueTapStart, cueTapTuningSchema, cueTapZones, type CueTapTuning,
} from "./engine";

// The cue_tap engine's rules in its own words (docs/13 6.2): a skin's test passes its tuning through cueTapFairness.
const tuning: CueTapTuning = { leadMs: 1000, approachMs: 1000, cleanEarlyMs: 80, cleanLateMs: 120, nearEarlyMs: 200, nearLateMs: 260, noneAfterMs: 600 };
const moment = cueTapMoment(tuning);

describe("the cue_tap engine", () => {
  it("is clean around the moment (wider after it), early or late a little off, a miss further off, none without a tap in time", () => {
    expect(cueTapOutcome(moment, tuning)).toBe("clean");
    expect(cueTapOutcome(moment - tuning.cleanEarlyMs, tuning)).toBe("clean");
    expect(cueTapOutcome(moment + tuning.cleanLateMs, tuning)).toBe("clean");
    expect(cueTapOutcome(moment - tuning.cleanEarlyMs - 1, tuning)).toBe("early");
    expect(cueTapOutcome(moment - tuning.nearEarlyMs, tuning)).toBe("early");
    expect(cueTapOutcome(moment + tuning.cleanLateMs + 1, tuning)).toBe("late");
    expect(cueTapOutcome(moment + tuning.nearLateMs, tuning)).toBe("late");
    expect(cueTapOutcome(moment - tuning.nearEarlyMs - 1, tuning)).toBe("miss");
    expect(cueTapOutcome(moment + tuning.nearLateMs + 1, tuning)).toBe("miss");
    // A phone's lag lands a tap late: as far after the moment as the early side reaches before it is still clean.
    expect(cueTapOutcome(moment + tuning.cleanEarlyMs + 30, tuning)).toBe("clean");
    expect(cueTapOutcome(cueTapStart(tuning), tuning)).toBe("miss");
    expect(cueTapOutcome(cueTapEnd(tuning), tuning)).toBe("miss");
    expect(cueTapOutcome(null, tuning)).toBe("none");
    expect(cueTapOutcome(cueTapEnd(tuning) + 1, tuning)).toBe("none");
    expect(cueTapOutcome(Number.NaN, tuning)).toBe("none");
  });

  it("does not count a tap before the thing starts coming: it decides nothing (no tap), the next one counts", () => {
    expect(cueTapCounts(0, tuning)).toBe(false);
    expect(cueTapCounts(cueTapStart(tuning) - 1, tuning)).toBe(false);
    expect(cueTapCounts(cueTapStart(tuning), tuning)).toBe(true);
    expect(cueTapCounts(cueTapEnd(tuning), tuning)).toBe(true);
    expect(cueTapCounts(cueTapEnd(tuning) + 1, tuning)).toBe(false);
    expect(cueTapOutcome(0, tuning)).toBe("none");
    expect(cueTapOutcome(cueTapStart(tuning) - 1, tuning)).toBe("none");
  });

  it("taps 「おまかせ」 at a time that does each outcome, where a tap counts", () => {
    for (const outcome of CUE_TAP_OUTCOMES) {
      const record = cueTapAutoRecord(outcome, tuning);
      expect(cueTapOutcome(record, tuning), outcome).toBe(outcome);
      if (record !== null) expect(cueTapCounts(record, tuning), outcome).toBe(true);
    }
  });

  it("moves the needle from the start of the approach to the end, the clean zone inside the near one, wider after the moment", () => {
    expect(cueTapMeter(0, tuning)).toBe(0);
    expect(cueTapMeter(cueTapStart(tuning), tuning)).toBe(0);
    expect(cueTapMeter(cueTapEnd(tuning), tuning)).toBe(1);
    expect(cueTapMeter(cueTapEnd(tuning) + 500, tuning)).toBe(1);
    const { near, clean } = cueTapZones(tuning);
    const at = cueTapMeter(moment, tuning);
    expect(near[0]).toBeLessThan(clean[0]);
    expect(clean[0]).toBeLessThan(at);
    expect(at).toBeLessThan(clean[1]);
    expect(clean[1]).toBeLessThan(near[1]);
    expect(near[1]).toBeLessThan(1);
    expect(clean[1] - at).toBeGreaterThan(at - clean[0]);
  });

  it("calls a tuning unfair when a phone's tap lag, the start's double tap or the end would decide the play", () => {
    expect(cueTapFairness(tuning)).toEqual([]);
    expect(cueTapFairness({ ...tuning, cleanEarlyMs: 40 }).join()).toContain("cleanEarlyMs 40");
    expect(cueTapFairness({ ...tuning, cleanLateMs: 80 }).join()).toContain("a phone lands a tap late");
    expect(cueTapFairness({ ...tuning, nearEarlyMs: 120 }).join()).toContain("less than twice cleanEarlyMs");
    expect(cueTapFairness({ ...tuning, nearLateMs: 200 }).join()).toContain("less than twice cleanLateMs");
    expect(cueTapFairness({ ...tuning, leadMs: 300 }).join()).toContain("double-tap guard");
    expect(cueTapFairness({ ...tuning, noneAfterMs: 250 }).join()).toContain("inside the near window");
    expect(cueTapFairness({ ...tuning, approachMs: 250 }).join()).toContain("before the thing starts coming");
    expect(() => cueTapTuningSchema.parse({ ...tuning, cleanEarlyMs: -1 })).toThrow();
    expect(() => cueTapTuningSchema.parse({ ...tuning, cleanMs: 90 })).toThrow();
  });

  it("gives a skin its outcomes through a table, and 「おまかせ」 to each of them", () => {
    const rules = cueTapRules<object, "hit" | "drop">(tuning, { clean: "hit", early: "hit", late: "drop", miss: "drop", none: "drop" });
    expect(rules.outcomeOf(moment, {})).toBe("hit");
    expect(rules.outcomeOf(null, {})).toBe("drop");
    for (const outcome of ["hit", "drop"] as const) expect(rules.outcomeOf(rules.autoRecord(outcome, {}), {})).toBe(outcome);
  });

  it("splits a far-off tap by its side when a skin asks, and 「おまかせ」 reaches a late miss before the end", () => {
    type Side = "hit" | "soon" | "after" | "never";
    const rules = cueTapRules<object, Side>(tuning, { clean: "hit", early: "soon", late: "after", miss: { early: "soon", late: "after" }, none: "never" });
    expect(rules.outcomeOf(moment, {})).toBe("hit");
    expect(rules.outcomeOf(cueTapStart(tuning), {})).toBe("soon");
    expect(rules.outcomeOf(moment - tuning.nearEarlyMs - 1, {})).toBe("soon");
    expect(rules.outcomeOf(moment + tuning.nearLateMs + 1, {})).toBe("after");
    expect(rules.outcomeOf(cueTapEnd(tuning), {})).toBe("after");
    expect(rules.outcomeOf(null, {})).toBe("never");
    // A tap before the start is no tap, as one after the end.
    expect(rules.outcomeOf(0, {})).toBe("never");
    expect(rules.outcomeOf(cueTapEnd(tuning) + 1, {})).toBe("never");
    for (const outcome of ["hit", "soon", "after", "never"] as const) expect(rules.outcomeOf(rules.autoRecord(outcome, {}), {})).toBe(outcome);
    // A skin whose sides of a miss are outcomes of their own reaches each of them.
    const own = cueTapRules<object, "clean" | "early" | "late" | "far_early" | "far_late" | "none">(tuning,
      { clean: "clean", early: "early", late: "late", miss: { early: "far_early", late: "far_late" }, none: "none" });
    expect(cueTapOutcome(cueTapLateMissRecord(tuning), tuning)).toBe("miss");
    expect(cueTapLateMissRecord(tuning)).toBeLessThanOrEqual(cueTapEnd(tuning));
    for (const outcome of ["clean", "early", "late", "far_early", "far_late", "none"] as const) expect(own.outcomeOf(own.autoRecord(outcome, {}), {})).toBe(outcome);
  });

  it("keeps a one-outcome miss as before: the early miss for 「おまかせ」", () => {
    const rules = cueTapRules<object, "a" | "b" | "c" | "d" | "e">(tuning, { clean: "a", early: "b", late: "c", miss: "d", none: "e" });
    expect(rules.autoRecord("d", {})).toBe(cueTapAutoRecord("miss", tuning));
    expect(rules.outcomeOf(moment + tuning.nearLateMs + 1, {})).toBe("d");
    expect(rules.outcomeOf(cueTapStart(tuning), {})).toBe("d");
    expect(rules.outcomeOf(0, {})).toBe("e");
  });

  it("keeps its rules pure: no randomness, clock, DOM or React", () => {
    const source = readFileSync(new URL("./engine.ts", import.meta.url), "utf8");
    for (const banned of ["Math.random", "crypto", "Date.now", "performance.now", "from \"react\"", "content/generated"]) expect(source).not.toContain(banned);
  });
});
