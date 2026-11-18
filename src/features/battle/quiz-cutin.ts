// 「Quiz」 (2026-11-18 user decision: a short cut-in as a quiz starts, nothing elaborate; QuizCutIn.tsx). Presentation
// only: it changes no game state and no save.
import type { ActiveBattle } from "../../domain/battle";

/** What the battle screen's cut-ins read of the battle, as the mounted screen last showed it and as it shows it now. */
export interface BattleCutInView {
  runId: string;
  phase: ActiveBattle["phase"];
  roundIndex: number;
  /** The answers given in this run. */
  answered: number;
  /** A special battle's proof has begun (its reasoning stop was reached in this run). */
  proof: boolean;
}

export function battleCutInView(active: Pick<ActiveBattle, "runId" | "phase" | "roundIndex" | "answers" | "reasoning">): BattleCutInView {
  return { runId: active.runId, phase: active.phase, roundIndex: active.roundIndex, answered: active.answers.length, proof: !!active.reasoning };
}

/**
 * Whether 「Quiz」 shows: the run's flow moves, in this mounted screen, from its talk to its first 3-choice question.
 * Once per run. Never for a screen that mounts on a question (a reload, a resumed save: the screen's first view is the
 * question itself), for a later question, across runs, or at a special battle's reasoning stop and the question that
 * follows its proof (B/C keep their own ReasoningCutIn). A special battle's ordinary first question shows it too.
 */
export function shouldShowQuizCutIn(previous: BattleCutInView, current: BattleCutInView): boolean {
  return previous.runId === current.runId && previous.phase === "dialogue" && current.phase === "question" &&
    current.roundIndex === 0 && current.answered === 0 && !current.proof;
}

/**
 * How long it shows (ms): short, and shorter and still with reduced motion. Each is longer than a double tap's moment
 * (DOUBLE_TAP_WINDOW_MS), whose second tap it ignores, so a later tap can still end it early.
 */
export const QUIZ_CUTIN_MS = 900;
export const QUIZ_CUTIN_STILL_MS = 500;

export function quizCutInDuration(still: boolean): number {
  return still ? QUIZ_CUTIN_STILL_MS : QUIZ_CUTIN_MS;
}
