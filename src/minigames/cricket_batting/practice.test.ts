import { describe, expect, it } from "vitest";
import { CUE_TAP_PLAYERS, cueTapBotTally, cueTapShares } from "../engines/cue_tap/bot";
import { cueTapEnd, cueTapMoment, cueTapScriptFairness } from "../engines/cue_tap/engine";
import { cricketBatting } from "./definition";
import { retune } from "./play";
import {
  CRICKET_TUNING, CRICKET_WARMUP, CRICKET_WARMUP_PLAN, cricketAtBouncer, cricketCounts, cricketPlan, cricketPlanner, cricketRules, cricketTravel,
  type CricketOutcome, type CricketParams,
} from "./rules";
import { CRICKET_FIELD_POINTS, cricketSkin } from "./Skin";

// Practice's warm-up (2026-11-16, the user's decision: practice is shorter and simpler than the real play, not its
// rehearsal): the `warmup` key the definition's practice puts over the tag's keys. One slow, straight ball; the real over
// (the bouncer, then a ball that changes pace at its bounce) stays as it was.

const context = { effectIds: [], backgroundIds: [], emotionIds: [] };
const schema = cricketBatting.params(context);
/** The keys practice plays with for a tag's keys (as the host reads them: the practice's over the tag's). */
const practiceOf = (raw: Record<string, string>): CricketParams => schema.parse({ ...raw, ...(cricketBatting.practice ? cricketBatting.practice.params : {}) });
const WARMUP = practiceOf({});
const outcomes = cricketBatting.outcomes.map((outcome) => outcome.id);
const plan = CRICKET_WARMUP_PLAN;
const overs = [cricketPlan(CRICKET_TUNING, "quick"), cricketPlan(CRICKET_TUNING, "slower")];

