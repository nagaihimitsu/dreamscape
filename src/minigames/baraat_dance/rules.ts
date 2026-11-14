import type { MiniGameRating, MiniGameRules } from "../contract";
import {
  rhythmTapBeats, rhythmTapInterval, rhythmTapRules, rhythmTapThen, type RhythmTapRecord, type RhythmTapSummary, type RhythmTapTuning,
} from "../engines/rhythm_tap/engine";

// The baraat dance's rules (docs/13 2.4): a rhythm_tap skin. The band's drum counts four (not to tap: taps then are not
// counted), then beats for 16; halfway the band speeds up, and the last two are the big 「ドン・ドン」. How the player's
// taps meet the beats decides how the closing lines sound; mashing is no dancing. Nothing is random. Pure. Every number
// to tune is in BARAAT_NUMBERS (E1; Debug's room edits them: play.ts retune).

export type BaraatOutcome = "in_step" | "off_beat_together" | "stumble" | "stood_still";
/** The dance has no keys of its own. */
export type BaraatParams = object;

/** The drum's count-in, the beats to dance, and the last big ones (the field makes them bigger): the story's shape. */
export const BARAAT_COUNT_IN = 4;
export const BARAAT_BEATS = 16;
export const BARAAT_BIG_BEATS = 2;

/**
 * The dance's numbers. The drum's own tempo (not the scene's music, docs/13 2.11): 96 a minute for the count-in and the
 * first 8 beats, then 108. About 12.5 s. Generous windows, wider late (the drum is heard after it is seen); ぴったり within
 * −50 to +90 ms. In step: 12 of the 16 met with no more than 4 extra taps; stumbling: extra taps at least as many as the
 * beats met, and at least 8 (mashing). ★3 for 10 beats or more right on the drum.
 */
export const BARAAT_NUMBERS = {
  bpm: 96,
  fastBpm: 108,
  slowBeats: 8,
  countInFirstMs: 600,
  earlyMs: 120,
  lateMs: 180,
  perfectEarlyMs: 50,
  perfectLateMs: 90,
  endAfterMs: 600,
  inStepHits: 12,
  inStepExtra: 4,
  stumbleExtra: 8,
  threeStarPerfects: 10,
} as const;
export type BaraatNumbers = { readonly [Key in keyof typeof BARAAT_NUMBERS]: number };

/** A dance built from its numbers: the count-in, the beats and windows, the rules. */
export interface BaraatGame {
  numbers: BaraatNumbers;
  countIn: readonly number[];
  tuning: RhythmTapTuning;
  outcome(summary: RhythmTapSummary): BaraatOutcome;
  rules: MiniGameRules<BaraatParams, BaraatOutcome, RhythmTapRecord>;
}

/**
 * Extra taps: taps beyond one a beat (a double tap, mashing). A tap that tried for a beat and missed its window is no
 * extra: it is a miss already.
 */
export const baraatExtraTaps = (summary: RhythmTapSummary): number => Math.max(0, summary.taps - summary.came);

/** The dance from its numbers (the story's: BARAAT_NUMBERS; Debug's room's edited ones). */
export function baraatGame(numbers: BaraatNumbers = BARAAT_NUMBERS): BaraatGame {
  const interval = rhythmTapInterval(numbers.bpm);
  const countIn = rhythmTapBeats({ firstMs: numbers.countInFirstMs, count: BARAAT_COUNT_IN, intervalMs: interval });
  const slow = Math.min(BARAAT_BEATS, Math.max(1, Math.round(numbers.slowBeats)));
  const tuning: RhythmTapTuning = {
    beats: rhythmTapThen(
      rhythmTapBeats({ firstMs: countIn[BARAAT_COUNT_IN - 1] + interval, count: slow, intervalMs: interval }),
      Array.from({ length: BARAAT_BEATS - slow }, () => rhythmTapInterval(numbers.fastBpm)),
    ),
    earlyMs: numbers.earlyMs,
    lateMs: numbers.lateMs,
    perfect: { earlyMs: numbers.perfectEarlyMs, lateMs: numbers.perfectLateMs },
    endAfterMs: numbers.endAfterMs,
  };
  /** The outcome of how the player's taps met the beats (taps during the count-in are not counted). */
  const outcome = (summary: RhythmTapSummary): BaraatOutcome => {
    if (summary.taps === 0) return "stood_still";
    const extra = baraatExtraTaps(summary);
    if (extra >= Math.max(numbers.stumbleExtra, summary.hits)) return "stumble";
    if (summary.hits >= numbers.inStepHits && extra <= numbers.inStepExtra) return "in_step";
    return "off_beat_together";
  };
  /**
   * The result card's ★ (display only: never saved, never in Ink; docs/13 4.1), in step with the outcome: stumbling or
   * dancing off the beat ★1, in step ★2, in step with 10 or more right on the drum ★3; standing still is not rated. The
   * score counts the beats right on the drum, then those met.
   */
  const rate = (summary: RhythmTapSummary, given: BaraatOutcome): MiniGameRating | null => {
    if (given === "stood_still") return null;
    const stars = given !== "in_step" ? 1 : summary.perfects >= numbers.threeStarPerfects ? 3 : 2;
    return { stars, scoreJa: `ぴったり ${summary.perfects}拍・${BARAAT_BEATS}拍中${summary.hits}拍` };
  };
  /** A third and two thirds of the way from a beat to the next (taps there meet neither). */
  const between = (index: number) => {
    const [from, to] = [tuning.beats[index], tuning.beats[index + 1]];
    return [Math.round(from + (to - from) / 3), Math.round(from + ((to - from) * 2) / 3)];
  };
  // In step: every beat. Off: the first half. Stumble: two beats, then two taps between each beat. Still: no tap.
  const rules = rhythmTapRules<BaraatParams, BaraatOutcome>(tuning, outcome, {
    in_step: { hit: () => true },
    off_beat_together: { hit: (index) => index < BARAAT_BEATS / 2 },
    stumble: { hit: (index) => index < 2, strays: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].flatMap(between) },
    stood_still: {},
  }, rate);
  return { numbers, countIn, tuning, outcome, rules };
}

/** The story's dance. */
export const BARAAT_GAME = baraatGame();
export const BARAAT_TUNING = BARAAT_GAME.tuning;
export const BARAAT_COUNT_IN_BEATS = BARAAT_GAME.countIn;
export const BARAAT_INTERVAL_MS = rhythmTapInterval(BARAAT_NUMBERS.bpm);
export const BARAAT_FAST_INTERVAL_MS = rhythmTapInterval(BARAAT_NUMBERS.fastBpm);
export const BARAAT_SLOW_BEATS = BARAAT_NUMBERS.slowBeats;
export const BARAAT_IN_STEP_HITS = BARAAT_NUMBERS.inStepHits;
export const BARAAT_IN_STEP_EXTRA = BARAAT_NUMBERS.inStepExtra;
export const baraatOutcome = BARAAT_GAME.outcome;
export const baraatRules = BARAAT_GAME.rules;
