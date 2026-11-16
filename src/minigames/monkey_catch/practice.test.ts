import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CUE_TAP_PLAYERS, cueTapBotTally, cueTapShares } from "../engines/cue_tap/bot";
import { cueTapCounts, cueTapEnd, cueTapScriptFairness, type CueTapTuning } from "../engines/cue_tap/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { monkeyCatch } from "./definition";
import { retune } from "./play";
import {
  MONKEY_END_MS, MONKEY_HANDS_MS, MONKEY_PLAN, MONKEY_TUNING, MONKEY_WARMUP, MONKEY_WARMUP_PLAN, monkeyCatchRules, type MonkeyCatchOutcome,
  type MonkeyCatchParams,
} from "./rules";
import { MONKEY_FIELD_POINTS, MONKEY_WARMUP_FIELD_POINTS, monkeyCatchSkin } from "./Skin";

// Practice (2026-11-16, the user's decision): a short plain drop of its own (the tag's `warmup`, which the definition's
// practice sets), never a rehearsal of the real catch's teasing; the real catch is unchanged.

const W = MONKEY_WARMUP_PLAN;
const WARMUP: MonkeyCatchParams = { thing: "bottle", warmup: "yes" };
const REAL: MonkeyCatchParams = { thing: "bottle" };
const OUTCOMES = monkeyCatch.outcomes.map((outcome) => outcome.id);
const context = { effectIds: [], backgroundIds: [], emotionIds: [] };
const tuningOf = (params: MonkeyCatchParams): CueTapTuning => (typeof monkeyCatchSkin.tuning === "function" ? monkeyCatchSkin.tuning(params) : monkeyCatchSkin.tuning);
/** When the field has shown all of a play (the end of the host's hold), as the engine works it out. */
const playEnd = (outcome: MonkeyCatchOutcome, tapMs: number | null, params: MonkeyCatchParams) => monkeyCatchSkin.endAt({ outcome, tapMs }, false, params);

// The rules template over practice's keys (the definition's examples stay the story's).
describeMiniGameRules({ ...monkeyCatch, id: "monkey_catch (practice)", examples: [{ warmup: "yes" }, { thing: "glasses", warmup: "yes" }] }, monkeyCatchRules,
  { records: [null, 0, W.script.start - 1, W.script.start, W.hands, W.script.end, W.script.end + 1, MONKEY_HANDS_MS, Number.NaN] });

