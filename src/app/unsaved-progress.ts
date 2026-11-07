import type { GameState } from "../domain/game";
import { sameGameState } from "../persistence";

/** Play this tab holds that its last observed save does not: a game started with manual saving
 * and never saved, or play after the last セーブ. */
export function hasUnsavedProgress(current: GameState | null, savedGame: GameState | null): boolean {
  return !!current && (!savedGame || !sameGameState(current, savedGame));
}

/** Ways to leave the game this tab shows. */
export type LeaveRequest =
  | { way: "switch_journey"; from: string; to: string }
  | { way: "load_save" }
  | { way: "close_page"; autoSave: boolean };

/**
 * Leaving asks first only when it would discard unsaved progress (AGENTS.md: 保存・再開を守る):
 * 「旅行編を切り替える」, 「保存した場面を読み込みますか？」, or the browser's own prompt when the page
 * is closed or reloaded. Choosing the journey already shown does nothing. With automatic saving the
 * page closes without the prompt: every change has already been saved or refused with a notice.
 */
export function leaveStep(request: LeaveRequest, unsaved: boolean): "stay" | "ask" | "leave" {
  if (request.way === "switch_journey" && request.from === request.to) return "stay";
  if (request.way === "close_page" && request.autoSave) return "leave";
  return unsaved ? "ask" : "leave";
}
