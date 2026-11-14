import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CUE_TAP_PLAYERS, cueTapBotTally, cueTapShares } from "./bot";
import {
  CUE_TAP_OUTCOMES, CUE_TAP_READ_MS, CUE_TAP_TELL_MS, cueTapAutoRecord, cueTapCounts, cueTapEnd, cueTapFairness, cueTapLateMissRecord, cueTapMeter, cueTapMoment,
  cueTapOutcome, cueTapRating, cueTapRules, cueTapScriptFairness, cueTapStart, cueTapTuningFor, cueTapTuningSchema, cueTapZones, type CueTapScript, type CueTapTuning,
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

  it("rates a tap for the result card in step with its outcome (clean ★3, near ★2, a miss ★1, no tap none), saying how far off", () => {
    expect(cueTapRating(moment, tuning)).toEqual({ stars: 3, scoreJa: "0.00秒差" });
    expect(cueTapRating(moment + tuning.cleanLateMs, tuning)).toEqual({ stars: 3, scoreJa: "0.12秒差" });
    expect(cueTapRating(moment - 150, tuning)).toEqual({ stars: 2, scoreJa: "0.15秒早い" });
    expect(cueTapRating(moment + 200, tuning)).toEqual({ stars: 2, scoreJa: "0.20秒遅い" });
    expect(cueTapRating(moment + tuning.nearLateMs + 1, tuning)?.stars).toBe(1);
    expect(cueTapRating(null, tuning)).toBeNull();
    expect(cueTapRating(0, tuning)).toBeNull();
    const rules = cueTapRules<object, "a" | "b" | "c" | "d" | "e">(tuning, { clean: "a", early: "b", late: "c", miss: "d", none: "e" });
    for (let ms = 0; ms <= cueTapEnd(tuning) + 50; ms += 5) expect(rules.rate!(ms, {})).toEqual(cueTapRating(ms, tuning));
    // A skin's trap names (a tap a trap fooled) take the seconds' place in the score line; the ★ stay the engine's.
    const named = cueTapRules<object, "a" | "b" | "c" | "d" | "e">(tuning, { clean: "a", early: "b", late: "c", miss: "d", none: "e" },
      { trapJa: (ms) => (ms < moment - 300 ? "罠で押した" : null) });
    expect(named.rate!(moment - 400, {})).toEqual({ stars: 1, scoreJa: "罠で押した" });
    expect(named.rate!(moment - 150, {})).toEqual(cueTapRating(moment - 150, tuning));
    expect(named.rate!(null, {})).toBeNull();
    expect(named.rate!(0, {})).toBeNull();
  });

  it("keeps its rules pure: no randomness, clock, DOM or React", () => {
    const source = readFileSync(new URL("./engine.ts", import.meta.url), "utf8");
    for (const banned of ["Math.random", "crypto", "Date.now", "performance.now", "from \"react\"", "content/generated"]) expect(source).not.toContain(banned);
  });

  it("takes a skin's timing from its tag's keys when the skin gives a function of them", () => {
    type Params = { slow?: boolean };
    const of = (params: Params): CueTapTuning => (params.slow ? { ...tuning, approachMs: 1400 } : tuning);
    const rules = cueTapRules<Params, "hit" | "far" | "never">(of, { clean: "hit", early: "far", late: "far", miss: "far", none: "never" });
    expect(rules.outcomeOf(moment, {})).toBe("hit");
    expect(rules.outcomeOf(moment, { slow: true })).toBe("far");
    expect(rules.outcomeOf(moment + 400, { slow: true })).toBe("hit");
    for (const params of [{}, { slow: true }]) for (const outcome of ["hit", "far", "never"] as const)
      expect(rules.outcomeOf(rules.autoRecord(outcome, params), params)).toBe(outcome);
  });
});

