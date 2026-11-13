import path from "node:path";
import {
  AMBIENCE_DEFAULT, AMBIENCE_FOLDER, AMBIENCE_STOP, ambienceIdOf, ambiencePath, ambiencePlaySchema, mergeAmbiencePlay,
  mergedAmbienceCatalogSchema, type AmbienceData, type AmbiencePlay,
} from "../src/content/ambience";
import { RESERVED_TRACK_IDS } from "../src/content/music";
import { SOUND_ID, type SoundSource } from "../src/content/sounds";
import { displayPath, parseCatalog, type ContentSources } from "./content-sources";
import type { ContentWarning } from "./content-report";
import { audioTagsOf, registerListedAudio, type ListedAudio, type RegisteredSound } from "./sound-files";

// content:build's ambience (環境音, 2026-11-13; src/content/ambience.ts): each layer's presentation/ambience.json against
// the MP3 files of its public/assets/ambience/ (the same checks as the sound effects and the music: sound-files.ts
// registerListedAudio), the journeys' `play.places`, the `# ambience:` tags of the stories, and what the game reads
// (src/content/generated/ambience.json). Pure checks of the loaded sources (no file is read). Light module (no content
// loading): unit tests use it directly.

export const AMBIENCE_KIND = "presentation/ambience.json";

/** The ambience: presentation/ambience.json's `tracks`, the files of public/assets/ambience/. */
export const AMBIENCE_FILES: ListedAudio = {
  kind: AMBIENCE_KIND, key: "tracks", folder: AMBIENCE_FOLDER, pathOf: ambiencePath, idOf: ambienceIdOf, ja: "環境音", jaShort: "環境音",
  en: "ambience track",
};

/** The registered tracks, their sources, and each list's `play`: the shared one (none without one) and each journey's. */
export type AmbienceRegistry = {
  tracks: RegisteredSound[];
  sources: SoundSource[];
  root: AmbiencePlay | undefined;
  /** A journey's own `play` (by journey ID; a journey without one is left out). */
  journeys: Map<string, AmbiencePlay>;
};

type Entry = Record<string, unknown>;
const isObject = (value: unknown): value is Entry => typeof value === "object" && value !== null && !Array.isArray(value);
const list = (value: unknown): Entry[] => (Array.isArray(value) ? value.filter(isObject) : []);

/** The issues of a zod parse as one line: `play.places.x: …; play.other: …`. */
function issuesText(issues: readonly { path: readonly PropertyKey[]; message: string }[]): string {
  return issues.map((issue) => `${["play", ...issue.path.map(String)].join(".")}: ${issue.message}`).join("; ");
}

/**
 * Why the content of the layer `layerId` cannot play the ambience track `id` (`where` names the tag or key), or null:
 * the ID is not one, or it names neither a shared track (the core layer's) nor one of that journey's own (a journey
 * folder must stay removable on its own). Japanese first, English after.
 */
export function ambienceUseProblem(id: string, layerId: string, tracks: readonly RegisteredSound[], where: string): string | null {
  if (!SOUND_ID.test(id))
    return `環境音の ID が使えません：${where}。ID は英小文字・数字・_ だけです（Invalid ambience track ID: ${id}; a-z, 0-9 and _）。`;
  const track = tracks.find((item) => item.entry.id === id);
  if (track && (track.layer.type === "core" || track.layer.id === layerId)) return null;
  return track
    ? `ほかの旅行編の環境音です：${where} は、旅行編 ${track.layer.id} の環境音です。共通の環境音か、この旅行編の環境音を書いてください` +
      `（Ambience track of another journey: ${id} is a track of ${track.layer.id}）。`
    : `環境音がありません：${where} は、共通の環境音の一覧（content/${AMBIENCE_KIND}）にも、この旅行編の ${AMBIENCE_KIND} にもありません。` +
      `音を public/${AMBIENCE_FOLDER}/<ID>.mp3 に置いて一覧に登録してください（Unknown ambience track: ${id}）。`;
}

/** The place IDs of a journey's cities (`places[].id` of its travel/<city>.json files). */
function journeyPlaceIds(sources: Pick<ContentSources, "cities">, journeyId: string): Set<string> {
  return new Set(sources.cities.filter((city) => city.layer === journeyId)
    .flatMap((city) => list(isObject(city.travel) ? city.travel.places : undefined).map((place) => place.id))
    .filter((id): id is string => typeof id === "string"));
}

const EMPTY = { schemaVersion: 1 as const, sources: [], tracks: [], play: undefined };

/**
 * The ambience tracks every layer registers (core first), checked against the served files like the sound effects
 * (registerListedAudio), and every list's `play`. Throws one error listing every problem (Japanese first, English
 * after): besides the file checks,
 * - a track named `stop` or `default` (the values `# ambience:` gives besides a track);
 * - a shared list with `play.places` (the places belong to a journey), or a `play` with another key;
 * - a journey's `play.places` naming a place its cities do not have, or a track it may not play (shared tracks and
 *   its own).
 */
