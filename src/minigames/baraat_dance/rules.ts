import { rhythmTapBeats, rhythmTapInterval, rhythmTapRules, rhythmTapThen, type RhythmTapSummary, type RhythmTapTuning } from "../engines/rhythm_tap/engine";

// The baraat dance's rules (docs/13 2.4): a rhythm_tap skin. The band's drum counts four (not to tap: taps then are not
// counted), then beats for 16; halfway the band speeds up, and the last two are the big 「ドン・ドン」. How the player's
// taps meet the beats decides how the closing lines sound; mashing is no dancing. Nothing is random. Pure. Every number
// to tune is here (E1).

export type BaraatOutcome = "in_step" | "off_beat_together" | "stumble" | "stood_still";
/** The dance has no keys of its own. */
export type BaraatParams = object;

/** The drum's tempo (its own: not the scene's music, docs/13 2.11): 96 a minute, then 108 from the 9th beat. */
export const BARAAT_BPM = 96;
export const BARAAT_FAST_BPM = 108;
export const BARAAT_COUNT_IN = 4;
export const BARAAT_BEATS = 16;
/** The beats at the slower tempo (the rest are faster). */
export const BARAAT_SLOW_BEATS = 8;
/** The last beats: the big 「ドン・ドン」 (the field makes them bigger). */
export const BARAAT_BIG_BEATS = 2;
export const BARAAT_INTERVAL_MS = rhythmTapInterval(BARAAT_BPM);
export const BARAAT_FAST_INTERVAL_MS = rhythmTapInterval(BARAAT_FAST_BPM);
/** The count-in's four drum beats (before the first to dance), from 0.6 s. */
export const BARAAT_COUNT_IN_BEATS = rhythmTapBeats({ firstMs: 600, count: BARAAT_COUNT_IN, intervalMs: BARAAT_INTERVAL_MS });

/**
 * About 12.5 s: the count-in, 8 beats, then 8 faster. Generous windows, wider late (the drum is heard after it is seen);
 * ぴったり within −50 to +90 ms.
 */
export const BARAAT_TUNING: RhythmTapTuning = {
  beats: rhythmTapThen(
    rhythmTapBeats({ firstMs: BARAAT_COUNT_IN_BEATS[BARAAT_COUNT_IN - 1] + BARAAT_INTERVAL_MS, count: BARAAT_SLOW_BEATS, intervalMs: BARAAT_INTERVAL_MS }),
    Array.from({ length: BARAAT_BEATS - BARAAT_SLOW_BEATS }, () => BARAAT_FAST_INTERVAL_MS),
  ),
  earlyMs: 120,
  lateMs: 180,
  perfect: { earlyMs: 50, lateMs: 90 },
  endAfterMs: 600,
};

/**
 * Extra taps: taps beyond one a beat (a double tap, mashing). A tap that tried for a beat and missed its window is no
 * extra: it is a miss already.
 */
export const baraatExtraTaps = (summary: RhythmTapSummary): number => Math.max(0, summary.taps - summary.came);
/** In step: this many of the beats met (70%), with no more than BARAAT_IN_STEP_EXTRA extra taps. */
export const BARAAT_IN_STEP_HITS = Math.ceil(BARAAT_BEATS * 0.7);
export const BARAAT_IN_STEP_EXTRA = 4;
/** Stumbling: extra taps at least as many as the beats met, and at least this many (mashing). */
export const BARAAT_STUMBLE_EXTRA = 8;

/** The outcome of how the player's taps met the beats (taps during the count-in are not counted). */
export function baraatOutcome(summary: RhythmTapSummary): BaraatOutcome {
  if (summary.taps === 0) return "stood_still";
  const extra = baraatExtraTaps(summary);
  if (extra >= Math.max(BARAAT_STUMBLE_EXTRA, summary.hits)) return "stumble";
  if (summary.hits >= BARAAT_IN_STEP_HITS && extra <= BARAAT_IN_STEP_EXTRA) return "in_step";
  return "off_beat_together";
}

/** A third and two thirds of the way from a beat to the next (taps there meet neither). */
const between = (index: number) => {
  const [from, to] = [BARAAT_TUNING.beats[index], BARAAT_TUNING.beats[index + 1]];
  return [Math.round(from + (to - from) / 3), Math.round(from + ((to - from) * 2) / 3)];
};
/** In step: every beat. Off: the first half. Stumble: two beats, then two taps between each beat. Still: no tap. */
export const baraatRules = rhythmTapRules<BaraatParams, BaraatOutcome>(BARAAT_TUNING, baraatOutcome, {
  in_step: { hit: () => true },
  off_beat_together: { hit: (index) => index < BARAAT_BEATS / 2 },
  stumble: { hit: (index) => index < 2, strays: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].flatMap(between) },
  stood_still: {},
});
