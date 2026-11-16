import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CUE_TAP_PLAYERS, cueTapBotTally, cueTapShares } from "../engines/cue_tap/bot";
import { cueTapCounts, cueTapEnd, type CueTapRecord, type CueTapTuning } from "../engines/cue_tap/engine";
import { MiniGameKitContext } from "../host/kit";
import { NO_JUICE } from "../host/no-juice";
import { clothFlap } from "./definition";
import { retune } from "./play";
import {
  CLOTH_END_MS, CLOTH_NICHE_MS, CLOTH_PLAN, CLOTH_START_MS, CLOTH_STEPS, CLOTH_TUNING, CLOTH_WARMUP_PLAN, clothFlapFairness, clothFlapRules, clothPlanFairness,
  type ClothFlapOutcome, type ClothFlapParams,
} from "./rules";
import { CLOTH_FIELD_POINTS, clothFlapSkin } from "./Skin";

// Practice (2026-11-16, the user's decision): shorter and simpler than the real flap, never its rehearsal. The definition's
// practice key `warmup` plays a short plain walk of its own (rules.ts CLOTH_WARMUP_PLAN); without it, the story's walk.

const context = { effectIds: [], backgroundIds: [], emotionIds: [] };
const schema = clothFlap.params(context);
/** What the host reads for practice (the tag's keys, practice's over them) and for the real play (the tag's alone). */
const WARMUP: ClothFlapParams = schema.parse({ ...clothFlap.examples[0], ...(clothFlap.practice ? clothFlap.practice.params : {}) });
const STORY: ClothFlapParams = schema.parse(clothFlap.examples[0]);
const plan = CLOTH_WARMUP_PLAN;
const outcomes = clothFlap.outcomes.map((outcome) => outcome.id);
const tuningOf = (params: ClothFlapParams): CueTapTuning => (typeof clothFlapSkin.tuning === "function" ? clothFlapSkin.tuning(params) : clothFlapSkin.tuning);

/**
 * When a play with `record` ends by itself, as the engine ends it (EnginePlay.tsx): decided at a tap that counts, or after
 * the end without one; it ends as the field shows the outcome (impactAt), the rest of the picture held (holdMs).
 */
function playEnd(params: ClothFlapParams, record: CueTapRecord) {
  const tuning = tuningOf(params);
  const tapMs = record !== null && Number.isFinite(record) && cueTapCounts(record, tuning) ? record : null;
  const outcome = clothFlapSkin.rules.outcomeOf(tapMs, params);
  const endAt = clothFlapSkin.endAt({ outcome, tapMs }, false, params);
  const impactAt = Math.min(endAt, clothFlapSkin.impactAt!({ outcome, tapMs }, false, params));
  return { outcome, at: Math.max(tapMs ?? cueTapEnd(tuning) + 1, impactAt), holdMs: endAt - impactAt };
}

