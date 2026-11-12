import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  SOUND_FOLDER, SOUND_ID, SYSTEM_SOUND_IDS, soundCatalogSchema, soundIdOf, soundPath, type SoundCatalog, type SoundEntry, type SoundSource,
} from "../src/content/sounds";
import { displayPath, parseCatalog, type ContentLayer, type ContentSources } from "./content-sources";
import type { ContentWarning } from "./content-report";
import { layerOfFile, servingLayer } from "./image-rights";
import { withoutComments } from "./place-files";

// content:build's sound effects (2026-11-12; src/content/sounds.ts): each layer's presentation/sounds.json against the
// MP3 files of its public/assets/se/, the `# se:` tags of the stories and the `se` of the journeys' transport modes, and
// the volumes the game reads (src/content/generated/sound-volumes.json). Pure checks of the loaded sources (no file is
// read). Light module (no content loading): unit tests use it directly.

export const SOUNDS_KIND = "presentation/sounds.json";

/** A registered sound: its entry, the layer whose public/ folder serves it, and the list (sounds.json) that registers it. */
export type RegisteredSound = { entry: SoundEntry; layer: ContentLayer; file: string };

/** A layer's sound folder as messages show it (`public/assets/se`, `content/journeys/<journeyId>/public/assets/se`). */
export function soundFolderPath(sources: Pick<ContentSources, "root">, layer: ContentLayer): string {
  const publicFolder = layer.type === "core" ? path.join(sources.root, "public") : path.join(layer.directory, "public");
  return displayPath(sources.root, path.join(publicFolder, ...SOUND_FOLDER.split("/")));
}

const EMPTY: SoundCatalog = { schemaVersion: 1, sources: [], sounds: [] };

/**
 * The sounds every layer registers (core first), checked against the served files. Throws one error listing every
 * problem (Japanese first, English after):
 * - a sound whose `<ID>.mp3` its layer's public/assets/se/ does not serve;
 * - a file in a public/assets/se/ that its layer's list does not register as a sound (or that is not `<ID>.mp3`);
 * - a sound ID registered twice (in one list or in two layers: an ID names one file in the whole build);
 * - a sound naming a source its own list does not have;
 * - a source listed twice in one list, or under one ID with other details in another layer's list (the credits list
 *   shows one source a line);
 * - a source of any licence but `own` without its page (`url`) or its author.
 */
