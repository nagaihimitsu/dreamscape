import type { GameState } from "../domain/game";
import { screenFor } from "../domain/screen";

/**
 * Debug's 「移動画面に戻る（Debug）」 (user decision 2026-11-11): while Debug mode is on, ⚙設定 on a
 * screen other than free time (a conversation, a quiz or battle, an encounter, a date, a tour's leg…)
 * offers to go back to the free-time screen as it last was, undoing everything since: fares and
 * admission, AP, the time, items spent or gained, flags, relationship values, memories, the records
 * of events, battles and encounters, the place (so the move that opened the event is undone too),
 * and any open scene. The last free-time state lives in GameApp's memory only: it is never saved
 * and is not part of the save format. It is forgotten while Debug mode is off, before the journey
 * begins (the title), on a load and on a new game; a journey switch rebuilds GameApp.
 */
export interface FreeTimeReturn {
  /** The journey whose screen remembered it. */
  journeyId: string;
  /** The whole game as the free-time screen last showed it. */
  state: GameState;
}

/**
 * The return point once `state` is on screen: `state` itself while it shows free time (so the
 * point is the free-time state before the action that left it), else the earlier point of the same
 * journey. None while Debug mode is off or before the journey begins.
 */
export function nextFreeTimeReturn(previous: FreeTimeReturn | null, state: GameState | null, journeyId: string, debugOn: boolean): FreeTimeReturn | null {
  if (!debugOn || !state) return null;
  if (screenFor(state) === "free_time") return { journeyId, state };
  return previous?.journeyId === journeyId ? previous : null;
}

/** Whether ⚙設定 offers 「移動画面に戻る（Debug）」: Debug mode on, a screen other than free time, and a return point of this journey. */
export function canReturnToFreeTime(point: FreeTimeReturn | null, current: GameState | null, journeyId: string, debugOn: boolean): boolean {
  return debugOn && !!point && !!current && point.journeyId === journeyId && screenFor(current) !== "free_time";
}

/**
 * The game that going back puts in place: the remembered free-time state as it was, with the
 * revision after the current one. The save takes it (saveGame refuses a revision at or before the
 * saved one, as another tab's older play), and no control or timer of the undone scene, which holds
 * an older revision, can act on it; a scene started again gets a new run ID.
 */
export function freeTimeReturnState(point: FreeTimeReturn, current: GameState): GameState {
  return { ...point.state, revision: current.revision + 1 };
}
