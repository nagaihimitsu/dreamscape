/**
 * When a story scene starts or ends, a new screen appears under the finger.
 * A scene ends when a date finishes, a guide gives way to the observation,
 * 「問題へ進む」, an epilogue or an encounter ends; it starts when a destination
 * opens a date or a guide, 「進む」 a battle's talk, 「敵の反応を見る」 the enemy's
 * reaction, 「エピローグへ進む」 the epilogue. The second tap of a quick double tap
 * on the line, the picture or the button that did it would press whatever is
 * there now: a control of the next screen (start another date and spend AP,
 * start the epilogue, answer a question) or the new scene's first line, read on
 * before it is seen. So GameApp holds taps for a moment then (holdTaps,
 * src/components/tap-hold.ts; AGENTS.md 選択肢の誤タップ防止; the battle's answer
 * guard is the same rule).
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

/**
 * Whether a story scene started or ended: the screen went from a story scene to
 * anything else (another scene, a question, the map), or from anything else to one.
 */
export function storySceneChanged(before: string | null, after: string | null): boolean {
  return after !== before;
}
