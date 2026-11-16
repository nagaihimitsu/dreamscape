import type { MiniGameRules } from "../contract";
import {
  cueTapRules, cueTapScriptFairness, cueTapTuningFor, type CueTapRecord, type CueTapScript, type CueTapTuning, type CueTapWindows,
} from "../engines/cue_tap/engine";

// The cloth flap (docs/13 2.4): a cue_tap skin with a script. Hidden in a niche of the stepwell, the player spreads the
// cloth once as Jasmeet, coming down the stairs, stands on the gold step in front of it. She knows a pigeon is waiting
// somewhere, so she does not come down at one pace: three steady steps (the count), a stop on the third while a boy runs
// down past her and past the niche (a decoy: not her), a step to the fourth where she freezes instead of stepping on (the
// beat the count expects does not come) and reaches a foot toward the gold step and draws it back (a feint), a step back
// up, and then she psyches herself up, bobbing on the third step in time (いち、にの…), holds on the bob she would go on
// (another beat that does not come), and on the next leaps two steps down onto the gold step (the climax).
// A far-off tap still tells its side: spread while she is still up the stairs (early), or after she has passed (late).
// Practice (its `warmup` key, 2026-11-16) is a walk of its own, short and plain, never a rehearsal of this one
// (CLOTH_WARMUP_PLAN): from the second step she comes down three steady steps onto the gold step and on, with wider
// windows; no stop, no boy, no freeze, no feint, no bobs, no leap. Nothing is random: the same walk every time. Pure.

export type ClothFlapOutcome = "perfect" | "early" | "late" | "frozen";
/**
 * The flap's one key, practice's alone: `warmup` (the definition's practice sets it; a story's tag never does) plays
 * practice's short plain walk in place of the story's.
 */
export interface ClothFlapParams {
  warmup?: "yes";
}
/** Whether a play is practice's short plain walk (its `warmup` key). */
export const clothWarmup = (params: ClothFlapParams): boolean => params.warmup === "yes";

/** Her walk's places: the steps from the top (0) to the gold one in front of the niche, and on down. */
export const CLOTH_STEPS = {
  /** The gold step in front of the niche. */
  gold: 5,
  /** The step she stops on (while the boy runs past), and the one she freezes on in front of the gold one. */
  wary: 3,
  freeze: 4,
  /** The last step she stands on when nothing happens (she goes on down past the niche, then stops and looks back). */
  last: 8,
} as const;

/**
 * The flap's tuning (E1; Debug's room edits these numbers): her walk and the windows. She stands on the gold step exactly
 * through the perfect window (from cleanEarlyMs before its beat to cleanLateMs after it), so a perfect flap always finds
 * her on it, an early one before she lands on it, a late one stepping off it.
 */
export const CLOTH_TUNING = {
  /** She stands at the top of the flight: the player sees the stairs, the steps' marks and the button (taps do not count). */
  settleMs: 900,
  /** Her steady pace, a landing to the next, and how long a steady step down takes (she stands the rest). */
  stepMs: 500,
  moveMs: 230,
  /** On the third step she stops and looks along the niches this long (from her landing to her next step). */
  waryMs: 1750,
  /** The boy appears at the top this long after she lands on the third step, and runs down at this pace. */
  boyAfterMs: 380,
  boyStepMs: 200,
  /** On the fourth step: her foot reaches toward the gold step this long after she lands (and is drawn back after feintMs). */
  feintAfterMs: 470,
  feintMs: 260,
  /** She steps back up this long after landing on the fourth step; the step back takes backMs. */
  freezeMs: 1100,
  backMs: 320,
  /**
   * Back on the third step, she bobs in time this far apart from bobAfterMs after landing: on the third bob she holds
   * (the beat the bobs count to), and leapAfterMs after it, off the beat, she leaps two steps down onto the gold one (in
   * leapMs): it no longer comes on a bob, so only the leap itself tells it.
   */
  bobAfterMs: 380,
  bobMs: 420,
  leapAfterMs: 260,
  leapMs: 230,
  /** After the gold step (no flap), her hurried steps on down. */
  hurryMs: 300,
  cleanEarlyMs: 70,
  cleanLateMs: 110,
  nearEarlyMs: 190,
  nearLateMs: 250,
};
export type ClothTuning = typeof CLOTH_TUNING;

