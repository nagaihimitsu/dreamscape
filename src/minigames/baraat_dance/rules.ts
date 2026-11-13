import { rhythmTapBeats, rhythmTapInterval, rhythmTapRules, type RhythmTapSummary, type RhythmTapTuning } from "../engines/rhythm_tap/engine";

// The baraat dance's rules (docs/13 2.4): a rhythm_tap skin. The band's drum counts four (not to tap), then beats
// steadily; how the player's taps meet the beats decides how the closing lines sound. Nothing is random. Pure.

export type BaraatOutcome = "in_step" | "off_beat_together" | "stumble" | "stood_still";
/** The dance has no keys of its own. */
export type BaraatParams = object;

/** The drum's tempo (its own: not the scene's music, docs/13 2.11), its count-in and the beats to dance. */
export const BARAAT_BPM = 96;
export const BARAAT_COUNT_IN = 4;
export const BARAAT_BEATS = 16;
export const BARAAT_INTERVAL_MS = rhythmTapInterval(BARAAT_BPM);
/** The count-in's four drum beats (before the first to dance), from 0.6 s. */
export const BARAAT_COUNT_IN_BEATS = rhythmTapBeats({ firstMs: 600, count: BARAAT_COUNT_IN, intervalMs: BARAAT_INTERVAL_MS });

/** About 13 s: the count-in, then 16 beats; generous windows, wider late (the drum is heard after it is seen). */
export const BARAAT_TUNING: RhythmTapTuning = {
  beats: rhythmTapBeats({ firstMs: BARAAT_COUNT_IN_BEATS[BARAAT_COUNT_IN - 1] + BARAAT_INTERVAL_MS, count: BARAAT_BEATS, intervalMs: BARAAT_INTERVAL_MS }),
  earlyMs: 120,
  lateMs: 180,
  endAfterMs: 600,
};

/** In step: this many of the beats met (70%). */
export const BARAAT_IN_STEP_HITS = Math.ceil(BARAAT_BEATS * 0.7);

/** The outcome of how the player's taps met the beats. */
export function baraatOutcome(summary: RhythmTapSummary): BaraatOutcome {
  if (summary.taps === 0) return "stood_still";
  if (summary.hits >= BARAAT_IN_STEP_HITS) return "in_step";
  return summary.strays > summary.hits ? "stumble" : "off_beat_together";
}

/** Halfway between a beat and the next (a tap there meets neither). */
const between = (index: number) => BARAAT_TUNING.beats[index] + Math.round(BARAAT_INTERVAL_MS / 2);
/** In step: every beat. Off: the first half. Stumble: two beats, then taps between the beats. Still: no tap. */
export const baraatRules = rhythmTapRules<BaraatParams, BaraatOutcome>(BARAAT_TUNING, baraatOutcome, {
  in_step: { hit: () => true },
  off_beat_together: { hit: (index) => index < BARAAT_BEATS / 2 },
  stumble: { hit: (index) => index < 2, strays: [4, 5, 6, 7, 8, 9, 10, 11, 12].map(between) },
  stood_still: {},
});