// A scripted play (docs/13 2.2, round 3): the moment is wherever the skin's script puts it, its tells and traps checked.
describe("the cue_tap engine's scripts", () => {
  const windows = { cleanEarlyMs: 80, cleanLateMs: 120, nearEarlyMs: 200, nearLateMs: 260 };
  const script: CueTapScript = {
    start: 1000, moment: 4000, end: 4600,
    read: { guessAt: 3800, tellAt: 3400 },
    traps: [{ kind: "feint", at: 1500, tellAt: 1500 }, { kind: "decoy", at: 2400, tellAt: 1900 }, { kind: "rest", at: 3200, tellAt: 2850 }],
  };

  it("gives the engine a tuning from a timeline: taps count from the start, the moment, the end", () => {
    const of = cueTapTuningFor(script, windows);
    expect(cueTapStart(of)).toBe(1000);
    expect(cueTapMoment(of)).toBe(4000);
    expect(cueTapEnd(of)).toBe(4600);
    expect(cueTapOutcome(4000, of)).toBe("clean");
    expect(cueTapOutcome(999, of)).toBe("none");
  });

  it("is fair when every change shows a reaction and more before it, and says why when one does not", () => {
    expect(cueTapScriptFairness(script, windows)).toEqual([]);
    const late = (changes: Partial<CueTapScript>) => cueTapScriptFairness({ ...script, ...changes }, windows).join();
    expect(late({ read: { guessAt: 3800, tellAt: 3800 } })).toContain(`(less than ${CUE_TAP_READ_MS})`);
    // A moment that comes later than the pattern says: its change shows CUE_TAP_TELL_MS before where the pattern put it.
    expect(late({ read: { guessAt: 3700, tellAt: 3500 } })).toContain("before where the pattern put it");
    expect(late({ traps: [{ kind: "decoy", at: 2400, tellAt: 2200 }] })).toContain(`shows what it is 200 ms before it (less than ${CUE_TAP_TELL_MS})`);
    // A feint shows itself as it happens (only a flinch falls for it): no lead asked.
    expect(late({ traps: [{ kind: "feint", at: 2400, tellAt: 2400 }] })).toBe("");
    expect(late({ traps: [{ kind: "rest", at: 900, tellAt: 400 }] })).toContain("comes before the start");
    expect(late({ traps: [{ kind: "rest", at: 3950, tellAt: 3500 }] })).toContain("is not before the moment's clean window");
    expect(late({ end: 3900 })).toContain("out of order");
  });

  it("plays a seeded player who meets a steady moment, is fooled by a late change and by traps it cannot tell in time", () => {
    const rules = cueTapRules<object, "hit" | "off" | "never">(cueTapTuningFor(script, windows), { clean: "hit", early: "off", late: "off", miss: "off", none: "never" });
    const tally = (s: CueTapScript, player: keyof typeof CUE_TAP_PLAYERS, knows = false) =>
      cueTapShares(cueTapBotTally(s, rules, {}, CUE_TAP_PLAYERS[player], { plays: 600, seed: 2, knows })).outcomes.hit ?? 0;
    const steady: CueTapScript = { ...script, read: { guessAt: 4000, tellAt: 1000 }, traps: [] };
    // A steady moment read from the start: nearly every average tap is clean; the same seed plays the same taps.
    expect(tally(steady, "average")).toBeGreaterThan(0.9);
    expect(tally(steady, "average")).toBe(tally(steady, "average"));
    // A rest shown only 150 ms before it fools nearly everyone; one shown 600 ms before, almost nobody.
    const rest = (lead: number): CueTapScript => ({ ...steady, traps: [{ kind: "rest", at: 3000, tellAt: 3000 - lead }] });
    expect(tally(rest(150), "average")).toBeLessThan(0.1);
    expect(tally(rest(600), "average")).toBeGreaterThan(0.85);
    // Skill shows: the skilled player beats the average one, who beats the careless one, on the full script.
    expect(tally(script, "skilled")).toBeGreaterThan(tally(script, "average"));
    expect(tally(script, "average")).toBeGreaterThan(tally(script, "careless"));
    // Practice shows: knowing the script, the average player does better.
    expect(tally(script, "average", true)).toBeGreaterThan(tally(script, "average"));
  });

  it("keeps the test player out of the play: only tests import it", () => {
    const play = readFileSync(new URL("./EnginePlay.tsx", import.meta.url), "utf8");
    const engine = readFileSync(new URL("./engine.ts", import.meta.url), "utf8");
    expect(play).not.toContain("./bot");
    expect(engine).not.toContain("./bot");
  });
});
