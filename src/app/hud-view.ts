import { frameCall, type StoryFrame } from "../story/frame-reader";

type Frame = Pick<StoryFrame, "choices">;

/** The parts of the game state that say which screen is on show and whether it waits for the player's choice. */
export interface HudState {
  activeEncounter: { phase: string; frame: Frame } | null;
  activeEpilogue: { frame: Frame } | null;
  activeTourism: { phase: string; frame: Frame | null } | null;
  activeBattle: { phase: string; frame: Frame | null } | null;
  activeDate: { frame: Frame } | null;
}

/**
 * What the header shows (user decision 2026-11-11, after playing on an iPhone).
 * - "talk": a story scene that the header lies over (an encounter, an arrival, an epilogue, a tour
 *   leg's narration, a sightseeing guide, a battle, a date) while nothing waits for the player's
 *   choice. The header shows only the place and time and ⚙設定.
 * - "all": every part, also the budget and AP, the held items and the screen's own tool (free time's
 *   地図; a guide's or a battle's 手がかり帳). Such a scene while it waits for a choice (one of
 *   the story's, a quiz's answer, the evidence of a battle's reasoning), and every other screen (free
 *   time, the observation, 交際開始).
 * The parts that "talk" leaves out keep their room (journey-hud.css), so nothing under the header
 * moves when they show at a choice.
 */
export type HudView = "all" | "talk";

export function hudView(state: HudState | null): HudView {
  return state && sceneWaits(state) === false ? "talk" : "all";
}

/** A frame that waits for one of its choices (a battle's call to its quiz or reasoning is no choice: battleDialogueStop). */
const choosing = (frame: Frame | null) => !!frame?.choices.length && !frameCall(frame);

/**
 * Whether the story scene on screen waits for the player's choice, or null when no story scene is
 * on screen. Follows GameApp's order of screens: an encounter, an arrival or epilogue, the tourism
 * screen (its guide; the observation is no scene), a battle (every phase), a date.
 */
function sceneWaits({ activeEncounter: encounter, activeEpilogue: epilogue, activeTourism: tourism, activeBattle: battle, activeDate: date }: HudState): boolean | null {
  // An encounter's quiz shows its English answers; its feedback shows the result in their place.
  if (encounter) return encounter.phase === "quiz" || (encounter.phase !== "feedback" && choosing(encounter.frame));
  if (epilogue) return choosing(epilogue.frame);
  if (tourism) return tourism.phase === "guide" ? choosing(tourism.frame) : null;
  if (battle) return battle.phase === "question" || battle.phase === "reasoning" || (battle.phase === "dialogue" && choosing(battle.frame));
  return date ? choosing(date.frame) : null;
}
