import { z } from "zod";
import { japaneseText } from "./text-language";

// The sound effects (2026-11-12): one MP3 each at a layer's `public/assets/se/<ID>.mp3` (the root public/ for the
// shared sounds, a journey's public/ for that journey's own), served at `assets/se/<ID>.mp3` (all public/ folders are
// served as one, so an ID names one file in the whole build). Each layer lists its sounds and where they come from in
// its presentation/sounds.json (content/presentation/sounds.json for the root public/,
// content/journeys/<journeyId>/presentation/sounds.json for that journey's). A line's `# se: <ID>` (src/content/tags.ts)
// plays one; the game plays the system sounds below by itself (src/audio/sound-effects.ts). content:build checks the
// lists, the files and the tags (scripts/sound-files.ts) and writes each sound's volume to
// src/content/generated/sound-volumes.json; ⚙設定's 「出典・権利の一覧」 lists the sources (src/content/credits.ts).

/** A sound's ID: its file name without `.mp3` (a source's ID has the same form). */
export const SOUND_ID = /^[a-z0-9_]+$/u;
/** The folder below a layer's `public/` that holds its sounds (served at the same path). */
export const SOUND_FOLDER = "assets/se";
const SOUND_EXTENSION = ".mp3";

/** The served path of a sound (`assets/se/<ID>.mp3`). */
export const soundPath = (soundId: string): string => `${SOUND_FOLDER}/${soundId}${SOUND_EXTENSION}`;

/** The ID of a served path that names a sound (`assets/se/<ID>.mp3`, directly in the folder), or undefined for any other path. */
export function soundIdOf(assetPath: string): string | undefined {
  const prefix = `${SOUND_FOLDER}/`;
  if (!assetPath.startsWith(prefix) || !assetPath.endsWith(SOUND_EXTENSION)) return undefined;
  const id = assetPath.slice(prefix.length, -SOUND_EXTENSION.length);
  return SOUND_ID.test(id) ? id : undefined;
}

/**
 * The sounds the game plays by itself (src/audio/sound-effects.ts playSe), which the shared list provides: a sound of
 * these IDs missing from content/presentation/sounds.json is a content:build warning, and the game skips it in silence.
 * `travel_<kind>` is the ride of each transport kind (a journey's mode may name another sound: its `se`).
 */
export const SYSTEM_SOUND_IDS = [
  "ui_tap", "ui_confirm", "ui_open", "ui_close", "ui_page", "ui_denied", "save",
  "phone_receive", "phone_send", "letter_open", "name_cutin", "recall", "local_word",
  "quiz_correct", "quiz_incorrect", "quiz_perfect", "quiz_reasoning", "quiz_result",
  "item_get", "money", "album_photo",
  "travel_walk", "travel_rail", "travel_car", "travel_bus", "travel_tram", "travel_three_wheeler", "travel_bicycle",
  "city_arrive", "city_clear", "time_passage", "night_rest", "episode_title",
] as const;
export type SystemSoundId = (typeof SYSTEM_SOUND_IDS)[number];

/** The licences a sound's source may have: files the public repository may hand on (`own`: made for Dreamscape). */
export const SOUND_LICENSES = ["CC0 1.0", "CC BY 3.0", "CC BY 4.0", "CC BY-SA 3.0", "CC BY-SA 4.0", "own"] as const;

const soundId = z.string().regex(SOUND_ID, "Expected an ID of a-z, 0-9 and _");
const text = z.string().trim().min(1);

/** Where sounds come from: a work, its author and licence, and (for every licence but `own`) where it is published. */
export const soundSourceSchema = z.object({
  id: soundId,
  /** The work's title as published (often English). */
  titleJa: text,
  author: text,
  license: z.enum(SOUND_LICENSES),
  checkedAt: z.iso.date(),
  /** The page of the work (every licence but `own`; content:build checks it). */
  url: z.url({ protocol: /^https$/ }).optional(),
  /** The site that publishes it (e.g. OpenGameArt.org). */
  site: text.optional(),
  /** The credit line the author asks for, shown as written. */
  creditJa: text.optional(),
}).strict();

/** A sound of a layer: its ID (its file's name), what it is for, the sources it is made from and how. */
export const soundEntrySchema = z.object({
  id: soundId,
  /** What the sound is used for, shown in the credits list. */
  useJa: japaneseText,
  /** The IDs of the sources of the same file (sounds.json) it is made from. */
  sources: z.array(soundId).min(1),
  /** How it was made from them (the source files, the cut); for the people editing the list. */
  fromJa: text,
  /** Its loudness against the others, more than 0 up to 1 (1 when left out; the files are already levelled). */
  volume: z.number().gt(0).max(1).optional(),
}).strict();

export const soundCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  sources: z.array(soundSourceSchema),
  sounds: z.array(soundEntrySchema),
}).strict();

export type SoundSource = z.infer<typeof soundSourceSchema>;
export type SoundEntry = z.infer<typeof soundEntrySchema>;
export type SoundCatalog = z.infer<typeof soundCatalogSchema>;
