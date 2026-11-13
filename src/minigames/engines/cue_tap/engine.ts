import { z } from "zod";
import type { MiniGameRating, MiniGameRules } from "../../contract";

// The `cue_tap` engine's rules (docs/13 2.2): something comes toward the player, and one tap meets it. The outcome comes
// from when the player taps against the moment it arrives; nothing is random. Times are milliseconds of the host's clock
// from the play's start. Pure: no clock, DOM or React (EnginePlay.tsx draws and times; a skin draws the field).

/** What a tap did: right on the moment, a little early or late, far off, or no tap at all. */
export type CueTapOutcome = "clean" | "early" | "late" | "miss" | "none";
export const CUE_TAP_OUTCOMES: readonly CueTapOutcome[] = ["clean", "early", "late", "miss", "none"];

/**
 * A play's record: the time of its tap from the play's start, or null (no tap before the play ended). Only a tap from the
 * moment the thing starts coming counts (cueTapCounts): one before it (her run-up, the monkey still holding what it took)
 * is no tap, and the player can still tap (it never decides a play the story cannot retry). The play records no such
 * tap; the rules read one as none.
 */
export type CueTapRecord = number | null;

/**
 * A skin's timing (in its definition's code, never in a tag: docs/13 2.2). The windows are wider after the moment than
 * before it: a phone's touch and screen land a tap some tens of milliseconds late, never early.
 */
export const cueTapTuningSchema = z.object({
  /** Before the thing starts coming: the player sees the field, the meter and the button (a tap in it does not count). */
  leadMs: z.number().int().positive(),
  /** From its start to the moment it arrives (the moment to tap). */
  approachMs: z.number().int().positive(),
  /** A tap up to this long before the moment: clean. */
  cleanEarlyMs: z.number().int().positive(),
  /** A tap up to this long after the moment: clean (wider than before it: a phone's lag). */
  cleanLateMs: z.number().int().positive(),
  /** Before clean, up to this long before the moment: early; further before: a miss. */
  nearEarlyMs: z.number().int().positive(),
  /** After clean, up to this long after the moment: late; further after: a miss. */
  nearLateMs: z.number().int().positive(),
  /** After the moment, a play without a tap ends: none. */
  noneAfterMs: z.number().int().positive(),
}).strict();
export type CueTapTuning = z.infer<typeof cueTapTuningSchema>;

/**
 * Fair on a phone (docs/13 2.2): a tap's own lag differs between devices by some tens of milliseconds and only ever makes
 * it later, so the clean window before the moment is at least CUE_TAP_MIN_CLEAN_MS, the one after it at least
 * CUE_TAP_LATE_EXTRA_MS wider, and each near window at least twice its clean one; the thing starts coming after the host's
 * double-tap guard (a start button's second tap is no tap); 「おまかせ」's early miss falls where a tap counts; a play
 * without a tap ends after the near window.
 */
export const CUE_TAP_MIN_CLEAN_MS = 70;
/** How much wider the clean window is after the moment than before it, at least (a phone's touch and screen lag). */
export const CUE_TAP_LATE_EXTRA_MS = 30;
/** The host's double-tap guard (src/minigames/host): input this soon after the start is the start button's second tap. */
export const CUE_TAP_GUARD_MS = 450;

/** The reasons a tuning is not fair on a phone (none: fair). */
export function cueTapFairness(tuning: CueTapTuning): string[] {
  const problems: string[] = [];
  const { cleanEarlyMs, cleanLateMs, nearEarlyMs, nearLateMs } = tuning;
  if (cleanEarlyMs < CUE_TAP_MIN_CLEAN_MS) problems.push(`cleanEarlyMs ${cleanEarlyMs} is narrower than ${CUE_TAP_MIN_CLEAN_MS} (a phone's tap lag)`);
  if (cleanLateMs < cleanEarlyMs + CUE_TAP_LATE_EXTRA_MS)
    problems.push(`cleanLateMs ${cleanLateMs} is not ${CUE_TAP_LATE_EXTRA_MS} ms wider than cleanEarlyMs ${cleanEarlyMs} (a phone lands a tap late)`);
  if (nearEarlyMs < cleanEarlyMs * 2) problems.push(`nearEarlyMs ${nearEarlyMs} is less than twice cleanEarlyMs`);
  if (nearLateMs < cleanLateMs * 2) problems.push(`nearLateMs ${nearLateMs} is less than twice cleanLateMs`);
  if (tuning.leadMs < CUE_TAP_GUARD_MS) problems.push(`leadMs ${tuning.leadMs} ends inside the start's double-tap guard (${CUE_TAP_GUARD_MS} ms)`);
  if (tuning.noneAfterMs <= nearLateMs) problems.push(`noneAfterMs ${tuning.noneAfterMs} ends the play inside the near window`);
  if (cueTapEarlyMissRecord(tuning) < cueTapStart(tuning)) problems.push("an early miss would fall before the thing starts coming, where a tap does not count");
  return problems;
}

/** When the thing starts coming (the meter's needle leaves 0): from then on, a tap counts. */
export const cueTapStart = (tuning: CueTapTuning): number => tuning.leadMs;
/** The moment to tap: when the thing arrives. */
export const cueTapMoment = (tuning: CueTapTuning): number => tuning.leadMs + tuning.approachMs;
/** When a play without a tap ends. */
export const cueTapEnd = (tuning: CueTapTuning): number => cueTapMoment(tuning) + tuning.noneAfterMs;
/** Whether a tap at `ms` counts: from the thing's start to the play's end (before it: too soon; after it: the play is over). */
export const cueTapCounts = (ms: number, tuning: CueTapTuning): boolean => ms >= cueTapStart(tuning) && ms <= cueTapEnd(tuning);

