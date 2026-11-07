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

/** How the title shows one of its actions: usable, shown but disabled, or not at all. */
export type TitleAction = "shown" | "disabled" | "hidden";

/**
 * The title's start (「旅をはじめる」 / 「元のデータを…新しく始める」) and, beside an unreadable save's
 * notice, 「保存データを消去する」, for the slot as it was loaded when the page opened:
 * - a save of another journey: neither (the notice points to that journey; nothing is replaced here);
 * - the storage area cannot be read: both disabled (its bytes could be neither kept nor checked);
 * - otherwise both can be used.
 * writeNewGame refuses the same starts; checkDeleteRequest refuses deleting unreadable storage.
 */
export function titleSaveActions(loaded: LoadResult): { start: TitleAction; deletion: TitleAction } {
  if (loaded.status !== "invalid") return { start: "shown", deletion: "shown" };
  if (loaded.kind === "journey") return { start: "hidden", deletion: "hidden" };
  if (loaded.raw === null) return { start: "disabled", deletion: "disabled" };
  return { start: "shown", deletion: "shown" };
}

/**
 * Start a new game (`next`) over the slot as it was loaded when the page opened. An unreadable
 * save is never overwritten in place (AGENTS.md 「安全に読み込めないデータを勝手に上書き・削除しない」):
 * - where the title offers no usable start (another journey's save, unreadable storage) nothing is
 *   written (no message: the title already says why);
 * - over an empty slot or an unreadable save, manual saving writes nothing yet, and an unreadable
 *   original stays as it is until an explicit save backs it up (writeExplicitSave);
 * - with automatic saving the original bytes go to a backup key first, and only while the slot still
 *   holds what the page showed (another tab's newer data is refused).
 */
export function writeNewGame(storage: StorageLike, next: GameState, loaded: LoadResult, autoSave: boolean): BaselineResult {
  if (titleSaveActions(loaded).start !== "shown") return { ok: false, message: null };
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
