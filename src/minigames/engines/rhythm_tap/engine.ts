import { z } from "zod";
import type { MiniGameRules } from "../../contract";

// The `rhythm_tap` engine's rules (docs/13 2.2, 2.4, 2.11): beats come one after another (the skin's beat map, written
// out or made from a tempo by rhythmTapBeats) and the player taps each as it comes. A tap inside a beat's window hits
// it; a beat whose window closes without one is missed; a tap that meets no beat (or a beat already hit) is a stray.
// A skin may give the player a stop button (the play ends when they press it), a partner who stops after a fixed beat,
// and a limit of misses that ends the play. Times are milliseconds of the host's clock from the play's start.
//
// Audio latency (docs/13 2.11): the beats are judged against the screen's beat on the host's clock (input times through
// clock.at(event.timeStamp)), never against the sound, and there is no per-device offset setting. A sound reaches the
// ear some tens of milliseconds after the clock's beat (more over Bluetooth), and a picture reaches the eye a frame or
// two after it, so the window is generous and wider on the late side (rhythmTapFairness); the game is played by the
// beats on screen (the lane's marks, the field), so it plays the same with the sound off. If a device turns out to need
// an offset, it is a ⚙設定 item for later (docs/13 2.11). Pure: no clock, DOM or React (EnginePlay.tsx draws and times).

/** A play's record: the taps' times, and when the player pressed the stop button (null: never). */
export type RhythmTapRecord = { taps: readonly number[]; stopMs: number | null };

