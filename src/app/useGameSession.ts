import { useEffect, useRef, useState } from "react";
import { createGame, type GameState } from "../domain/game";
import { advanceCompletedJourneyCity } from "../domain/city-travel";
import { startCityArrival } from "../domain/epilogue";
import { applyPlayerAction } from "../domain/player-action";
import { deleteSaveData, loadGame, saveGame, type StorageLike } from "../persistence";
import { checkDeleteRequest, type DeleteSnapshot } from "./save-deletion";
import { writeExplicitSave, writeNewGame, type BaselineResult } from "./save-recovery";
import { hasUnsavedProgress as unsavedProgress, leaveStep } from "./unsaved-progress";

export type GameChange = (state: GameState) => GameState;
export type GameStorage = StorageLike & { removeItem(key: string): void };

/** Called after every player action that changed the game (not after a load, a new game or a deletion). */
export type CommitListener = (previous: GameState, next: GameState) => void;

/** Owns the in-memory game and the snapshots used to protect persisted progress. */
export function useGameSession(storage: GameStorage, autoSave: boolean, onCommitted?: CommitListener) {
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
    return unsavedProgress(gameRef.current, savedGameRef.current);
  }
  function adopt(next: GameState) {
    gameRef.current = next;
    setGame(next);
  }
  function commit(change: GameChange) {
    const previous = gameRef.current;
    if (!previous) return false;
    // The action and any automatic city departure form one saved snapshot.
    const next = applyPlayerAction(previous, change);
    if (next === previous) return false;
    if (autoSave) {
      const saved = saveGame(storage, next, savedGameRef.current);
      if (!saved.ok) { setNotice(saved.message); return false; }
      savedGameRef.current = next;
    }
    adopt(next);
    setNotice("");
    onCommitted?.(previous, next);
    return true;
  }
  useEffect(() => {
    const warnIfUnsaved = (event: BeforeUnloadEvent) => {
      if (leaveStep({ way: "close_page", autoSave }, hasUnsavedProgress()) !== "ask") return;
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

  /** Keep what a successful write says this tab now knows about its slot; report a refusal. */
  function adoptBaseline(result: BaselineResult) {
    if (!result.ok) {
      if (result.message !== null) setNotice(result.message);
      return false;
    }
    savedGameRef.current = result.baseline.savedGame;
    protectedOriginalRef.current = result.baseline.protectedOriginal;
    return true;
  }
  function begin(player: string, heroine: string, journeyId: string) {
    const initial = createGame(player.trim(), heroine.trim(), { journeyId });
    const next = startCityArrival(initial, initial.revision);
    if (!adoptBaseline(writeNewGame(storage, next, loaded, autoSave))) return;
    adopt(next);
    setInvalid("");
    setNotice("");
  }
  /** Shared by manual save and enabling automatic saving. */
  function persistCurrent() {
    const current = gameRef.current;
    if (!current) return true;
    return adoptBaseline(writeExplicitSave(storage, current,
      { savedGame: savedGameRef.current, protectedOriginal: protectedOriginalRef.current }));
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
    const { notice: message, ...result } = checkDeleteRequest(storage, {
      hasGame: !!gameRef.current, savedGame: savedGameRef.current,
      protectedOriginal: protectedOriginalRef.current, loaded,
    });
    if (message) setNotice(message);
    return result;
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
