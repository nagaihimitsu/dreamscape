import { z } from "zod";
import { SOUND_ID } from "./sounds";
import { VOICE_ID } from "./voice-files";

// Which layer (the shared one, `core`, or a journey) provides each registered sound effect, background-music track and
// ambience track, and each journey's voices (2026-11-13 user request). content:build writes it to
// src/content/generated/audio-layers.json (scripts/audio-layers.ts); only Debug's 「音と演出の見本」 reads it
// (src/dev/EffectsRoom.tsx), to list every sound by its layer. The game itself never reads it.

/** The ID of the shared layer (scripts/content-sources.ts contentLayers). */
export const CORE_LAYER_ID = "core";

const audioId = z.string().regex(SOUND_ID);

/** One layer's own audio, each list in its list's order (the voices in the order of the served files). */
export const audioLayerSchema = z.object({
  id: z.string().min(1),
  sounds: z.array(audioId),
  music: z.array(audioId),
  ambience: z.array(audioId),
  voices: z.array(z.string().regex(VOICE_ID)),
}).strict();
export type AudioLayer = z.infer<typeof audioLayerSchema>;

/** src/content/generated/audio-layers.json: every layer in the layers' order (core first), written even with no audio. */
export const audioLayersSchema = z.object({
  schemaVersion: z.literal(1),
  layers: z.array(audioLayerSchema),
}).strict();
export type AudioLayers = z.infer<typeof audioLayersSchema>;
