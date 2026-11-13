import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import path from "node:path";
import { generatedPublicDirectory, mirrorDirectory, type CatalogKind } from "./content-layout";
import type { MergedCatalog } from "./catalog-merge";
import { listFiles, type ContentSources } from "./content-sources";
import { imageJourneyIndex } from "./image-rights";

// The outputs of content:build, written after the content was validated:
// the compiled stories and quizzes, the generated mirror of the merged
// catalogs (src/content/generated/content/) and the served static files
// (src/content/generated/public/, with the reduced photo copies of derived-images.ts).

export const GENERATED_DIRECTORY = "src/content/generated";
/** How the outputs were built: `{ extraJourneyFolders: { <journeyId>: <folder> } }`, empty without extra journey folders. */
export const BUILD_INFO_FILE = `${GENERATED_DIRECTORY}/build-info.json`;
/** Which journey provides each tourism image, for the credits list (image-rights.ts imageJourneyIndex). */
export const IMAGE_JOURNEYS_FILE = `${GENERATED_DIRECTORY}/image-journeys.json`;
/** Every journey's album images (album-images.ts albumImagesOf; read by src/content/index.ts). */
export const ALBUM_IMAGES_FILE = `${GENERATED_DIRECTORY}/album-images.json`;
/** Every layer's mini-game pictures (minigame-art.ts miniGameArtOf; read by src/content/index.ts). */
export const MINI_GAME_ART_FILE = `${GENERATED_DIRECTORY}/minigame-art.json`;
/** Where the stories use the mini-games (scene-walk.ts; read by the tests and Debug's 「ミニゲームの見本」). */
export const MINI_GAME_USES_FILE = `${GENERATED_DIRECTORY}/minigame-uses.json`;
/** Every registered sound's volume by ID (sound-files.ts soundVolumesOf; read by src/audio/sound-effects.ts). */
export const SOUND_VOLUMES_FILE = `${GENERATED_DIRECTORY}/sound-volumes.json`;
/** The music: every track's volume and credit, and where each journey plays them (music-files.ts musicDataOf; src/audio/bgm.ts). */
export const MUSIC_FILE = `${GENERATED_DIRECTORY}/music.json`;
/** The music file of a build without music: nothing plays. */
const NO_MUSIC = { schemaVersion: 1, sources: [], tracks: [], root: null, journeys: {} };
/** The ambience: every track's volume and credit, and each journey's places' own (ambience-files.ts ambienceDataOf; src/audio/ambience.ts). */
export const AMBIENCE_FILE = `${GENERATED_DIRECTORY}/ambience.json`;
/** The ambience file of a build without ambience: nothing plays. */
const NO_AMBIENCE = { schemaVersion: 1, sources: [], tracks: [], journeys: {} };
/** Which layer gives each sound, track and ambience track, and each journey's voices (audio-layers.ts audioLayersOf; Debug's 音と演出の見本). */
export const AUDIO_LAYERS_FILE = `${GENERATED_DIRECTORY}/audio-layers.json`;
/** Each scene's voiced lines and # bgm: tracks (scene-audio.ts sceneAudioOf; the music room, src/features/journey/music-room.ts). */
export const SCENE_AUDIO_FILE = `${GENERATED_DIRECTORY}/scene-audio.json`;

/**
 * Write every output of a validated build into `root`. `derivedFiles` (served
 * path → file) are the reduced photo copies of derived-images.ts, served with
 * the public files.
 */
