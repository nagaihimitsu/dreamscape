import type { MiniGameRules } from "../contract";
import { cueTapRules, cueTapScriptFairness, cueTapTuningFor, type CueTapRecord, type CueTapScript, type CueTapTuning } from "../engines/cue_tap/engine";
import type { MONKEY_THINGS } from "./definition";

// The monkey's catch (docs/13 2.4): a cue_tap skin with a script. The monkey on the gate's wall teases before it gives
// back what it took: it jerks its arm down with its fist still closed (a feint), drops a peanut shell from its other hand
// (a decoy: not hers, let it fall), lets go of the thing and snatches it back in mid-air (the catch the fall promised does
// not come), and at last opens its hand and lets it fall, the other hand dropping a second shell beside it ("two
// things"): the shell falls straight, and the thing clips the wall's carved ledge and comes on a moment later (the late
// change: the climax). One tap closes the hands. Nothing is random: the same teasing every time (practice is a
// rehearsal). Pure.

export type MonkeyCatchOutcome = "caught" | "fumbled" | "missed";
/** The tag's keys: what the monkey drops (the picture only; the timing is the same). */
export type MonkeyCatchParams = { thing: (typeof MONKEY_THINGS)[number] };

/**
 * The catch's tuning (E1; Debug's room edits these numbers): the monkey's teasing and the windows, wider after the thing
 * reaches the hands (a phone lands a tap late; a thing a little past the fingertips is still inside the cupped hands).
 */
export const MONKEY_TUNING = {
  /** The monkey holds it out over the wall's edge: the player sees the wall, the hands and the button (taps do not count). */
  holdMs: 1000,
  /** Its feint this long after: the arm jerks down, the fist closed (the thing dips and comes back up in feintMs). */
  feintAfterMs: 500,
  feintMs: 320,
  /** This long after the feint, it drops a peanut shell from its other hand (it falls straight, in fallMs). */
  decoyAfterMs: 600,
  /** A straight fall from its hand to the player's (the shells', and the thing's without the ledge). */
  fallMs: 820,
  /** This long after the shell reached the hands, it lets go of the thing and snatches it back snatchMs after. */
  fakeAfterMs: 450,
  snatchMs: 520,
  /** This long after the snatch, it lets go for real (a second shell from its other hand with it). */
  releaseAfterMs: 900,
  /** The thing clips the ledge this long after it lets go, and reaches the hands this long after the clip. */
  ledgeMs: 520,
  afterLedgeMs: 460,
  /** After the thing reaches the hands, a play without a tap ends this long after (it has fallen out of the field). */
  noneAfterMs: 650,
  /**
   * Hands closed at a tease (before it lets go for real): the monkey laughs this long, then tosses the thing down past
   * them (a thrown fall, quicker than a dropped one): the play ends about a second after the tap, not at the routine's end.
   */
  laughMs: 150,
  tossMs: 600,
  cleanEarlyMs: 70,
  cleanLateMs: 110,
  /** Wide enough that hands closed on the second shell (160 ms before the thing, either side of it) bounce it off the fingers. */
  nearEarlyMs: 250,
  nearLateMs: 260,
};
export type MonkeyTuning = typeof MONKEY_TUNING;

/** The monkey's teasing with a tuning: its feint, the shells, the snatch, its release, the ledge, and the play's script. */
export interface MonkeyPlan {
  /** Its arm jerks down then (fist closed), and is back up feintMs later. */
  feint: number;
  /** The shells: dropped, and reaching the hands (the second dropped with the thing). */
  shells: readonly { drop: number; hands: number }[];
  /** The thing let go and snatched back in mid-air. */
  fake: { drop: number; snatch: number };
  /** The thing let go for real, clipping the ledge, reaching the hands. */
  release: number;
  ledge: number;
  hands: number;
  script: CueTapScript;
  tuning: CueTapTuning;
}

/** When a flinch at a feint presses: as the arm jerks (a startled hand closes at once). */
const FLINCH_MS = 200;

/** The monkey's teasing worked out from a tuning (the story's, or Debug's room's edited one). */
export function monkeyPlan(t: MonkeyTuning): MonkeyPlan {
  const feint = t.holdMs + t.feintAfterMs;
  const shellDrop = feint + t.decoyAfterMs;
  const shell = { drop: shellDrop, hands: shellDrop + t.fallMs };
  const fakeDrop = shell.hands + t.fakeAfterMs;
  const snatch = fakeDrop + t.snatchMs;
  const release = snatch + t.releaseAfterMs;
  const ledge = release + t.ledgeMs;
  const hands = ledge + t.afterLedgeMs;
  const second = { drop: release, hands: release + t.fallMs };
  const script: CueTapScript = {
    start: t.holdMs, moment: hands, end: hands + t.noneAfterMs,
    // A straight fall (as the shells') would reach the hands fallMs after it lets go; the clip on the ledge shows the delay.
    read: { guessAt: release + t.fallMs, tellAt: ledge },
    traps: [
      { kind: "feint", at: feint + FLINCH_MS, tellAt: feint },
      // The shell: small, brown and dull, from its other hand (the thing is held up in the first all along).
      { kind: "decoy", at: shell.hands, tellAt: shell.drop },
      // Let go, it falls: the catch its fall promises, until the monkey's hand snaps down and takes it back.
      { kind: "rest", at: fakeDrop + t.fallMs, tellAt: snatch },
      // The second shell, falling straight beside the thing: it reaches the hands first.
      { kind: "decoy", at: second.hands, tellAt: second.drop },
    ],
  };
  return { feint, shells: [shell, second], fake: { drop: fakeDrop, snatch }, release, ledge, hands, script, tuning: cueTapTuningFor(script, t) };
}

