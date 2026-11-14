import type { MiniGameRating, MiniGameRules } from "../contract";
import {
  rhythmTapOpens, rhythmTapPick, rhythmTapRules, rhythmTapSteps, type RhythmTapPhrase, type RhythmTapRecord, type RhythmTapSummary,
  type RhythmTapTuning,
} from "../engines/rhythm_tap/engine";

// The baraat dance's rules (docs/13 2.4): a rhythm_tap skin. The band's drum counts four (not to tap: taps then are not
// counted), then plays dance phrases (round 3, 2026-11-14: no longer sixteen even beats): on the beat, the 3-3-2 groove
// (off the beat), a double-time burst, a break (the band stops: rests not to tap), faster, and the finale with the big
// 「ドン・ドン」. How the player's taps meet the beats decides how the closing lines sound; mashing is no dancing, and a
// tap in the break is an extra tap. Nothing is random. Pure. Every number to tune is in BARAAT_NUMBERS (E1; Debug's
// room edits them: play.ts retune).

export type BaraatOutcome = "in_step" | "off_beat_together" | "stumble" | "stood_still";
/** The dance has no keys of its own. */
export type BaraatParams = object;

/** The drum's count-in, and the last big beats (the field makes them bigger): the story's shape. */
export const BARAAT_COUNT_IN = 4;
export const BARAAT_BIG_BEATS = 2;

/** A phrase of the band: its name (the field's word for it), its tempo's number, its eighth-note steps (`x` a beat, `X` big, `o` a rest). */
export interface BaraatPhrase { name: "count" | "teach" | "chaal" | "burst" | "break" | "faster" | "finale"; tempo: "bpm" | "fastBpm"; steps: string }

/**
 * The band's phrases, in eighth notes: the count-in (not to tap), four on the beat, the chaal (3-3-2: the second off the
 * beat), two then a double-time burst of four (eighths), the break (the band stops on two beats: not to tap), three on
 * the beat at the faster tempo and a stop on the fourth (not to tap: a breath before the end), the finale (the chaal at
 * the new tempo, then the two big ones).
 */
export const BARAAT_PHRASES: readonly BaraatPhrase[] = [
  { name: "count", tempo: "bpm", steps: "x.x.x.x." },
  { name: "teach", tempo: "bpm", steps: "x.x.x.x." },
  { name: "chaal", tempo: "bpm", steps: "x..x..x." },
  { name: "burst", tempo: "bpm", steps: "x.x.xxxx" },
  { name: "break", tempo: "bpm", steps: "o.o." },
  { name: "faster", tempo: "fastBpm", steps: "x.x.x.o." },
  { name: "finale", tempo: "fastBpm", steps: "x..x..X.X." },
];

/**
 * The dance's numbers. The drum's own tempo (not the scene's music, docs/13 2.11): 96 a minute to the break, then 108.
 * About 17 s. Windows −110/+180 (wider late: the drum is heard after it is seen, and a slow phone's +120 ms still meets
 * it; narrow enough for the burst's eighths, 0.31 s apart), the finale's −100/+170 (its peak); ぴったり −50 to +90 ms; a
 * tap at a rest fools from 0.1 s before it to 0.14 s after. In step: 18 of the 20 met with no more than 4 extra taps (a
 * tap at a rest is one); stumbling: extra taps at least as many as the beats met, and at least 8 (mashing), or more than
 * 4 with 18 met (every beat met, then mashing in the excitement: group2 N7). ★3 for in step with 16 beats or more right
 * on the drum and every rest held. The field shows the feet tangling from the second extra tap of a beat (tangleExtra;
 * display only, group2 N6: baraatFeet). Round 3's bots (rules.test.ts): the average dancer is in step nearly always but
 * ★3 about a third of the time; the careless one mostly dances off the beat (the story's default).
 */
