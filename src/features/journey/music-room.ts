import { readLineId } from "../../components/read-skip";
import type { MusicPlay } from "../../content/music";
import type { SceneAudio } from "../../content/scene-audio";
import type { SceneAt, SceneEntry } from "../../content/scene-schemas";
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
export type RoomScene = Pick<SceneEntry, "id" | "kind" | "main" | "at" | "story" | "knots" | "cityId" | "title">;
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
/** The voiced lines of one completed scene, or of the untitled scenes of one moment, under its name. */
export type RoomVoiceGroup = { key: string; labelJa: string; voices: RoomVoice[] };
/** Where the room's voice list puts a scene: the group's key and its name. */
export type SceneGroup = { key: string; labelJa: string };

/** The names the room gives the content a scene refers to (each falls back to the ID). */
export type SceneNames = {
  city: (cityId: string) => string;
  landmark: (landmarkId: string) => string;
  place: (cityId: string, placeId: string) => string;
  battle: (battleId: string) => string;
  date: (dateId: string) => string;
  tour: (tourId: string) => string;
};

/** Where and when a moment of `# at:` happens, in words (an untitled scene's group name). */
function momentLabelJa(at: SceneAt, cityId: string, names: SceneNames): string {
  if ("visit" in at) return at.visit === "any" ? `${names.city(cityId)}の観光地で` : `${names.landmark(at.visit)}で`;
  if ("place" in at) return `${names.place(cityId, at.place)}で`;
  if ("date" in at) return `デート「${names.date(at.date)}」で`;
  if ("finale" in at) return `${names.city(at.finale)}のフィナーレで`;
  if ("epilogue" in at) return `${names.city(at.epilogue)}のエピローグで`;
  if ("depart" in at) return `${names.city(at.depart)}を発つ日`;
  if ("arrive" in at) return `${names.city(at.arrive)}に着いた日`;
  if ("hotel" in at) return `${names.city(cityId)}の宿で`;
  if ("trip" in at) return `${names.city(cityId)}の移動中に`;
  if ("ticket" in at) return `${names.place(cityId, at.ticket)}の窓口で`;
  return `${names.tour(at.tour)}で`;
}

/**
 * Where the room's voice list puts a completed scene (2026-11-13 user decision): a main part on its own, named by what it
 * is (a guide, a battle's or a date's title, a city's epilogue or arrival); another scene with a title on its own under
 * it; an untitled scene (a talk at the hotel, before a departure, a tour leg …) together with the untitled scenes of the
 * same moment, named by where and when they happen (its first `# at:`: 「デリーの宿で」, 「デリーを発つ日」), from the
 * content alone. The scene table titles a main part by its place or city only, so that title is not used for one.
 */
export function sceneGroup(scene: Pick<RoomScene, "id" | "main" | "at" | "cityId" | "title">, names: SceneNames): SceneGroup {
  const main = scene.main;
  if (main) {
    const labelJa = "guide" in main ? `${names.landmark(main.guide)}の案内`
      : "battle" in main ? names.battle(main.battle)
      : "date" in main ? names.date(main.date)
      : "epilogue" in main ? `${names.city(main.epilogue)}のエピローグ`
      : `${names.city(main.arrival)}に到着`;
    return { key: scene.id, labelJa };
  }
  if (scene.title) return { key: scene.id, labelJa: scene.title };
  const at = scene.at[0];
  // The name says the city and the place or moment, so the scenes it names together are one group (a tour's legs and steps too).
  const labelJa = at ? momentLabelJa(at, scene.cityId, names) : `${names.city(scene.cityId)}で`;
  return { key: `at:${labelJa}`, labelJa };
}

/** How many places or scenes a track's name lists before 「など」. */
export const TRACK_LABEL_USES = 3;

