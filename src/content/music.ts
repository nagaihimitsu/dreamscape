import { z } from "zod";
import { SOUND_ID, soundEntrySchema, soundSourceSchema } from "./sounds";

// The background music (2026-11-12): one MP3 a track at a layer's `public/assets/bgm/<ID>.mp3` (the root public/ for the
// shared tracks, a journey's public/ for that journey's own), served at `assets/bgm/<ID>.mp3` (all public/ folders are
// served as one, so an ID names one file in the whole build). Each layer lists its tracks and where they come from in
// its presentation/music.json (`sources` and `tracks` as in sounds.json), and says which track plays where (`play`): the
// shared list (content/presentation/music.json) every screen's usual track, a journey's list the ones it changes and its
// places' own (`places`). A line's `# bgm: <ID>` (src/content/tags.ts) changes the scene's track from that line on.
// content:build checks the lists, the files and the tags (scripts/music-files.ts) and writes what the game needs to
// src/content/generated/music.json (musicDataSchema); src/audio/scene-music.ts decides the track, src/audio/bgm.ts plays
// it. The music never tells a relationship value or a confession's result.

/** The folder below a layer's `public/` that holds its tracks (served at the same path). */
export const MUSIC_FOLDER = "assets/bgm";
const MUSIC_EXTENSION = ".mp3";
/**
 * The values `# bgm:` gives besides a track: `stop` (silence from that line on) and `default` (the scene's usual track
 * again). No track may take these IDs.
 */
export const BGM_STOP = "stop";
export const BGM_DEFAULT = "default";
export const RESERVED_TRACK_IDS: readonly string[] = [BGM_STOP, BGM_DEFAULT];

/** The served path of a track (`assets/bgm/<ID>.mp3`). */
export const musicPath = (trackId: string): string => `${MUSIC_FOLDER}/${trackId}${MUSIC_EXTENSION}`;

/** The ID of a served path that names a track (`assets/bgm/<ID>.mp3`, directly in the folder), or undefined for any other path. */
export function trackIdOf(assetPath: string): string | undefined {
  const prefix = `${MUSIC_FOLDER}/`;
  if (!assetPath.startsWith(prefix) || !assetPath.endsWith(MUSIC_EXTENSION)) return undefined;
  const id = assetPath.slice(prefix.length, -MUSIC_EXTENSION.length);
  return SOUND_ID.test(id) ? id : undefined;
}

/** A track's ID as a play value or a tag names it (content:build checks that the track exists and may play there). */
const trackRef = z.string().regex(SOUND_ID, "Expected a track ID of a-z, 0-9 and _");

/** The free time's three tracks by the game clock: morning 05:00–11:59, day 12:00–17:59, night 18:00–04:59. */
export const freeTimeMusicSchema = z.object({ morning: trackRef, day: trackRef, night: trackRef }).strict();

/** The usual track of each kind of screen (the shared list's `play`; every key required there). */
export const rootMusicPlaySchema = z.object({
  /** The title screen (before a game starts). */
  title: trackRef,
  /** Free time (the map and the cards), by the game clock. */
  freeTime: freeTimeMusicSchema,
  /** The night screen and the night's visuals. */
  night: trackRef,
  /** A scene at a place (sightseeing, a quiz, a date, an encounter) whose place has no track of its own (`places`). */
  place: trackRef,
  /** A city's arrival scene. */
  arrival: trackRef,
  /** A city's epilogue (the departure). */
  epilogue: trackRef,
  /** The journey's end roll. */
  endRoll: trackRef,
}).strict();

/**
 * A journey's `play` (every key optional): each key it sets replaces the shared one (`freeTime` as a whole), and
 * `places` gives a place of its cities (a `places[].id` of its travel/<city>.json) its own track.
 */
export const journeyMusicPlaySchema = rootMusicPlaySchema.partial().extend({
  places: z.record(z.string().min(1), trackRef).optional(),
}).strict();

/** A layer's presentation/music.json (the editor's schema: the shared list's `play` needs every key, content:build checks it). */
export const musicCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  sources: z.array(soundSourceSchema),
  tracks: z.array(soundEntrySchema),
  play: journeyMusicPlaySchema.optional(),
}).strict();

/**
 * Every layer's presentation/music.json merged (scripts/content-layout.ts): the sources and tracks of every list (the
 * shared one first), and each list's `play` by its layer (`core` for the shared list, else the journey's ID), checked
 * one by one by content:build.
 */
export const mergedMusicCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  sources: z.array(soundSourceSchema),
  tracks: z.array(soundEntrySchema),
  play: z.record(z.string().min(1), z.unknown()).optional(),
}).strict();

export type RootMusicPlay = z.infer<typeof rootMusicPlaySchema>;
export type JourneyMusicPlay = z.infer<typeof journeyMusicPlaySchema>;

/** The tracks a journey plays where (the shared `play` with the journey's own over it), as the game reads them. */
export const musicPlaySchema = rootMusicPlaySchema.extend({
  places: z.record(z.string().min(1), trackRef),
}).strict();
export type MusicPlay = z.infer<typeof musicPlaySchema>;

/** The shared `play` with a journey's over it: each key the journey sets replaces the shared one, its `freeTime` as a whole. */
export function mergeMusicPlay(root: RootMusicPlay, journey: JourneyMusicPlay | undefined): MusicPlay {
  const { places, ...own }: JourneyMusicPlay = journey ?? {};
  const set = Object.fromEntries(Object.entries(own).filter(([, value]) => value !== undefined)) as Partial<RootMusicPlay>;
  return { ...root, ...set, places: { ...places } };
}

/**
 * src/content/generated/music.json (content:build, scripts/music-files.ts; written even with no music): every track's
 * volume and credit (the sources and what each track is for), the shared `play` (`root`, null without a shared list:
 * then no music plays) and each journey's merged `play` by journey ID.
 */
export const musicDataSchema = z.object({
  schemaVersion: z.literal(1),
  sources: z.array(soundSourceSchema),
  tracks: z.array(z.object({
    id: trackRef,
    useJa: z.string().min(1),
    sources: z.array(z.string().min(1)),
    volume: z.number().gt(0).max(1),
  }).strict()),
  root: musicPlaySchema.nullable(),
  journeys: z.record(z.string().min(1), musicPlaySchema),
}).strict();
export type MusicData = z.infer<typeof musicDataSchema>;
