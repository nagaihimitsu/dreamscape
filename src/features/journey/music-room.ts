import { readLineId } from "../../components/read-skip";
import type { MusicPlay } from "../../content/music";
import type { SceneAudio } from "../../content/scene-audio";
import type { SceneEntry } from "../../content/scene-schemas";
import { knotAddress } from "../../content/story-address";
import type { GameState } from "../../domain/game";

// 旅の音楽室 (2026-11-13 user decision): the tracks and the heroine's voiced lines the player has already heard, derived
// from what the game and this device keep (no new saved data): the tracks of the places visited and the `# bgm:` of the
// scenes completed, and, of those scenes' `# voice:` lines (content:build's index, scene-audio.json), only the ones this
// device has read (read-skip's record, src/components/read-skip.ts), so the branch not taken is never shown. It opens once
// the player has cleared a city. Pure: MusicRoom.tsx gives it the content and plays what is chosen through the game's own
// players. Nothing here reads a relationship value.

/** The room opens once the player has cleared their first city. */
export const musicRoomOpen = (game: Pick<GameState, "completedCityIds">): boolean => game.completedCityIds.length > 0;

/** A scene as the room reads it (the scene table's entry). */
export type RoomScene = Pick<SceneEntry, "id" | "kind" | "main" | "at" | "story" | "knots">;
/** The parts of the game the room reads. */
export type RoomGame = Pick<GameState, "seenEncounterIds" | "completedTourIds" | "completedGuideIds" | "battleRecords" | "playedDateIds" |
  "viewedEpilogueCityIds" | "activeEpilogue" | "currentCityId" | "completedCityIds">;

/**
 * Whether the player has completed `scene`: an inserted scene seen to its end (any choice), a guide read, a battle
 * played to its result, a date played, an epilogue read, a tour's leg of a finished tour, a city's arrival once the
 * party has reached the city (`reached`) and is past it.
 */
export function sceneCompleted(scene: RoomScene, game: RoomGame, reached: (cityId: string) => boolean): boolean {
  if (scene.kind === "talk" || scene.kind === "encounter") return game.seenEncounterIds.includes(scene.id);
  if (scene.kind === "tour_leg") return scene.at.some((at) => "tour" in at && game.completedTourIds.includes(at.tour));
  const main = scene.main;
  if (!main) return false;
  if ("guide" in main) return game.completedGuideIds.includes(main.guide);
  if ("battle" in main) return game.battleRecords.some((record) => record.battleId === main.battle);
  if ("date" in main) return game.playedDateIds.includes(main.date);
  if ("epilogue" in main) return game.viewedEpilogueCityIds.includes(main.epilogue);
  return reached(main.arrival) && !(game.activeEpilogue?.kind === "arrival" && game.currentCityId === main.arrival);
}

/** The story addresses a scene's lines come from: its knot and the knots it calls (a place file), or its one-scene file. */
export function sceneAddresses(scene: Pick<RoomScene, "story" | "knots">): string[] {
  const { storyId, knot } = scene.story;
  if (knot === undefined) return [storyId];
  return [...new Set([knot, ...scene.knots])].map((name) => `${storyId}.${name}`);
}

/** A track of the room: its ID and what it is for (the credits' words). */
export type RoomTrack = { id: string; labelJa: string };
/** A voiced line of the room: its recording and its text (the names filled in). */
export type RoomVoice = { id: string; textJa: string };
/** The voiced lines of one completed scene, under its name. */
export type RoomVoiceGroup = { sceneId: string; labelJa: string; voices: RoomVoice[] };

/**
 * The tracks heard: each visited place's own track (else the journey's usual place track), in the order of
 * `visitedPlaceIds`, then the `# bgm:` tracks of the completed scenes in their order, each once; only tracks the build
 * has (`labelOf` knows them).
 */
export function heardTracks({ play, visitedPlaceIds, scenes, audio, labelOf }: {
  play: MusicPlay | null;
  visitedPlaceIds: readonly string[];
  scenes: readonly RoomScene[];
  audio: SceneAudio;
  labelOf: (trackId: string) => string | undefined;
}): RoomTrack[] {
  const ids: string[] = [];
  if (play) for (const placeId of visitedPlaceIds) ids.push(Object.hasOwn(play.places, placeId) ? play.places[placeId] : play.place);
  for (const scene of scenes)
    for (const address of sceneAddresses(scene)) ids.push(...(audio.stories[address]?.bgm ?? []));
  return [...new Set(ids)].flatMap((id) => {
    const labelJa = labelOf(id);
    return labelJa ? [{ id, labelJa }] : [];
  });
}

/**
 * The story a scene's lines are read under in read-skip's record (readLineId's first part): the one its screen gives
 * them, the lines of the knots it calls included. A date's ID (RomanceScene), a battle's ID (BattleScreen), an inserted
 * scene's ID (EncounterScreen); else its story address: a guide (TourismScreen: the landmark's guideStoryId), an
 * epilogue, an arrival, a tour's leg (EpilogueScreen: activeEpilogueStoryId).
 */
export function readStoryKey(scene: Pick<RoomScene, "id" | "kind" | "main" | "story">): string {
  if (scene.kind === "talk" || scene.kind === "encounter") return scene.id;
  const main = scene.main;
  if (main && "date" in main) return main.date;
  if (main && "battle" in main) return main.battle;
  const { storyId, knot } = scene.story;
  return knot === undefined ? storyId : knotAddress(storyId, knot);
}

/**
 * The voiced lines heard, by completed scene (in `scenes`' order; a scene without one is left out), each line once in
 * the whole room: only the lines this device has read (`isRead`, read-skip's record: the line's story key and its text
 * as shown, the names filled in), so a branch not taken stays unheard. `names` fills in {player_name} and
 * {heroine_name}, as the story does; `sceneLabel` names each scene. A voiced line whose text has Ink's own logic (a
 * `{…}` other than the names, glue) shows other words than written and is not found (no voiced line has any today).
 */
export function heardVoices<S extends RoomScene>({ scenes, audio, names, sceneLabel, isRead }: {
  scenes: readonly S[];
  audio: SceneAudio;
  names: (text: string) => string;
  sceneLabel: (scene: S) => string;
  isRead: (lineId: string) => boolean;
}): RoomVoiceGroup[] {
  const seen = new Set<string>();
  return scenes.flatMap((scene) => {
    const key = readStoryKey(scene);
    const voices: RoomVoice[] = [];
    for (const address of sceneAddresses(scene))
      for (const voice of audio.stories[address]?.voices ?? []) {
        const textJa = names(voice.textJa);
        if (seen.has(voice.id) || !isRead(readLineId(key, textJa))) continue;
        seen.add(voice.id);
        voices.push({ id: voice.id, textJa });
      }
    return voices.length ? [{ sceneId: scene.id, labelJa: sceneLabel(scene), voices }] : [];
  });
}
