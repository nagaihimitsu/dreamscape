import path from "node:path";
import {
  BGM_DEFAULT, BGM_STOP, journeyMusicPlaySchema, mergedMusicCatalogSchema, mergeMusicPlay, MUSIC_FOLDER, musicPath, RESERVED_TRACK_IDS,
  rootMusicPlaySchema, trackIdOf, type JourneyMusicPlay, type MusicData, type MusicPlay, type RootMusicPlay,
} from "../src/content/music";
import { SOUND_ID, type SoundSource } from "../src/content/sounds";
import { MINI_GAME_TRACKS } from "../src/minigames/host/music";
import { displayPath, parseCatalog, type ContentSources } from "./content-sources";
import type { ContentWarning } from "./content-report";
import { audioTagsOf, registerListedAudio, type ListedAudio, type RegisteredSound } from "./sound-files";

// content:build's background music (2026-11-12; src/content/music.ts): each layer's presentation/music.json against the
// MP3 files of its public/assets/bgm/ (the same checks as the sound effects: sound-files.ts registerListedAudio), the
// lists' `play` (which track plays where), the `# bgm:` tags of the stories, and what the game reads
// (src/content/generated/music.json). Pure checks of the loaded sources (no file is read). Light module (no content
// loading): unit tests use it directly.

export const MUSIC_KIND = "presentation/music.json";

/** The music: presentation/music.json's `tracks`, the files of public/assets/bgm/. */
export const MUSIC_FILES: ListedAudio = {
  kind: MUSIC_KIND, key: "tracks", folder: MUSIC_FOLDER, pathOf: musicPath, idOf: trackIdOf, ja: "曲", jaShort: "曲", en: "track",
};

/** The registered tracks, their sources, and each list's `play`: the shared one (null without a shared list) and each journey's. */
export type MusicRegistry = {
  tracks: RegisteredSound[];
  sources: SoundSource[];
  root: RootMusicPlay | null;
  /** A journey's own `play` (by journey ID; a journey without one is left out). */
  journeys: Map<string, JourneyMusicPlay>;
};

type Entry = Record<string, unknown>;
const isObject = (value: unknown): value is Entry => typeof value === "object" && value !== null && !Array.isArray(value);
const list = (value: unknown): Entry[] => (Array.isArray(value) ? value.filter(isObject) : []);

/** The issues of a zod parse as one line: `play.freeTime.night: …; play.arrival: …`. */
function issuesText(issues: readonly { path: readonly PropertyKey[]; message: string }[]): string {
  return issues.map((issue) => `${["play", ...issue.path.map(String)].join(".")}: ${issue.message}`).join("; ");
}

/** Every track ID a `play` names (`places` included), with where it is written (`play.freeTime.night`, `play.places.<placeId>`). */
export function playTrackIds(play: JourneyMusicPlay): { id: string; key: string }[] {
  return Object.entries(play).flatMap(([key, value]): { id: string; key: string }[] => typeof value === "string" ? [{ id: value, key: `play.${key}` }]
    : isObject(value) ? Object.entries(value).filter((item): item is [string, string] => typeof item[1] === "string")
      .map(([inner, id]) => ({ id, key: `play.${key}.${inner}` })) : []);
}

/**
 * Why the content of the layer `layerId` (`core` for the shared list) cannot play the track `id` (`where` names the tag
 * or key), or null: the ID is not one, or it names neither a shared track (the core layer's) nor one of that journey's
 * own (a journey folder must stay removable on its own; the shared list names shared tracks only). Japanese first,
 * English after.
 */
export function trackUseProblem(id: string, layerId: string, tracks: readonly RegisteredSound[], where: string): string | null {
  if (!SOUND_ID.test(id))
    return `曲の ID が使えません：${where}。ID は英小文字・数字・_ だけです（Invalid track ID: ${id}; a-z, 0-9 and _）。`;
  const track = tracks.find((item) => item.entry.id === id);
  if (track && (track.layer.type === "core" || track.layer.id === layerId)) return null;
  if (track && layerId === "core")
    return `旅行編の曲です：${where} は、旅行編 ${track.layer.id} の曲です。共通の一覧には共通の曲を書いてください` +
      `（Journey track in the shared list: ${id} is a track of ${track.layer.id}）。`;
  return track
    ? `ほかの旅行編の曲です：${where} は、旅行編 ${track.layer.id} の曲です。共通の曲か、この旅行編の曲を書いてください` +
      `（Track of another journey: ${id} is a track of ${track.layer.id}）。`
    : `曲がありません：${where} は、共通の曲の一覧（content/${MUSIC_KIND}）にも、この旅行編の ${MUSIC_KIND} にもありません。` +
      `曲を public/${MUSIC_FOLDER}/<ID>.mp3 に置いて一覧に登録してください（Unknown track: ${id}）。`;
}

