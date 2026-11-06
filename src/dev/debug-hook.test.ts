import { describe, expect, it } from "vitest";
import { createGame, type GameState } from "../domain/game";
import { DEBUG_HOOK_NAME, installDebugHook, type DebugSceneInfo, type DreamscapeDebugHook } from "./debug-hook";

const scene: DebugSceneInfo = { dataMode: "real", settings: null, cityId: "samarkand", url: "?debug&city=samarkand&scene=map", location: "サマルカンド" };

describe("Debug's read-only hook", () => {
  it("returns copies that cannot change Debug's game, and cannot be replaced", () => {
    const target: Record<string, unknown> = {};
    let state: GameState | null = createGame();
    const remove = installDebugHook(target, { state: () => state, scene: () => scene });
    const hook = target[DEBUG_HOOK_NAME] as DreamscapeDebugHook;
    const read = hook.getState()!;
    expect(read).toEqual(state);
    expect(read).not.toBe(state);
    read.ap = 99;
    expect(hook.getState()!.ap).toBe(0);
    hook.getScene()!.cityId = "milano";
    expect(hook.getScene()).toEqual(scene);
    expect(() => { "use strict"; (target as { [DEBUG_HOOK_NAME]: unknown })[DEBUG_HOOK_NAME] = {}; }).toThrow(TypeError);
    expect(() => { (hook as unknown as Record<string, unknown>).getState = () => null; }).toThrow(TypeError);
    expect(Object.keys(target)).toEqual([]);
    state = null;
    expect(hook.getState()).toBeNull();
    remove();
    expect(DEBUG_HOOK_NAME in target).toBe(false);
  });

  it("survives React's development double run (install, remove, install)", () => {
    const target: Record<string, unknown> = {};
    const source = { state: () => null, scene: () => null };
    const first = installDebugHook(target, source);
    first();
    const second = installDebugHook(target, source);
    const installed = target[DEBUG_HOOK_NAME];
    first();
    expect(target[DEBUG_HOOK_NAME]).toBe(installed);
    second();
    expect(DEBUG_HOOK_NAME in target).toBe(false);
  });
});