export function ambienceRegistry(sources: Pick<ContentSources, "root" | "layers" | "catalogs" | "publicFiles" | "cities">): AmbienceRegistry {
  const merged = sources.catalogs[AMBIENCE_KIND];
  const catalog = merged ? parseCatalog(sources, mergedAmbienceCatalogSchema, AMBIENCE_KIND) : EMPTY;
  const show = (file: string) => displayPath(sources.root, file);
  const errors: string[] = [];
  const tracks = registerListedAudio(sources, AMBIENCE_FILES, { sources: catalog.sources, entries: catalog.tracks },
    merged?.provenance.items.sources ?? [], merged?.provenance.items.tracks ?? [], errors);
  for (const track of tracks)
    if (RESERVED_TRACK_IDS.includes(track.entry.id))
      errors.push(`環境音の ID に "${track.entry.id}" は使えません：${show(track.file)}。${AMBIENCE_STOP} と ${AMBIENCE_DEFAULT} は # ambience: の値です。` +
        `ファイル名と ID を変えてください（Reserved ambience track ID: ${track.entry.id}）。`);

  const plays: Record<string, unknown> = catalog.play ?? {};
  const playFiles: Readonly<Record<string, string>> = merged?.provenance.keys.play ?? {};
  const core = sources.layers.find((layer) => layer.type === "core")!;
  let root: AmbiencePlay | undefined;
  if (Object.hasOwn(plays, "core")) {
    const file = playFiles.core ?? path.join(core.directory, AMBIENCE_KIND);
    const value = plays.core;
    const parsed = ambiencePlaySchema.safeParse(value);
    if (isObject(value) && Object.hasOwn(value, "places"))
      errors.push(`places は旅行編の一覧にだけ書けます：${show(file)} の play.places。地点ごとの環境音は、その旅行編の ${AMBIENCE_KIND} に書いてください` +
        "（places in the shared ambience list）。");
    else if (!parsed.success)
      errors.push(`共通の環境音の一覧の play が正しくありません：${show(file)}（${issuesText(parsed.error.issues)}）。共通の一覧には play を書きません` +
        "（Invalid play in the shared ambience list）。");
    else root = parsed.data;
  }

  const journeys = new Map<string, AmbiencePlay>();
  for (const layer of sources.layers.filter((item) => item.type === "journey")) {
    if (!Object.hasOwn(plays, layer.id)) continue;
    const file = playFiles[layer.id] ?? path.join(layer.directory, AMBIENCE_KIND);
    const parsed = ambiencePlaySchema.safeParse(plays[layer.id]);
    if (!parsed.success) {
      errors.push(`旅行編の環境音の一覧の play が正しくありません：${show(file)}（${issuesText(parsed.error.issues)}）。地点ごとの環境音（places）を、地点 ID と環境音の ID で書いてください` +
        "（Invalid play in a journey's ambience list）。");
      continue;
    }
    const placeIds = journeyPlaceIds(sources, layer.id);
    for (const [placeId, id] of Object.entries(parsed.data.places ?? {})) {
      if (!placeIds.has(placeId))
        errors.push(`地点がありません：${show(file)} の play.places "${placeId}" は、旅行編 ${layer.id} の都市の travel/<都市ID>.json の places にありません` +
          `（Unknown place in play.places: ${placeId}）。`);
      const problem = ambienceUseProblem(id, layer.id, tracks, `${show(file)} の play.places.${placeId} "${id}"`);
      if (problem) errors.push(problem);
    }
    journeys.set(layer.id, parsed.data);
  }

  if (errors.length) throw new Error(errors.join("\n"));
  return { tracks, sources: catalog.sources, root, journeys };
}

/** The `# ambience:` tags of an Ink source (read statically, like `# bgm:`). */
export function ambienceTagsOf(source: string) {
  return audioTagsOf(source, "ambience");
}

/**
 * Throws at the first `# ambience:` of a story of the layer `storyLayer` that gives neither `stop`, `default` nor a
 * track it may play (ambienceUseProblem), and at a line with two `# ambience:`.
 */
export function checkAmbienceTags(source: string, storyLayer: string, tracks: readonly RegisteredSound[]): void {
  const lines = new Set<number>();
  for (const { id, line, knot } of ambienceTagsOf(source)) {
    const where = `${knot ? `knot ${knot} の` : ""}${line}行目の # ambience: ${id}`;
    if (lines.has(line))
      throw new Error(`1つの行に # ambience: が2つあります：${where}。1つにしてください（Duplicate ambience tag on line ${line}）。`);
    lines.add(line);
    if (id === AMBIENCE_STOP || id === AMBIENCE_DEFAULT) continue;
    const problem = ambienceUseProblem(id, storyLayer, tracks, where);
    if (problem) throw new Error(problem);
  }
}

/**
 * What the game reads (generated/ambience.json): every track's volume (1 when its entry has none) and credit, and each
 * journey's merged `play` (the shared one with the journey's over it).
 */
export function ambienceDataOf(registry: AmbienceRegistry, journeyIds: readonly string[]): AmbienceData {
  return {
    schemaVersion: 1,
    sources: registry.sources,
    tracks: registry.tracks.map(({ entry }) => ({ id: entry.id, useJa: entry.useJa, sources: entry.sources, volume: entry.volume ?? 1 })),
    journeys: Object.fromEntries(journeyIds.map((id) => [id, mergeAmbiencePlay(registry.root, registry.journeys.get(id))])),
  };
}

/** The ambience notes that do not stop the build: a journey's own track that no `play.places` value and no line (`# ambience:`) plays. */
export function ambienceWarnings(sources: Pick<ContentSources, "root" | "storyFiles">, registry: AmbienceRegistry): ContentWarning[] {
  const played = new Set([
    ...sources.storyFiles.flatMap((story) => ambienceTagsOf(story.source).map((tag) => tag.id)),
    ...[...registry.journeys.values()].flatMap((play) => Object.values(play.places ?? {})),
  ]);
  return registry.tracks.filter((track) => track.layer.type === "journey" && !played.has(track.entry.id))
    .map((track): ContentWarning => ({ kind: "ambience", message: `Unused ambience track: ${displayPath(sources.root, track.file)} registers ` +
      `"${track.entry.id}", but no play.places value (${AMBIENCE_KIND}) or line (# ambience:) of ${track.layer.id} plays it` }));
}