/** One step of hers (or the boy's): from step `from` to `to`, the foot leaving at `lift` and landing at `land`. */
export type ClothMove = { from: number; to: number; lift: number; land: number; kind: "step" | "back" | "leap" | "hurry" };
/** What she shows on a step from a time (the tells): walking on, stopped and looking, frozen, bobbing to go, holding a bob. */
export type ClothPose = "walk" | "wary" | "freeze" | "gather" | "hold";

/** Her whole walk with a tuning: her steps, her poses, the feint, the boy's run, and the play's script (the engine's). */
export interface ClothPlan {
  moves: readonly ClothMove[];
  poses: readonly { from: number; pose: ClothPose }[];
  /** Her foot reached toward the gold step and drawn back (none in practice's walk). */
  feint: { lift: number; back: number } | null;
  /** Her bobs on the third step before the leap (the times of their lowest points; she holds on the third; none in practice's). */
  bobs: readonly number[];
  /** The boy's run down past her (none in practice's walk). */
  boy: readonly ClothMove[];
  script: CueTapScript;
  tuning: CueTapTuning;
}

/** Her walk worked out from a tuning (the story's, or Debug's room's edited one). */
export function clothPlan(t: ClothTuning): ClothPlan {
  const moves: ClothMove[] = [];
  const stand = t.stepMs - t.moveMs;
  let at = t.settleMs;
  // Three steady steps: the count.
  for (let k = 0; k < CLOTH_STEPS.wary; k += 1) {
    moves.push({ from: k, to: k + 1, lift: at, land: at + t.moveMs, kind: "step" });
    at += t.stepMs;
  }
  const onWary = moves[moves.length - 1].land;
  // She stops on the third step (her stop shows when she does not step on) while the boy runs past.
  const boyStart = onWary + t.boyAfterMs;
  const boyStand = Math.max(40, t.boyStepMs - Math.round(t.boyStepMs * 0.65));
  const boy: ClothMove[] = [];
  for (let k = 0; k < CLOTH_STEPS.last + 2; k += 1) {
    const lift = boyStart + k * t.boyStepMs;
    boy.push({ from: k, to: k + 1, lift, land: lift + t.boyStepMs - boyStand, kind: "hurry" });
  }
  const toFreeze = onWary + t.waryMs;
  moves.push({ from: CLOTH_STEPS.wary, to: CLOTH_STEPS.freeze, lift: toFreeze, land: toFreeze + t.moveMs, kind: "step" });
  const onFreeze = toFreeze + t.moveMs;
  // On the fourth she freezes where her next step would start, reaches a foot toward the gold step, steps back up.
  const feintLift = onFreeze + t.feintAfterMs;
  const back = onFreeze + t.freezeMs;
  moves.push({ from: CLOTH_STEPS.freeze, to: CLOTH_STEPS.wary, lift: back, land: back + t.backMs, kind: "back" });
  // Back on the third, she bobs in time (いち、にの…), holds on the third bob, and suddenly leaps onto the gold step.
  const bobs = [0, 1, 2].map((index) => back + t.backMs + t.bobAfterMs + index * t.bobMs);
  const held = bobs[2];
  const leap = held + t.leapAfterMs;
  const onGold = leap + t.leapMs;
  moves.push({ from: CLOTH_STEPS.wary, to: CLOTH_STEPS.gold, lift: leap, land: onGold, kind: "leap" });
  // She stands on it through the perfect window, then hurries on down.
  const goldStand = t.cleanEarlyMs + t.cleanLateMs;
  const hurryMove = Math.max(80, t.hurryMs - goldStand);
  let lift = onGold + goldStand;
  for (let k = CLOTH_STEPS.gold; k < CLOTH_STEPS.last; k += 1) {
    moves.push({ from: k, to: k + 1, lift, land: lift + hurryMove, kind: "hurry" });
    lift += t.hurryMs;
  }
  const moment = onGold + t.cleanEarlyMs;
  const end = moves[moves.length - 1].land + 160;
  const script: CueTapScript = {
    start: t.settleMs, moment, end,
    // After the bob she held on, the bobs' time would put her leap on the next one; she goes off the beat, and only the
    // leap shows it (her crouch says it is coming, not when).
    read: { guessAt: held + t.bobMs + t.leapMs + t.cleanEarlyMs, tellAt: leap },
    traps: [
      // The boy on the gold step: not her (a smaller figure in a red cap, much quicker, no mark lights for him).
      { kind: "decoy", at: boy[CLOTH_STEPS.gold - 1].land + t.cleanEarlyMs, tellAt: boyStart },
      // The gold step's beat at her pace from the fourth: it does not come (she freezes where her next step would start).
      { kind: "rest", at: onFreeze + t.stepMs + t.cleanEarlyMs, tellAt: onFreeze + stand },
      // Her foot reaching toward the gold step, and drawn back: where it would have landed.
      { kind: "feint", at: feintLift + t.moveMs + t.cleanEarlyMs, tellAt: feintLift },
      // The bob her bobbing counts to: she holds on it instead of leaving the step (a leap from it would land on the gold step).
      { kind: "rest", at: held + t.leapMs + t.cleanEarlyMs, tellAt: held },
    ],
  };
  const poses: { from: number; pose: ClothPose }[] = [
    { from: 0, pose: "walk" },
    { from: onWary + stand, pose: "wary" },
    { from: toFreeze, pose: "walk" },
    { from: onFreeze + stand, pose: "freeze" },
    { from: back + t.backMs, pose: "gather" },
    { from: held, pose: "hold" },
    { from: leap, pose: "walk" },
  ];
  return { moves, poses, feint: { lift: feintLift, back: feintLift + t.feintMs }, bobs, boy, script, tuning: cueTapTuningFor(script, t) };
}

