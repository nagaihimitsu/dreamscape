import type { MiniGameRating, MiniGameRules } from "../contract";
import {
  rhythmTapFairness, rhythmTapPick, rhythmTapRules, rhythmTapSteps, rhythmTapVsPartner, type RhythmTapPhrase, type RhythmTapRecord,
  type RhythmTapSummary, type RhythmTapTuning,
} from "../engines/rhythm_tap/engine";

// The golgappa duel's rules (docs/13 2.4): a rhythm_tap skin. The vendor's hand is written as phrases, each at its own
// pace (round 3, 2026-11-14: no longer one even speed-up): it gives hers (`h`), then the player's (`y`: the beats), now
// and then winds up over the player's bowl and gives nothing (`f`: a feint, the engine's rest: a bite at it fills the
// choke gauge by more), holds one over the bowl (a slow tease), drops two at once (a double), and speeds up to her 14th.
// At her 12th she bluffs (her hand half up, then she thumps her chest: the story's 「十二で、彼女が胸を叩いた」); after
// her 13th she says the next is her last; after her 14th her hand goes up. Two left in the bowl end the play (a choke),
// and so does mashing: a bite at nothing (a stray) fills the choke gauge, a golgappa eaten empties a drop, and a full
// gauge leaves one in the bowl. After her hand the vendor's climax (a fast run, a second feint, a hold, a last double)
// has narrower windows and no longer waits: one missed there (or a full gauge) is a choke (the next lands on it):
// going on past her is a real risk. The player's 「バス」 against her hand decides the rest. Nothing is random. Pure.
// Every number to tune is in GOLGAPPA_NUMBERS (E1; Debug's room edits them: play.ts retune).

export type GolgappaOutcome = "together" | "you_first" | "choke" | "outlast";
/** The duel has no keys of its own. */
export type GolgappaParams = object;

/** She raises her hand after her 14th (the scene's count: 「十四の声に重なって」; the hints say 14 too, so it stays). */
export const GOLGAPPA_HER_STOP = 14;
/** At her 12th she bluffs: her hand half up, then she thumps her chest and eats on (「十二で、彼女が胸を叩いた」). */
export const GOLGAPPA_HER_BLUFF = 12;
/** Raising the hand this many golgappa after her (the player's own count) is still 「同時」. */
export const GOLGAPPA_TOGETHER_AFTER = 1;

/**
 * The duel's numbers (ms unless named otherwise). Each phrase's step (GOLGAPPA_PHRASES says what it plays): her first
 * lands at `firstMs`; the player's after it, 1.2 s a pair, then 0.8 s; the first feint and the player's a step later; a
 * held one (0.9 s); a double (0.4 s apart); her double; the jump to her hand (0.6 s a pair); after it the climax on a
 * 0.17 s grid (0.34 s apart, a hold of 0.85 s). About 16.7 s. Windows: −130/+260 (the late side wider for a phone's
 * lag; narrow enough for the double), −110/+180 in the climax (the peak, with its one-slip limit), ぴったり −60/+90. A
 * feint fools a tap from 0.1 s before it to 0.15 s after, and fills two drops of the three-drop choke gauge; its mark on
 * the lane (and the hand's wind-up) shows it 0.29 s before. 「同時」 from 0.15 s before her hand. A golgappa falls for
 * 280 ms (less than the shortest time between two drops: one falls at a time); she eats hers in 250 ms. Round 3's bots
 * (rules.test.ts): eating on past her, the average player outlasts her about 7 times in 10, cleanly (★3) 3 to 4.
 */
export const GOLGAPPA_NUMBERS = {
  firstMs: 800,
  teachStepMs: 600,
  fasterStepMs: 400,
  feintStepMs: 380,
  teaseStepMs: 450,
  doubleStepMs: 400,
  runStepMs: 320,
  jumpStepMs: 300,
  climaxStepMs: 170,
  earlyMs: 130,
  lateMs: 260,
  peakEarlyMs: 110,
  peakLateMs: 180,
  peakMissLimit: 1,
  perfectEarlyMs: 60,
  perfectLateMs: 90,
  feintEarlyMs: 100,
  feintLateMs: 150,
  feintWeight: 2,
  feintTellMs: 290,
  endAfterMs: 700,
  missLimit: 2,
  strayLimit: 3,
  togetherBeforeMs: 150,
  fallMs: 280,
  herEatMs: 250,
} as const;
export type GolgappaNumbers = { readonly [Key in keyof typeof GOLGAPPA_NUMBERS]: number };