/** The place IDs of a journey's cities (`places[].id` of its travel/<city>.json files). */
function journeyPlaceIds(sources: Pick<ContentSources, "cities">, journeyId: string): Set<string> {
  return new Set(sources.cities.filter((city) => city.layer === journeyId)
    .flatMap((city) => list(isObject(city.travel) ? city.travel.places : undefined).map((place) => place.id))
    .filter((id): id is string => typeof id === "string"));
}

const EMPTY = { schemaVersion: 1 as const, sources: [], tracks: [], play: undefined };

/**
 * The tracks every layer registers (core first), checked against the served files like the sound effects
 * (registerListedAudio), and every list's `play`. Throws one error listing every problem (Japanese first, English after):
 * besides the file checks,
 * - a track named `stop` or `default` (the values `# bgm:` gives besides a track);
 * - a shared list without `play` (when any list exists), or with a key missing or wrong, or with `places`;
 * - a journey's `play` with a wrong key, or `places` naming a place its cities do not have;
 * - a play value naming no track, or a track it may not play (the shared list: shared tracks only; a journey: shared
 *   tracks and its own).
 */
export function musicRegistry(sources: Pick<ContentSources, "root" | "layers" | "catalogs" | "publicFiles" | "cities">): MusicRegistry {
  const merged = sources.catalogs[MUSIC_KIND];
  const catalog = merged ? parseCatalog(sources, mergedMusicCatalogSchema, MUSIC_KIND) : EMPTY;
  const show = (file: string) => displayPath(sources.root, file);
  const errors: string[] = [];
  const tracks = registerListedAudio(sources, MUSIC_FILES, { sources: catalog.sources, entries: catalog.tracks },
    merged?.provenance.items.sources ?? [], merged?.provenance.items.tracks ?? [], errors);
  for (const track of tracks)
    if (RESERVED_TRACK_IDS.includes(track.entry.id))
      errors.push(`曲の ID に "${track.entry.id}" は使えません：${show(track.file)}。${BGM_STOP} と ${BGM_DEFAULT} は # bgm: の値です。ファイル名と ID を変えてください` +
        `（Reserved track ID: ${track.entry.id}）。`);

  const plays: Record<string, unknown> = catalog.play ?? {};
  const playFiles: Readonly<Record<string, string>> = merged?.provenance.keys.play ?? {};
  const core = sources.layers.find((layer) => layer.type === "core")!;
  const coreFile = playFiles.core ?? path.join(core.directory, MUSIC_KIND);
  const checkValues = (play: JourneyMusicPlay, layerId: string, file: string) => {
    for (const { id, key } of playTrackIds(play)) {
      const problem = trackUseProblem(id, layerId, tracks, `${show(file)} の ${key} "${id}"`);
      if (problem) errors.push(problem);
    }
  };

  let root: RootMusicPlay | null = null;
  if (merged) {
    const value = plays.core;
    if (value === undefined)
      errors.push(`共通の曲の一覧に play がありません：${show(coreFile)} に、画面ごとのいつもの曲（title・freeTime・night・place・arrival・epilogue・endRoll）を書いてください` +
        "（Missing play in the shared music list）。");
    else if (isObject(value) && Object.hasOwn(value, "places"))
      errors.push(`places は旅行編の一覧にだけ書けます：${show(coreFile)} の play.places。観光地ごとの曲は、その旅行編の ${MUSIC_KIND} に書いてください` +
        "（places in the shared music list）。");
    else {
      const parsed = rootMusicPlaySchema.safeParse(value);
      if (!parsed.success)
        errors.push(`共通の曲の一覧の play が正しくありません：${show(coreFile)}（${issuesText(parsed.error.issues)}）。画面ごとのいつもの曲を、すべて曲の ID で書いてください` +
          "（Invalid play in the shared music list）。");
      else {
        root = parsed.data;
        checkValues(root, "core", coreFile);
      }
    }
  }

  const journeys = new Map<string, JourneyMusicPlay>();
  for (const layer of sources.layers.filter((item) => item.type === "journey")) {
    if (!Object.hasOwn(plays, layer.id)) continue;
    const file = playFiles[layer.id] ?? path.join(layer.directory, MUSIC_KIND);
    const parsed = journeyMusicPlaySchema.safeParse(plays[layer.id]);
    if (!parsed.success) {
      errors.push(`旅行編の曲の一覧の play が正しくありません：${show(file)}（${issuesText(parsed.error.issues)}）。変えたい画面の曲と、観光地ごとの曲（places）を曲の ID で書いてください` +
        "（Invalid play in a journey's music list）。");
      continue;
    }
    const placeIds = journeyPlaceIds(sources, layer.id);
    for (const placeId of Object.keys(parsed.data.places ?? {}))
      if (!placeIds.has(placeId))
        errors.push(`観光地がありません：${show(file)} の play.places "${placeId}" は、旅行編 ${layer.id} の都市の travel/<都市ID>.json の places にありません` +
          `（Unknown place in play.places: ${placeId}）。`);
    checkValues(parsed.data, layer.id, file);
    journeys.set(layer.id, parsed.data);
  }

  if (errors.length) throw new Error(errors.join("\n"));
  return { tracks, sources: catalog.sources, root, journeys };
}

