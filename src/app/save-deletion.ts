import { LEARNING_KEY, SAVE_KEY, loadGame, sameGameState, type LoadResult, type StorageLike } from "../persistence";
import type { SaveBaseline } from "./save-recovery";

export type DeleteSnapshot = { game: string | null; learning: string | null };
export type DeleteRequest = { snapshot?: DeleteSnapshot; closeSettings: boolean; notice?: string };

/** What this tab knows about the save it shows. */
export type DeleteSession = SaveBaseline & {
  hasGame: boolean;
  /** Result of loading the slot when the page opened. */
  loaded: LoadResult;
};

/**
 * Before asking for confirmation, require that storage still holds exactly what this tab last
 * observed, so an older tab cannot delete progress saved by another one. The returned snapshot is
 * checked again by `deleteSaveData` when the player confirms.
 */
export function checkDeleteRequest(storage: StorageLike, session: DeleteSession): DeleteRequest {
  const { hasGame, savedGame, protectedOriginal, loaded } = session;
  try {
    const current = loadGame(storage);
    if (hasGame) {
      if (savedGame === null
        ? protectedOriginal === null
          ? current.status !== "empty"
          : current.status !== "invalid" || current.raw !== protectedOriginal
        : current.status !== "loaded" || !sameGameState(current.state, savedGame)) {
        return { closeSettings: true, notice: "別の画面でセーブが更新されています。再読み込みしてからやり直してください。" };
      }
    } else if (loaded.status !== "invalid" || current.status !== "invalid" || current.raw === null || current.raw !== loaded.raw) {
      return { closeSettings: false, notice: "保存データを確認できません。再読み込みしてからやり直してください。" };
    }
    return { closeSettings: true, snapshot: { game: storage.getItem(SAVE_KEY), learning: storage.getItem(LEARNING_KEY) } };
  } catch {
    return { closeSettings: false, notice: "保存データを読み取れませんでした。ブラウザの保存設定を確認してください。" };
  }
}