/**
 * Practice's walk (2026-11-16, the user's decision: practice is shorter and simpler than the real play, never its
 * rehearsal): the one tap only. Already two steps down (a start of its own), she comes down three steady steps onto the
 * gold step, stands on it through wider windows than the story's (a tap as she is seen to land on it is in time), and
 * steps on past the niche; a third of the story's walk or less. Its timing is its own: its moment comes before she has
 * even stopped once in the story's (a flap timed in practice is early there). The same in Debug's room (its edited numbers
 * are the story's walk's).
 */
export const CLOTH_WARMUP = {
  /** The step she stands on at the start (the marks of the first two lit; the gold one is the fifth). */
  fromStep: 2,
  /** She stands there this long (taps do not count yet), then comes down at her steady pace (a step's move in moveMs). */
  settleMs: 600,
  stepMs: 520,
  moveMs: 250,
  cleanEarlyMs: 130,
  cleanLateMs: 200,
  nearEarlyMs: 300,
  nearLateMs: 450,
} as const;

/** Practice's walk worked out (CLOTH_WARMUP): her steady steps, and its script without a trap or a change of pace. */
function clothWarmupPlan(): ClothPlan {
  const { fromStep, settleMs, stepMs, moveMs, cleanEarlyMs, cleanLateMs, nearEarlyMs, nearLateMs } = CLOTH_WARMUP;
  const moves: ClothMove[] = [];
  let at = settleMs;
  for (let k = fromStep; k < CLOTH_STEPS.gold; k += 1) {
    moves.push({ from: k, to: k + 1, lift: at, land: at + moveMs, kind: "step" });
    at += stepMs;
  }
  const onGold = moves[moves.length - 1].land;
  const moment = onGold + cleanEarlyMs;
  // She stands on the gold step through the perfect window, then one step on past the niche (and stops, as in the story's).
  const off = moment + cleanLateMs;
  moves.push({ from: CLOTH_STEPS.gold, to: CLOTH_STEPS.gold + 1, lift: off, land: off + moveMs, kind: "step" });
  const script: CueTapScript = { start: settleMs, moment, end: off + moveMs + 160, read: { guessAt: moment, tellAt: settleMs }, traps: [] };
  return {
    moves, poses: [{ from: 0, pose: "walk" }], feint: null, bobs: [], boy: [], script,
    tuning: cueTapTuningFor(script, { cleanEarlyMs, cleanLateMs, nearEarlyMs, nearLateMs }),
  };
}
export const CLOTH_WARMUP_PLAN = clothWarmupPlan();

