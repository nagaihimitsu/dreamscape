import { z } from "zod";
import { SOUND_ID, soundEntrySchema, soundSourceSchema } from "./sounds";
import { BGM_DEFAULT, BGM_STOP, musicDataSchema } from "./music";

// The ambience (環境音, 2026-11-13 user decision): a quiet looping sound of the place under the background music, one MP3 a
// track at a layer's `public/assets/ambience/<ID>.mp3` (the root public/ for the shared tracks, a journey's public/ for
// that journey's own; served at `assets/ambience/<ID>.mp3`, so an ID names one file in the whole build). Each layer
// lists its tracks and where they come from in its presentation/ambience.json (`sources` and `tracks` as in sounds.json
// and music.json), and a journey's list may give its places their own track (`play.places`). A line's
// `# ambience: <ID>` (src/content/tags.ts) changes the scene's ambience from that line on. content:build checks the
// lists, the files and the tags (scripts/ambience-files.ts) and writes what the game reads to
// src/content/generated/ambience.json (ambienceDataSchema); src/audio/scene-ambience.ts decides the track,
// src/audio/ambience.ts plays it. The ambience never tells a relationship value.

/** The folder below a layer's `public/` that holds its tracks (served at the same path). */
export const AMBIENCE_FOLDER = "assets/ambience";
const AMBIENCE_EXTENSION = ".mp3";
/** The values `# ambience:` gives besides a track (as `# bgm:`): silence from that line on, the place's own again. */
export const AMBIENCE_STOP = BGM_STOP;
export const AMBIENCE_DEFAULT = BGM_DEFAULT;

/** The served path of a track (`assets/ambience/<ID>.mp3`). */
export const ambiencePath = (trackId: string): string => `${AMBIENCE_FOLDER}/${trackId}${AMBIENCE_EXTENSION}`;

/** The ID of a served path that names a track (`assets/ambience/<ID>.mp3`, directly in the folder), or undefined for any other path. */
export function ambienceIdOf(assetPath: string): string | undefined {
  const prefix = `${AMBIENCE_FOLDER}/`;
  if (!assetPath.startsWith(prefix) || !assetPath.endsWith(AMBIENCE_EXTENSION)) return undefined;
  const id = assetPath.slice(prefix.length, -AMBIENCE_EXTENSION.length);
  return SOUND_ID.test(id) ? id : undefined;
}

const trackRef = z.string().regex(SOUND_ID, "Expected a track ID of a-z, 0-9 and _");

/**
 * Where a list's tracks play: `places`, a place of the journey's cities (a `places[].id` of its travel/<city>.json) with
 * its own track (only a journey's list may give one; content:build checks it).
 */
export const ambiencePlaySchema = z.object({
  places: z.record(z.string().min(1), trackRef).optional(),
}).strict();
export type AmbiencePlay = z.infer<typeof ambiencePlaySchema>;

/** A layer's presentation/ambience.json (the editor's schema). */
export const ambienceCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  sources: z.array(soundSourceSchema),
  tracks: z.array(soundEntrySchema),
  play: ambiencePlaySchema.optional(),
}).strict();

/**
 * Every layer's presentation/ambience.json merged (scripts/content-layout.ts): the sources and tracks of every list (the
 * shared one first), and each list's `play` by its layer (`core` for the shared list, else the journey's ID), checked
 * one by one by content:build.
 */
export const mergedAmbienceCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  sources: z.array(soundSourceSchema),
  tracks: z.array(soundEntrySchema),
  play: z.record(z.string().min(1), z.unknown()).optional(),
}).strict();

/** Where a journey's tracks play, as the game reads them: every place given a track of its own. */
export const ambienceJourneyPlaySchema = z.object({ places: z.record(z.string().min(1), trackRef) }).strict();
export type AmbienceJourneyPlay = z.infer<typeof ambienceJourneyPlaySchema>;

/** The shared `play` with a journey's over it (as mergeMusicPlay): the places of both, the journey's own winning. */
export function mergeAmbiencePlay(root: AmbiencePlay | undefined, journey: AmbiencePlay | undefined): AmbienceJourneyPlay {
  return { places: { ...root?.places, ...journey?.places } };
}

/**
 * src/content/generated/ambience.json (content:build, scripts/ambience-files.ts; written even with no ambience): every
 * track's volume and credit (the sources and what each track is for, as the music's) and each journey's merged `play`.
 */
export const ambienceDataSchema = z.object({
  schemaVersion: z.literal(1),
  sources: z.array(soundSourceSchema),
  tracks: musicDataSchema.shape.tracks,
  journeys: z.record(z.string().min(1), ambienceJourneyPlaySchema),
}).strict();
export type AmbienceData = z.infer<typeof ambienceDataSchema>;
