import { useEffect } from "react";
import { dates, episodes, getAlbumImage, getCityContent, glossaryTerms, landmarks, presentation, scenes, storyState, tagContext, tourismAssets } from "../content";
import { getCityBackdropPath } from "../content/city-backdrop";
import { reactionMarkImage } from "../content/code-images";
import { derivedImagePath } from "../content/derived-images";
import { getPlacePhoto } from "../content/place-photo";
import { characterForBattle, characterPicture } from "../components/character-catalog";
import { getActiveBattleContent } from "../domain/battle";
import { activeDateStoryId } from "../domain/date-rules";
import { getActiveEncounterDefinition } from "../domain/encounter";
import { activeEpilogueStoryId, epilogueScene } from "../domain/epilogue";
import { createGame, type GameState } from "../domain/game";
import { openOccasion } from "../domain/occasion";
import { sceneConditionReader } from "../domain/scene-conditions";
import { scenePerson, speakingPerson } from "../domain/scene-person";
import { activeGuideStoryId } from "../domain/tourism";
import { beginTravelEvent, type TravelMode } from "../domain/travel-game";
import { miniGameArtPath } from "../minigames/tag";
import { peekStory, type PeekReach } from "../story/runtime";
import type { StoryFrame } from "../story/frame-reader";
import { preloadMedia, type PreloadSource } from "./preload";
import type { PreloadPriority, PreloadRequest } from "./preload-queue";
import { aheadMedia, type MediaCatalog, type SceneLook } from "./scene-media";

// What the game is about to show, for the background loading (2026-11-13; src/media/preload.ts loads it): the lines ahead
// of the story scene on screen, read on a copy of its saved state (src/story/runtime.ts peekStory); during free time its
// photo cards, and the first lines of the scene the chosen card would open (computed with the game's own rules on a
// copy of the state, never saved); on the title, the first lines of the new journey's arrival. Journey-agnostic: every
// file is named by the content and the rules the screens use.

/** The content's served paths for what a line names (scene-media.ts MediaCatalog), as the screens resolve them. */
export const contentMediaCatalog: MediaCatalog = {
  background(backgroundId) {
    const backdrop = presentation.backgrounds[backgroundId];
    if (!backdrop) return undefined;
    return backdrop.imageAssetId ? tourismAssets.find((asset) => asset.id === backdrop.imageAssetId)?.path : backdrop.imagePath ?? undefined;
  },
  figure: (characterId, emotion, look) => characterPicture(characterId, emotion, { sceneId: look.sceneId, cityId: look.cityId }) ?? undefined,
  personFigure: (frame) => speakingPerson(storyState.people, frame),
  albumImage: (imageId) => getAlbumImage(imageId)?.path,
  termPhoto(termId) {
    const imageId = glossaryTerms.find((term) => term.id === termId)?.imageId;
    return tourismAssets.find((asset) => asset.id === imageId)?.path;
  },
  miniGameArt: (imageId) => miniGameArtPath(tagContext, imageId),
  reactionMark: reactionMarkImage,
};

/** The story scene on screen: its story, where it is (its saved state and the line on screen) and how it dresses its stage. */
export type SceneStory = { storyId: string; storyState: string; frame: StoryFrame; look: SceneLook };

/** The landmark's photo, if it has one: a guide, an encounter or a battle there shows it throughout (SceneLook photo). */
function landmarkPhoto(landmarkId: string | null | undefined): Pick<SceneLook, "photo"> {
  const assetId = landmarks.find((landmark) => landmark.id === landmarkId)?.imageAssetId;
  const path = assetId ? tourismAssets.find((asset) => asset.id === assetId)?.path : undefined;
  return path ? { photo: path } : {};
}

/**
 * The story scene on screen, in GameApp's order of screens (an encounter, an arrival or epilogue, a guide, a battle's talk,
 * a date), or null: none, or one whose story cannot be read (changed content keeps its own screen's message).
 */
export function sceneStoryOnScreen(state: GameState): SceneStory | null {
  try {
    const encounter = state.activeEncounter;
    if (encounter) {
      const definition = getActiveEncounterDefinition(encounter);
      const person = scenePerson(storyState.people, scenes.find((scene) => scene.id === definition.id)?.people);
      return { storyId: encounter.storyId, storyState: encounter.storyState, frame: encounter.frame,
        look: { sceneId: definition.id, cityId: definition.cityId, enemyFigure: person?.characterId ?? "enemy",
          ...landmarkPhoto(definition.landmarkId) } };
    }
    const epilogue = state.activeEpilogue;
    if (epilogue) {
      const storyId = activeEpilogueStoryId(epilogue);
      const person = scenePerson(storyState.people, epilogueScene(epilogue)?.people);
      const cityId = episodes.find((episode) => episode.id === epilogue.episodeId)?.cityId ?? state.currentCityId;
      return storyId ? { storyId, storyState: epilogue.storyState, frame: epilogue.frame,
        look: { sceneId: epilogue.episodeId, cityId, ...(person ? { enemyFigure: person.characterId } : {}) } } : null;
    }
    const tourism = state.activeTourism;
    if (tourism) {
      const storyId = tourism.phase === "guide" ? activeGuideStoryId(tourism) : null;
      const cityId = landmarks.find((landmark) => landmark.id === tourism.landmarkId)?.cityId;
      return storyId && tourism.frame && tourism.storyState ? { storyId, storyState: tourism.storyState, frame: tourism.frame,
        look: { sceneId: tourism.landmarkId, cityId, ...landmarkPhoto(tourism.landmarkId) } } : null;
    }
    const battle = state.activeBattle;
    if (battle) {
      if (battle.phase !== "dialogue" || !battle.frame || !battle.storyState) return null;
      const content = getActiveBattleContent(battle).battle;
      return { storyId: content.storyId, storyState: battle.storyState, frame: battle.frame,
        look: { sceneId: content.id, cityId: content.cityId ?? landmarks.find((landmark) => landmark.id === content.landmarkId)?.cityId,
          enemyFigure: characterForBattle(content.id), ...landmarkPhoto(content.landmarkId) } };
    }
    const date = state.activeDate;
    const definition = date && dates.find((item) => item.id === date.dateId);
    return date && definition ? { storyId: activeDateStoryId(definition, date), storyState: date.storyState, frame: date.frame,
      look: { sceneId: date.dateId, cityId: state.currentCityId } } : null;
  } catch {
    return null;
  }
}