export function writeContentOutputs(
  root: string,
  sources: ContentSources,
  validated: { stories: Record<string, string>; quizzes: Record<string, unknown>; tours?: readonly unknown[];
    catalogOverrides?: Partial<Record<CatalogKind, unknown>>;
    sceneConditions?: { conditions: Record<string, unknown>; stories: Record<string, string[]> };
    scenes?: { scenes: unknown[]; rewards: unknown[] }; albumImages?: readonly unknown[]; miniGameArt?: readonly unknown[]; miniGameUses?: readonly unknown[]; soundVolumes?: Readonly<Record<string, number>>;
    music?: unknown; ambience?: unknown; audioLayers?: unknown; sceneAudio?: unknown },
  derivedFiles: ReadonlyMap<string, string> = new Map(),
): void {
  const directory = path.join(root, GENERATED_DIRECTORY);
  mkdirSync(directory, { recursive: true });
  // Records whether development-only journey folders (the sample journey) are part of these outputs.
  const buildInfo = { extraJourneyFolders: sources.tree.extraJourneyFolders ?? {} };
  writeFileSync(path.join(root, BUILD_INFO_FILE), `${JSON.stringify(buildInfo, null, 2)}\n`);
  writeFileSync(path.join(directory, "quizzes.json"), `${JSON.stringify(validated.quizzes, null, 2)}\n`);
  // Every journey's tours (src/content/index.ts imports the file, so it is written even with no tour: `[]`).
  writeFileSync(path.join(directory, "tours.json"), `${JSON.stringify(validated.tours ?? [], null, 2)}\n`);
  writeFileSync(path.join(directory, "stories.json"), `${JSON.stringify(validated.stories, null, 2)}\n`);
  // The scenes' cond("…") texts and their conditions (scripts/scene-conditions.ts; read by src/domain/scene-conditions.ts).
  writeFileSync(path.join(directory, "scene-conditions.json"),
    `${JSON.stringify(validated.sceneConditions ?? { conditions: {}, stories: {} }, null, 2)}\n`);
  // The scene list and the tags' AP rules (scripts/scene-table.ts; read by src/content/index.ts).
  writeFileSync(path.join(directory, "scenes.json"), `${JSON.stringify(validated.scenes ?? { scenes: [], rewards: [] }, null, 2)}\n`);
  writeFileSync(path.join(root, IMAGE_JOURNEYS_FILE), `${JSON.stringify(imageJourneyIndex(sources), null, 2)}\n`);
  // The album's illustrations (src/content/index.ts imports the file, so it is written even with none: `[]`).
  writeFileSync(path.join(root, ALBUM_IMAGES_FILE), `${JSON.stringify(validated.albumImages ?? [], null, 2)}\n`);
  // The mini-games' pictures (src/content/index.ts imports the file, so it is written even with none: `[]`).
  writeFileSync(path.join(root, MINI_GAME_ART_FILE), `${JSON.stringify(validated.miniGameArt ?? [], null, 2)}\n`);
  // The mini-game uses (Debug's room imports the file, so it is written even with none: `[]`).
  writeFileSync(path.join(root, MINI_GAME_USES_FILE), `${JSON.stringify(validated.miniGameUses ?? [], null, 2)}\n`);
  // The sounds the game may play and their volumes (src/audio/sound-effects.ts imports the file, so it is written even with none: `{}`).
  writeFileSync(path.join(root, SOUND_VOLUMES_FILE), `${JSON.stringify(validated.soundVolumes ?? {}, null, 2)}\n`);
  // The music (src/audio/bgm.ts and the credits list import the file, so it is written even with none).
  writeFileSync(path.join(root, MUSIC_FILE), `${JSON.stringify(validated.music ?? NO_MUSIC, null, 2)}\n`);
  // The ambience (src/audio/ambience.ts and the credits list import the file, so it is written even with none).
  writeFileSync(path.join(root, AMBIENCE_FILE), `${JSON.stringify(validated.ambience ?? NO_AMBIENCE, null, 2)}\n`);
  // The audio by layer (src/dev/EffectsRoom.tsx imports the file, so it is written even with no audio).
  writeFileSync(path.join(root, AUDIO_LAYERS_FILE), `${JSON.stringify(validated.audioLayers ?? { schemaVersion: 1, layers: [] }, null, 2)}\n`);
  // What each scene lets the player hear (the music room imports the file, so it is written even with nothing).
  writeFileSync(path.join(root, SCENE_AUDIO_FILE), `${JSON.stringify(validated.sceneAudio ?? { schemaVersion: 1, stories: {} }, null, 2)}\n`);
  // The game imports the validated, merged catalogs only from this mirror.
  writeContentMirror(sources, mirrorDirectory(root), validated.catalogOverrides);
  // Vite serves and builds the game's images from this folder (publicDir in vite.config.ts).
  assemblePublicDirectory(new Map([...sources.publicFiles, ...derivedFiles]), generatedPublicDirectory(root));
}

