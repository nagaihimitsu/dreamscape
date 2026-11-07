import type { GameState } from "../domain/game";
import { backupAndCreate, saveGame, type LoadResult, type SaveResult, type StorageLike } from "../persistence";

/** What a tab knows about its journey's slot besides the game it shows. */
export type SaveBaseline = {
  /** Last save this tab wrote or loaded; null when the current game was never saved. */
  savedGame: GameState | null;
  /** Unreadable original kept by an unsaved start until an explicit save backs it up. */
  protectedOriginal: string | null;
};

export type BaselineResult = { ok: true; baseline: SaveBaseline } | { ok: false; message: string | null };

/**
 * Start a new game (`next`) over the slot as it was loaded when the page opened. An unreadable
 * save is never overwritten in place (AGENTS.md 「安全に読み込めないデータを勝手に上書き・削除しない」):
 * - a save of another journey cannot be replaced from here (no message; the title offers no start);
 * - with manual saving nothing is written yet, and an unreadable original stays as it is until an
 *   explicit save backs it up (writeExplicitSave);
 * - with automatic saving the original bytes go to a backup key first, and only while the slot still
 *   holds what the page showed (another tab's newer data is refused).
 */
export function writeNewGame(storage: StorageLike, next: GameState, loaded: LoadResult, autoSave: boolean): BaselineResult {
  if (loaded.status === "invalid" && loaded.kind === "journey") return { ok: false, message: null };
  const original = loaded.status === "invalid" ? loaded.raw : null;
  if (!autoSave && (loaded.status === "empty" || original !== null))
    return { ok: true, baseline: { savedGame: null, protectedOriginal: original } };
  const saved = loaded.status === "invalid" ? backupAndCreate(storage, next, original) : saveGame(storage, next);
  return written(saved, next);
}

/** セーブ, and turning automatic saving on: back up a protected original first; otherwise save
 * only over the snapshot this tab last observed (another tab's newer save is refused). */
export function writeExplicitSave(storage: StorageLike, current: GameState, baseline: SaveBaseline): BaselineResult {
  const saved = baseline.protectedOriginal !== null
    ? backupAndCreate(storage, current, baseline.protectedOriginal)
    : saveGame(storage, current, baseline.savedGame);
  return written(saved, current);
}

function written(saved: SaveResult, state: GameState): BaselineResult {
  return saved.ok ? { ok: true, baseline: { savedGame: state, protectedOriginal: null } } : { ok: false, message: saved.message };
}
