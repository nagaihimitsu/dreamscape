import { z } from "zod";
import type { MiniGameRules } from "../../contract";

// The `step_pick` engine's rules (docs/13 2.2): steps come one after another on the clock (a price coming down, an offer
// going up), and the player takes the one on show with the main button, leaves with the other, or lets them all pass.
// The outcome comes from which step was on show when the player took it, or how the play ended; nothing is random. A step
// stays on show long enough to read it and decide: where to stop is the player's choice, not a reflex. Times are
// milliseconds of the host's clock from the play's start. Pure: no clock, DOM or React (EnginePlay.tsx draws and times).

/** A play's record: the player took the step on show, or left, at `ms`; null: every step passed without either. */
export type StepPickRecord = { kind: "take"; ms: number } | { kind: "leave"; ms: number } | null;

/** How a play ended: a step taken (by its index from 0), the leave button, or the steps ran out. */
export type StepPickEnding = { kind: "take"; step: number } | { kind: "leave" } | { kind: "none" };

/** A skin's steps (in its definition's code, never in a tag: docs/13 2.2). */
export const stepPickTuningSchema = z.object({
  /** How long each step is on show, in order; the play ends when the last one's time is up. */
  stepsMs: z.array(z.number().int().positive()).min(2),
}).strict();
export type StepPickTuning = z.infer<typeof stepPickTuningSchema>;

/** Time to read a step and decide (a choice, not a reflex): every step is on show at least this long. */
export const STEP_PICK_MIN_STEP_MS = 1000;
/** The host's double-tap guard (src/minigames/host/timing.ts): input this soon after the start is the start button's second tap. */
export const STEP_PICK_GUARD_MS = 450;

/** The reasons a tuning is not fair on a phone (none: fair). */
export function stepPickFairness(tuning: StepPickTuning): string[] {
  const parsed = stepPickTuningSchema.safeParse(tuning);
  if (!parsed.success) return [`not a step_pick tuning: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`];
  const problems: string[] = [];
  tuning.stepsMs.forEach((ms, index) => {
    if (ms < STEP_PICK_MIN_STEP_MS) problems.push(`step ${index + 1} is on show ${ms} ms (less than ${STEP_PICK_MIN_STEP_MS}: time to read and decide)`);
  });
  // The first step can be taken for as long as the others, after the start's double-tap guard.
  if (tuning.stepsMs[0] - STEP_PICK_GUARD_MS < STEP_PICK_MIN_STEP_MS)
    problems.push(`the first step leaves less than ${STEP_PICK_MIN_STEP_MS} ms after the start's double-tap guard (${STEP_PICK_GUARD_MS} ms)`);
  return problems;
}

/** When each step comes on show. */
export function stepPickStarts(tuning: StepPickTuning): number[] {
  const starts = [0];
  for (const ms of tuning.stepsMs.slice(0, -1)) starts.push(starts[starts.length - 1] + ms);
  return starts;
}

/** When the last step's time is up and a play without a take or a leave ends. */
export const stepPickEnd = (tuning: StepPickTuning): number => tuning.stepsMs.reduce((sum, ms) => sum + ms, 0);

/** The step on show at `ms` (from 0); the number of steps once the play is over. */
export function stepPickStepAt(ms: number, tuning: StepPickTuning): number {
  if (!(ms >= 0)) return 0;
  const starts = stepPickStarts(tuning);
  if (ms >= stepPickEnd(tuning)) return starts.length;
  let step = 0;
  while (step + 1 < starts.length && ms >= starts[step + 1]) step += 1;
  return step;
}

const isTime = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** How a record ended: a take or a leave before the end, else the steps ran out (a take before the start takes the first step). */
export function stepPickEnding(record: StepPickRecord, tuning: StepPickTuning): StepPickEnding {
  if (!record || !isTime(record.ms) || record.ms >= stepPickEnd(tuning)) return { kind: "none" };
  if (record.kind === "leave") return { kind: "leave" };
  return record.kind === "take" ? { kind: "take", step: stepPickStepAt(record.ms, tuning) } : { kind: "none" };
}

/** 「おまかせ」: the record that ends so (a take in the middle of its step's time; a leave in the middle of the first step's). */
export function stepPickAutoRecord(ending: StepPickEnding, tuning: StepPickTuning): StepPickRecord {
  const starts = stepPickStarts(tuning);
  const middle = (step: number) => starts[step] + Math.floor(tuning.stepsMs[step] / 2);
  switch (ending.kind) {
    case "take": return { kind: "take", ms: middle(Math.min(Math.max(0, ending.step), starts.length - 1)) };
    case "leave": return { kind: "leave", ms: middle(0) };
    case "none": return null;
  }
}

/** A skin's outcome for each step taken (one per step, in order), for the leave button, and for the steps running out. */
export type StepPickMap<Outcome extends string> = Readonly<{ steps: readonly Outcome[]; leave: Outcome; none: Outcome }>;

/** The skin's outcome of an ending. */
export const stepPickOutcome = <Outcome extends string>(ending: StepPickEnding, map: StepPickMap<Outcome>): Outcome =>
  ending.kind === "take" ? map.steps[ending.step] : map[ending.kind];

/**
 * A skin's rules from the engine's (docs/13 2.4). 「おまかせ」 to a skin outcome takes the first step mapped to it, else
 * leaves, else lets the steps run out.
 */
export function stepPickRules<Params, Outcome extends string>(tuning: StepPickTuning, map: StepPickMap<Outcome>): MiniGameRules<Params, Outcome, StepPickRecord> {
  if (map.steps.length !== tuning.stepsMs.length) throw new Error(`step_pick: ${map.steps.length} step outcomes for ${tuning.stepsMs.length} steps`);
  return {
    outcomeOf: (record) => stepPickOutcome(stepPickEnding(record, tuning), map),
    autoRecord: (outcome) => {
      const step = map.steps.indexOf(outcome);
      if (step >= 0) return stepPickAutoRecord({ kind: "take", step }, tuning);
      if (map.leave === outcome) return stepPickAutoRecord({ kind: "leave" }, tuning);
      if (map.none === outcome) return stepPickAutoRecord({ kind: "none" }, tuning);
      throw new Error(`No step_pick ending gives ${outcome}`);
    },
  };
}
