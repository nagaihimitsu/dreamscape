import type { MiniGameRating, MiniGameRules } from "../contract";
import {
  cueTapMoment, cueTapOutcome, cueTapRules, cueTapScriptFairness, cueTapTuningFor, type CueTapRecord, type CueTapScript, type CueTapTuning,
} from "../engines/cue_tap/engine";
import type { CRICKET_BALLS, CRICKET_LET_GO } from "./definition";

// The cricket's rules (docs/13 2.4): a cue_tap skin with a script. Her first delivery comes like any ball until it lands
// on a crack in the dusty pitch and kicks up steeply over the bat and the bricks (a bouncer: leave it, and Sonia calls it
// dead; a swing at it gets under it and skies it over the side wall: a big hit off the wrong ball). Then she walks back and bowls her real last ball, which changes pace where it bounces (the tag's
// `ball`): `quick` comes flat and fast and grips the dusty pitch, holding up after the bounce (a swing timed by its first
// part is early); `slower` is tossed up slower and skids on (a swing timed by its first part is late). One tap, the swing:
// its time against the real ball's arrival at the bat. Nothing is random (the taped ball's wobble on screen is drawn the
// same every time and changes nothing). Practice plays a warm-up of its own (the `warmup` key: CRICKET_WARMUP): one slow,
// straight ball, none of the over's twists. Pure.

export type CricketOutcome = "six" | "over_wall" | "edge" | "bowled" | "no_swing";
/**
 * The tag's keys: which ball she bowls, and where a ball the batter lets go goes (definition.ts; the picture, and which late
 * swings count); `warmup` (practice's own key, never in a story): practice's warm-up in place of the over, whatever the others say.
 */
export type CricketParams = { ball?: (typeof CRICKET_BALLS)[number]; letgo?: (typeof CRICKET_LET_GO)[number]; warmup?: "yes" };
export type CricketBall = (typeof CRICKET_BALLS)[number];

/** The real ball's way: where it bounces (a part of the way from her hand to the bat). */
export const CRICKET_BOUNCE_AT = 0.6;

/**
 * The cricket's tuning (E1; Debug's room edits these numbers): her two run-ups, the bouncer, each real ball's pace before
 * and after its bounce, the bricks behind the bat, and the windows (wider after the ball's arrival: a phone lands a tap
 * late; a little early is pulled over the wall, the heavier outcome). The late near window ends before the ball reaches
 * the bricks.
 */
export const CRICKET_TUNING = {
  /** Before her run-up (after the host's 3・2・1, during which the player already sees the pitch, the meter and the button). */
  settleMs: 200,
  /** Her run-up to the ball leaving her hand (both times). */
  runUpMs: 1100,
  /**
   * The bouncer: from her hand to its bounce (on a crack in the dusty pitch: it kicks up steeply from there), over the
   * bat, and gone over the bricks.
   */
  bouncerBounceMs: 450,
  bouncerBatMs: 780,
  bouncerGoneMs: 1000,
  /** After the bouncer has gone, she walks back this long before her second run-up. */
  walkBackMs: 600,
  /** The quick ball: from her hand to the bounce, and from the bounce to the bat (it holds up). */
  quickPreMs: 450,
  quickPostMs: 460,
  /** The slower ball: tossed up (slower to the bounce), then skidding on. */
  slowerPreMs: 760,
  slowerPostMs: 330,
  /** After the ball's arrival, it reaches the bricks behind the bat (a ball not hit knocks them down then). */
  bricksMs: 260,
  /** After the ball's arrival, a play without a swing ends. */
  noneAfterMs: 650,
  cleanEarlyMs: 70,
  cleanLateMs: 105,
  nearEarlyMs: 190,
  nearLateMs: 240,
};
export type CricketTuning = typeof CRICKET_TUNING;

/** The bouncer: from her hand, its bounce, over the bat, the last moment a swing can still meet it, gone over the bricks. */
export interface CricketBouncer { release: number; bounce: number; bat: number; reach: number; gone: number }

/**
 * A play's balls: the bouncer (none in practice's warm-up), the ball to hit (its release, bounce, arrival at the bat and the
 * bricks), and the play's script.
 */
export interface CricketPlan {
  bouncer: CricketBouncer | null;
  release: number;
  bounce: number;
  contact: number;
  bricks: number;
  /** The ball's pace before and after the bounce (the part of the way from her hand to the bat a millisecond). */
  speeds: { pre: number; post: number };
  script: CueTapScript;
  tuning: CueTapTuning;
}
/** The story's over: the bouncer, then the real ball. */
export type CricketOver = CricketPlan & { bouncer: CricketBouncer };

