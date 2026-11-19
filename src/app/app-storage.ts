import type { ReactNode } from "react";
import type { GameState } from "../domain/game";
import type { KeyedStorage } from "../persistence/old-data";
import type { DebugShot } from "./debug-mode";
import type { SaveSlot } from "../persistence/journey-storage";

export const browserStorage = {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) =>
    window.localStorage.setItem(key, value),
  removeItem: (key: string) => window.localStorage.removeItem(key),
};
/** This site's whole browser storage, read by 「古い保存データの整理」 (it looks only at `dreamscape.` keys). */
export const browserKeyedStorage: KeyedStorage = {
  keys: () => Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
    .filter((key): key is string => key !== null),
  getItem: browserStorage.getItem,
  removeItem: browserStorage.removeItem,
};
/** What Debug's bar may do to its running game (src/dev/DebugMode.tsx: the flags and the clock, src/dev/debug-edits.ts). */
export type DebugGameAccess = {
  /** The game as it is now (null before a journey begins). */
  game(): GameState | null;
  /**
   * Put `change(game)` in place of the game, saved as an action is but with no action run on it (no relationship change, no
   * travel art), as 「移動画面に戻る（Debug）」's return; whether it was put in place. A throw of `change` (its reason) passes through.
   */
  replace(change: (state: GameState) => GameState): boolean;
};
export type AppProps = {
  storage?: typeof browserStorage;
  nextRomanceRoll?: () => number;
  debug?: boolean;
  /** Debug sessions only (src/dev/DebugMode.tsx): an author's panel over the game (the candidate table, 4.8). */
  debugPanel?: (state: GameState) => ReactNode;
  /** Debug sessions only: set to the running game's access while it shows (null when it goes). */
  debugAccess?: { current: DebugGameAccess | null };
  /**
   * Debug sessions only: the page's 撮影の形 (src/app/debug-mode.ts useDebugShot, on with a launch URL's shot=1), which also hides
   * Debug's bar; without it, the game reads this device's own.
   */
  debugShot?: DebugShot;
};


/** The journey's save slots as the game's screen sees them (save-slots.ts): the one it plays, and the way to another. */
export type SaveSlots = {
  journeyId: string;
  slot: SaveSlot;
  /** The browser storage the slots are read from (SaveSlots.tsx's list). */
  base: typeof browserStorage;
  onSwitch: (slot: SaveSlot) => void;
};
