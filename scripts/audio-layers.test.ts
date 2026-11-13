import { describe, expect, it } from "vitest";
import { audioLayersSchema } from "../src/content/audio-layers";
import { audioLayersOf } from "./audio-layers";

// The audio by layer for Debug's 「音と演出の見本」 (2026-11-13): what content:build writes to generated/audio-layers.json.

const registered = (id: string, layer: string) => ({ entry: { id }, layer: { id: layer } });

describe("the audio by layer", () => {
  it("gives every layer, core first, its own sounds, tracks, ambience and voices in their lists' order", () => {
    const layers = audioLayersOf([{ id: "core" }, { id: "trip_a" }, { id: "trip_b" }], {
      sounds: [registered("ui_tap", "core"), registered("ta_bell", "trip_a"), registered("save", "core")],
      music: [registered("title_song", "core"), registered("ta_fort_song", "trip_a")],
      ambience: [registered("ta_wind", "trip_a")],
      voices: [{ id: "ta_arrival_002", journeyId: "trip_a" }, { id: "ta_arrival_001", journeyId: "trip_a" }],
    });
    expect(layers).toEqual({
      schemaVersion: 1,
      layers: [
        { id: "core", sounds: ["ui_tap", "save"], music: ["title_song"], ambience: [], voices: [] },
        { id: "trip_a", sounds: ["ta_bell"], music: ["ta_fort_song"], ambience: ["ta_wind"], voices: ["ta_arrival_002", "ta_arrival_001"] },
        { id: "trip_b", sounds: [], music: [], ambience: [], voices: [] },
      ],
    });
    // The file the game's Debug room reads back.
    expect(audioLayersSchema.parse(layers)).toEqual(layers);
  });

  it("lists the layers even without any audio", () => {
    expect(audioLayersOf([{ id: "core" }], { sounds: [], music: [], ambience: [], voices: [] }))
      .toEqual({ schemaVersion: 1, layers: [{ id: "core", sounds: [], music: [], ambience: [], voices: [] }] });
  });
});
