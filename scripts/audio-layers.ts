import type { AudioLayers } from "../src/content/audio-layers";
import type { ContentLayer } from "./content-sources";
import type { VoiceFile } from "./voice-files";

// content:build's list of the audio by layer (2026-11-13 user request; src/content/audio-layers.ts): which layer (the
// shared one, `core`, or a journey) registers each sound effect, background-music track and ambience track, and each
// journey's voices, for Debug's 「音と演出の見本」 (src/content/generated/audio-layers.json). Pure, over what the
// validation already registered (sound-files.ts, music-files.ts, ambience-files.ts, voice-files.ts). Light module.

/** A registered sound, track or ambience track as this list reads it: its ID and the layer whose public/ serves it. */
type Registered = { entry: { id: string }; layer: Pick<ContentLayer, "id"> };

/** Every layer, in the layers' order (core first), with the IDs of its own sounds, tracks, ambience tracks and voices. */
export function audioLayersOf(layers: readonly Pick<ContentLayer, "id">[], audio: {
  sounds: readonly Registered[];
  music: readonly Registered[];
  ambience: readonly Registered[];
  voices: readonly VoiceFile[];
}): AudioLayers {
  const own = (list: readonly Registered[], layerId: string) => list.filter((item) => item.layer.id === layerId).map((item) => item.entry.id);
  return {
    schemaVersion: 1,
    layers: layers.map((layer) => ({
      id: layer.id,
      sounds: own(audio.sounds, layer.id),
      music: own(audio.music, layer.id),
      ambience: own(audio.ambience, layer.id),
      voices: audio.voices.filter((voice) => voice.journeyId === layer.id).map((voice) => voice.id),
    })),
  };
}