describe("the cricket's practice", () => {
  it("plays the warm-up through its own key, for every example's keys; the story's keys and examples are as they were", () => {
    expect(cricketBatting.practice).toEqual({ params: { warmup: "yes" } });
    for (const raw of cricketBatting.examples) expect(practiceOf(raw as Record<string, string>).warmup, JSON.stringify(raw)).toBe("yes");
    // The real play never gets it: its keys read as before, without warmup.
    expect(cricketBatting.examples).toEqual([{}, { ball: "slower", letgo: "plank" }]);
    expect(schema.parse({})).toEqual({ letgo: "bricks", ball: "quick" });
    expect(schema.parse({ ball: "slower", letgo: "plank" })).toEqual({ letgo: "plank", ball: "slower" });
    expect(() => schema.parse({ warmup: "no" })).toThrow();
    const planOf = cricketPlanner(CRICKET_TUNING);
    expect(planOf({})).toEqual(overs[0]);
    expect(planOf({ ball: "slower", letgo: "plank" })).toEqual(overs[1]);
    // Whatever the tag's ball and letgo, practice is the one warm-up.
    expect(planOf(practiceOf({ ball: "slower", letgo: "plank" }))).toBe(plan);
  });

  it("is shorter than the real play: its ball at the bat in under 2.5 s, the play over in about 3 s (the real one about 6 s)", () => {
    expect(plan.contact).toBeLessThanOrEqual(2500);
    expect(plan.script.end).toBeLessThanOrEqual(3000);
    const endAt = (outcome: CricketOutcome, tapMs: number | null, params: CricketParams = WARMUP) => cricketSkin.endAt({ outcome, tapMs }, false, params);
    expect(endAt("no_swing", null)).toBeLessThanOrEqual(3300);
    expect(endAt("six", plan.contact)).toBeLessThanOrEqual(3300);
    for (const ball of ["quick", "slower"] as const) {
      const over = cricketPlan(CRICKET_TUNING, ball);
      expect(plan.contact, ball).toBeLessThan(over.contact * 0.55);
      expect(plan.script.end, ball).toBeLessThan(over.script.end * 0.6);
      expect(endAt("no_swing", null), ball).toBeLessThan(endAt("no_swing", null, { ball }) * 0.6);
    }
  });

  it("has none of the over's twists: no bouncer, no walk back, one pace all the way, nothing that looks like the moment", () => {
    expect(plan.bouncer).toBeNull();
    expect(plan.script.traps).toEqual([]);
    expect(plan.speeds.post).toBe(plan.speeds.pre);
    // Its moment reads from its start: no change to read late.
    expect(plan.script.read).toEqual({ guessAt: plan.contact, tellAt: plan.release });
    expect(plan.script.start).toBe(plan.release);
    for (let ms = 0; ms <= plan.script.end + 200; ms += 10) {
      expect(cricketAtBouncer(plan, ms), String(ms)).toBe(false);
      expect(cricketCounts(plan, ms), String(ms)).toBe(ms >= plan.release && ms <= plan.script.end);
      // The field draws no bouncer; she runs in once; a swing meets the ball at once.
      expect(CRICKET_FIELD_POINTS.warmup.bouncerBall(ms), String(ms)).toBeNull();
      expect(["ready", "run1"], String(ms)).toContain(CRICKET_FIELD_POINTS.warmup.phaseAt(ms));
      expect(CRICKET_FIELD_POINTS.warmup.meetsAt(ms)).toBe(ms);
    }
    // The needle follows the ball at one pace: at the bat (1) at its arrival, the gold zone where a swing is clean.
    expect(cricketTravel(plan, plan.contact)).toBeCloseTo(1, 9);
    expect(cricketTravel(plan, plan.bounce)).toBeCloseTo(0.6, 9);
    expect(CRICKET_FIELD_POINTS.warmup.bowledBall(plan.contact).ball.y).toBe(CRICKET_FIELD_POINTS.BAT.y);
    // The engine plays the warm-up's timing, meter and counted swings for practice's keys.
    expect((cricketSkin.tuning as (params: CricketParams) => unknown)(WARMUP)).toBe(plan.tuning);
    expect(cricketSkin.progress!(plan.release, WARMUP)).toBe(0);
    expect(cricketSkin.progress!(plan.script.end, WARMUP)).toBeCloseTo(1, 9);
    expect(cricketSkin.counts!(plan.release - 1, WARMUP)).toBe(false);
    expect(cricketSkin.counts!(plan.release, WARMUP)).toBe(true);
    // The ball let go goes into the bricks, never onto the plank (letgo is the story's).
    const plank = practiceOf({ ball: "slower", letgo: "plank" });
    for (let ms = plan.release; ms <= plan.script.end + 50; ms += 5) expect(cricketRules.outcomeOf(ms, plank), String(ms)).toBe(cricketRules.outcomeOf(ms, WARMUP));
    expect(cricketRules.outcomeOf(plan.contact + CRICKET_WARMUP.nearLateMs + 1, plank)).toBe("bowled");
  });

  it("does not show the real ball's timing: slower all the way than either real one (its first part and after the bounce), after a shorter run-up", () => {
    expect(CRICKET_WARMUP.runUpMs).toBeLessThan(CRICKET_TUNING.runUpMs);
    const flight = plan.contact - plan.release;
    for (const over of overs) {
      expect(plan.speeds.pre).toBeLessThan(0.85 * Math.min(over.speeds.pre, over.speeds.post));
      // A swing timed off the warm-up's ball fits neither the real ball's arrival nor where its first part's pace puts it:
      // each is further off than the real play's near window.
      expect(flight - (over.contact - over.release)).toBeGreaterThan(CRICKET_TUNING.nearLateMs);
      expect(flight - (over.script.read.guessAt - over.release)).toBeGreaterThan(CRICKET_TUNING.nearLateMs);
    }
  });

  it("is forgiving and fair: wider windows than the real ball's, fair on a phone, a clean hit for nearly every player", () => {
    for (const key of ["cleanEarlyMs", "cleanLateMs", "nearEarlyMs", "nearLateMs"] as const) expect(CRICKET_WARMUP[key], key).toBeGreaterThan(CRICKET_TUNING[key]);
    expect(cueTapScriptFairness(plan.script, plan.tuning)).toEqual([]);
    expect(CRICKET_WARMUP.bricksMs).toBeGreaterThan(CRICKET_WARMUP.nearLateMs);
    expect(CRICKET_WARMUP.noneAfterMs).toBeGreaterThan(CRICKET_WARMUP.bricksMs);
    const share = (player: keyof typeof CUE_TAP_PLAYERS) => cueTapShares(cueTapBotTally(plan.script, cricketRules, WARMUP, CUE_TAP_PLAYERS[player],
      { plays: 1000, seed: 9, counts: (ms) => cricketCounts(plan, ms) })).outcomes.six ?? 0;
    expect(share("average")).toBeGreaterThan(0.9);
    expect(share("careless")).toBeGreaterThan(0.6);
  });

  it("ends by itself with one of the game's outcomes, and its rules (おまかせ, outcome, ★) take its keys without throwing", () => {
    // No swing: the engine decides at the play's end, the field ends it once the bricks fall.
    expect(cueTapEnd(plan.tuning)).toBe(plan.script.end);
    expect(cricketRules.outcomeOf(null, WARMUP)).toBe("no_swing");
    expect(Number.isFinite(cricketSkin.endAt({ outcome: "no_swing", tapMs: null }, false, WARMUP))).toBe(true);
    // A swing at its ball: a clean hit at its arrival, near and far on each side, as in the real play.
    expect(cueTapMoment(plan.tuning)).toBe(plan.contact);
    expect(cricketRules.outcomeOf(plan.contact, WARMUP)).toBe("six");
    expect(cricketRules.outcomeOf(plan.contact - CRICKET_WARMUP.nearEarlyMs, WARMUP)).toBe("over_wall");
    expect(cricketRules.outcomeOf(plan.contact + CRICKET_WARMUP.nearLateMs, WARMUP)).toBe("edge");
    expect(cricketRules.outcomeOf(plan.release, WARMUP)).toBe("bowled");
    for (const raw of cricketBatting.examples) {
      const params = practiceOf(raw as Record<string, string>);
      for (const outcome of outcomes) expect(cricketRules.outcomeOf(cricketRules.autoRecord(outcome, params), params), outcome).toBe(outcome);
      for (const record of [null, 0, plan.release - 1, plan.release, plan.contact, plan.script.end, plan.script.end + 1, Number.NaN]) {
        expect(outcomes).toContain(cricketRules.outcomeOf(record, params));
        const rating = cricketRules.rate!(record, params);
        if (rating) expect([1, 2, 3]).toContain(rating.stars);
        for (const still of [false, true]) {
          const outcome = cricketRules.outcomeOf(record, params);
          const end = cricketSkin.endAt({ outcome, tapMs: Number.isFinite(record) ? record : null }, still, params);
          // At the latest, a swing at the play's last moment and its hold.
          expect(end, `${String(record)} ${outcome}`).toBeLessThanOrEqual(3500);
        }
      }
    }
    // Her face at its end is a plain one, never the story's line.
    expect(Object.keys(CRICKET_FIELD_POINTS.warmup.face).sort()).toEqual([...outcomes].sort());
    for (const face of Object.values(CRICKET_FIELD_POINTS.warmup.face)) expect(["cheer", "oops"]).toContain(face);
  });

  it("plays the same warm-up in Debug's room with an edited tuning (retune), its real over edited as before", () => {
    const edited = { ...CRICKET_TUNING, runUpMs: 1300, quickPreMs: 500, cleanEarlyMs: 80, cleanLateMs: 120 };
    const { rules } = retune(edited);
    for (let ms = 0; ms <= plan.script.end + 50; ms += 5) {
      expect(rules.outcomeOf(ms, WARMUP), String(ms)).toBe(cricketRules.outcomeOf(ms, WARMUP));
      expect(rules.rate!(ms, WARMUP)).toEqual(cricketRules.rate!(ms, WARMUP));
    }
    const over = cricketPlan(edited, "quick");
    expect(rules.outcomeOf(over.contact, {})).toBe("six");
    expect(rules.outcomeOf(over.bouncer.bat, {})).toBe("over_wall");
  });
});
