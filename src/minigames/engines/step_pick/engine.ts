import { z } from "zod";
import type { MiniGameRules } from "../../contract";

// The `step_pick` engine's rules (docs/13 2.2): a row of steps (a price coming down), moved on by the player's own
// presses of a push button (「じっと見る」), never by time. The player takes the step on show with the main button, leaves
// with the other, pushes once too often and the other side gives up (the push limit), or does nothing for a long while.
// So where to stop is the player's choice, and pushing on has its risk. Presses closer together than the push gap count
// once (no mashing). The outcome comes from which step was on show when the player took it, or how the play ended;
// nothing is random. Times are milliseconds of the host's clock from the play's start. Pure: no clock, DOM or React
// (EnginePlay.tsx draws and times).

/** A play's record: the push button's presses (their times, in order), and the take or the leave that ended it (null: none did). */
export interface StepPickRecord {
  pushes: readonly number[];
  end: { kind: "take" | "leave"; ms: number } | null;
}

/** How a play ended: a step taken (by its index from 0), the leave button, the push limit reached, or nothing for the idle time. */
export type StepPickEnding = { kind: "take"; step: number } | { kind: "leave" } | { kind: "out" } | { kind: "none" };

/** A skin's steps (in its definition's code, never in a tag: docs/13 2.2). */
export const stepPickTuningSchema = z.object({
  /** The counted pushes that move each step on to the next (one for each step but the last): two steps and more. */
  pushesPerStep: z.array(z.number().int().min(1)).min(1),
  /** The counted push that ends the play with no step taken (the other side gives up); null: pushes past the last step do nothing. */
  pushLimit: z.number().int().min(1).nullable(),
  /** A push closer than this to the last counted one counts once with it. */
  pushGapMs: z.number().int().min(0),
  /** Doing nothing this long (since the start or the last counted push) ends the play with nothing taken. */
  idleMs: z.number().int().positive(),
}).strict();
export type StepPickTuning = z.infer<typeof stepPickTuningSchema>;

/** The host's double-tap guard (src/minigames/host/timing.ts): input this soon after the start is the start button's second tap. */
export const STEP_PICK_GUARD_MS = 450;
/** Time to decide before doing nothing ends the play. */
export const STEP_PICK_MIN_IDLE_MS = 8000;
/** A push gap longer than this would drop a deliberate second press (people press about 3 times a second at most when they mean it). */
export const STEP_PICK_MAX_GAP_MS = 500;
/** 「おまかせ」's pace: its first press after the start's guard and a look, then one press a step (wider than any push gap). */
export const STEP_PICK_AUTO_LEAD_MS = 1000;
export const STEP_PICK_AUTO_STEP_MS = 700;

/** How many steps there are. */
export const stepPickSteps = (tuning: StepPickTuning): number => tuning.pushesPerStep.length + 1;
/** The counted pushes that bring each step on show (step 0 at 0). */
export function stepPickThresholds(tuning: StepPickTuning): number[] {
  const thresholds = [0];
  for (const pushes of tuning.pushesPerStep) thresholds.push(thresholds[thresholds.length - 1] + pushes);
  return thresholds;
}

/** The reasons a tuning is not fair on a phone (none: fair). */
export function stepPickFairness(tuning: StepPickTuning): string[] {
  const parsed = stepPickTuningSchema.safeParse(tuning);
  if (!parsed.success) return [`not a step_pick tuning: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`];
  const problems: string[] = [];
  const last = stepPickThresholds(tuning).at(-1)!;
  if (tuning.pushLimit !== null && tuning.pushLimit <= last)
    problems.push(`the push limit ${tuning.pushLimit} comes before the last step can be taken (${last} pushes)`);
  if (tuning.pushGapMs > STEP_PICK_MAX_GAP_MS) problems.push(`a push gap of ${tuning.pushGapMs} ms drops deliberate presses (more than ${STEP_PICK_MAX_GAP_MS})`);
  if (tuning.pushGapMs >= STEP_PICK_AUTO_STEP_MS) problems.push("「おまかせ」's presses are closer than the push gap");
  if (tuning.idleMs < STEP_PICK_MIN_IDLE_MS) problems.push(`doing nothing ends the play after ${tuning.idleMs} ms (less than ${STEP_PICK_MIN_IDLE_MS}: time to decide)`);
  return problems;
}

const isTime = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;

