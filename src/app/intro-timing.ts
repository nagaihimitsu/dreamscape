import type { GameState } from "../domain/game";

// 最初の3分の計測 (2026-11-13 user decision; Debug mode only): from 「旅をはじめる」, the real time and the dialogue lines
// read until the first choice shown, the first quiz answered, the first free time and the first date started, with and
// without the opening movie's time. GameApp keeps it in this tab's memory while Debug mode is on, never in a save; its
// words are in the lazily loaded IntroTimingNote.tsx (Debug's code stays out of the title's files). Pure rules here.

export const INTRO_MILESTONES = ["choice", "quiz", "free", "date"] as const;
export type IntroMilestone = (typeof INTRO_MILESTONES)[number];
/** A milestone reached: the time since 「旅をはじめる」 (ms, the movie's included), the movie's share of it and the lines read. */
export type IntroMark = { atMs: number; movieMs: number; lines: number };
export type IntroTiming = {
  startedAt: number;
  /** While the opening movie plays: when it began. */
  movieStartedAt: number | null;
  /** How long the movie played (ms). */
  movieMs: number;
  /** The dialogue lines shown so far. */
  lines: number;
  marks: Partial<Record<IntroMilestone, IntroMark>>;
};

/** The measure as 「旅をはじめる」 is pressed (`now`, ms), the opening movie starting first when the journey has one. */
export function startIntroTiming(now: number, movie: boolean): IntroTiming {
  return { startedAt: now, movieStartedAt: movie ? now : null, movieMs: 0, lines: 0, marks: {} };
}

/** The opening movie ended at `now`. */
export function endIntroMovie(timing: IntroTiming, now: number): IntroTiming {
  if (timing.movieStartedAt === null) return timing;
  return { ...timing, movieStartedAt: null, movieMs: timing.movieMs + Math.max(0, now - timing.movieStartedAt) };
}

/** `milestones` reached at `now` and `lines` more lines shown (a milestone counts its first time only). */
export function recordIntro(timing: IntroTiming, now: number, { lines = 0, milestones = [] }: { lines?: number; milestones?: readonly IntroMilestone[] }): IntroTiming {
  const counted = timing.lines + lines;
  const marks = { ...timing.marks };
  for (const milestone of milestones)
    marks[milestone] ??= { atMs: Math.max(0, now - timing.startedAt), movieMs: timing.movieMs, lines: counted };
  return lines || milestones.some((milestone) => !timing.marks[milestone]) ? { ...timing, lines: counted, marks } : timing;
}

type LineFrame = { text: string; choices: readonly { call?: string }[] } | null | undefined;

/** The line on screen (as lineFrameOnScreen of local-words.ts reads it): the story scene shown, none outside one. */
function lineOnScreen(state: GameState): LineFrame {
  return state.activeEncounter ? state.activeEncounter.frame
    : state.activeEpilogue ? (state.activeEpilogue.kind === "arrival" && !state.activeEpilogue.logoComplete ? null : state.activeEpilogue.frame)
      : state.activeTourism ? (state.activeTourism.phase === "guide" ? state.activeTourism.frame : null)
        : state.activeBattle ? (state.activeBattle.phase === "dialogue" ? state.activeBattle.frame : null)
          : state.activeDate?.frame;
}

/** Whether a frame offers the player a choice (a battle's call is the game's own, not one). */
const offersChoice = (frame: LineFrame) => !!frame?.choices.some((choice) => !choice.call);

/**
 * What a saved change (`previous` → `next`) did for the measure: a new line shown (the line on screen changed its
 * text), the first choice shown, a quiz answered (a battle's or an encounter's), a date started. Free time is the
 * screen's (GameApp). Never a relationship value.
 */
export function introChange(previous: GameState, next: GameState): { lines: number; milestones: IntroMilestone[] } {
  const before = lineOnScreen(previous);
  const after = lineOnScreen(next);
  const milestones: IntroMilestone[] = [];
  if (offersChoice(after) || (next.activeEncounter?.phase === "quiz" && previous.activeEncounter?.phase !== "quiz")) milestones.push("choice");
  if ((next.activeBattle?.answers.length ?? 0) > (previous.activeBattle?.answers.length ?? 0) ||
      (next.activeEncounter?.phase === "feedback" && previous.activeEncounter?.phase !== "feedback")) milestones.push("quiz");
  if (next.activeDate && next.activeDate.dateId !== previous.activeDate?.dateId) milestones.push("date");
  return { lines: after?.text && after.text !== before?.text ? 1 : 0, milestones };
}