/** The `# bgm:` tags of an Ink source (read statically, like `# se:`). */
export function bgmTagsOf(source: string) {
  return audioTagsOf(source, "bgm");
}

/**
 * Throws at the first `# bgm:` of a story of the layer `storyLayer` that gives neither `stop`, `default` nor a track it
 * may play (trackUseProblem), and at a line with two `# bgm:`.
 */
export function checkBgmTags(source: string, storyLayer: string, tracks: readonly RegisteredSound[]): void {
  const lines = new Set<number>();
  for (const { id, line, knot } of bgmTagsOf(source)) {
    const where = `${knot ? `knot ${knot} の` : ""}${line}行目の # bgm: ${id}`;
    if (lines.has(line))
      throw new Error(`1つの行に # bgm: が2つあります：${where}。1つにしてください（Duplicate bgm tag on line ${line}）。`);
    lines.add(line);
    if (id === BGM_STOP || id === BGM_DEFAULT) continue;
    const problem = trackUseProblem(id, storyLayer, tracks, where);
    if (problem) throw new Error(problem);
  }
}

/**
 * What the game reads (generated/music.json): every track's volume (1 when its entry has none) and credit, the shared
 * `play` and each journey's merged `play` (the shared one when the journey has none). Without a shared `play` nothing
 * plays (`root` null, no journey).
 */
export function musicDataOf(registry: MusicRegistry, journeyIds: readonly string[]): MusicData {
  const root = registry.root;
  return {
    schemaVersion: 1,
    sources: registry.sources,
    tracks: registry.tracks.map(({ entry }) => ({ id: entry.id, useJa: entry.useJa, sources: entry.sources, volume: entry.volume ?? 1 })),
    root: root && mergeMusicPlay(root, undefined),
    journeys: root ? Object.fromEntries(journeyIds.map((id): [string, MusicPlay] => [id, mergeMusicPlay(root, registry.journeys.get(id))])) : {},
  };
}

/** The music notes that do not stop the build: a track that no `play` value, no line (`# bgm:`) and no mini-game (its `music`) plays. */
export function musicWarnings(sources: Pick<ContentSources, "root" | "storyFiles">, registry: MusicRegistry): ContentWarning[] {
  const played = new Set([
    ...sources.storyFiles.flatMap((story) => bgmTagsOf(story.source).map((tag) => tag.id)),
    ...(registry.root ? playTrackIds(registry.root).map((item) => item.id) : []),
    ...[...registry.journeys.values()].flatMap((play) => playTrackIds(play).map((item) => item.id)),
    // The mini-games' own tracks (docs/13 2.11): a game's definition plays them while it is played.
    ...Object.values(MINI_GAME_TRACKS),
  ]);
  return registry.tracks.filter((track) => !played.has(track.entry.id))
    .map((track): ContentWarning => ({ kind: "music", message: `Unused track: ${displayPath(sources.root, track.file)} registers ` +
      `"${track.entry.id}", but no play value (${MUSIC_KIND}) or line (# bgm:) plays it` }));
}