/** What a play's record did. */
export function cueTapOutcome(record: CueTapRecord, tuning: CueTapTuning): CueTapOutcome {
  if (record === null || !Number.isFinite(record) || !cueTapCounts(record, tuning)) return "none";
  const off = record - cueTapMoment(tuning);
  if (off >= -tuning.cleanEarlyMs && off <= tuning.cleanLateMs) return "clean";
  if (off < 0 && -off <= tuning.nearEarlyMs) return "early";
  if (off > 0 && off <= tuning.nearLateMs) return "late";
  return "miss";
}

/** 「おまかせ」's early miss: as far before the near window as the near window reaches before the clean one. */
function cueTapEarlyMissRecord(tuning: CueTapTuning): number {
  return cueTapMoment(tuning) - tuning.nearEarlyMs - (tuning.nearEarlyMs - tuning.cleanEarlyMs);
}

/** 「おまかせ」: the tap that does `outcome` (null: no tap); cueTapOutcome of it is `outcome`. */
export function cueTapAutoRecord(outcome: CueTapOutcome, tuning: CueTapTuning): CueTapRecord {
  const moment = cueTapMoment(tuning);
  switch (outcome) {
    case "clean": return moment;
    case "early": return moment - (tuning.cleanEarlyMs + tuning.nearEarlyMs) / 2;
    case "late": return moment + (tuning.cleanLateMs + tuning.nearLateMs) / 2;
    case "miss": return cueTapEarlyMissRecord(tuning);
    case "none": return null;
  }
}

/** Where the meter's needle is (0 to 1) at `ms`: at 0 until the thing starts coming, at 1 when a play without a tap ends. */
export function cueTapMeter(ms: number, tuning: CueTapTuning): number {
  return Math.min(1, Math.max(0, (ms - cueTapStart(tuning)) / (cueTapEnd(tuning) - cueTapStart(tuning))));
}

/** The meter's zones (0 to 1, as cueTapMeter reads time): the clean one, and the near ones on each side of it (wider after). */
export function cueTapZones(tuning: CueTapTuning): { near: [number, number]; clean: [number, number] } {
  const moment = cueTapMoment(tuning);
  const at = (ms: number) => cueTapMeter(ms, tuning);
  return {
    near: [at(moment - tuning.nearEarlyMs), at(moment + tuning.nearLateMs)],
    clean: [at(moment - tuning.cleanEarlyMs), at(moment + tuning.cleanLateMs)],
  };
}

/** 「おまかせ」's late miss: halfway between the near window's end and the play's end (a miss after the moment). */
export function cueTapLateMissRecord(tuning: CueTapTuning): number {
  return cueTapMoment(tuning) + (tuning.nearLateMs + tuning.noneAfterMs) / 2;
}

/**
 * The result card's ★ for a tap (display only: never saved, never in Ink; docs/13 4.1), in step with the engine's outcome:
 * clean ★3, early or late ★2, a miss ★1, no tap none. The score line says how far off the tap was, which way, so practice
 * shows where to move (「0.03秒差」「0.12秒早い」「0.15秒遅い」).
 */
export function cueTapRating(record: CueTapRecord, tuning: CueTapTuning): MiniGameRating | null {
  const engine = cueTapOutcome(record, tuning);
  if (engine === "none" || record === null) return null;
  const off = record - cueTapMoment(tuning);
  const seconds = (Math.abs(off) / 1000).toFixed(2);
  return {
    stars: engine === "clean" ? 3 : engine === "miss" ? 1 : 2,
    scoreJa: engine === "clean" ? `${seconds}秒差` : `${seconds}秒${off < 0 ? "早い" : "遅い"}`,
  };
}

/**
 * A skin's table from the engine's outcomes to its own. A far-off tap (`miss`) gives one outcome, or one for each side of
 * the moment (`{ early, late }`): a skin whose far-off taps tell different stories (a cloth spread while she is still far
 * up the stairs, or long after she has passed).
 */
export type CueTapMap<Outcome extends string> = Readonly<Record<Exclude<CueTapOutcome, "miss">, Outcome> & {
  miss: Outcome | Readonly<{ early: Outcome; late: Outcome }>;
}>;

/**
 * A skin's rules from the engine's (docs/13 2.4): `map` gives each engine outcome the skin's outcome. 「おまかせ」 to a
 * skin outcome taps as the first engine outcome mapped to it (in the order clean, early, late, miss early, miss late, none).
 * The ★ are the engine's (cueTapRating); a skin may give its own rate in their place.
 */
export function cueTapRules<Params, Outcome extends string>(tuning: CueTapTuning, map: CueTapMap<Outcome>): MiniGameRules<Params, Outcome, CueTapRecord> {
  const { miss } = map;
  const missEarly = typeof miss === "string" ? miss : miss.early;
  const missLate = typeof miss === "string" ? miss : miss.late;
  const taps: readonly (readonly [Outcome, CueTapRecord])[] = [
    [map.clean, cueTapAutoRecord("clean", tuning)],
    [map.early, cueTapAutoRecord("early", tuning)],
    [map.late, cueTapAutoRecord("late", tuning)],
    [missEarly, cueTapAutoRecord("miss", tuning)],
    [missLate, cueTapLateMissRecord(tuning)],
    [map.none, cueTapAutoRecord("none", tuning)],
  ];
  return {
    outcomeOf: (record) => {
      const engine = cueTapOutcome(record, tuning);
      if (engine !== "miss") return map[engine];
      return (record as number) < cueTapMoment(tuning) ? missEarly : missLate;
    },
    autoRecord: (outcome) => {
      const tap = taps.find(([mapped]) => mapped === outcome);
      if (!tap) throw new Error(`No cue_tap outcome gives ${outcome}`);
      return tap[1];
    },
    rate: (record) => cueTapRating(record, tuning),
  };
}