export const BARAAT_NUMBERS = {
  bpm: 96,
  fastBpm: 108,
  countInFirstMs: 600,
  earlyMs: 110,
  lateMs: 180,
  finaleEarlyMs: 100,
  finaleLateMs: 170,
  perfectEarlyMs: 50,
  perfectLateMs: 90,
  restEarlyMs: 100,
  restLateMs: 140,
  endAfterMs: 700,
  inStepHits: 18,
  inStepExtra: 4,
  stumbleExtra: 8,
  threeStarPerfects: 16,
  tangleExtra: 2,
} as const;
export type BaraatNumbers = { readonly [Key in keyof typeof BARAAT_NUMBERS]: number };

/** A phrase of the band as played: its name, and when it starts and ends. */
export interface BaraatSection { name: BaraatPhrase["name"]; startMs: number; endMs: number }

/** A dance built from its numbers: the count-in, the beats and windows, the band's sections, the rules. */
export interface BaraatGame {
  numbers: BaraatNumbers;
  countIn: readonly number[];
  tuning: RhythmTapTuning;
  /** Each phrase as played (the count-in's too), in order. */
  sections: readonly BaraatSection[];
  /** The beats (by index from 0) to draw bigger: the finale's two. */
  bigBeats: readonly number[];
  outcome(summary: RhythmTapSummary): BaraatOutcome;
  rules: MiniGameRules<BaraatParams, BaraatOutcome, RhythmTapRecord>;
}

/**
 * Extra taps: taps beyond one a beat (a double tap, mashing, a tap at a rest). A tap that tried for a beat and missed
 * its window is no extra: it is a miss already.
 */
export const baraatExtraTaps = (summary: RhythmTapSummary): number => Math.max(0, summary.taps - summary.came);

/**
 * The feet as of `ms` (the field's look only, never the outcome: group2 N6). Each beat to dance owns the time nearest it
 * (from halfway after the beat before to halfway before the next; the first from its window's opening, so the count-in's
 * clapping is never in one): taps there beyond the first are its extra taps. `extra`: the extra taps so far in the beat
 * whose time `ms` is in (a tap that makes it `tangleExtra` tangles the feet: the dancers stagger); `tangled`: that beat or
 * the one before has `tangleExtra` or more (a beat met then shows no success: no bangles, no burst, no word). One
 * double tap, or a tap far off its beat, never tangles; mashing (three taps a beat) does, as it happens.
 */
export function baraatFeet(taps: readonly number[], ms: number, tuning: RhythmTapTuning, tangleExtra: number = BARAAT_NUMBERS.tangleExtra): {
  extra: number; tangled: boolean;
} {
  const { beats } = tuning;
  const opens = rhythmTapOpens(tuning);
  /** The beat whose time `time` is in (-1 before the first window opens). */
  const beatOf = (time: number) => {
    if (time < opens) return -1;
    let index = 0;
    while (index + 1 < beats.length && time >= (beats[index] + beats[index + 1]) / 2) index += 1;
    return index;
  };
  const now = beatOf(ms);
  if (now < 0) return { extra: 0, tangled: false };
  const counts = [0, 0];
  for (const tap of taps) {
    if (!Number.isFinite(tap) || tap > ms) continue;
    const at = beatOf(tap);
    if (at === now) counts[0] += 1;
    else if (at === now - 1) counts[1] += 1;
  }
  const limit = Math.max(1, Math.round(tangleExtra));
  const extra = Math.max(0, counts[0] - 1);
  return { extra, tangled: extra >= limit || counts[1] - 1 >= limit };
}