/**
 * The fake-out a flap fell for, for the score line (like the cricket's 「高い球に振った」; the words of the early outcome's
 * note), or null (the seconds off: during her steady first steps, or her leap itself): her stop on the third step, the boy
 * running past (until she steps on), her stop on the fourth, her foot reached toward the gold step and her step back up,
 * her bobbing and the held bob.
 */
export function clothTrapJa(plan: ClothPlan, tapMs: number): string | null {
  const wary = plan.poses.find((pose) => pose.pose === "wary")?.from ?? Number.POSITIVE_INFINITY;
  const onFourth = plan.moves.find((move) => move.to === CLOTH_STEPS.freeze)?.lift ?? Number.POSITIVE_INFINITY;
  const backOnThird = plan.moves.find((move) => move.kind === "back")?.land ?? Number.POSITIVE_INFINITY;
  const leap = plan.moves.find((move) => move.kind === "leap")?.lift ?? Number.NEGATIVE_INFINITY;
  if (tapMs < wary || tapMs >= leap) return null;
  if (tapMs >= backOnThird) return "はずみの途中で広げた";
  if (plan.feint && tapMs >= plan.feint.lift) return "踏み出しかけで広げた";
  if (tapMs >= (plan.boy[0]?.lift ?? Number.POSITIVE_INFINITY) && tapMs < onFourth) return "男の子で広げた";
  return "立ち止まりで広げた";
}

/** The flap's rules with a tuning (the story's, or Debug's room's edited one). Clean: right in front of her. Any tap
 * before: early (the boy, her freeze, her feint: she sees it coming); any after: late (far off too, by its side). No tap:
 * frozen. ★ from the engine: clean ★3, a little off ★2, far off ★1 (its outcome is early or late all the same), no tap none;
 * the score line names the fake-out a flap fell for. With the `warmup` key: practice's walk (CLOTH_WARMUP_PLAN, the same
 * with any tuning), judged the same way; it has no fake-outs, so its score line is the seconds off. */
export function clothFlapRulesFor(tuning: ClothTuning): MiniGameRules<ClothFlapParams, ClothFlapOutcome, CueTapRecord> {
  const plan = clothPlan(tuning);
  return cueTapRules<ClothFlapParams, ClothFlapOutcome>((params) => (clothWarmup(params) ? CLOTH_WARMUP_PLAN : plan).tuning,
    { clean: "perfect", early: "early", late: "late", miss: { early: "early", late: "late" }, none: "frozen" },
    { trapJa: (tapMs, params) => (clothWarmup(params) ? null : clothTrapJa(plan, tapMs)) });
}

/** Why an edited tuning would make the flap unfair (the engine's checks of her walk's script; none: fair). */
export function clothFlapFairness(tuning: ClothTuning): string[] {
  return clothPlanFairness(clothPlan(tuning), tuning);
}

/** Why a walk would be unfair: the engine's checks of its script with its windows, and her steps out of order (none: fair). */
export function clothPlanFairness(plan: ClothPlan, windows: CueTapWindows): string[] {
  const problems = cueTapScriptFairness(plan.script, windows);
  for (const [index, move] of plan.moves.entries()) {
    if (move.land <= move.lift) problems.push(`her step ${index + 1} lands before it leaves`);
    const next = plan.moves[index + 1];
    if (next && next.lift < move.land) problems.push(`her step ${index + 2} starts before step ${index + 1} has landed`);
  }
  return problems;
}

export const CLOTH_PLAN = clothPlan(CLOTH_TUNING);
export const clothFlapRules = clothFlapRulesFor(CLOTH_TUNING);
/** When taps start to count (she starts down), the gold step's beat (she stands on it around it), and when a play without a tap ends. */
export const CLOTH_START_MS = CLOTH_PLAN.script.start;
export const CLOTH_NICHE_MS = CLOTH_PLAN.script.moment;
export const CLOTH_END_MS = CLOTH_PLAN.script.end;
