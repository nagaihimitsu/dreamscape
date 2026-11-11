/**
 * When a story scene starts or ends, a new screen appears under the finger.
 * A scene ends when a date finishes, a guide gives way to the observation,
 * 「問題へ進む」, an epilogue or an encounter ends; it starts when a destination
 * opens a date or a guide, 「進む」 a battle's talk, 「相手の反応を見る」 the enemy's
 * reaction, 「エピローグへ進む」 the epilogue. The second tap of a quick double tap
 * on the line, the picture or the button that did it would press whatever is
 * there now: a control of the next screen (start another date and spend AP,
 * start the epilogue, answer a question) or the new scene's first line, read on
 * before it is seen. So GameApp holds taps for a moment then (holdTaps,
 * src/components/tap-hold.ts; AGENTS.md 選択肢の誤タップ防止; the battle's answer
 * guard is the same rule). A load holds them too, also when it brings back the
 * scene on screen (GameApp's loadSavedGame).
 */

/** The parts of the game state that say which story scene is on screen. */
export interface SceneState {
  activeEncounter: { runId: string } | null;
  activeEpilogue: { episodeId: string; kind?: "arrival" | "tour_leg" } | null;
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

/** The parts of the game state that say which screen is shown (GameApp's order of screens). */
export interface ScreenState extends SceneState {
  currentCityId: string;
  endingReached?: boolean;
  activeEpilogue: { episodeId: string; kind?: "arrival" | "tour_leg"; logoComplete?: boolean } | null;
}

/**
 * The screen on show, named so that a new screen has a new name (UI redesign §3.7 E: a lost
 * focus goes to the new screen's heading, free time opens at the top). A scene a load brings
 * back is a new screen (`sceneEpoch`, as the date, battle and encounter are rebuilt); the
 * sightseeing guide and the free observation are two screens; an arrival's title card is one
 * screen and its talk the next (the window, with its heading, is inert under the card).
 */
export function screenOnShow(state: ScreenState | null, view: { sceneEpoch: number; showRomanceEnding: boolean }): string {
  if (!state) return "title";
  const epoch = view.sceneEpoch;
  if (state.activeEncounter) return `encounter:${state.activeEncounter.runId}:${epoch}`;
  const epilogue = state.activeEpilogue;
  if (epilogue) return `epilogue:${epilogue.episodeId}:${epilogue.kind ?? "ending"}${epilogue.kind === "arrival" && !epilogue.logoComplete ? ":card" : ""}`;
  if (state.activeTourism) return `tourism:${state.activeTourism.landmarkId}:${state.activeTourism.phase}`;
  if (state.activeBattle) return `battle:${state.activeBattle.runId}:${epoch}`;
  if (state.activeDate) return `date:${state.activeDate.runId}:${epoch}`;
  if (state.endingReached && view.showRomanceEnding) return "romance-ending";
  return `free:${state.currentCityId}`;
}