describe("the catch's practice", () => {
  it("is what the definition's practice plays, a key of its own that the story's examples never use", () => {
    expect(monkeyCatch.practice).toEqual({ params: { warmup: "yes" } });
    for (const example of monkeyCatch.examples) expect(example).not.toHaveProperty("warmup");
    const schema = monkeyCatch.params(context);
    expect(schema.parse({ ...monkeyCatch.examples[0], ...(monkeyCatch.practice ? monkeyCatch.practice.params : {}) })).toEqual(WARMUP);
    expect(() => schema.parse({ warmup: "no" })).toThrow();
  });

  it("is about a third as long as the real catch, or less, whatever the tap", () => {
    expect(W.script.end).toBeLessThanOrEqual(MONKEY_END_MS / 3);
    for (const outcome of OUTCOMES) {
      const practice = playEnd(outcome, monkeyCatchRules.autoRecord(outcome, WARMUP), WARMUP);
      const real = playEnd(outcome, monkeyCatchRules.autoRecord(outcome, REAL), REAL);
      expect(practice, outcome).toBeLessThanOrEqual(2500);
      expect(practice / real, outcome).toBeLessThan(0.37);
    }
    // The longest it can take: a bounce off the fingers at the end of the late window.
    expect(playEnd("fumbled", W.hands + W.tuning.nearLateMs, WARMUP)).toBeLessThanOrEqual(2600);
    expect(playEnd("missed", null, WARMUP)).toBeLessThanOrEqual(2600);
  });

  it("has none of the real catch's teasing: no feint, shell, snatch or ledge, just one straight fall it lets go of once", () => {
    expect(W.script.traps).toEqual([]);
    // Nothing changes on the way down: the moment reads from the drop, and it takes a straight fall's time.
    expect(W.script.read).toEqual({ guessAt: W.hands, tellAt: W.release });
    expect(W.hands - W.release).toBe(MONKEY_WARMUP.fallMs);
    const { untouched, gripAt, ringAt } = MONKEY_WARMUP_FIELD_POINTS;
    const { HELD, HANDS } = MONKEY_FIELD_POINTS;
    // Held out still until it lets go (no dip), then only down, to the hands as it reaches them (no snatch, no hop).
    for (let ms = 0; ms < W.release; ms += 20) expect(untouched(ms), String(ms)).toEqual(HELD);
    let last = HELD.y;
    for (let ms = W.release; ms <= W.hands; ms += 20) {
      expect(untouched(ms).y, String(ms)).toBeGreaterThanOrEqual(last);
      last = untouched(ms).y;
    }
    expect(untouched(W.hands)).toEqual(HANDS);
    // The monkey's hand: held out, then open once (never a jerk or a snatch).
    const grips: string[] = [];
    for (let ms = 0; ms <= W.script.end; ms += 10) if (grips.at(-1) !== gripAt(ms)) grips.push(gripAt(ms));
    expect(grips).toEqual(["hold", "open"]);
    expect(gripAt(W.release)).toBe("open");
    // The ring tightens for the one arrival only.
    const full = [];
    for (let ms = 0; ms <= W.script.end; ms += 10) if (ringAt(ms) === 1) full.push(ms);
    expect(full.length).toBeGreaterThan(0);
    expect(Math.min(...full)).toBe(W.hands);
    expect(ringAt(W.release)).toBe(0);
    // Its score line is the seconds off, never a tease.
    for (let ms = W.script.start; ms <= W.script.end; ms += 10) {
      const score = monkeyCatchRules.rate!(ms, WARMUP)?.scoreJa;
      if (score !== undefined) expect(score, String(ms)).toMatch(/^\d\.\d\d秒(差|早い|遅い)$/u);
    }
  });

  it("draws no shells and no ledge on the wall, and the story's field still does", () => {
    const field = (params: MonkeyCatchParams) => renderToStaticMarkup(createElement(monkeyCatchSkin.Field, {
      params, still: false, seed: 1, cast: { heroine: createElement("i") }, names: { player: "主人公", heroine: "ヒロイン" },
      art: {}, sound: () => undefined, vibrate: () => undefined, frames: () => () => undefined,
    }));
    for (const thing of ["bottle", "glasses"] as const) {
      const practice = field({ thing, warmup: "yes" });
      expect(practice).toContain(`data-thing="${thing}"`);
      expect(practice).toContain("mg-monkey-catch-monkey-figure");
      expect(practice).not.toContain("mg-monkey-catch-shell");
      expect(practice).not.toContain("mg-monkey-catch-ledge");
    }
    expect(field(REAL)).toContain("mg-monkey-catch-shell-figure");
    expect(field(REAL)).toContain("mg-monkey-catch-ledge");
  });

  it("is forgiving: wider windows than the story's, fair on a phone, and caught by nearly every player", () => {
    const real = MONKEY_PLAN.tuning;
    for (const key of ["cleanEarlyMs", "cleanLateMs", "nearEarlyMs", "nearLateMs"] as const) expect(W.tuning[key], key).toBeGreaterThan(real[key]);
    expect(cueTapScriptFairness(W.script, W.tuning)).toEqual([]);
    // A late catch still finds it on the palms (the field draws it there through the late window).
    const { HANDS, THROUGH_DEPTH } = MONKEY_FIELD_POINTS;
    expect(MONKEY_WARMUP_FIELD_POINTS.untouched(W.hands + W.tuning.nearLateMs).y).toBeLessThanOrEqual(HANDS.y + THROUGH_DEPTH);
    const share = (player: keyof typeof CUE_TAP_PLAYERS) =>
      cueTapShares(cueTapBotTally(W.script, monkeyCatchRules, WARMUP, CUE_TAP_PLAYERS[player], { plays: 1000, seed: 5 })).outcomes;
    expect(share("average").caught).toBeGreaterThan(0.95);
    expect(share("skilled").caught).toBeGreaterThan(0.98);
    expect(share("careless").caught).toBeGreaterThan(0.6);
  });

  it("ends by itself with one of its outcomes: without a tap once the thing has gone past, and after any tap", () => {
    expect(cueTapEnd(tuningOf(WARMUP))).toBe(W.script.end);
    // A tap while the monkey still holds it out does not count (the player can still catch it).
    expect(cueTapCounts(W.release - 1, tuningOf(WARMUP))).toBe(false);
    expect(cueTapCounts(W.release, tuningOf(WARMUP))).toBe(true);
    expect(monkeyCatchRules.outcomeOf(null, WARMUP)).toBe("missed");
    expect(monkeyCatchSkin.impactAt!({ outcome: "missed", tapMs: null }, false, WARMUP)).toBe(W.script.end);
    for (let tapMs = W.script.start; tapMs <= W.script.end; tapMs += 25) {
      const outcome = monkeyCatchRules.outcomeOf(tapMs, WARMUP);
      expect(OUTCOMES, String(tapMs)).toContain(outcome);
      const impact = monkeyCatchSkin.impactAt!({ outcome, tapMs }, false, WARMUP);
      expect(impact, String(tapMs)).toBeGreaterThanOrEqual(tapMs);
      expect(playEnd(outcome, tapMs, WARMUP), String(tapMs)).toBeGreaterThan(impact);
    }
    expect(monkeyCatchRules.outcomeOf(W.hands, WARMUP)).toBe("caught");
    expect(monkeyCatchRules.outcomeOf(W.hands + W.tuning.cleanLateMs + 50, WARMUP)).toBe("fumbled");
    expect(monkeyCatchRules.outcomeOf(W.release + 50, WARMUP)).toBe("missed");
    // Caught: in the hands as it meets them.
    expect(MONKEY_WARMUP_FIELD_POINTS.thingAt(W.hands + 200, W.hands, "caught").held).toBe(true);
  });

  it("is the same drop in Debug's room with edited numbers (they tune the story's catch only)", () => {
    const edited = retune({ ...MONKEY_TUNING, holdMs: 1400, fallMs: 700, cleanEarlyMs: 90 });
    for (const outcome of OUTCOMES) {
      const tapMs = edited.rules.autoRecord(outcome, WARMUP);
      expect(tapMs, outcome).toBe(monkeyCatchRules.autoRecord(outcome, WARMUP));
      expect(edited.rules.outcomeOf(tapMs, WARMUP), outcome).toBe(outcome);
    }
    expect(edited.rules.outcomeOf(W.hands, WARMUP)).toBe("caught");
    expect(edited.rules.autoRecord("caught", REAL)).not.toBe(monkeyCatchRules.autoRecord("caught", REAL));
  });

  it("leaves the real catch as it was: its keys, its timing, its teasing and its score lines", () => {
    const schema = monkeyCatch.params(context);
    expect(schema.parse({})).toStrictEqual({ thing: "bottle" });
    expect(schema.parse({ thing: "glasses" })).toStrictEqual({ thing: "glasses" });
    expect(tuningOf(REAL)).toEqual(MONKEY_PLAN.tuning);
    expect(tuningOf({ thing: "glasses" })).toEqual(MONKEY_PLAN.tuning);
    expect(monkeyCatchRules.autoRecord("caught", REAL)).toBe(MONKEY_HANDS_MS);
    expect(MONKEY_PLAN.script.traps.map((trap) => trap.kind)).toEqual(["feint", "decoy", "rest", "decoy"]);
    expect(monkeyCatchRules.rate!(MONKEY_PLAN.script.traps[1].at, REAL)?.scoreJa).toBe("殻で手を閉じた");
    expect(monkeyCatchSkin.impactAt!({ outcome: "missed", tapMs: null }, false, REAL)).toBe(MONKEY_END_MS);
  });
});