/** The dance from its numbers (the story's: BARAAT_NUMBERS; Debug's room's edited ones). */
export function baraatGame(numbers: BaraatNumbers = BARAAT_NUMBERS): BaraatGame {
  /** An eighth note at a tempo (never below a millisecond: Debug's room's zero). */
  const eighth = (bpm: number) => 60000 / Math.max(1, bpm) / 2;
  const phrases: RhythmTapPhrase[] = BARAAT_PHRASES.map((phrase) => ({ stepMs: eighth(numbers[phrase.tempo]), steps: phrase.steps }));
  // Each phrase on its own from where the one before ended (the same steps as all of them at once: rhythmTapSteps).
  const sections: BaraatSection[] = [];
  let at = Math.round(numbers.countInFirstMs);
  const written = BARAAT_PHRASES.map((phrase, index) => {
    const played = rhythmTapSteps(at, [phrases[index]]);
    sections.push({ name: phrase.name, startMs: at, endMs: played.endMs });
    at = played.endMs;
    return played.steps;
  });
  const [count, ...dance] = written;
  const steps = dance.flat();
  const countIn = rhythmTapPick(count, "xX");
  const beats = rhythmTapPick(steps, "xX");
  const finaleFrom = beats.findIndex((beat) => beat >= sections[sections.length - 1].startMs);
  const bigBeats = steps.filter((step) => step.char !== "o").flatMap((step, index) => (step.char === "X" ? [index] : []));
  const tuning: RhythmTapTuning = {
    beats,
    earlyMs: numbers.earlyMs,
    lateMs: numbers.lateMs,
    peak: { from: finaleFrom, earlyMs: numbers.finaleEarlyMs, lateMs: numbers.finaleLateMs },
    perfect: { earlyMs: numbers.perfectEarlyMs, lateMs: numbers.perfectLateMs },
    endAfterMs: numbers.endAfterMs,
    rests: { at: rhythmTapPick(steps, "o"), earlyMs: numbers.restEarlyMs, lateMs: numbers.restLateMs },
  };
  /** The outcome of how the player's taps met the beats (taps during the count-in are not counted). */
  const outcome = (summary: RhythmTapSummary): BaraatOutcome => {
    if (summary.taps === 0) return "stood_still";
    const extra = baraatExtraTaps(summary);
    // Mashing, or every beat met and then mashing (group2 N7: 「ずれたまま」 did not fit a dance with every beat met).
    if (extra >= Math.max(numbers.stumbleExtra, summary.hits)) return "stumble";
    if (summary.hits >= numbers.inStepHits) return extra <= numbers.inStepExtra ? "in_step" : "stumble";
    return "off_beat_together";
  };
  /**
   * The result card's ★ (display only: never saved, never in Ink; docs/13 4.1), in step with the outcome: stumbling or
   * dancing off the beat ★1, in step ★2, in step with 16 or more right on the drum and every rest held ★3; standing still
   * is not rated. The score counts the beats right on the drum, then those met.
   */
  const rate = (summary: RhythmTapSummary, given: BaraatOutcome): MiniGameRating | null => {
    if (given === "stood_still") return null;
    const stars = given !== "in_step" ? 1 : summary.perfects >= numbers.threeStarPerfects && summary.fooled === 0 ? 3 : 2;
    return { stars, scoreJa: `ぴったり ${summary.perfects}拍・${beats.length}拍中${summary.hits}拍` };
  };
  /** Mashing: a tap every 140 ms from the first beat's window to the end. */
  const mashed = Array.from({ length: Math.floor((beats[beats.length - 1] - rhythmTapOpens(tuning)) / 140) }, (_, index) => rhythmTapOpens(tuning) + index * 140);
  // In step: every beat. Off: the first half. Stumble: mashing. Still: no tap.
  const rules = rhythmTapRules<BaraatParams, BaraatOutcome>(tuning, outcome, {
    in_step: { hit: () => true },
    off_beat_together: { hit: (index) => index < beats.length / 2 },
    stumble: { strays: mashed },
    stood_still: {},
  }, rate);
  return { numbers, countIn, tuning, sections, bigBeats, outcome, rules };
}

/** The story's dance. */
export const BARAAT_GAME = baraatGame();
export const BARAAT_TUNING = BARAAT_GAME.tuning;
export const BARAAT_COUNT_IN_BEATS = BARAAT_GAME.countIn;
export const BARAAT_BEATS = BARAAT_TUNING.beats.length;
export const BARAAT_IN_STEP_HITS = BARAAT_NUMBERS.inStepHits;
export const BARAAT_IN_STEP_EXTRA = BARAAT_NUMBERS.inStepExtra;
export const baraatOutcome = BARAAT_GAME.outcome;
export const baraatRules = BARAAT_GAME.rules;
