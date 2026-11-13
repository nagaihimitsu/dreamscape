import { z } from "zod";
import { SOUND_ID } from "./sounds";
import { VOICE_ID } from "./voice-files";

// What each scene's story lets the player hear (2026-11-13, 旅の音楽室): its `# voice:` lines with their text and the
// tracks its `# bgm:` names, read statically from the Ink by content:build (scripts/scene-audio.ts) and written to
// src/content/generated/scene-audio.json. The music room (src/features/journey/music-room.ts) lists those of the scenes
// the player has completed. Keyed by story address: a place file's knot (`places/<file>.<knot>`) or a one-scene file.

/** A voiced line: its recording's ID and the line's text as written (names such as {heroine_name} left in). */
export const sceneVoiceSchema = z.object({ id: z.string().regex(VOICE_ID), textJa: z.string() }).strict();
export type SceneVoice = z.infer<typeof sceneVoiceSchema>;

export const sceneAudioSchema = z.object({
  schemaVersion: z.literal(1),
  stories: z.record(z.string().min(1), z.object({
    voices: z.array(sceneVoiceSchema),
    /** The tracks its `# bgm:` names (not `stop` or `default`), each once, in the story's order. */
    bgm: z.array(z.string().regex(SOUND_ID)),
  }).strict()),
}).strict();
export type SceneAudio = z.infer<typeof sceneAudioSchema>;