/** How near a shell's arrival hands closed on it (the shell lands in them, and the score line names it). */
export const MONKEY_ON_SHELL_MS = 150;

/**
 * The tease hands closed at, for the score line (like the cricket's 「高い球に振った」), or null (a tap at none: the
 * seconds off): its feint (until the first shell drops), the first shell (until it lets go of the thing), the fall it
 * snatches back (until it lets go for real), or the second shell (as it reaches the hands).
 */
export function monkeyTrapJa(plan: MonkeyPlan, tapMs: number): string | null {
  // On the second shell, before the catch's own window (a clean tap meets the thing, not the shell).
  if (Math.abs(tapMs - plan.shells[1].hands) <= MONKEY_ON_SHELL_MS) return tapMs < plan.hands - plan.tuning.cleanEarlyMs ? "殻で手を閉じた" : null;
  if (tapMs >= plan.release || tapMs < plan.feint) return null;
  if (tapMs < plan.shells[0].drop) return "フェイントで手を閉じた";
  if (tapMs < plan.fake.drop) return "殻で手を閉じた";
  return "取り返された時に手を閉じた";
}

/**
 * Hands closed at a tease, before the monkey lets go for real: it laughs and tosses the thing down past them at once
 * (when it is free in its hand: after the feint's jerk, or once it has brought the snatched one back up), or lets the
 * fall it would have snatched back go on; null for a tap after it let go. When the thing starts that fall from its hand,
 * and how long the fall takes to reach the hands.
 */
export function monkeyEarlyFall(plan: MonkeyPlan, tuning: MonkeyTuning, tapMs: number): { drop: number; fallMs: number } | null {
  if (tapMs >= plan.release) return null;
  if (tapMs >= plan.fake.drop && tapMs < plan.fake.snatch) return { drop: plan.fake.drop, fallMs: tuning.fallMs };
  const free = tapMs >= plan.feint && tapMs < plan.feint + tuning.feintMs ? plan.feint + tuning.feintMs
    : tapMs >= plan.fake.snatch ? plan.fake.snatch + MONKEY_SNATCH_BACK_MS : tapMs;
  return { drop: Math.max(tapMs + tuning.laughMs, free), fallMs: tuning.tossMs };
}

/** How long the monkey's hand takes to bring the snatched thing back up (the field draws it). */
export const MONKEY_SNATCH_BACK_MS = 260;

/**
 * The catch's rules with a tuning (the story's, or Debug's room's edited one). Clean: caught. A little early or late: it
 * bounces off the fingers (the hands closed on the shell beside it, or a moment late). Far off (the hands closed at a
 * feint, on the first shell, on the thing it snatched back, or long after), or no tap: it falls past the hands. ★ from
 * the engine: clean ★3, a little off ★2, far off ★1, no tap none; the score line names the tease the hands closed at.
 */
export function monkeyCatchRulesFor(tuning: MonkeyTuning): MiniGameRules<MonkeyCatchParams, MonkeyCatchOutcome, CueTapRecord> {
  const plan = monkeyPlan(tuning);
  return cueTapRules<MonkeyCatchParams, MonkeyCatchOutcome>(plan.tuning,
    { clean: "caught", early: "fumbled", late: "fumbled", miss: "missed", none: "missed" }, { trapJa: (tapMs) => monkeyTrapJa(plan, tapMs) });
}

/** Why an edited tuning would make the catch unfair (the engine's checks of the monkey's script; none: fair). */
export function monkeyCatchFairness(tuning: MonkeyTuning): string[] {
  const plan = monkeyPlan(tuning);
  const problems = cueTapScriptFairness(plan.script, tuning);
  if (plan.ledge <= plan.release || plan.ledge >= plan.release + tuning.fallMs) problems.push("the ledge is not on the thing's way down");
  if (tuning.snatchMs >= tuning.fallMs) problems.push("the monkey snatches the thing back after it would have reached the hands");
  if (plan.feint + tuning.feintMs > plan.shells[0].drop) problems.push("the shell drops before the feint is over");
  if (tuning.tossMs < 200 || tuning.laughMs < 0) problems.push("the monkey's laugh and toss after hands closed at a tease are too quick to see");
  return problems;
}

export const MONKEY_PLAN = monkeyPlan(MONKEY_TUNING);
export const monkeyCatchRules = monkeyCatchRulesFor(MONKEY_TUNING);
/** When taps start to count, when it lets go for real, when the thing reaches the hands, and when a play without a tap ends. */
export const MONKEY_START_MS = MONKEY_PLAN.script.start;
export const MONKEY_RELEASE_MS = MONKEY_PLAN.release;
export const MONKEY_HANDS_MS = MONKEY_PLAN.hands;
export const MONKEY_END_MS = MONKEY_PLAN.script.end;