/** How far ahead a scene on screen is read: four lines, and two lines after each of up to four choices. */
const ON_SCREEN_REACH: PeekReach = { lines: 4, choices: 4, choiceLines: 2 };
/** How far a scene not open yet is read (the title's arrival, the chosen card's scene): its first lines only. */
const NOT_YET_REACH: PeekReach = { lines: 2, choices: 0, choiceLines: 0 };

/** The files of the story scene of `state` and of its lines ahead (scene-media.ts aheadMedia), none without one. */
export function sceneRequests(state: GameState, reach: PeekReach = ON_SCREEN_REACH): PreloadRequest[] {
  const scene = sceneStoryOnScreen(state);
  if (!scene) return [];
  const ahead = peekStory(scene.storyId, scene.storyState, scene.frame, state.memories, state.inventory, sceneConditionReader(state), reach);
  return aheadMedia(scene.frame, ahead, scene.look, contentMediaCatalog);
}

/** The same files a step later: what a scene not open yet needs is "soon" at most. */
function later(requests: readonly PreloadRequest[]): PreloadRequest[] {
  const step: Record<PreloadPriority, PreloadPriority> = { next: "soon", soon: "idle", idle: "idle" };
  return requests.map((request) => ({ ...request, priority: step[request.priority] }));
}

/** The pictures of a city's free time at `priority`: its backdrop and every place's photo card (and the hotel's). */
export function freeTimeRequests(cityId: string, priority: PreloadPriority): PreloadRequest[] {
  const backdrop = getCityBackdropPath(cityId);
  const cards = getCityContent(cityId).travel.places.flatMap((place) => {
    const photo = getPlacePhoto(cityId, place.id);
    return photo ? [derivedImagePath(photo, "card")] : [];
  });
  return [...(backdrop ? [backdrop] : []), ...cards].map((key) => ({ kind: "image", key, priority }));
}

/**
 * What the game state on screen is about to need: a story scene's lines ahead (and, quietly, the free time it ends in);
 * free time's photo cards and the heroine as she stands in this city.
 */
export function gameRequests(state: GameState): PreloadRequest[] {
  const scene = sceneRequests(state);
  if (scene.length) return [...scene, ...freeTimeRequests(state.currentCityId, "idle")];
  const heroine = characterPicture("heroine", "neutral", { cityId: state.currentCityId });
  return [...freeTimeRequests(state.currentCityId, "soon"), ...(heroine ? [{ kind: "image" as const, key: heroine, priority: "idle" as const }] : [])];
}

/** The title's: the first lines of the journey's arrival, as a new game would open it (names do not change its files). */
export function titleRequests(journeyId: string): PreloadRequest[] {
  try {
    const created = createGame(undefined, undefined, { journeyId });
    return later(sceneRequests(openOccasion(created, { kind: "arrive" }, created.revision, () => 0), NOT_YET_REACH));
  } catch {
    return [];
  }
}

/** A free-time card's way to go: its event and the mode its swipe up would take. */
export type DestinationWay = { eventId: string; mode: TravelMode };

/**
 * The first lines of the scenes a free-time card would open (its available events, each by its way), computed on copies
 * of the state by the game's own rule (beginTravelEvent), never saved: "soon" for the first line, "idle" after.
 */
export function destinationRequests(state: GameState, ways: readonly DestinationWay[]): PreloadRequest[] {
  return ways.flatMap(({ eventId, mode }) => {
    try {
      const opened = beginTravelEvent(state, eventId, mode, state.revision, () => 0);
      return opened === state ? [] : later(sceneRequests(opened, NOT_YET_REACH));
    } catch {
      return [];
    }
  });
}

/** Runs `task` when the page is idle (soon after at the latest), not in the middle of a screen's work; returns its cancel. */
function whenIdle(task: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(task, { timeout: 600 });
    return () => window.cancelIdleCallback(handle);
  }
  const timer = window.setTimeout(task, 120);
  return () => window.clearTimeout(timer);
}

/** Asks the background loading for `source`'s files once the page is idle (computing them reads the story ahead). */
export function usePreload(source: PreloadSource, requests: () => readonly PreloadRequest[], deps: readonly unknown[]): void {
  useEffect(() => whenIdle(() => preloadMedia(source, requests())), deps);
  useEffect(() => () => preloadMedia(source, []), [source]);
}

/**
 * GameApp's: after each saved change, the files of what the screen is about to show (gameRequests); on the title, the
 * new journey's arrival (titleRequests); none while `paused` (the opening movie streams).
 */
export function usePreloadAhead(game: GameState | null, journeyId: string, paused: boolean): void {
  usePreload("game", () => (paused ? [] : game ? gameRequests(game) : titleRequests(journeyId)), [game, journeyId, paused]);
}

/** Free time's chosen card: the first lines of the scenes it would open (destinationRequests). */
export function usePreloadDestination(game: GameState, ways: readonly DestinationWay[]): void {
  const key = ways.map((way) => `${way.eventId}:${way.mode}`).join(",");
  usePreload("destination", () => destinationRequests(game, ways), [game, key]);
}
