import { stepPickRules, type StepPickMap, type StepPickStretch, type StepPickTuning } from "../engines/step_pick/engine";

// Raju's haggle (docs/13 2.4): a step_pick skin with moods, the staring contest Raju's own line sets up (「じっと見られる
// と、ぼく、ちょっとずつ負けちゃう」). Round 3: a contest you read. Raju is never still: he boasts (chin up, the map held
// high: a stare now bounces off him and he gets huffier), then his eyes wander (a sigh, a glance at his map, fiddling with
// its corner, a look over at his grandpa's chai stall: a stare now lands), over and over. Two landed stares bring his price
// down a step (₹50 → ₹40 → ₹30). At ₹40 his boasts grow longer and his wobbles shorter, and after the first landed stare
// he pretends to walk away (「じゃあ、いいよ」), peeking back over his shoulder: a stare at the peek calls his bluff (₹30 at
// once); waited out, he comes back. At ₹30 he has nothing left: every stare bounces. Three bounces and he stomps off with
// the map. The price on show when the player says 「この値段で」 is the deal; 「やめておく」, his pride gone or doing nothing
// for a long while is no deal. Time alone never lowers the price (only stares do): it only changes how a stare lands. How
// far to push is an attitude, not a skill: no rating. His moods come from the numbers and what the player did, never the
// seed (docs/13 2.8; the seed picks only which tell he shows). Pure.

export type RajuHaggleOutcome = "buy_map" | "fair_map" | "haggle_map" | "decline_map";
/** The haggle has no keys of its own. */
export type RajuHaggleParams = object;

/**
 * Each outcome's price in rupees as the field shows it (null: no deal). The scene's choices pay the same (`# money:`;
 * tests/journeys/golden_triangle/raju-haggle.test.ts keeps them together).
 */
export const RAJU_PRICES: Readonly<Record<RajuHaggleOutcome, number | null>> = { buy_map: 50, fair_map: 40, haggle_map: 30, decline_map: null };

/** His prices in order, and the outcome each one is; no deal however the play ends without one. */
export const RAJU_MAP: StepPickMap<RajuHaggleOutcome> = {
  steps: ["buy_map", "fair_map", "haggle_map"], leave: "decline_map", out: "decline_map", none: "decline_map",
};

/** How Raju looks in each stretch of his moods (the field's drawing and words follow it). */
export type RajuLook = "boast" | "wobble" | "recover" | "turn" | "peek" | "back" | "floor";

/** The staring contest's numbers (E1; Debug's room may change them for its next play). Times in ms. */
export type RajuTuning = {
  /** The landed stares (in his wobbles) that bring his price down a step. */
  staresPerPrice: number;
  /** His pride: the stares that bounce off him (in his boasts, or at ₹30) before he gives up and keeps the map. */
  pride: number;
  /** Stares closer together than this count once (a stare, not a mash). */
  stareGapMs: number;
  /** Doing nothing this long (since the start or the last stare) and he asks no more: no deal. */
  idleMs: number;
  /** At ₹50: his first boast, his wobbles, his later boasts, and his recovering after a landed stare. */
  boastFirstMs: number;
  wobbleMs: number;
  boastMs: number;
  recoverMs: number;
  /** At ₹40: longer boasts, shorter wobbles. */
  boast40Ms: number;
  wobble40Ms: number;
  /** The fake walk-away at ₹40: turning away, peeking back (a stare calls the bluff), coming back. */
  turnMs: number;
  peekMs: number;
  backMs: number;
};
// A stare that ignores him does not work (2026-11-14 playtest: one a second, never reading him, reached ₹30): after a
// landed stare he is on guard a while (recoverMs), his boasts at ₹40 are long and he takes a moment to turn away, so a
// steady starer bounces off him (rules.test.ts: one a second never reaches ₹30; any steady pace from 0.6 to 1.6 s about
// 1 in 6, against 7 in 10 before), while one who stares in his wobbles still gets there.
export const RAJU_HAGGLE_TUNING: RajuTuning = {
  staresPerPrice: 2, pride: 3, stareGapMs: 350, idleMs: 12000,
  boastFirstMs: 1400, wobbleMs: 1800, boastMs: 1200, recoverMs: 1500,
  boast40Ms: 1800, wobble40Ms: 1200,
  turnMs: 1100, peekMs: 1500, backMs: 1300,
};

const ms = (value: number) => Math.max(1, Math.round(value));
const boast = (length: number, look: RajuLook = "boast"): StepPickStretch => ({ mood: "closed", ms: ms(length), look });
const wobble = (length: number): StepPickStretch => ({ mood: "open", ms: ms(length), look: "wobble" });

/** His routines for a tuning: `[price][landed stares]`, each from the moment the play came there. */
export function rajuRoutines(tuning: RajuTuning): StepPickStretch[][][] {
  const per = Math.max(1, Math.round(tuning.staresPerPrice));
  const fifty = [boast(tuning.boastFirstMs), wobble(tuning.wobbleMs), boast(tuning.boastMs), wobble(tuning.wobbleMs)];
  const fiftyAgain = [boast(tuning.recoverMs, "recover"), wobble(tuning.wobbleMs - 300), boast(tuning.boastMs), wobble(tuning.wobbleMs - 300)];
  const forty = [boast(tuning.boast40Ms), wobble(tuning.wobble40Ms), boast(tuning.boast40Ms - 200), wobble(tuning.wobble40Ms)];
  // After his first landed stare at ₹40: the fake walk-away (turning, peeking back, coming back), then his moods again.
  const bluff = [boast(tuning.turnMs, "turn"), { mood: "feint" as const, ms: ms(tuning.peekMs), look: "peek" }, boast(tuning.backMs, "back"),
    wobble(tuning.wobble40Ms), boast(tuning.boast40Ms), wobble(tuning.wobble40Ms)];
  const byLanded = (first: StepPickStretch[], again: StepPickStretch[], second = again) =>
    Array.from({ length: per }, (_, landed) => (landed === 0 ? first : landed === 1 ? second : again));
  return [byLanded(fifty, fiftyAgain), byLanded(forty, forty, bluff), [[boast(1500, "floor")]]];
}

/** The engine's steps for a tuning: three prices, two landed stares apart, his moods and his pride. */
export function rajuStepTuning(tuning: RajuTuning): StepPickTuning {
  const per = Math.max(1, Math.round(tuning.staresPerPrice));
  return {
    pushesPerStep: [per, per], pushLimit: null, pushGapMs: Math.max(0, Math.round(tuning.stareGapMs)), idleMs: Math.max(1, Math.round(tuning.idleMs)),
    moods: { routines: rajuRoutines(tuning), patience: Math.max(1, Math.round(tuning.pride)) },
  };
}
export const RAJU_TUNING: StepPickTuning = rajuStepTuning(RAJU_HAGGLE_TUNING);
/** His pride at the start: the stares that may bounce off him before he gives up. */
export const RAJU_PRIDE = RAJU_TUNING.moods!.patience;
/** He asks once more this long before doing nothing ends the haggle. */
export const RAJU_NUDGE_BEFORE_MS = 4000;

export const rajuHaggleRulesFor = (tuning: StepPickTuning) => stepPickRules<RajuHaggleParams, RajuHaggleOutcome>(tuning, RAJU_MAP);
export const rajuHaggleRules = rajuHaggleRulesFor(RAJU_TUNING);
