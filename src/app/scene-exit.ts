/**
 * When a story scene ends (a date finishes, a guide gives way to the
 * observation, 「問題へ進む」, an epilogue or an encounter ends), the next screen
 * appears under the finger. The second tap of a quick double tap on the line,
 * the picture or the next button would press whatever control is there (start
 * another date and spend AP, start the epilogue, answer a question), so GameApp
 * holds taps for a moment then (holdTaps, src/components/tap-hold.ts; AGENTS.md
 * 選択肢の誤タップ防止; the battle's answer guard is the same rule).
 */

/** The parts of the game state that say which story scene is on screen. */
export interface SceneState {
  activeEncounter: { runId: string } | null;
  activeEpilogue: { episodeId: string; kind?: "arrival" } | null;
  activeTourism: { landmarkId: string; phase: "guide" | "exploring" } | null;
  activeBattle: { runId: string; phase: string } | null;
  activeDate: { runId: string } | null;
}

/**
 * The story scene (a scene with the dialogue window) on screen, named so that
 * another scene has another name, or null. Follows GameApp's order of screens:
 * an encounter over the epilogue, the tourism screen and the battle, the date last.
 */
export function storySceneOnScreen(state: SceneState | null): string | null {
  if (!state) return null;
  if (state.activeEncounter) return `encounter:${state.activeEncounter.runId}`;
  if (state.activeEpilogue) return `epilogue:${state.activeEpilogue.episodeId}:${state.activeEpilogue.kind ?? "ending"}`;
  if (state.activeTourism) return state.activeTourism.phase === "guide" ? `guide:${state.activeTourism.landmarkId}` : null;
  if (state.activeBattle) return state.activeBattle.phase === "dialogue" ? `battle:${state.activeBattle.runId}` : null;
  return state.activeDate ? `date:${state.activeDate.runId}` : null;
}

/** Whether the screen went from a story scene to anything else (another scene, a question, the map). */
export function leftStoryScene(before: string | null, after: string | null): boolean {
  return before !== null && after !== before;
}