/** The pushes that count: in order, each at least the push gap after the last counted one. */
export function stepPickCounted(pushes: readonly number[], tuning: StepPickTuning): number[] {
  const counted: number[] = [];
  for (const at of Array.isArray(pushes) ? pushes : []) {
    if (!isTime(at)) continue;
    const last = counted.at(-1);
    if (last === undefined || at - last >= tuning.pushGapMs) counted.push(at);
  }
  return counted;
}

/** The step on show after `count` counted pushes (the last step stays on show after more). */
export function stepPickStepOf(count: number, tuning: StepPickTuning): number {
  const thresholds = stepPickThresholds(tuning);
  let step = 0;
  while (step + 1 < thresholds.length && count >= thresholds[step + 1]) step += 1;
  return step;
}

/**
 * How a record ended, walking its pushes in time: doing nothing for the idle time ends it with nothing; the push limit's
 * push ends it (out); else its take (the step on show then) or its leave; a record with neither ran out (none).
 */
export function stepPickEnding(record: StepPickRecord | null, tuning: StepPickTuning): StepPickEnding {
  const end = record?.end && isTime(record.end.ms) && (record.end.kind === "take" || record.end.kind === "leave") ? record.end : null;
  let last = 0;
  let count = 0;
  for (const at of stepPickCounted(record?.pushes ?? [], tuning)) {
    if (end && end.ms < at) break;
    if (at - last >= tuning.idleMs) return { kind: "none" };
    count += 1;
    last = at;
    if (tuning.pushLimit !== null && count >= tuning.pushLimit) return { kind: "out" };
  }
  if (!end || end.ms - last >= tuning.idleMs) return { kind: "none" };
  return end.kind === "leave" ? { kind: "leave" } : { kind: "take", step: stepPickStepOf(count, tuning) };
}

/** When 「おまかせ」 presses its `index`-th button (the host's clock, from the play's start). */
export const stepPickAutoAt = (index: number): number => STEP_PICK_AUTO_LEAD_MS + index * STEP_PICK_AUTO_STEP_MS;

/** 「おまかせ」: the record that ends so (the pushes a step needs, one a step apart, then the take; a leave at once). */
export function stepPickAutoRecord(ending: StepPickEnding, tuning: StepPickTuning): StepPickRecord {
  const pushes = (count: number) => Array.from({ length: count }, (_, index) => stepPickAutoAt(index));
  switch (ending.kind) {
    case "take": {
      const count = stepPickThresholds(tuning)[Math.min(Math.max(0, ending.step), stepPickSteps(tuning) - 1)];
      return { pushes: pushes(count), end: { kind: "take", ms: stepPickAutoAt(count) } };
    }
    case "leave": return { pushes: [], end: { kind: "leave", ms: stepPickAutoAt(0) } };
    case "out": return { pushes: pushes(tuning.pushLimit ?? 0), end: null };
    case "none": return { pushes: [], end: null };
  }
}

/** A skin's outcome for each step taken (one per step, in order), for the leave, the push limit and doing nothing. */
export type StepPickMap<Outcome extends string> = Readonly<{ steps: readonly Outcome[]; leave: Outcome; out: Outcome; none: Outcome }>;

/** The skin's outcome of an ending. */
export const stepPickOutcome = <Outcome extends string>(ending: StepPickEnding, map: StepPickMap<Outcome>): Outcome =>
  ending.kind === "take" ? map.steps[ending.step] : map[ending.kind];

/**
 * A skin's rules from the engine's (docs/13 2.4). 「おまかせ」 to a skin outcome takes the first step mapped to it, else
 * leaves, else pushes to the limit, else lets the play run out.
 */
export function stepPickRules<Params, Outcome extends string>(tuning: StepPickTuning, map: StepPickMap<Outcome>): MiniGameRules<Params, Outcome, StepPickRecord> {
  if (map.steps.length !== stepPickSteps(tuning)) throw new Error(`step_pick: ${map.steps.length} step outcomes for ${stepPickSteps(tuning)} steps`);
  return {
    outcomeOf: (record) => stepPickOutcome(stepPickEnding(record, tuning), map),
    autoRecord: (outcome) => {
      const step = map.steps.indexOf(outcome);
      if (step >= 0) return stepPickAutoRecord({ kind: "take", step }, tuning);
      if (map.leave === outcome) return stepPickAutoRecord({ kind: "leave" }, tuning);
      if (map.out === outcome && tuning.pushLimit !== null) return stepPickAutoRecord({ kind: "out" }, tuning);
      if (map.none === outcome) return stepPickAutoRecord({ kind: "none" }, tuning);
      throw new Error(`No step_pick ending gives ${outcome}`);
    },
  };
}
