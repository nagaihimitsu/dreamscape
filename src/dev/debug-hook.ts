import type { GameState } from "../domain/game";
import type { DebugDataMode, DebugSettings } from "./debug-query";

/** The window property tests read while Debug is open (development builds only; never in production). */
export const DEBUG_HOOK_NAME = "__dreamscapeDebug";

/** The open Debug scene: what was opened, its launch URL (search part) and the Debug bar's place. */
export interface DebugSceneInfo {
  dataMode: DebugDataMode;
  /** null for a prototype city's map. */
  settings: DebugSettings | null;
  cityId: string;
  url: string;
  location: string;
}

/**
 * Read-only: every call returns a copy, so a test cannot change Debug or the
 * game through it. Both return null while the scene picker (場面の確認) is shown.
 */
export interface DreamscapeDebugHook {
  /** The Debug game as last saved in its memory storage (every action is saved unless 自動保存 is off). */
  getState(): GameState | null;
  getScene(): DebugSceneInfo | null;
}

/** Install the hook on `target` (the window) and return its removal. */
export function installDebugHook(target: object, source: { state(): GameState | null; scene(): DebugSceneInfo | null }): () => void {
  const hook: DreamscapeDebugHook = Object.freeze({
    getState: () => structuredClone(source.state()),
    getScene: () => structuredClone(source.scene()),
  });
  Object.defineProperty(target, DEBUG_HOOK_NAME, { value: hook, configurable: true, enumerable: false, writable: false });
  return () => {
    if ((target as Record<string, unknown>)[DEBUG_HOOK_NAME] === hook) delete (target as Record<string, unknown>)[DEBUG_HOOK_NAME];
  };
}