/** The over worked out from a tuning (the story's, or Debug's room's edited one) and the tag's ball. */
export function cricketPlan(t: CricketTuning, ball: CricketBall = "quick"): CricketOver {
  const first = t.settleMs + t.runUpMs;
  const bouncer = {
    release: first, bounce: first + t.bouncerBounceMs, bat: first + t.bouncerBatMs, reach: first + t.bouncerBatMs + t.cleanLateMs, gone: first + t.bouncerGoneMs,
  };
  const release = bouncer.gone + t.walkBackMs + t.runUpMs;
  const [preMs, postMs] = ball === "slower" ? [t.slowerPreMs, t.slowerPostMs] : [t.quickPreMs, t.quickPostMs];
  const bounce = release + preMs;
  const contact = bounce + postMs;
  const pre = CRICKET_BOUNCE_AT / preMs;
  const script: CueTapScript = {
    start: bouncer.release, moment: contact, end: contact + t.noneAfterMs,
    // At its pace before the bounce, the ball would reach the bat at guessAt: it holds up (or skids on), and the bounce shows it.
    read: { guessAt: bounce + (1 - CRICKET_BOUNCE_AT) / pre, tellAt: bounce },
    // The bouncer passing over the bat: its short bounce and its rise show it is not one to hit.
    traps: [{ kind: "decoy", at: bouncer.bat, tellAt: bouncer.bounce }],
  };
  return {
    bouncer, release, bounce, contact, bricks: contact + t.bricksMs, speeds: { pre, post: (1 - CRICKET_BOUNCE_AT) / postMs }, script,
    tuning: cueTapTuningFor(script, t),
  };
}

/**
 * Practice's warm-up (the `warmup` key: definition.ts `practice`): after a short run-up, one slow, straight ball at one pace
 * all the way (it bounces on the way without a change), with wider windows; no bouncer, no walk back, no change of pace,
 * the tag's `ball` and `letgo` unused. Its own pace, slower than either real ball and after a shorter run-up, so it teaches
 * the swing as the ball reaches the bat and not the real ball's timing. Fixed: Debug's room edits the story's over only.
 */
export const CRICKET_WARMUP = {
  settleMs: 200,
  runUpMs: 600,
  /** From her hand to the bat, at one pace (slower all the way than either real ball, its first part or after the bounce). */
  approachMs: 1600,
  bricksMs: 380,
  noneAfterMs: 550,
  cleanEarlyMs: 100,
  cleanLateMs: 150,
  nearEarlyMs: 220,
  nearLateMs: 320,
};

/** The warm-up's plan: its one ball, its script (the moment reads from the start; nothing looks like it) and its tuning. */
function warmupPlan(w: typeof CRICKET_WARMUP): CricketPlan {
  const release = w.settleMs + w.runUpMs;
  const contact = release + w.approachMs;
  const speed = 1 / w.approachMs;
  const script: CueTapScript = { start: release, moment: contact, end: contact + w.noneAfterMs, read: { guessAt: contact, tellAt: release }, traps: [] };
  const { cleanEarlyMs, cleanLateMs, nearEarlyMs, nearLateMs } = w;
  return {
    bouncer: null, release, bounce: release + CRICKET_BOUNCE_AT * w.approachMs, contact, bricks: contact + w.bricksMs, speeds: { pre: speed, post: speed },
    script, tuning: cueTapTuningFor(script, { cleanEarlyMs, cleanLateMs, nearEarlyMs, nearLateMs }),
  };
}
export const CRICKET_WARMUP_PLAN = warmupPlan(CRICKET_WARMUP);

/** Whether a play is practice's warm-up. */
export const cricketIsWarmup = (params: CricketParams): boolean => params.warmup === "yes";
/** Whether a ball let go runs on to the still plank (`letgo plank`; never in the warm-up, whose ball goes into the bricks). */
export const cricketOntoPlank = (params: CricketParams): boolean => params.letgo === "plank" && !cricketIsWarmup(params);

/** Each play's plan with a tuning (the story's, or Debug's room's edited one): the warm-up, or the over with the tag's ball. */
export function cricketPlanner(tuning: CricketTuning): (params: CricketParams) => CricketPlan {
  const overs = { quick: cricketPlan(tuning, "quick"), slower: cricketPlan(tuning, "slower") };
  return (params) => (cricketIsWarmup(params) ? CRICKET_WARMUP_PLAN : overs[params.ball ?? "quick"]);
}

/**
 * Whether a swing at `ms` counts: from the bouncer leaving her hand until it is over the bat and past reach (a swing at
 * it), and from the real ball leaving her hand to the play's end. Once the bouncer is over the batter's head, and while
 * she walks back and runs up again, it does not (the batter can still swing at the real ball).
 */
export function cricketCounts(plan: CricketPlan, ms: number): boolean {
  return cricketAtBouncer(plan, ms) || (ms >= plan.release && ms <= plan.script.end);
}

/** Whether a swing at `ms` is at the bouncer (the plank gets under it and skies it over the side wall, however it is timed). */
export function cricketAtBouncer(plan: CricketPlan, ms: number): boolean {
  return plan.bouncer !== null && ms >= plan.bouncer.release && ms <= plan.bouncer.reach;
}

