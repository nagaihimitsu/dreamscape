import type { MiniGameRating, MiniGameRules } from "../contract";
import {
  rhythmTapBeats, rhythmTapRules, rhythmTapThen, rhythmTapVsPartner, type RhythmTapRecord, type RhythmTapSummary, type RhythmTapTuning,
} from "../engines/rhythm_tap/engine";

// The golgappa duel's rules (docs/13 2.4): a rhythm_tap skin. The player's golgappa are the beats; she gets hers between
// them (the field draws them) and raises her hand after her 14th. Two left in the bowl end the play (a choke), and so
// does mashing: a bite at nothing (a stray) fills the choke gauge, a golgappa eaten empties a drop, and a full gauge
// leaves one in the bowl. After her 14th the vendor goes faster and the windows narrow: going on past her is a risk.
// The player's 「バス」 against her hand decides the rest. Nothing is random. Pure. Every number to tune is in
// GOLGAPPA_NUMBERS (E1; Debug's room edits them: play.ts retune).

export type GolgappaOutcome = "together" | "you_first" | "choke" | "outlast";
/** The duel has no keys of its own. */
export type GolgappaParams = object;

/** She raises her hand after her 14th (the scene's count: 「十四の声に重なって」; the hints say 14 too, so it stays). */
export const GOLGAPPA_HER_STOP = 14;
/** Raising the hand this many golgappa after her (the player's own count) is still 「同時」. */
export const GOLGAPPA_TOGETHER_AFTER = 1;

/**
 * The duel's numbers (ms unless named otherwise). The player's golgappa: the first after the vendor's reach, 1.2 s apart,
 * faster evenly to 0.6 s by the 14th; then the peak after her hand goes up, 0.48, 0.42 and 0.42 s apart with a narrower
 * late window; 17 in all (about 15 s). Generous windows: a golgappa can be eaten as it lands and a while after (ぴったり
 * within −60/+90). A missed one stays in the bowl; a full choke gauge (three bites at nothing, less the golgappa eaten
 * since) leaves one too; the second one there ends the play. 「同時」 from 0.15 s before her hand. A golgappa falls for
 * 280 ms (less than half the shortest gap: one falls at a time); she eats hers in 250 ms.
 */
export const GOLGAPPA_NUMBERS = {
  firstMs: 1400,
  firstGapMs: 1200,
  herStopGapMs: 600,
  peakGap1Ms: 480,
  peakGap2Ms: 420,
  peakGap3Ms: 420,
  earlyMs: 150,
  lateMs: 300,
  peakLateMs: 200,
  perfectEarlyMs: 60,
  perfectLateMs: 90,
  endAfterMs: 700,
  missLimit: 2,
  strayLimit: 3,
  togetherBeforeMs: 150,
  fallMs: 280,
  herEatMs: 250,
} as const;
export type GolgappaNumbers = { readonly [Key in keyof typeof GOLGAPPA_NUMBERS]: number };

/** A duel built from its numbers: the beats and windows, her landings and hand, the rules. */
export interface GolgappaGame {
  numbers: GolgappaNumbers;
  tuning: RhythmTapTuning;
  /** When each of her 14 lands (halfway before each of the player's: the vendor gives hers first in each round). */
  herLandings: readonly number[];
  /** When she raises her hand: her 14th eaten (just before the player's 14th lands). */
  handMs: number;
  rules: MiniGameRules<GolgappaParams, GolgappaOutcome, RhythmTapRecord>;
}

/** When her golgappa lands: halfway before each of the player's first 14. */
export function golgappaHerLandings(tuning: RhythmTapTuning): number[] {
  const { beats } = tuning;
  const gapBefore = (index: number) => (index === 0 ? beats[1] - beats[0] : beats[index] - beats[index - 1]);
  return beats.slice(0, GOLGAPPA_HER_STOP).map((beat, index) => beat - Math.round(gapBefore(index) / 2));
}

/**
 * The result card's ★ (display only: never saved, never in Ink; docs/13 4.1), in step with the outcome: a choke or an
 * early 「バス」 ★1; with her or past her ★3 when nothing was left in the bowl, else ★2. The score counts the golgappa
 * eaten and those right on the landing.
 */
export function golgappaRating(summary: RhythmTapSummary, outcome: GolgappaOutcome): MiniGameRating {
  const clean = summary.misses === 0 && summary.overflows === 0;
  const stars = outcome === "choke" || outcome === "you_first" ? 1 : clean ? 3 : 2;
  return { stars, scoreJa: `${summary.hits}個食べた・ぴったり${summary.perfects}` };
}

const all = () => true;

/** The duel from its numbers (the story's: GOLGAPPA_NUMBERS; Debug's room's edited ones). */
export function golgappaGame(numbers: GolgappaNumbers = GOLGAPPA_NUMBERS): GolgappaGame {
  const tuning: RhythmTapTuning = {
    beats: rhythmTapThen(
      rhythmTapBeats({ firstMs: numbers.firstMs, count: GOLGAPPA_HER_STOP, intervalMs: numbers.firstGapMs, endIntervalMs: numbers.herStopGapMs }),
      [numbers.peakGap1Ms, numbers.peakGap2Ms, numbers.peakGap3Ms],
    ),
    earlyMs: numbers.earlyMs,
    lateMs: numbers.lateMs,
    peak: { from: GOLGAPPA_HER_STOP, earlyMs: numbers.earlyMs, lateMs: numbers.peakLateMs },
    perfect: { earlyMs: numbers.perfectEarlyMs, lateMs: numbers.perfectLateMs },
    endAfterMs: numbers.endAfterMs,
    missLimit: numbers.missLimit,
    strayLimit: numbers.strayLimit,
    partnerStop: GOLGAPPA_HER_STOP,
  };
  const herLandings = golgappaHerLandings(tuning);
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
  // Together: every one eaten, 「バス」 after the 14th. First: after the 10th. Choke: the 9th and 10th left. Outlast: all 17.
  const rules = rhythmTapRules<GolgappaParams, GolgappaOutcome>(tuning, outcome, {
    together: { hit: all, stopAfter: GOLGAPPA_HER_STOP },
    you_first: { hit: all, stopAfter: 10 },
    choke: { hit: (index) => index < 8 },
    outlast: { hit: all },
  }, golgappaRating);
  return { numbers, tuning, herLandings, handMs, rules };
}

/** The story's duel. */
export const GOLGAPPA_GAME = golgappaGame();
export const GOLGAPPA_TUNING = GOLGAPPA_GAME.tuning;
export const GOLGAPPA_HER_HAND_MS = GOLGAPPA_GAME.handMs;
export const golgappaRules = GOLGAPPA_GAME.rules;