export function soundRegistry(sources: Pick<ContentSources, "root" | "layers" | "catalogs" | "publicFiles">): RegisteredSound[] {
  const merged = sources.catalogs[SOUNDS_KIND];
  const catalog = merged ? parseCatalog(sources, soundCatalogSchema, SOUNDS_KIND) : EMPTY;
  const sourceFiles = merged?.provenance.items.sources ?? [];
  const soundFiles = merged?.provenance.items.sounds ?? [];
  const show = (file: string) => displayPath(sources.root, file);
  const errors: string[] = [];

  const listSources = new Map<string, Map<string, SoundSource>>();
  const firstSource = new Map<string, { source: SoundSource; file: string }>();
  catalog.sources.forEach((source, index) => {
    const file = sourceFiles[index];
    const own = listSources.get(file) ?? new Map<string, SoundSource>();
    listSources.set(file, own);
    if (own.has(source.id))
      errors.push(`効果音の出典が2回あります：${show(file)} の sources に "${source.id}" が2つあります。1つにまとめてください` +
        `（Duplicate sound source: ${source.id}）。`);
    own.set(source.id, source);
    const first = firstSource.get(source.id);
    if (!first) firstSource.set(source.id, { source, file });
    else if (first.file !== file && !isDeepStrictEqual(first.source, source))
      errors.push(`同じ ID の出典の中身が違います：${show(first.file)} と ${show(file)} の "${source.id}"。同じ作品なら同じ内容に、別の作品なら別の ID にしてください` +
        `（Sound source ${source.id} differs between lists）。`);
    if (source.license !== "own" && (!source.url || !source.author))
      errors.push(`効果音の出典に作品のページか作者がありません：${show(file)} の "${source.id}"（${source.license}）。自作（own）でない音は url と author を書いてください` +
        `（Sound source without url or author: ${source.id}）。`);
  });

  const sounds: RegisteredSound[] = [];
  const registeredBy = new Map<string, string>();
  catalog.sounds.forEach((entry, index) => {
    const file = soundFiles[index];
    const layer = layerOfFile(sources.layers, file);
    const previous = registeredBy.get(entry.id);
    if (previous) {
      errors.push(`同じ ID の効果音が2つあります：${show(previous)} と ${show(file)} の "${entry.id}"。ID は音のファイル名で、すべての旅行編で1つだけにします` +
        `（Duplicate sound ID: ${entry.id}）。`);
      return;
    }
    registeredBy.set(entry.id, file);
    for (const sourceId of entry.sources)
      if (!listSources.get(file)?.has(sourceId))
        errors.push(`効果音の出典がありません：${show(file)} の音 "${entry.id}" の出典 "${sourceId}" が、同じファイルの sources にありません` +
          `（Unknown sound source: ${entry.id}/${sourceId}）。`);
    const served = sources.publicFiles.get(soundPath(entry.id));
    if (!served || servingLayer(sources, served) !== layer)
      errors.push(`効果音のファイルがありません：${show(file)} の "${entry.id}" の ${entry.id}.mp3 が ${soundFolderPath(sources, layer)}/ にありません` +
        `（Missing sound file: ${soundPath(entry.id)} is not served by its layer）。`);
    sounds.push({ entry, layer, file });
  });

  for (const [assetPath, file] of sources.publicFiles) {
    if (!assetPath.startsWith(`${SOUND_FOLDER}/`)) continue;
    const layer = servingLayer(sources, file);
    const id = soundIdOf(assetPath);
    if (id !== undefined && sounds.some((sound) => sound.entry.id === id && sound.layer === layer)) continue;
    errors.push(id === undefined
      ? `効果音のファイル名が使えません：${show(file)}。音は ${soundFolderPath(sources, layer)}/ の直下に「ID.mp3」の名前で置きます（ID は英小文字・数字・_ だけ）` +
        `（Invalid sound file: ${assetPath}; name it ${SOUND_FOLDER}/<ID>.mp3）。`
      : `一覧にない効果音のファイルです：${show(file)}。${show(path.join(layer.directory, SOUNDS_KIND))} の sounds に、出典と一緒に登録してください` +
        `（Unlisted sound file: ${assetPath}）。`);
  }

  if (errors.length) throw new Error(errors.join("\n"));
  return sounds;
}

/** Every registered sound's volume (1 when its entry has none), for the game (generated/sound-volumes.json). */
export function soundVolumesOf(sounds: readonly RegisteredSound[]): Record<string, number> {
  return Object.fromEntries(sounds.map((sound) => [sound.entry.id, sound.entry.volume ?? 1]));
}

/**
 * Why the content of the layer `layerId` cannot play the sound `id` (`where` names the tag or field), or null: the ID is
 * not one, or it names neither a shared sound (the core layer's) nor one of that journey's own (a journey folder must
 * stay removable on its own). Japanese first, English after.
 */
export function soundUseProblem(id: string, layerId: string, sounds: readonly RegisteredSound[], where: string): string | null {
  if (!SOUND_ID.test(id))
    return `効果音の ID が使えません：${where}。ID は英小文字・数字・_ だけです（Invalid sound ID: ${id}; a-z, 0-9 and _）。`;
  const sound = sounds.find((item) => item.entry.id === id);
  if (sound && (sound.layer.type === "core" || sound.layer.id === layerId)) return null;
  return sound
    ? `ほかの旅行編の効果音です：${where} は、旅行編 ${sound.layer.id} の音です。共通の音か、この旅行編の音を書いてください` +
      `（Sound of another journey: ${id} is a sound of ${sound.layer.id}）。`
    : `効果音がありません：${where} は、共通の音の一覧（content/presentation/sounds.json）にも、この旅行編の presentation/sounds.json にもありません。` +
      `音を public/assets/se/<ID>.mp3 に置いて一覧に登録してください（Unknown sound: ${id}）。`;
}

