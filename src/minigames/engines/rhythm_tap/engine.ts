import { z } from "zod";
import type { MiniGameRating, MiniGameRules } from "../../contract";

// The `rhythm_tap` engine's rules (docs/13 2.2, 2.4, 2.11): beats come one after another (the skin's beat map, written
// out or made from a tempo by rhythmTapBeats) and the player taps each as it comes. A tap inside a beat's window hits
// it (one inside the finer `perfect` window is right on it: ぴったり); a beat whose window closes without one is missed;
// a tap that meets no beat (or a beat already hit) is a stray. Taps before the first beat's window opens (a count-in,
// the vendor's reach) are not counted at all: tapping along with a count is no fault. A skin may narrow the last beats'
// windows (the play's peak), give the player a stop button (the play ends when they press it), a partner who stops after
// a fixed beat, a limit of misses that ends the play, and a stray gauge (each stray fills it, each hit empties one; full,
// it counts as a miss: mashing does not pay). Times are milliseconds of the host's clock from the play's start.
//
// Audio latency (docs/13 2.11): the beats are judged against the screen's beat on the host's clock (input times through
// clock.at(event.timeStamp)), never against the sound, and there is no per-device offset setting. A sound reaches the
// ear some tens of milliseconds after the clock's beat (more over Bluetooth), and a picture reaches the eye a frame or
// two after it, so the window is generous and wider on the late side (rhythmTapFairness); the game is played by the
// beats on screen (the lane's marks, the field), so it plays the same with the sound off. If a device turns out to need
// an offset, it is a ⚙設定 item for later (docs/13 2.11). Pure: no clock, DOM or React (EnginePlay.tsx draws and times).

/** A play's record: the taps' times, and when the player pressed the stop button (null: never). */
export type RhythmTapRecord = { taps: readonly number[]; stopMs: number | null };

const windowMs = z.number().int().positive();

/** A skin's beats and timing (in its definition's code, never in a tag: docs/13 2.2). */
export const rhythmTapTuningSchema = z.object({
  /** When each beat comes, ascending (the moment to tap). */
  beats: z.array(z.number().int().nonnegative()).min(2),
  /** A tap this much before a beat still hits it. */
  earlyMs: windowMs,
  /** A tap this much after a beat still hits it; when it has passed without one, the beat is missed. */
  lateMs: windowMs,
  /** The play's peak: from the beat at index `from` (from 0) on, these windows (narrower than the others). */
  peak: z.object({ from: z.number().int().nonnegative(), earlyMs: windowMs, lateMs: windowMs }).strict().optional(),
  /** A hit this close to its beat is right on it (ぴったり): a finer grade inside every window; none: one grade. */
  perfect: z.object({ earlyMs: windowMs, lateMs: windowMs }).strict().optional(),
  /** After the last beat, the play ends (by itself). */
  endAfterMs: windowMs,
  /** This many misses end the play at once (none: the play goes on to the end). A full stray gauge counts as one. */
  missLimit: z.number().int().positive().optional(),
  /** The stray gauge's size: each stray fills it by one, each hit empties one; full, it empties and counts as a miss. */
  strayLimit: z.number().int().positive().optional(),
  /** The partner stops after this many beats (none: no partner). The skin draws them; the summary compares the stop. */
  partnerStop: z.number().int().positive().optional(),
}).strict();
export type RhythmTapTuning = z.infer<typeof rhythmTapTuningSchema>;

/** How a play ended: the player's stop button, the miss limit, or the beats ran out. */
export type RhythmTapEnd = "stop" | "misses" | "end";

/** What a record did, as of a moment (rhythmTapJudge). */
export interface RhythmTapSummary {
  /** Each beat judged so far, in order (a beat whose window is still open, or that came after the end, is not in it). */
  judged: readonly ("hit" | "miss")[];
  /** Each judged beat's tap against its beat (ms; negative: early), or null for a miss. */
  offsets: readonly (number | null)[];
  hits: number;
  /** Hits inside the `perfect` window (none without one). */
  perfects: number;
  /** Beats missed (the stray gauge's overflows are counted apart). */
  misses: number;
  /** Taps that met no beat, or a beat already hit (taps before the first window are not counted at all). */
  strays: number;
  /** The stray gauge as it is now (0 to strayLimit − 1). */
  gauge: number;
  /** How many times the stray gauge filled (each one counted as a miss toward missLimit). */
  overflows: number;
  /** Taps counted before the end (from the first beat's window on). */
  taps: number;
  /** The run of hits up to the last judged beat. */
  streak: number;
  longestStreak: number;
  /** Beats that have come (their moment passed) before the end. */
  came: number;
  /** When the player stopped: the beats that had come by then. */
  stopCount: number | null;
  /** How the play ended, once it has. */
  ended: RhythmTapEnd | null;
  endMs: number | null;
}