/**
 * The tracks heard: each visited place's own track (else the journey's usual place track), in the order of
 * `visitedPlaceIds`, then the `# bgm:` tracks of the completed scenes in their order, each once; only tracks the build
 * has (`labelOf` knows them). A place's track (one the journey's music plays at a place) is named by the visited places
 * that play it (`placeName`; its words in the credits list every place, later cities' too: 2026-11-13 user decision),
 * else by the completed scenes that play it (`sceneLabel`), each name once, the first TRACK_LABEL_USES and 「など」 after
 * more. Another track keeps its words (`labelOf`), which say the kind of scene it is for.
 */
export function heardTracks<S extends RoomScene>({ play, visitedPlaceIds, scenes, audio, labelOf, placeName, sceneLabel }: {
  play: MusicPlay | null;
  visitedPlaceIds: readonly string[];
  scenes: readonly S[];
  audio: SceneAudio;
  labelOf: (trackId: string) => string | undefined;
  placeName: (placeId: string) => string;
  sceneLabel: (scene: S) => string;
}): RoomTrack[] {
  // Where each track was heard: at visited places, in completed scenes; in the order first heard.
  const places = new Map<string, string[]>();
  const inScenes = new Map<string, string[]>();
  const order: string[] = [];
  const add = (uses: Map<string, string[]>, trackId: string, where: string) => {
    if (!order.includes(trackId)) order.push(trackId);
    const names = uses.get(trackId) ?? [];
    if (!names.includes(where)) names.push(where);
    uses.set(trackId, names);
  };
  if (play) for (const placeId of visitedPlaceIds) add(places, Object.hasOwn(play.places, placeId) ? play.places[placeId] : play.place, placeName(placeId));
  for (const scene of scenes)
    for (const address of sceneAddresses(scene))
      for (const trackId of audio.stories[address]?.bgm ?? []) add(inScenes, trackId, sceneLabel(scene));
  const placeTracks = new Set(play ? [play.place, ...Object.values(play.places)] : []);
  const listed = (names: readonly string[]) => `${names.slice(0, TRACK_LABEL_USES).join("、")}${names.length > TRACK_LABEL_USES ? "など" : ""}`;
  const tracks = order.flatMap((id) => {
    const words = labelOf(id);
    if (words === undefined) return [];
    return [{ id, labelJa: placeTracks.has(id) ? listed(places.get(id) ?? inScenes.get(id) ?? []) : words }];
  });
  // Two tracks heard in the same scenes only would read alike: 「（その1）」「（その2）」 tell them apart.
  const count = (labelJa: string) => tracks.filter((track) => track.labelJa === labelJa).length;
  return tracks.map((track, index) => count(track.labelJa) < 2 ? track
    : { ...track, labelJa: `${track.labelJa}（その${tracks.slice(0, index + 1).filter((other) => other.labelJa === track.labelJa).length}）` });
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
 * {heroine_name}, as the story does; `group` puts each scene in its group (sceneGroup): the scenes of one group share it,
 * where its first scene stands. A voiced line whose text has Ink's own logic (a `{…}` other than the names, glue) shows
 * other words than written and is not found (no voiced line has any today).
 */
export function heardVoices<S extends RoomScene>({ scenes, audio, names, group, isRead }: {
  scenes: readonly S[];
  audio: SceneAudio;
  names: (text: string) => string;
  group: (scene: S) => SceneGroup;
  isRead: (lineId: string) => boolean;
}): RoomVoiceGroup[] {
  const seen = new Set<string>();
  const groups = new Map<string, RoomVoiceGroup>();
  for (const scene of scenes) {
    const key = readStoryKey(scene);
    const voices: RoomVoice[] = [];
    for (const address of sceneAddresses(scene))
      for (const voice of audio.stories[address]?.voices ?? []) {
        const textJa = names(voice.textJa);
        if (seen.has(voice.id) || !isRead(readLineId(key, textJa))) continue;
        seen.add(voice.id);
        voices.push({ id: voice.id, textJa });
      }
    if (!voices.length) continue;
    const { key: groupKey, labelJa } = group(scene);
    const shared = groups.get(groupKey);
    if (shared) shared.voices.push(...voices);
    else groups.set(groupKey, { key: groupKey, labelJa, voices });
  }
  return [...groups.values()];
}
