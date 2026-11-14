import { z } from "zod";
import type { MiniGameRules } from "../../contract";

// The `step_pick` engine's rules (docs/13 2.2): a row of steps (a price coming down), moved on by the player's own
// presses of a push button (「じっと見る」), never by time. The player takes the step on show with the main button, leaves
// with the other, pushes once too often and the other side gives up (the push limit), or does nothing for a long while.
// So where to stop is the player's choice, and pushing on has its risk. Presses closer together than the push gap count
// once (no mashing). The outcome comes from which step was on show when the player took it, or how the play ended;
// nothing is random. Times are milliseconds of the host's clock from the play's start. Pure: no clock, DOM or React
// (EnginePlay.tsx draws and times).
//
// Moods (optional, round 3): the other side is never still. From the start, and from every push that changes where the
// play stands (a step and how many pushes have landed on it), it runs that situation's routine: stretches of mood in
// order, its last two then taking turns. A push while it is `open` lands (enough landed pushes move the step on); while
// it is `closed` the push bounces and costs its patience (the patience gone, it gives up); while it `feint`s (a bluff,
// a fake walk-away) the push calls it and moves the step on at once. A bounce changes nothing else: the routine goes on.
// Time alone still never moves a step: it only changes how the next push lands, so reading the other side is the game.

/** A play's record: the push button's presses (their times, in order), and the take or the leave that ended it (null: none did). */
export interface StepPickRecord {
  pushes: readonly number[];
  end: { kind: "take" | "leave"; ms: number } | null;
}

/** How a play ended: a step taken (by its index from 0), the leave button, the push limit reached, or nothing for the idle time. */
export type StepPickEnding = { kind: "take"; step: number } | { kind: "leave" } | { kind: "out" } | { kind: "none" };

/** How a push lands in a mood: it counts (open), it bounces and costs patience (closed), it calls a bluff and moves the step on (feint). */
export type StepPickMood = "open" | "closed" | "feint";
const moodSchema = z.enum(["open", "closed", "feint"]);
/** A stretch of the other side's mood: how pushes land, for how long, and the skin's name for how it looks (「boast」「wobble」). */
const stretchSchema = z.object({ mood: moodSchema, ms: z.number().int().positive(), look: z.string().min(1) }).strict();
export type StepPickStretch = z.infer<typeof stretchSchema>;