/**
 * The vendor's phrases, each at the pace of its number: `h` hers lands, `y` the player's (a beat), `f` a feint over the
 * player's bowl (a rest: nothing lands), `.` a step of waiting. The player's 1–3, 4–6, 7 (after the feint), 8 (held),
 * 9–10 (a double), 11–12 (with her double and her bluff), 13–14 (the jump; her hand just before the player's 14th), then
 * the climax 15–17, a feint, 18, a hold, 19–20.
 */
export const GOLGAPPA_PHRASES: readonly { pace: keyof GolgappaNumbers; steps: string }[] = [
  { pace: "teachStepMs", steps: "hyhyhy" },
  { pace: "fasterStepMs", steps: "hyhyhy" },
  { pace: "feintStepMs", steps: "hfy" },
  { pace: "teaseStepMs", steps: "h.y" },
  { pace: "doubleStepMs", steps: "hyy" },
  { pace: "runStepMs", steps: "hhyhy" },
  { pace: "jumpStepMs", steps: "hyhy" },
  { pace: "climaxStepMs", steps: ".y.y.y.f.y....y.y" },
];

/** One move of the vendor's hand: a golgappa into her bowl or the player's, or a feint over the player's. */
export interface GolgappaMove { at: number; to: "her" | "you"; feint: boolean }

/** A duel built from its numbers: the beats and windows, her landings, bluff and hand, the vendor's moves, the rules. */
export interface GolgappaGame {
  numbers: GolgappaNumbers;
  tuning: RhythmTapTuning;
  /** Every move of the vendor's hand, in order. */
  moves: readonly GolgappaMove[];
  /** When each of her 14 lands. */
  herLandings: readonly number[];
  /** When she bluffs: her 12th eaten (her hand half up, then her chest). */
  bluffMs: number;
  /** When she raises her hand: her 14th eaten (just before the player's 14th lands). */
  handMs: number;
  /** Why these numbers would be unfair (the engine's checks and the duel's own); none: fair. */
  fairness(): string[];
  rules: MiniGameRules<GolgappaParams, GolgappaOutcome, RhythmTapRecord>;
}

/**
 * The result card's ★ (display only: never saved, never in Ink; docs/13 4.1), in step with the outcome, and the risk's
 * reward (round 3): a choke or an early 「バス」 ★1; with her ★2 (safe); past her ★3 when nothing was left in the bowl
 * and no feint fooled the player (through the climax: the risk), else ★2. The score counts the golgappa eaten, those
 * right on the landing, and the feints bitten at.
 */
export function golgappaRating(summary: RhythmTapSummary, outcome: GolgappaOutcome): MiniGameRating {
  const clean = summary.misses === 0 && summary.overflows === 0 && summary.fooled === 0;
  const stars = outcome === "choke" || outcome === "you_first" ? 1 : outcome === "outlast" && clean ? 3 : 2;
  return { stars, scoreJa: `${summary.hits}個食べた・ぴったり${summary.perfects}${summary.fooled ? `・つられた${summary.fooled}` : ""}` };
}

const all = () => true;