/** A skin's beats and timing (in its definition's code, never in a tag: docs/13 2.2). */
export const rhythmTapTuningSchema = z.object({
  /** When each beat comes, ascending (the moment to tap). */
  beats: z.array(z.number().int().nonnegative()).min(2),
  /** A tap this much before a beat still hits it. */
  earlyMs: z.number().int().positive(),
  /** A tap this much after a beat still hits it; when it has passed without one, the beat is missed. */
  lateMs: z.number().int().positive(),
  /** After the last beat, the play ends (by itself). */
  endAfterMs: z.number().int().positive(),
  /** This many misses end the play at once (none: the play goes on to the end). */
  missLimit: z.number().int().positive().optional(),
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
  hits: number;
  misses: number;
  /** Taps that met no beat, or a beat already hit. */
  strays: number;
  /** Taps before the end. */
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
/** The host's double-tap guard (src/minigames/host/timing.ts): input this soon after the start is the start button's second tap. */
export const RHYTHM_TAP_GUARD_MS = 450;
/** Beats closer than this ask for speed, not rhythm (about three taps a second with one thumb). */
export const RHYTHM_TAP_MIN_GAP_MS = 300;

/** The reasons a tuning is not fair on a phone (none: fair). */
export function rhythmTapFairness(tuning: RhythmTapTuning): string[] {
  const parsed = rhythmTapTuningSchema.safeParse(tuning);
  if (!parsed.success) return [`not a rhythm_tap tuning: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`];
  const { beats, earlyMs, lateMs, endAfterMs, partnerStop } = tuning;
  const problems: string[] = [];
  if (earlyMs < RHYTHM_TAP_MIN_WINDOW_MS) problems.push(`earlyMs ${earlyMs} is narrower than ${RHYTHM_TAP_MIN_WINDOW_MS} (a phone's tap lag)`);
  if (lateMs < earlyMs) problems.push(`lateMs ${lateMs} is narrower than earlyMs (the sound and the picture come after the clock's beat)`);
  beats.slice(1).forEach((beat, index) => {
    const gap = beat - beats[index];
    if (gap < RHYTHM_TAP_MIN_GAP_MS) problems.push(`beat ${index + 2} comes ${gap} ms after the one before (less than ${RHYTHM_TAP_MIN_GAP_MS})`);
    if (gap <= earlyMs + lateMs) problems.push(`beat ${index + 2}'s window touches the one before (a tap could hit both)`);
  });
  if (beats[0] - earlyMs < RHYTHM_TAP_GUARD_MS) problems.push(`the first beat's window opens inside the start's double-tap guard (${RHYTHM_TAP_GUARD_MS} ms)`);
  if (endAfterMs <= lateMs) problems.push(`endAfterMs ${endAfterMs} ends the play inside the last beat's window`);
  if (partnerStop !== undefined && partnerStop >= beats.length) problems.push(`partnerStop ${partnerStop} leaves no beat after the partner stops`);
  return problems;
}

/** When the play ends by itself: the last beat, then endAfterMs. */
export const rhythmTapEnd = (tuning: RhythmTapTuning): number => tuning.beats[tuning.beats.length - 1] + tuning.endAfterMs;

const isTime = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;

/**
 * What a record did as of `now` (the play's time; Infinity: the whole record, as the rules read it). The play ends at
 * the first of: the stop (when pressed before the end), the miss that reaches the limit, the end. Nothing after the end
 * counts (taps, the stop).
 */
export function rhythmTapJudge(record: RhythmTapRecord, tuning: RhythmTapTuning, now = Number.POSITIVE_INFINITY): RhythmTapSummary {
  const { beats, earlyMs, lateMs, missLimit } = tuning;
  const last = rhythmTapEnd(tuning);
  const stop = isTime(record.stopMs) && record.stopMs <= last ? record.stopMs : null;
  let ended: RhythmTapEnd | null = stop !== null && stop <= now ? "stop" : last <= now ? "end" : null;
  let cutoff = Math.min(now, stop ?? last);
  const taps = (Array.isArray(record.taps) ? record.taps : []).filter(isTime).sort((a, b) => a - b);
  const used = new Set<number>();
  const judged: ("hit" | "miss")[] = [];
  let misses = 0;
  for (const beat of beats) {
    const from = beat - earlyMs;
    const to = beat + lateMs;
    if (from > cutoff) break;
    const tap = taps.findIndex((time, index) => !used.has(index) && time >= from && time <= to && time <= cutoff);
    if (tap >= 0) {
      used.add(tap);
      judged.push("hit");
      continue;
    }
    // Still open: the beats after it have not begun (the windows do not touch: rhythmTapFairness).
    if (to > cutoff) break;
    judged.push("miss");
    misses += 1;
    if (missLimit !== undefined && misses >= missLimit) {
      cutoff = to;
      ended = "misses";
      break;
    }
  }
  let streak = 0;
  let longestStreak = 0;
  for (const judgment of judged) {
    streak = judgment === "hit" ? streak + 1 : 0;
    longestStreak = Math.max(longestStreak, streak);
  }
  const hits = judged.length - misses;
  const tapped = taps.filter((time) => time <= cutoff).length;
  return {
    judged, hits, misses, strays: tapped - hits, taps: tapped, streak, longestStreak,
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
  const { beats, earlyMs, lateMs, endAfterMs } = tuning;
  let stopMs: number | null = null;
  if (plan.stopAfter !== undefined) {
    const after = Math.min(Math.max(0, Math.floor(plan.stopAfter)), beats.length);
    stopMs = after === 0 ? Math.max(0, beats[0] - earlyMs - 1)
      : after === beats.length ? beats[after - 1] + Math.floor((lateMs + endAfterMs) / 2)
      : Math.floor((beats[after - 1] + lateMs + beats[after] - earlyMs) / 2);
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

/** A tempo's beat interval in milliseconds. */
export const rhythmTapInterval = (bpm: number): number => Math.round(60000 / bpm);

/**
 * A skin's rules from the engine's (docs/13 2.4): `outcomeOf` reads the whole record's summary; 「おまかせ」 to an outcome
 * plays its plan.
 */
export function rhythmTapRules<Params, Outcome extends string>(tuning: RhythmTapTuning, outcomeOf: (summary: RhythmTapSummary) => Outcome,
  plans: Readonly<Record<Outcome, RhythmTapPlan>>): MiniGameRules<Params, Outcome, RhythmTapRecord> {
  return {
    outcomeOf: (record) => outcomeOf(rhythmTapJudge(record, tuning)),
    autoRecord: (outcome) => {
      if (!Object.hasOwn(plans, outcome)) throw new Error(`No rhythm_tap plan gives ${outcome}`);
      return rhythmTapRecordOf(plans[outcome], tuning);
    },
  };
}