/** Fair on a phone (docs/13 2.2): a tap's own lag differs between devices by some tens of milliseconds (both sides). */
export const RHYTHM_TAP_MIN_WINDOW_MS = 70;
/** A fair ぴったり on a phone: its window (early and late together) at least this wide. */
export const RHYTHM_TAP_MIN_PERFECT_MS = 100;
/** A stray gauge smaller than this would count a single slip of the thumb (a double tap) as a miss. */
export const RHYTHM_TAP_MIN_STRAY_LIMIT = 3;
/** The host's double-tap guard (src/minigames/host/timing.ts): input this soon after the start is the start button's second tap. */
export const RHYTHM_TAP_GUARD_MS = 450;
/** Beats closer than this ask for speed, not rhythm (about three taps a second with one thumb). */
export const RHYTHM_TAP_MIN_GAP_MS = 300;

/** The hit window of the beat at `index` (the peak's from its first beat on). */
export function rhythmTapWindow(tuning: RhythmTapTuning, index: number): { earlyMs: number; lateMs: number } {
  const { peak } = tuning;
  return peak && index >= peak.from ? { earlyMs: peak.earlyMs, lateMs: peak.lateMs } : { earlyMs: tuning.earlyMs, lateMs: tuning.lateMs };
}

/** Whether a hit's offset (tap − beat) is right on the beat (ぴったり); never without a perfect window. */
export function rhythmTapPerfect(tuning: RhythmTapTuning, offset: number): boolean {
  return !!tuning.perfect && offset >= -tuning.perfect.earlyMs && offset <= tuning.perfect.lateMs;
}

/** When the first beat's window opens: taps before it are not counted (a count-in). */
export const rhythmTapOpens = (tuning: RhythmTapTuning): number => tuning.beats[0] - rhythmTapWindow(tuning, 0).earlyMs;

/** The reasons a tuning is not fair on a phone (none: fair). */
export function rhythmTapFairness(tuning: RhythmTapTuning): string[] {
  const parsed = rhythmTapTuningSchema.safeParse(tuning);
  if (!parsed.success) return [`not a rhythm_tap tuning: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`];
  const { beats, endAfterMs, partnerStop, peak, perfect, strayLimit } = tuning;
  const problems: string[] = [];
  const windows = [{ name: "", earlyMs: tuning.earlyMs, lateMs: tuning.lateMs }, ...(peak ? [{ name: "peak.", ...peak }] : [])];
  for (const { name, earlyMs, lateMs } of windows) {
    if (earlyMs < RHYTHM_TAP_MIN_WINDOW_MS) problems.push(`${name}earlyMs ${earlyMs} is narrower than ${RHYTHM_TAP_MIN_WINDOW_MS} (a phone's tap lag)`);
    if (lateMs < earlyMs) problems.push(`${name}lateMs ${lateMs} is narrower than ${name}earlyMs (the sound and the picture come after the clock's beat)`);
    if (perfect && (perfect.earlyMs > earlyMs || perfect.lateMs > lateMs)) problems.push(`the perfect window is wider than the ${name}hit window`);
  }
  if (peak && peak.from >= beats.length) problems.push(`peak.from ${peak.from} is past the last beat`);
  if (perfect) {
    if (perfect.earlyMs + perfect.lateMs < RHYTHM_TAP_MIN_PERFECT_MS) problems.push(`the perfect window is narrower than ${RHYTHM_TAP_MIN_PERFECT_MS} ms in all (a phone's tap lag)`);
    if (perfect.lateMs < perfect.earlyMs) problems.push("the perfect window is narrower late than early");
  }
  if (strayLimit !== undefined && strayLimit < RHYTHM_TAP_MIN_STRAY_LIMIT) problems.push(`strayLimit ${strayLimit} would count one slip of the thumb as a miss`);
  beats.slice(1).forEach((beat, index) => {
    const gap = beat - beats[index];
    if (gap < RHYTHM_TAP_MIN_GAP_MS) problems.push(`beat ${index + 2} comes ${gap} ms after the one before (less than ${RHYTHM_TAP_MIN_GAP_MS})`);
    if (gap <= rhythmTapWindow(tuning, index).lateMs + rhythmTapWindow(tuning, index + 1).earlyMs) problems.push(`beat ${index + 2}'s window touches the one before (a tap could hit both)`);
  });
  if (rhythmTapOpens(tuning) < RHYTHM_TAP_GUARD_MS) problems.push(`the first beat's window opens inside the start's double-tap guard (${RHYTHM_TAP_GUARD_MS} ms)`);
  if (endAfterMs <= rhythmTapWindow(tuning, beats.length - 1).lateMs) problems.push(`endAfterMs ${endAfterMs} ends the play inside the last beat's window`);
  if (partnerStop !== undefined && partnerStop >= beats.length) problems.push(`partnerStop ${partnerStop} leaves no beat after the partner stops`);
  return problems;
}