/** A skin's steps (in its definition's code, never in a tag: docs/13 2.2). */
export const stepPickTuningSchema = z.object({
  /** The counted pushes that move each step on to the next (one for each step but the last): two steps and more. With moods, the landed ones. */
  pushesPerStep: z.array(z.number().int().min(1)).min(1),
  /** The counted push that ends the play with no step taken (the other side gives up); null: pushes past the last step do nothing. Not with moods. */
  pushLimit: z.number().int().min(1).nullable(),
  /** A push closer than this to the last counted one counts once with it. */
  pushGapMs: z.number().int().min(0),
  /** Doing nothing this long (since the start or the last counted push) ends the play with nothing taken. */
  idleMs: z.number().int().positive(),
  /**
   * The other side's moods (round 3): `routines[step][landed]` is what it does from the moment the play came to that step
   * with that many landed pushes on it (the start, or the push that made it so): stretches in order, the last two then
   * taking turns (one: it stays). `patience`: the bounced pushes it takes; the next ends the play (out).
   */
  moods: z.object({
    routines: z.array(z.array(z.array(stretchSchema).min(1)).min(1)).min(2),
    patience: z.number().int().min(1),
  }).strict().optional(),
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
/** An open (or feint) mood at least this long: a reaction to it (about 250 ms) and a press, with room to read it. */
export const STEP_PICK_MIN_OPEN_MS = 900;
/** 「おまかせ」 presses this far into an open stretch (or its middle, when shorter). */
const AUTO_INTO_OPEN_MS = 400;

/** How many steps there are. */
export const stepPickSteps = (tuning: StepPickTuning): number => tuning.pushesPerStep.length + 1;
/** The counted pushes that bring each step on show (step 0 at 0). */
export function stepPickThresholds(tuning: StepPickTuning): number[] {
  const thresholds = [0];
  for (const pushes of tuning.pushesPerStep) thresholds.push(thresholds[thresholds.length - 1] + pushes);
  return thresholds;
}

/** The stretch of a routine `ms` after it began (its index, counting the turns of its last two, and how far into it). */
export function stepPickStretchAt(routine: readonly StepPickStretch[], ms: number): { stretch: StepPickStretch; index: number; intoMs: number } {
  let left = Math.max(0, ms);
  let index = 0;
  const loopFrom = Math.max(0, routine.length - 2);
  for (;;) {
    const at = index < routine.length ? index : loopFrom + ((index - routine.length) % (routine.length - loopFrom));
    const stretch = routine[at];
    if (left < stretch.ms) return { stretch, index, intoMs: left };
    left -= stretch.ms;
    index++;
  }
}

/** Where a play with moods stands: the step on show, the pushes landed on it, the bounces, and when its routine began. */
export interface StepPickStanding { step: number; landed: number; bounces: number; since: number }
/** What a push did (with moods): landed, bounced, called a bluff, or (no moods, past the last step) nothing. */
export type StepPickPushResult = "landed" | "bounced" | "called";

/** The routine for where the play stands (the last step's last routine past its list). */
export const stepPickRoutine = (tuning: StepPickTuning, standing: Pick<StepPickStanding, "step" | "landed">): readonly StepPickStretch[] => {
  const routines = tuning.moods!.routines;
  const byStep = routines[Math.min(standing.step, routines.length - 1)];
  return byStep[Math.min(standing.landed, byStep.length - 1)];
};

/** A push at `at` with moods: what it does and where the play stands after it. */
export function stepPickMoodPush(tuning: StepPickTuning, standing: StepPickStanding, at: number): { result: StepPickPushResult; standing: StepPickStanding } {
  const { stretch } = stepPickStretchAt(stepPickRoutine(tuning, standing), at - standing.since);
  const last = stepPickSteps(tuning) - 1;
  if (stretch.mood === "closed" || standing.step >= last) return { result: "bounced", standing: { ...standing, bounces: standing.bounces + 1 } };
  if (stretch.mood === "feint") return { result: "called", standing: { ...standing, step: standing.step + 1, landed: 0, since: at } };
  const landed = standing.landed + 1;
  if (landed >= tuning.pushesPerStep[standing.step]) return { result: "landed", standing: { ...standing, step: standing.step + 1, landed: 0, since: at } };
  return { result: "landed", standing: { ...standing, landed, since: at } };
}

/** The reasons a tuning is not fair on a phone (none: fair). */
export function stepPickFairness(tuning: StepPickTuning): string[] {
  const parsed = stepPickTuningSchema.safeParse(tuning);
  if (!parsed.success) return [`not a step_pick tuning: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`];
  const problems: string[] = [];
  const last = stepPickThresholds(tuning).at(-1)!;
  if (tuning.pushLimit !== null && tuning.pushLimit <= last && !tuning.moods)
    problems.push(`the push limit ${tuning.pushLimit} comes before the last step can be taken (${last} pushes)`);
  if (tuning.pushGapMs > STEP_PICK_MAX_GAP_MS) problems.push(`a push gap of ${tuning.pushGapMs} ms drops deliberate presses (more than ${STEP_PICK_MAX_GAP_MS})`);
  if (tuning.pushGapMs >= STEP_PICK_AUTO_STEP_MS) problems.push("「おまかせ」's presses are closer than the push gap");
  if (tuning.idleMs < STEP_PICK_MIN_IDLE_MS) problems.push(`doing nothing ends the play after ${tuning.idleMs} ms (less than ${STEP_PICK_MIN_IDLE_MS}: time to decide)`);
  if (tuning.moods) problems.push(...moodFairness(tuning, tuning.moods));
  return problems;
}

/** The reasons a tuning's moods are not fair (none: fair). */
function moodFairness(tuning: StepPickTuning, moods: NonNullable<StepPickTuning["moods"]>): string[] {
  const problems: string[] = [];
  if (tuning.pushLimit !== null) problems.push("a push limit with moods: the moods' patience ends the play");
  if (moods.routines.length !== stepPickSteps(tuning)) problems.push(`${moods.routines.length} steps of routines for ${stepPickSteps(tuning)} steps`);
  moods.routines.forEach((byStep, step) => {
    if (step >= tuning.pushesPerStep.length) return;
    if (byStep.length < tuning.pushesPerStep[step]) problems.push(`step ${step} has ${byStep.length} routines for its ${tuning.pushesPerStep[step]} landed pushes`);
    byStep.forEach((routine, landed) => {
      const where = `step ${step}, ${landed} landed`;
      for (const stretch of routine) {
        if (stretch.mood !== "closed" && stretch.ms < STEP_PICK_MIN_OPEN_MS) problems.push(`${where}: a ${stretch.mood} stretch of ${stretch.ms} ms (less than ${STEP_PICK_MIN_OPEN_MS}: no time to read it)`);
      }
      // It must open again in its turns (or the step could never be moved on), and soon enough to read before doing nothing ends.
      const loop = routine.slice(Math.max(0, routine.length - 2));
      if (!loop.some((stretch) => stretch.mood !== "closed")) problems.push(`${where}: its last two never open (the step could not move on)`);
      const firstOpen = routine.findIndex((stretch) => stretch.mood !== "closed");
      const before = routine.slice(0, firstOpen < 0 ? routine.length : firstOpen).reduce((sum, stretch) => sum + stretch.ms, 0);
      if (before > tuning.idleMs - 3000) problems.push(`${where}: it first opens after ${before} ms (doing nothing would end the play soon after)`);
    });
  });
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

/** The step on show after `count` counted pushes (the last step stays on show after more). Without moods. */
export function stepPickStepOf(count: number, tuning: StepPickTuning): number {
  const thresholds = stepPickThresholds(tuning);
  let step = 0;
  while (step + 1 < thresholds.length && count >= thresholds[step + 1]) step += 1;
  return step;
}

/** Where a play stands after its counted pushes up to `untilMs` (with moods: the routine; without: the step by count), and what each push did. */
export function stepPickStanding(pushes: readonly number[], tuning: StepPickTuning, untilMs = Infinity): { standing: StepPickStanding; results: StepPickPushResult[] } {
  const counted = stepPickCounted(pushes, tuning).filter((at) => at <= untilMs);
  if (!tuning.moods) {
    return { standing: { step: stepPickStepOf(counted.length, tuning), landed: 0, bounces: 0, since: counted.at(-1) ?? 0 }, results: counted.map(() => "landed") };
  }
  let standing: StepPickStanding = { step: 0, landed: 0, bounces: 0, since: 0 };
  const results: StepPickPushResult[] = [];
  for (const at of counted) {
    const pushed = stepPickMoodPush(tuning, standing, at);
    standing = pushed.standing;
    results.push(pushed.result);
    if (standing.bounces >= tuning.moods.patience) break;
  }
  return { standing, results };
}

/**
 * How a record ended, walking its pushes in time: doing nothing for the idle time ends it with nothing; the push limit's
 * push (with moods: the bounce past its patience) ends it (out); else its take (the step on show then) or its leave; a
 * record with neither ran out (none).
 */
export function stepPickEnding(record: StepPickRecord | null, tuning: StepPickTuning): StepPickEnding {
  const end = record?.end && isTime(record.end.ms) && (record.end.kind === "take" || record.end.kind === "leave") ? record.end : null;
  let last = 0;
  let count = 0;
  let standing: StepPickStanding = { step: 0, landed: 0, bounces: 0, since: 0 };
  for (const at of stepPickCounted(record?.pushes ?? [], tuning)) {
    if (end && end.ms < at) break;
    if (at - last >= tuning.idleMs) return { kind: "none" };
    count += 1;
    last = at;
    if (tuning.moods) {
      standing = stepPickMoodPush(tuning, standing, at).standing;
      if (standing.bounces >= tuning.moods.patience) return { kind: "out" };
    } else if (tuning.pushLimit !== null && count >= tuning.pushLimit) return { kind: "out" };
  }
  if (!end || end.ms - last >= tuning.idleMs) return { kind: "none" };
  if (end.kind === "leave") return { kind: "leave" };
  return { kind: "take", step: tuning.moods ? standing.step : stepPickStepOf(count, tuning) };
}

/** When 「おまかせ」 presses its `index`-th button (the host's clock, from the play's start). */
export const stepPickAutoAt = (index: number): number => STEP_PICK_AUTO_LEAD_MS + index * STEP_PICK_AUTO_STEP_MS;

/** With moods: the next time from `from` on that the routine of where the play stands is in one of `moods` (a press a little into it). */
function nextMoodAt(tuning: StepPickTuning, standing: StepPickStanding, from: number, moods: readonly StepPickMood[]): number {
  const routine = stepPickRoutine(tuning, standing);
  let at = Math.max(from, standing.since);
  for (let guard = 0; guard < 200; guard++) {
    const { stretch, intoMs } = stepPickStretchAt(routine, at - standing.since);
    const start = at - intoMs;
    const into = moods.includes(stretch.mood) ? Math.min(AUTO_INTO_OPEN_MS, stretch.ms / 2) : null;
    if (into !== null && start + into >= at) return start + into;
    if (into !== null && at < start + stretch.ms - 50) return at;
    at = start + stretch.ms;
  }
  return at;
}

/** 「おまかせ」 with moods: presses in the openings (calling a bluff when it comes) up to the step, or in the closed stretches until out. */
function moodAutoRecord(ending: StepPickEnding, tuning: StepPickTuning): StepPickRecord {
  const pushes: number[] = [];
  let standing: StepPickStanding = { step: 0, landed: 0, bounces: 0, since: 0 };
  let at = STEP_PICK_AUTO_LEAD_MS;
  const press = (moods: readonly StepPickMood[]) => {
    at = nextMoodAt(tuning, standing, Math.max(at, (pushes.at(-1) ?? -Infinity) + tuning.pushGapMs + 50), moods);
    pushes.push(at);
    standing = stepPickMoodPush(tuning, standing, at).standing;
  };
  switch (ending.kind) {
    case "take": {
      const step = Math.min(Math.max(0, ending.step), stepPickSteps(tuning) - 1);
      while (standing.step < step && pushes.length < 50) press(["open", "feint"]);
      return { pushes, end: { kind: "take", ms: at + STEP_PICK_AUTO_STEP_MS } };
    }
    case "leave": return { pushes: [], end: { kind: "leave", ms: stepPickAutoAt(0) } };
    case "out": {
      while (standing.bounces < tuning.moods!.patience && pushes.length < 50) press(["closed"]);
      return { pushes, end: null };
    }
    case "none": return { pushes: [], end: null };
  }
}

/** 「おまかせ」: the record that ends so (the pushes a step needs, one a step apart, then the take; a leave at once). */
export function stepPickAutoRecord(ending: StepPickEnding, tuning: StepPickTuning): StepPickRecord {
  if (tuning.moods) return moodAutoRecord(ending, tuning);
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
      if (map.out === outcome && (tuning.pushLimit !== null || tuning.moods)) return stepPickAutoRecord({ kind: "out" }, tuning);
      if (map.none === outcome) return stepPickAutoRecord({ kind: "none" }, tuning);
      throw new Error(`No step_pick ending gives ${outcome}`);
    },
  };
}
