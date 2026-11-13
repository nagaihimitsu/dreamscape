import { z } from "zod";
import type { MiniGameRules } from "../../contract";

// The `cue_tap` engine's rules (docs/13 2.2): something comes toward the player, and one tap meets it. The outcome comes
// from when the player taps against the moment it arrives; nothing is random. Times are milliseconds of the host's clock
// from the play's start. Pure: no clock, DOM or React (EnginePlay.tsx draws and times; a skin draws the field).

/** What a tap did: right on the moment, a little early or late, far off, or no tap at all. */
export type CueTapOutcome = "clean" | "early" | "late" | "miss" | "none";
export const CUE_TAP_OUTCOMES: readonly CueTapOutcome[] = ["clean", "early", "late", "miss", "none"];

/** A play's record: the tap's time from the play's start, or null (no tap before the play ended). */
export type CueTapRecord = number | null;

/** A skin's timing (in its definition's code, never in a tag: docs/13 2.2). */
export const cueTapTuningSchema = z.object({
  /** Before the thing starts coming: the player sees the field, the meter and the button. */
  leadMs: z.number().int().positive(),
  /** From its start to the moment it arrives (the moment to tap). */
  approachMs: z.number().int().positive(),
  /** A tap this close to the moment, early or late: clean. */
  cleanMs: z.number().int().positive(),
  /** Beyond clean up to this: early or late; further off: a miss. */
  nearMs: z.number().int().positive(),
  /** After the moment, a play without a tap ends: none. */
  noneAfterMs: z.number().int().positive(),
}).strict();
export type CueTapTuning = z.infer<typeof cueTapTuningSchema>;

/**
 * Fair on a phone (docs/13 2.2): a tap's own lag differs between devices by some tens of milliseconds, so the clean window
 * (both sides) is at least CUE_TAP_MIN_CLEAN_MS and the near one at least twice as wide; the thing starts coming after the
 * host's double-tap guard (a start button's second tap is no tap); a play without a tap ends after the near window.
 */
export const CUE_TAP_MIN_CLEAN_MS = 70;
/** The host's double-tap guard (src/minigames/host): input this soon after the start is the start button's second tap. */
export const CUE_TAP_GUARD_MS = 450;

/** The reasons a tuning is not fair on a phone (none: fair). */
export function cueTapFairness(tuning: CueTapTuning): string[] {
  const problems: string[] = [];
  if (tuning.cleanMs < CUE_TAP_MIN_CLEAN_MS) problems.push(`cleanMs ${tuning.cleanMs} is narrower than ${CUE_TAP_MIN_CLEAN_MS} (a phone's tap lag)`);
  if (tuning.nearMs < tuning.cleanMs * 2) problems.push(`nearMs ${tuning.nearMs} is less than twice cleanMs`);
  if (tuning.leadMs < CUE_TAP_GUARD_MS) problems.push(`leadMs ${tuning.leadMs} ends inside the start's double-tap guard (${CUE_TAP_GUARD_MS} ms)`);
  if (tuning.noneAfterMs <= tuning.nearMs) problems.push(`noneAfterMs ${tuning.noneAfterMs} ends the play inside the near window`);
  if (cueTapMoment(tuning) - tuning.nearMs - (tuning.nearMs - tuning.cleanMs) < CUE_TAP_GUARD_MS)
    problems.push("an early miss would fall inside the start's double-tap guard");
  return problems;
}

/** When the thing starts coming (the meter's needle leaves 0). */
export const cueTapStart = (tuning: CueTapTuning): number => tuning.leadMs;
/** The moment to tap: when the thing arrives. */
export const cueTapMoment = (tuning: CueTapTuning): number => tuning.leadMs + tuning.approachMs;
/** When a play without a tap ends. */
export const cueTapEnd = (tuning: CueTapTuning): number => cueTapMoment(tuning) + tuning.noneAfterMs;

/** What a play's record did. */
export function cueTapOutcome(record: CueTapRecord, tuning: CueTapTuning): CueTapOutcome {
  if (record === null || !Number.isFinite(record) || record > cueTapEnd(tuning)) return "none";
  const off = record - cueTapMoment(tuning);
  if (Math.abs(off) <= tuning.cleanMs) return "clean";
  if (off < 0 && -off <= tuning.nearMs) return "early";
  if (off > 0 && off <= tuning.nearMs) return "late";
  return "miss";
}

/** 「おまかせ」: the tap that does `outcome` (null: no tap); cueTapOutcome of it is `outcome`. */
export function cueTapAutoRecord(outcome: CueTapOutcome, tuning: CueTapTuning): CueTapRecord {
  const moment = cueTapMoment(tuning);
  const between = (tuning.cleanMs + tuning.nearMs) / 2;
  switch (outcome) {
    case "clean": return moment;
    case "early": return moment - between;
    case "late": return moment + between;
    case "miss": return moment - tuning.nearMs - (tuning.nearMs - tuning.cleanMs);
    case "none": return null;
  }
}

/** Where the meter's needle is (0 to 1) at `ms`: at 0 until the thing starts coming, at 1 when a play without a tap ends. */
export function cueTapMeter(ms: number, tuning: CueTapTuning): number {
  return Math.min(1, Math.max(0, (ms - cueTapStart(tuning)) / (cueTapEnd(tuning) - cueTapStart(tuning))));
}

/** The meter's zones (0 to 1, as cueTapMeter reads time): the clean one, and the near ones on each side of it. */
export function cueTapZones(tuning: CueTapTuning): { near: [number, number]; clean: [number, number] } {
  const moment = cueTapMoment(tuning);
  const at = (ms: number) => cueTapMeter(ms, tuning);
  return {
    near: [at(moment - tuning.nearMs), at(moment + tuning.nearMs)],
    clean: [at(moment - tuning.cleanMs), at(moment + tuning.cleanMs)],
  };
}

/** 「おまかせ」's late miss: halfway between the near window's end and the play's end (a miss after the moment). */
export function cueTapLateMissRecord(tuning: CueTapTuning): number {
  return cueTapMoment(tuning) + (tuning.nearMs + tuning.noneAfterMs) / 2;
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
  };
}