/** The duel from its numbers (the story's: GOLGAPPA_NUMBERS; Debug's room's edited ones). */
export function golgappaGame(numbers: GolgappaNumbers = GOLGAPPA_NUMBERS): GolgappaGame {
  const phrases: RhythmTapPhrase[] = GOLGAPPA_PHRASES.map(({ pace, steps }) => ({ stepMs: Math.max(1, numbers[pace]), steps }));
  const { steps } = rhythmTapSteps(Math.round(numbers.firstMs), phrases);
  const beats = rhythmTapPick(steps, "y");
  const herLandings = rhythmTapPick(steps, "h");
  const feints = rhythmTapPick(steps, "f");
  const moves: GolgappaMove[] = steps.map((step) => ({ at: step.at, to: step.char === "h" ? "her" : "you", feint: step.char === "f" }));
  const tuning: RhythmTapTuning = {
    beats,
    earlyMs: numbers.earlyMs,
    lateMs: numbers.lateMs,
    peak: { from: GOLGAPPA_HER_STOP, earlyMs: numbers.peakEarlyMs, lateMs: numbers.peakLateMs, missLimit: numbers.peakMissLimit },
    perfect: { earlyMs: numbers.perfectEarlyMs, lateMs: numbers.perfectLateMs },
    endAfterMs: numbers.endAfterMs,
    missLimit: numbers.missLimit,
    strayLimit: numbers.strayLimit,
    partnerStop: GOLGAPPA_HER_STOP,
    rests: { at: feints, earlyMs: numbers.feintEarlyMs, lateMs: numbers.feintLateMs, weight: numbers.feintWeight },
  };
  const bluffMs = herLandings[GOLGAPPA_HER_BLUFF - 1] + numbers.herEatMs;
  const handMs = herLandings[GOLGAPPA_HER_STOP - 1] + numbers.herEatMs;
  /** The outcome of what the player did. */
  const outcome = (summary: RhythmTapSummary): GolgappaOutcome => {
    if (summary.ended === "misses") return "choke";
    const ahead = rhythmTapVsPartner(summary, tuning);
    // Never raised: ate every one the vendor had.
    if (ahead === null) return "outlast";
    // Just before her hand (her 14th in her mouth): nobody could tell who was first.
    if (ahead === -1) return (summary.endMs ?? 0) >= handMs - numbers.togetherBeforeMs ? "together" : "you_first";
    if (ahead < 0) return "you_first";
    return ahead <= GOLGAPPA_TOGETHER_AFTER ? "together" : "outlast";
  };
  const fairness = () => {
    const problems = rhythmTapFairness(tuning);
    const drops = moves.filter((move) => !move.feint).map((move) => move.at);
    drops.slice(1).forEach((at, index) => {
      if (at - drops[index] <= numbers.fallMs) problems.push(`drop ${index + 2} comes ${at - drops[index]} ms after the one before (a golgappa falls for fallMs ${numbers.fallMs}: two would fall at once)`);
    });
    if (drops[0] <= numbers.fallMs) problems.push(`the first golgappa lands at ${drops[0]} ms (it falls for ${numbers.fallMs}: it would start falling before the play)`);
    if (handMs >= beats[GOLGAPPA_HER_STOP - 1]) problems.push(`her hand (${handMs} ms) comes after the player's ${GOLGAPPA_HER_STOP}th lands`);
    if (handMs <= beats[GOLGAPPA_HER_STOP - 2]) problems.push(`her hand (${handMs} ms) comes before the player's ${GOLGAPPA_HER_STOP - 1}th lands`);
    if (numbers.feintTellMs <= 0) problems.push(`feintTellMs ${numbers.feintTellMs} shows a feint only after it`);
    return problems;
  };
  // Together: every one eaten, 「バス」 after the 14th. First: after the 10th. Choke: the 9th and 10th left. Outlast: all 20.
  const rules = rhythmTapRules<GolgappaParams, GolgappaOutcome>(tuning, outcome, {
    together: { hit: all, stopAfter: GOLGAPPA_HER_STOP },
    you_first: { hit: all, stopAfter: 10 },
    choke: { hit: (index) => index < 8 },
    outlast: { hit: all },
  }, golgappaRating);
  return { numbers, tuning, moves, herLandings, bluffMs, handMs, fairness, rules };
}

/** The story's duel. */
export const GOLGAPPA_GAME = golgappaGame();
export const GOLGAPPA_TUNING = GOLGAPPA_GAME.tuning;
export const GOLGAPPA_HER_HAND_MS = GOLGAPPA_GAME.handMs;
export const golgappaRules = GOLGAPPA_GAME.rules;