const KNOT_LINE = /^\s*={2,}\s*(?:function\s+)?([A-Za-z_][A-Za-z0-9_]*)/u;
const SE_TAG = /#\s*se\s*:([^#]*)/gu;

/** A `# se:` of an Ink source: the ID it names (as written, trimmed), its line (from 1) and the knot it is in. */
export type SoundTag = { id: string; line: number; knot?: string };

/** The `# se:` tags of an Ink source, read statically (so a line in a branch no walk takes counts too), without `//` comments. */
export function soundTagsOf(source: string): SoundTag[] {
  let knot: string | undefined;
  return withoutComments(source).split("\n").flatMap((text, index) => {
    const head = KNOT_LINE.exec(text);
    if (head) knot = head[1];
    return [...text.matchAll(SE_TAG)].map((match): SoundTag => ({ id: match[1].trim(), line: index + 1, ...(knot ? { knot } : {}) }));
  });
}

/** Throws at the first `# se:` of a story of the layer `storyLayer` that names no sound it may play (soundUseProblem). */
export function checkSoundTags(source: string, storyLayer: string, sounds: readonly RegisteredSound[]): void {
  for (const { id, line, knot } of soundTagsOf(source)) {
    const problem = soundUseProblem(id, storyLayer, sounds, `${knot ? `knot ${knot} の` : ""}${line}行目の # se: ${id}`);
    if (problem) throw new Error(problem);
  }
}

type Entry = Record<string, unknown>;
const isObject = (value: unknown): value is Entry => typeof value === "object" && value !== null && !Array.isArray(value);
const list = (value: unknown): Entry[] => (Array.isArray(value) ? value.filter(isObject) : []);

/** The `se` of every journey's transport modes (manifest `transportModes`), with the journey and its manifest file. */
export function transportModeSounds(sources: Pick<ContentSources, "manifests">): { id: string; journeyId: string; modeId: string; file: string }[] {
  return sources.manifests.flatMap((manifest) => list(manifest.data.transportModes).flatMap((mode) =>
    typeof mode.se === "string" ? [{ id: mode.se, journeyId: manifest.id, modeId: String(mode.id), file: manifest.file }] : []));
}

/**
 * The sound notes that do not stop the build: a journey's own sound that no line (`# se:`) and no transport mode
 * (`se`) plays, and the system sounds (SYSTEM_SOUND_IDS) the shared list does not register (the game skips them).
 */
export function soundWarnings(sources: Pick<ContentSources, "root" | "storyFiles" | "manifests">, sounds: readonly RegisteredSound[]): ContentWarning[] {
  const played = new Set([...sources.storyFiles.flatMap((story) => soundTagsOf(story.source).map((tag) => tag.id)),
    ...transportModeSounds(sources).map((mode) => mode.id)]);
  const unused = sounds.filter((sound) => sound.layer.type === "journey" && !played.has(sound.entry.id))
    .map((sound): ContentWarning => ({ kind: "sound", message: `Unused sound: ${displayPath(sources.root, sound.file)} registers ` +
      `"${sound.entry.id}", but no line (# se:) or transport mode (se) of ${sound.layer.id} plays it` }));
  const shared = new Set(sounds.filter((sound) => sound.layer.type === "core").map((sound) => sound.entry.id));
  const missing = SYSTEM_SOUND_IDS.filter((id) => !shared.has(id));
  return [...unused, ...(missing.length ? [{ kind: "sound" as const, message: `System sounds missing from content/${SOUNDS_KIND}: ` +
    `${missing.join(", ")} (the game plays them by itself and skips a missing one in silence)` }] : [])];
}