/**
 * How far along its way the real ball is at `ms` (0 in her hand, 1 at the bat; on past it at the pace after the bounce):
 * the meter's needle follows it (it waits at 0 through the bouncer, a ball that does not count, and moves slower after a
 * bounce that holds the ball up).
 */
export function cricketTravel(plan: CricketPlan, ms: number): number {
  if (ms <= plan.release) return 0;
  if (ms <= plan.bounce) return (ms - plan.release) * plan.speeds.pre;
  return CRICKET_BOUNCE_AT + (ms - plan.bounce) * plan.speeds.post;
}

/**
 * The result card's ★ (display only: never saved, never in Ink; docs/13 4.1), in step with the outcome: a clean hit ★3,
 * a little early or late ★2, a miss or a swing at the bouncer ★1, no swing not rated. The score says how far off the swing
 * was, so a player who plays again (`retry`, Debug's room) sees which way to move (「0.12秒早い」), or that it was at the bouncer.
 */
export function cricketRating(record: CueTapRecord, plan: CricketPlan): MiniGameRating | null {
  if (record !== null && cricketAtBouncer(plan, record)) return { stars: 1, scoreJa: "高い球に振った" };
  const engine = cueTapOutcome(record, plan.tuning);
  if (engine === "none" || record === null || !cricketCounts(plan, record)) return null;
  const off = record - cueTapMoment(plan.tuning);
  const seconds = (Math.abs(off) / 1000).toFixed(2);
  return {
    stars: engine === "clean" ? 3 : engine === "miss" ? 1 : 2,
    scoreJa: engine === "clean" ? `ずれ ${seconds}秒` : `${seconds}秒${off < 0 ? "早い" : "遅い"}`,
  };
}

/**
 * A swing after a ball let go onto the plank (`letgo plank`) has met it: the ball has knocked against the still plank and
 * rolls off to her feet, so the swing is at nothing and the ball was let go all the same (the story's 「板きれは、また
 * 動かなかった」). Only a late swing past the near window: earlier ones meet the ball as on any ball.
 */
function swungAfterPlank(record: CueTapRecord, params: CricketParams, tuning: CueTapTuning): boolean {
  return cricketOntoPlank(params) && record !== null && cueTapOutcome(record, tuning) === "miss" && record > cueTapMoment(tuning);
}

/** The cricket's rules with a tuning (the story's, or Debug's room's edited one). */
export function cricketRulesFor(tuning: CricketTuning): MiniGameRules<CricketParams, CricketOutcome, CueTapRecord> {
  const planOf = cricketPlanner(tuning);
  // Clean: straight back. A little early: pulled over the side. A little late: off the edge. Far off: bowled. No swing (a
  // swing during her run-ups does not count: the batter can still swing at the ball). At the bouncer: over the side.
  const rules = cueTapRules<CricketParams, CricketOutcome>((params) => planOf(params).tuning,
    { clean: "six", early: "over_wall", late: "edge", miss: "bowled", none: "no_swing" });
  return {
    ...rules,
    outcomeOf: (record, params) => {
      const plan = planOf(params);
      if (record !== null && cricketAtBouncer(plan, record)) return "over_wall";
      if (record === null || !cricketCounts(plan, record) || swungAfterPlank(record, params, plan.tuning)) return "no_swing";
      return rules.outcomeOf(record, params);
    },
    rate: (record, params) => (swungAfterPlank(record, params, planOf(params).tuning) ? null : cricketRating(record, planOf(params))),
  };
}

/** Why an edited tuning would make the cricket unfair (the engine's checks of each over's script; none: fair). */
export function cricketFairness(tuning: CricketTuning): string[] {
  const problems: string[] = [];
  for (const ball of ["quick", "slower"] as const) {
    const plan = cricketPlan(tuning, ball);
    for (const problem of cueTapScriptFairness(plan.script, tuning)) problems.push(`${ball}: ${problem}`);
    if (!(plan.bouncer.bounce < plan.bouncer.bat && plan.bouncer.reach < plan.bouncer.gone)) problems.push(`${ball}: the bouncer's way is out of order`);
  }
  if (tuning.bricksMs <= tuning.nearLateMs) problems.push("the ball reaches the bricks inside the late near window (a late swing would edge a ball already in them)");
  if (tuning.noneAfterMs <= tuning.bricksMs) problems.push("a play without a swing ends before the ball reaches the bricks");
  return problems;
}

export const cricketRules = cricketRulesFor(CRICKET_TUNING);
/** The story's first ball (`ball quick`): the bouncer, the real ball's release, bounce, arrival at the bat and the bricks, and the end. */
export const CRICKET_PLAN = cricketPlan(CRICKET_TUNING, "quick");
export const CRICKET_RELEASE_MS = CRICKET_PLAN.release;
export const CRICKET_CONTACT_MS = CRICKET_PLAN.contact;
export const CRICKET_BRICKS_MS = CRICKET_PLAN.bricks;
export const CRICKET_END_MS = CRICKET_PLAN.script.end;
