import { battles, dates, episodes, getCityContent, landmarks, sceneConditions, scenes } from "../content";
import { splitStoryAddress } from "../content/story-address";
import { meets } from "./conditions";
import type { GameState } from "./game-state-schema";

/**
 * A scene's `cond("…")` (the unified event design, stage 2a): Ink asks whether a condition,
 * written as text, holds now. Only the texts content:build read from the stories exist
 * (src/content/generated/scene-conditions.json); each is judged by `meets` on the state the
 * caller gives: the state after a choice's effects when the choice is passed to Ink, so the
 * lines after it read the new values. Ink gets true or false, never a number; the player
 * never sees which (Debug mode lists them: sceneConditionTruths).
 */
export type ConditionReader = (text: string) => boolean;

export function sceneConditionReader(state: Readonly<GameState>): ConditionReader {
  return (text) => {
    const condition = Object.hasOwn(sceneConditions.conditions, text) ? sceneConditions.conditions[text] : undefined;
    if (!condition) throw new Error(`場面の条件が見つかりません: ${text}`);
    return meets(state, condition);
  };
}

/**
 * The story of the scene on screen, or null: the order of GameApp's screens (an encounter over the
 * epilogue, the guide and the battle's talk, the date last; story-scene-change.ts). For Debug mode only:
 * it reads the content by ID, without the fingerprint checks of the scenes' own functions.
 */
export function activeSceneStoryId(state: Readonly<GameState>): string | null {
  if (state.activeEncounter) return state.activeEncounter.storyId;
  const epilogue = state.activeEpilogue;
  if (epilogue?.kind === "tour_leg") {
    // A tour leg's narration (tour stage 2b): its scene's knot.
    const scene = scenes.find((item) => item.id === epilogue.episodeId);
    return scene?.story.knot ? `${scene.story.storyId}.${scene.story.knot}` : null;
  }
  if (epilogue) {
    const episode = episodes.find((item) => item.id === epilogue.episodeId);
    return (epilogue.kind === "arrival" ? episode && getCityContent(episode.cityId).city.arrivalStoryId : episode?.epilogueStoryId) ?? null;
  }
  const tourism = state.activeTourism;
  if (tourism) return tourism.phase === "guide" ? landmarks.find((item) => item.id === tourism.landmarkId)?.guideStoryId ?? null : null;
  const battle = state.activeBattle;
  if (battle) return battle.phase === "dialogue" ? battles.find((item) => item.id === battle.battleId)?.storyId ?? null : null;
  const date = state.activeDate;
  return date ? dates.find((item) => item.id === date.dateId)?.storyId ?? null : null;
}

/** Each `cond("…")` text of the story, with whether it holds in `state` (for Debug mode; empty for a story without any). */
export function sceneConditionTruths(state: Readonly<GameState>, storyId = activeSceneStoryId(state)): { text: string; met: boolean }[] {
  if (!storyId) return [];
  // A place file's scene reads the texts of its own knots (generated/scenes.json), not the whole file's.
  const { storyId: file, path } = splitStoryAddress(storyId);
  const scene = path === undefined ? undefined : scenes.find((item) => item.story.storyId === file && item.story.knot === path.split(".")[0]);
  const texts = scene ? scene.conds : Object.hasOwn(sceneConditions.stories, file) ? sceneConditions.stories[file] : [];
  const read = sceneConditionReader(state);
  return texts.map((text) => ({ text, met: read(text) }));
}