/** When the play ends by itself: the last beat, then endAfterMs. */
export const rhythmTapEnd = (tuning: RhythmTapTuning): number => tuning.beats[tuning.beats.length - 1] + tuning.endAfterMs;

const isTime = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;

/**
 * What a record did as of `now` (the play's time; Infinity: the whole record, as the rules read it). The play ends at
 * the first of: the stop (when pressed before the end), the miss (or the stray gauge's overflow) that reaches the limit,
 * the end. Nothing after the end counts (taps, the stop), nor taps before the first beat's window.
 */
export function rhythmTapJudge(record: RhythmTapRecord, tuning: RhythmTapTuning, now = Number.POSITIVE_INFINITY): RhythmTapSummary {
  const { beats, missLimit, strayLimit } = tuning;
  const last = rhythmTapEnd(tuning);
  const stop = isTime(record.stopMs) && record.stopMs <= last ? record.stopMs : null;
  let ended: RhythmTapEnd | null = stop !== null && stop <= now ? "stop" : last <= now ? "end" : null;
  let cutoff = Math.min(now, stop ?? last);
  const opens = rhythmTapOpens(tuning);
  const taps = (Array.isArray(record.taps) ? record.taps : []).filter((time) => isTime(time) && time >= opens).sort((a, b) => a - b);
  const judged: ("hit" | "miss")[] = [];
  const offsets: (number | null)[] = [];
  let next = 0;
  let misses = 0;
  let perfects = 0;
  let strays = 0;
  let gauge = 0;
  let overflows = 0;
  let tapped = 0;
  const limited = () => missLimit !== undefined && misses + overflows >= missLimit;
  /** Misses every beat whose window closed before `time` (or at it, when `inclusive`); true when that reached the limit. */
  const close = (time: number, inclusive: boolean): boolean => {
    while (next < beats.length) {
      const to = beats[next] + rhythmTapWindow(tuning, next).lateMs;
      if (inclusive ? to > time : to >= time) return false;
      judged.push("miss");
      offsets.push(null);
      misses += 1;
      next += 1;
      if (limited()) {
        cutoff = to;
        ended = "misses";
        return true;
      }
    }
    return false;
  };
  let full = false;
  for (const tap of taps) {
    if (tap > cutoff || close(tap, false)) break;
    tapped += 1;
    // The windows do not touch (rhythmTapFairness): a tap is inside the next beat's window, or in none.
    if (next < beats.length && tap >= beats[next] - rhythmTapWindow(tuning, next).earlyMs) {
      const offset = tap - beats[next];
      judged.push("hit");
      offsets.push(offset);
      if (rhythmTapPerfect(tuning, offset)) perfects += 1;
      next += 1;
      gauge = Math.max(0, gauge - 1);
      continue;
    }
    strays += 1;
    if (strayLimit === undefined) continue;
    gauge += 1;
    if (gauge < strayLimit) continue;
    gauge = 0;
    overflows += 1;
    if (limited()) {
      cutoff = tap;
      ended = "misses";
      full = true;
      break;
    }
  }
  if (!full && ended !== "misses") close(cutoff, true);
  let streak = 0;
  let longestStreak = 0;
  for (const judgment of judged) {
    streak = judgment === "hit" ? streak + 1 : 0;
    longestStreak = Math.max(longestStreak, streak);
  }
  return {
    judged, offsets, hits: judged.length - misses, perfects, misses, strays, gauge, overflows, taps: tapped, streak, longestStreak,
    came: beats.filter((beat) => beat <= cutoff).length,
    stopCount: ended === "stop" && stop !== null ? beats.filter((beat) => beat <= stop).length : null,
    ended,
    endMs: ended ? cutoff : null,
  };
}

