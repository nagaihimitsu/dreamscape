import { useEffect, useRef, useState } from "react";
import { createGame, type GameState } from "../domain/game";
import { advanceCompletedJourneyCity } from "../domain/city-travel";
import { finishTravelEventIfComplete } from "../domain/travel-game";
import {
  backupAndCreate, deleteSaveData, LEARNING_KEY, SAVE_KEY, loadGame,
  sameGameState, saveGame, type StorageLike,
} from "../persistence";

export type GameChange = (state: GameState) => GameState;
export type DeleteSnapshot = { game: string | null; learning: string | null };
export type GameStorage = StorageLike & { removeItem(key: string): void };

/** Owns the in-memory game and the snapshots used to protect persisted progress. */
export function useGameSession(storage: GameStorage, autoSave: boolean, onCityChange: () => void) {
  const [loaded] = useState(() => loadGame(storage));
  const [game, setGame] = useState<GameState | null>(loaded.status === "loaded" ? loaded.state : null);
  const gameRef = useRef(game);
  // Manual play advances the game without changing the last observed save.
  const savedGameRef = useRef<GameState | null>(loaded.status === "loaded" ? loaded.state : null);
  // An unreadable original stays protected until an explicit save backs it up.
  const protectedOriginalRef = useRef<string | null>(null);
  const [invalid, setInvalid] = useState(loaded.status === "invalid" ? loaded.message : "");
  const [notice, setNotice] = useState("");

  function getCurrent() { return gameRef.current; }
  function hasUnsavedProgress() {
    return !!gameRef.current && (!savedGameRef.current || !sameGameState(gameRef.current, savedGameRef.current));
  }
  function adopt(next: GameState) {
    gameRef.current = next;
    setGame(next);
  }
  function commit(change: GameChange) {
    const previous = gameRef.current;
    if (!previous) return false;
    const changed = finishTravelEventIfComplete(previous, change(previous));
    if (changed === previous) return false;
    // The action and any automatic city departure form one saved snapshot.
    const next = advanceCompletedJourneyCity(changed, changed.revision);
    if (autoSave) {
      const saved = saveGame(storage, next, savedGameRef.current);
      if (!saved.ok) { setNotice(saved.message); return false; }
      savedGameRef.current = next;
    }
    adopt(next);
    if (next.currentCityId !== previous.currentCityId) onCityChange();
    setNotice("");
    return true;
  }
  useEffect(() => {
    const warnIfUnsaved = (event: BeforeUnloadEvent) => {
      if (autoSave || !hasUnsavedProgress()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnIfUnsaved);
    return () => window.removeEventListener("beforeunload", warnIfUnsaved);
  }, [autoSave]);
  // A completed city may gain a published successor after the last save.
  useEffect(() => {
    if (game) commit((state) => advanceCompletedJourneyCity(state, state.revision));
  }, [game]);

  function begin(player: string, heroine: string, journeyId: string) {
    if (loaded.status === "invalid" && loaded.kind === "journey") return;
    const next = createGame(player.trim(), heroine.trim(), { journeyId });
    const unsavedStart = !autoSave &&
      (loaded.status === "empty" || (loaded.status === "invalid" && loaded.raw !== null));
    const saved = unsavedStart ? { ok: true as const } : invalid && loaded.status === "invalid"
      ? backupAndCreate(storage, next, loaded.raw) : saveGame(storage, next);
    if (!saved.ok) { setNotice(saved.message); return; }
    savedGameRef.current = unsavedStart ? null : next;
    protectedOriginalRef.current = unsavedStart && loaded.status === "invalid" ? loaded.raw : null;
    adopt(next);
    setInvalid("");
    setNotice("");
  }
  /** Shared by manual save and enabling automatic saving. */
  function persistCurrent() {
    const current = gameRef.current;
    if (!current) return true;
    const result = protectedOriginalRef.current !== null
      ? backupAndCreate(storage, current, protectedOriginalRef.current)
      : saveGame(storage, current, savedGameRef.current);
    if (!result.ok) { setNotice(result.message); return false; }
    savedGameRef.current = current;
    protectedOriginalRef.current = null;
    return true;
  }
  function save() {
    if (gameRef.current && persistCurrent()) setNotice("現在の場面を保存しました。");
  }
  function restore() {
    const restored = loadGame(storage);
    if (restored.status !== "loaded") {
      setNotice(restored.status === "invalid" ? restored.message : "保存データがありません。");
      return false;
    }
    savedGameRef.current = restored.state;
    protectedOriginalRef.current = null;
    adopt(restored.state);
    setNotice("保存した場面から再開しました。");
    return true;
  }
  function prepareDelete(): { snapshot?: DeleteSnapshot; closeSettings: boolean } {
    try {
      const current = loadGame(storage);
      if (gameRef.current) {
        if (savedGameRef.current === null
          ? protectedOriginalRef.current === null
            ? current.status !== "empty"
            : current.status !== "invalid" || current.raw !== protectedOriginalRef.current
          : current.status !== "loaded" || !sameGameState(current.state, savedGameRef.current)) {
          setNotice("別の画面でセーブが更新されています。再読み込みしてからやり直してください。");
          return { closeSettings: true };
        }
      } else if (loaded.status !== "invalid" || current.status !== "invalid" || current.raw === null || current.raw !== loaded.raw) {
        setNotice("保存データを確認できません。再読み込みしてからやり直してください。");
        return { closeSettings: false };
      }
      return { closeSettings: true, snapshot: { game: storage.getItem(SAVE_KEY), learning: storage.getItem(LEARNING_KEY) } };
    } catch {
      setNotice("保存データを読み取れませんでした。ブラウザの保存設定を確認してください。");
      return { closeSettings: false };
    }
  }
  function deleteConfirmed(snapshot: DeleteSnapshot) {
    const result = deleteSaveData(storage, snapshot);
    if (!result.ok) { setNotice(result.message); return false; }
    // Explicit deletion confirms that any unsaved in-memory progress is discarded.
    gameRef.current = null;
    return true;
  }
  return { game, loaded, invalid, notice, setNotice, getCurrent, hasUnsavedProgress,
    commit, begin, persistCurrent, save, restore, prepareDelete, deleteConfirmed };
}