/**
 * Write the validated merged view to `directory` (the generated mirror) with
 * the old `content/` relative paths: catalogs as formatted JSON, city and
 * travel files byte for byte. `overrides` replaces (or adds) whole catalogs
 * the validation derived (the encounters' head tags). Files are written in
 * place, unchanged files are left untouched and files no longer produced are removed.
 */
export function writeContentMirror(sources: ContentSources, directory: string, overrides: Partial<Record<CatalogKind, unknown>> = {}): void {
  const outputs = new Map<string, Buffer>();
  for (const [kind, merged] of Object.entries(sources.catalogs) as [CatalogKind, MergedCatalog][])
    outputs.set(kind, Buffer.from(`${JSON.stringify(merged.value, null, 2)}\n`));
  for (const [kind, value] of Object.entries(overrides))
    outputs.set(kind, Buffer.from(`${JSON.stringify(value, null, 2)}\n`));
  for (const city of sources.cities) {
    outputs.set(`cities/${city.id}.json`, city.bytes.city);
    outputs.set(`travel/${city.id}.json`, city.bytes.travel);
    outputs.set(`travel/${city.id}-settings.json`, city.bytes.settings);
  }
  const existing = existsSync(directory) ? listFiles(directory) : [];
  for (const relative of existing)
    if (!outputs.has(relative)) rmSync(path.join(directory, relative), { force: true });
  for (const [relative, data] of outputs) {
    const file = path.join(directory, relative);
    if (existsSync(file) && readFileSync(file).equals(data)) continue;
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, data);
  }
  removeEmptyDirectories(directory);
}

/**
 * Make `directory` hold exactly `files` (URL path → source file): remove the
 * files no source provides any more, and copy a file when its copy is missing
 * or differs in size or modification time (copies keep the source's time;
 * times within a millisecond count as equal). Returns the number of files
 * copied and removed.
 */
export function assemblePublicDirectory(files: ReadonlyMap<string, string>, directory: string): { copied: number; removed: number } {
  let removed = 0;
  for (const relative of existsSync(directory) ? listFiles(directory) : []) {
    if (files.has(relative)) continue;
    rmSync(path.join(directory, relative), { recursive: true, force: true });
    removed += 1;
  }
  removeEmptyDirectories(directory);
  let copied = 0;
  for (const [relative, source] of files) {
    const target = path.join(directory, relative);
    const from = statSync(source);
    const to = existsSync(target) ? statSync(target) : undefined;
    if (to?.isFile() && to.size === from.size && Math.abs(to.mtimeMs - from.mtimeMs) < 1) continue;
    if (to && !to.isFile()) rmSync(target, { recursive: true, force: true });
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(source, target);
    // Seconds as numbers keep sub-millisecond precision (a Date would round).
    utimesSync(target, from.atimeMs / 1000, from.mtimeMs / 1000);
    copied += 1;
  }
  return { copied, removed };
}

/** Remove empty directories below and including `directory`; true when it was removed. */
export function removeEmptyDirectories(directory: string): boolean {
  if (!existsSync(directory)) return false;
  let empty = true;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const removed = entry.isDirectory() && removeEmptyDirectories(path.join(directory, entry.name));
    if (!removed) empty = false;
  }
  if (empty) rmdirSync(directory);
  return empty;
}