/** Where the player stopped against the partner: beats ahead of the partner's stop (negative: before it); null without a stop or a partner. */
export function rhythmTapVsPartner(summary: RhythmTapSummary, tuning: RhythmTapTuning): number | null {
  return summary.stopCount === null || tuning.partnerStop === undefined ? null : summary.stopCount - tuning.partnerStop;
}

/** A play to write as a record (「おまかせ」): the beats it hits (by index from 0), its stray taps, the beats after which it stops. */
export interface RhythmTapPlan {
  hit?: (index: number) => boolean;
  strays?: readonly number[];
  /** Stop once this many beats have come (between that beat's window and the next one's); undefined: never. */
  stopAfter?: number;
}

/** The record of a plan: a hit right on its beat; the stop between the windows (rhythmTapJudge reads the plan back). */
export function rhythmTapRecordOf(plan: RhythmTapPlan, tuning: RhythmTapTuning): RhythmTapRecord {
  const { beats, endAfterMs } = tuning;
  const windowOf = (index: number) => rhythmTapWindow(tuning, index);
  let stopMs: number | null = null;
  if (plan.stopAfter !== undefined) {
    const after = Math.min(Math.max(0, Math.floor(plan.stopAfter)), beats.length);
    stopMs = after === 0 ? Math.max(0, beats[0] - windowOf(0).earlyMs - 1)
      : after === beats.length ? beats[after - 1] + Math.floor((windowOf(after - 1).lateMs + endAfterMs) / 2)
      : Math.floor((beats[after - 1] + windowOf(after - 1).lateMs + beats[after] - windowOf(after).earlyMs) / 2);
  }
  const taps = [...beats.filter((_, index) => plan.hit?.(index) ?? false), ...(plan.strays ?? [])]
    .filter((time) => stopMs === null || time <= stopMs).sort((a, b) => a - b);
  return { taps, stopMs };
}

/**
 * Beats from a tempo, the same every time: the first at `firstMs`, then `count - 1` more, `intervalMs` apart at first,
 * changing evenly to `endIntervalMs` by the `rampBeats`-th beat and steady after it (a steady beat without them).
 */
export function rhythmTapBeats({ firstMs, count, intervalMs, endIntervalMs = intervalMs, rampBeats = count }: {
  firstMs: number; count: number; intervalMs: number; endIntervalMs?: number; rampBeats?: number;
}): number[] {
  const beats = [firstMs];
  const span = Math.max(1, rampBeats - 2);
  for (let index = 0; index < count - 1; index += 1)
    beats.push(beats[index] + intervalMs + (endIntervalMs - intervalMs) * Math.min(1, index / span));
  return beats.map((beat) => Math.round(beat));
}

/** Beats that go on from the last of `beats`, these gaps apart (a change of tempo, a peak). */
export function rhythmTapThen(beats: readonly number[], gaps: readonly number[]): number[] {
  const out = [...beats];
  for (const gap of gaps) out.push(out[out.length - 1] + gap);
  return out;
}

/** A tempo's beat interval in milliseconds. */
export const rhythmTapInterval = (bpm: number): number => Math.round(60000 / bpm);

/**
 * A skin's rules from the engine's (docs/13 2.4): `outcomeOf` reads the whole record's summary; 「おまかせ」 to an outcome
 * plays its plan; `rate` (optional: the result card's ★) reads the summary and the outcome it gave.
 */
export function rhythmTapRules<Params, Outcome extends string>(tuning: RhythmTapTuning, outcomeOf: (summary: RhythmTapSummary) => Outcome,
  plans: Readonly<Record<Outcome, RhythmTapPlan>>, rate?: (summary: RhythmTapSummary, outcome: Outcome) => MiniGameRating | null,
): MiniGameRules<Params, Outcome, RhythmTapRecord> {
  return {
    outcomeOf: (record) => outcomeOf(rhythmTapJudge(record, tuning)),
    autoRecord: (outcome) => {
      if (!Object.hasOwn(plans, outcome)) throw new Error(`No rhythm_tap plan gives ${outcome}`);
      return rhythmTapRecordOf(plans[outcome], tuning);
    },
    ...(rate ? {
      rate: (record: RhythmTapRecord) => {
        const summary = rhythmTapJudge(record, tuning);
        return rate(summary, outcomeOf(summary));
      },
    } : {}),
  };
}