describe("the flap's practice", () => {
  it("plays with practice's warmup key; the story's tags and the examples never have it", () => {
    expect(WARMUP).toEqual({ warmup: "yes" });
    expect(STORY).toEqual({});
    for (const example of clothFlap.examples) expect(example).not.toHaveProperty("warmup");
    expect(() => schema.parse({ warmup: "no" })).toThrow();
  });

  it("is a third of the real flap or less: three steady steps onto the gold step and one on, ending by itself", () => {
    expect(plan.moves.map((move) => `${move.from}>${move.to}`)).toEqual(["2>3", "3>4", "4>5", `${CLOTH_STEPS.gold}>6`]);
    expect(plan.moves.every((move) => move.kind === "step")).toBe(true);
    const lifts = plan.moves.slice(0, 3).map((move) => move.lift);
    expect(lifts[1] - lifts[0]).toBe(lifts[2] - lifts[1]);
    expect(plan.script.end).toBeLessThanOrEqual(CLOTH_END_MS / 3);
    // Every outcome (おまかせ's tap of each, and no tap) ends by itself, in a third of the real flap's time or less.
    for (const outcome of outcomes) {
      const practice = playEnd(WARMUP, clothFlapRules.autoRecord(outcome, WARMUP));
      const real = playEnd(STORY, clothFlapRules.autoRecord(outcome, STORY));
      expect(practice.outcome, outcome).toBe(outcome);
      expect(practice.at, outcome).toBeLessThanOrEqual(real.at / 3);
      expect(practice.at, outcome).toBeLessThan(3000);
      expect(practice.holdMs, outcome).toBeGreaterThan(0);
      expect(practice.holdMs, outcome).toBeLessThan(2000);
    }
    expect(playEnd(WARMUP, null)).toMatchObject({ outcome: "frozen", at: plan.script.end + 1 });
    // A tap before she starts down, or after the end, is none (the play still ends by itself, frozen).
    for (const record of [0, plan.script.start - 1, plan.script.end + 1, Number.NaN]) expect(playEnd(WARMUP, record).outcome, String(record)).toBe("frozen");
  });

  it("has none of the real flap's twists: no stop, no boy, no freeze, no feint, no bobs, no leap, no change of pace", () => {
    expect(plan.script.traps).toEqual([]);
    expect(plan.script.read.guessAt).toBe(plan.script.moment);
    expect(plan.boy).toEqual([]);
    expect(plan.feint).toBeNull();
    expect(plan.bobs).toEqual([]);
    expect(plan.poses).toEqual([{ from: 0, pose: "walk" }]);
    expect(clothPlanFairness(plan, plan.tuning)).toEqual([]);
    // As drawn: always walking, never a tell (no ？, no …, so no whisper), no boy, no reach, no crouch, never a step back up.
    const { poseAt, boyAt, reachAt, crouchAt, stepAt } = CLOTH_FIELD_POINTS.warmup;
    let step = stepAt(0);
    for (let ms = 0; ms <= plan.script.end + 500; ms += 10) {
      expect(poseAt(ms), String(ms)).toBe("walk");
      expect(boyAt(ms), String(ms)).toBeNull();
      expect(reachAt(ms), String(ms)).toBe(0);
      expect(crouchAt(ms), String(ms)).toBe(0);
      expect(stepAt(ms), String(ms)).toBeGreaterThanOrEqual(step);
      step = stepAt(ms);
    }
  });

  it("is forgiving: wider windows, her foot on the gold step through the perfect one, and most first tries spread it perfectly", () => {
    for (const key of ["cleanEarlyMs", "cleanLateMs", "nearEarlyMs", "nearLateMs"] as const) expect(plan.tuning[key], key).toBeGreaterThan(CLOTH_PLAN.tuning[key]);
    const { walkerAt, nicheMs } = CLOTH_FIELD_POINTS.warmup;
    expect(nicheMs).toBe(plan.script.moment);
    for (let ms = nicheMs - plan.tuning.cleanEarlyMs; ms <= nicheMs + plan.tuning.cleanLateMs; ms += 10) {
      expect(walkerAt(ms).foot, String(ms)).toEqual(CLOTH_FIELD_POINTS.NICHE);
      expect(clothFlapRules.outcomeOf(ms, WARMUP)).toBe("perfect");
    }
    expect(walkerAt(nicheMs - plan.tuning.cleanEarlyMs - 15).foot).not.toEqual(CLOTH_FIELD_POINTS.NICHE);
    expect(walkerAt(nicheMs + plan.tuning.cleanLateMs + 15).foot).not.toEqual(CLOTH_FIELD_POINTS.NICHE);
    // First tries (the bots know nothing of the walk): far easier than the real flap's first try (about two in five).
    const perfect = (player: keyof typeof CUE_TAP_PLAYERS) =>
      cueTapShares(cueTapBotTally(plan.script, clothFlapRules, WARMUP, CUE_TAP_PLAYERS[player], { plays: 1000, seed: 3 })).outcomes.perfect;
    expect(perfect("skilled")).toBeGreaterThan(0.97);
    expect(perfect("average")).toBeGreaterThan(0.9);
    expect(perfect("careless")).toBeGreaterThan(0.7);
  });

  it("shows nothing of the real flap's walk or timing: its own start, and a flap timed in it is early in the real one", () => {
    expect(plan.moves[0].from).not.toBe(CLOTH_PLAN.moves[0].from);
    // Its moment comes before she has even stopped once in the real walk; the real moment is long after practice is over.
    const firstStop = CLOTH_PLAN.poses.find((pose) => pose.pose === "wary")!.from;
    expect(plan.script.moment).toBeLessThan(firstStop);
    expect(clothFlapRules.outcomeOf(plan.script.moment, STORY)).toBe("early");
    expect(CLOTH_NICHE_MS).toBeGreaterThan(plan.script.end);
    expect(clothFlapRules.outcomeOf(CLOTH_NICHE_MS, WARMUP)).toBe("frozen");
  });

  it("rates a flap like the real one, its score the seconds off (it has no fake-out to name), and never throws", () => {
    const stars = new Map<ClothFlapOutcome, Set<number | null>>();
    for (let ms = plan.script.start; ms <= plan.script.end; ms += 5) {
      const outcome = clothFlapRules.outcomeOf(ms, WARMUP);
      const rating = clothFlapRules.rate!(ms, WARMUP);
      expect(rating?.scoreJa, String(ms)).toMatch(/^\d\.\d\d秒(差|早い|遅い)$/u);
      stars.set(outcome, (stars.get(outcome) ?? new Set()).add(rating?.stars ?? null));
    }
    expect(Object.fromEntries([...stars].map(([key, set]) => [key, [...set].sort()]))).toEqual({ perfect: [3], early: [1, 2], late: [1, 2] });
    expect(clothFlapRules.rate!(null, WARMUP)).toBeNull();
    for (const outcome of outcomes) expect(clothFlapRules.outcomeOf(clothFlapRules.autoRecord(outcome, WARMUP), WARMUP)).toBe(outcome);
  });

  it("plays the same practice with Debug's room's edited numbers, which change only the real walk", () => {
    const edited = { ...CLOTH_TUNING, leapAfterMs: 400 };
    const module = retune(edited);
    expect(typeof module.Play).toBe("function");
    for (let ms = 0; ms <= plan.script.end + 100; ms += 5) {
      expect(module.rules.outcomeOf(ms, WARMUP), String(ms)).toBe(clothFlapRules.outcomeOf(ms, WARMUP));
      expect(module.rules.rate!(ms, WARMUP), String(ms)).toEqual(clothFlapRules.rate!(ms, WARMUP));
    }
    expect(module.rules.outcomeOf(CLOTH_NICHE_MS + 140, STORY)).toBe("perfect");
    expect(clothFlapFairness(edited)).toEqual([]);
  });

  it("leaves the real flap as it was without the key: its walk, timing and rules", () => {
    // The real flap's timeline as before practice changed (2026-11-16).
    expect([CLOTH_START_MS, CLOTH_NICHE_MS, CLOTH_END_MS]).toEqual([900, 7310, 8300]);
    expect(tuningOf(STORY)).toEqual(CLOTH_PLAN.tuning);
    expect(CLOTH_FIELD_POINTS.plan).toEqual(CLOTH_PLAN);
    const module = retune(CLOTH_TUNING);
    for (let ms = 0; ms <= CLOTH_END_MS + 100; ms += 5) {
      expect(module.rules.outcomeOf(ms, STORY), String(ms)).toBe(clothFlapRules.outcomeOf(ms, STORY));
      expect(module.rules.rate!(ms, STORY), String(ms)).toEqual(clothFlapRules.rate!(ms, STORY));
    }
  });

  it("draws practice's walk from its start: two steps down, two marks lit, on the stairs and in the gauge", () => {
    const field = (params: ClothFlapParams) => renderToStaticMarkup(createElement(clothFlapSkin.Field, {
      params, still: false, seed: 1, cast: { heroine: createElement("i") }, names: { player: "主人公", heroine: "ヒロイン" },
      art: {}, sound: () => undefined, vibrate: () => undefined, frames: () => () => undefined,
    }));
    const lit = (html: string) => html.match(/data-lit="true"/gu)?.length ?? 0;
    const { footOn } = CLOTH_FIELD_POINTS;
    expect(lit(field(WARMUP))).toBe(2);
    expect(field(WARMUP)).toContain(`left:${footOn(2).x}%;top:${footOn(2).y}%`);
    expect(lit(field(STORY))).toBe(0);
    expect(field(STORY)).toContain(`left:${footOn(0).x}%;top:${footOn(0).y}%`);
    const gauge = (practice: boolean) => renderToStaticMarkup(createElement(MiniGameKitContext.Provider, {
      value: { juice: NO_JUICE, react() {}, practice, still: false, end() {}, decided() {} },
    }, createElement(clothFlapSkin.Gauge!, { still: false, frames: () => () => undefined })));
    expect(lit(gauge(true))).toBe(2);
    expect(lit(gauge(false))).toBe(0);
  });
});
