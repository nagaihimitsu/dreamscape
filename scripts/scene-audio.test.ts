import { describe, expect, it } from "vitest";
import { sceneAudioOf } from "./scene-audio";

// content:build's index of the scenes' voices and tracks (2026-11-13, 旅の音楽室).

describe("the scenes' audio index", () => {
  it("puts a place file's voices and tracks under their knots, with each voiced line's text", () => {
    const place = [
      "INCLUDE modules.ink", "-> DONE", "=== ta_talk ===", "# scene: talk", "# bgm: ta_tense", "# speaker: heroine", "# voice: ta_v1",
      "{heroine_name}、こっち", "# bgm: stop", "-> END", "=== ta_date ===", "# scene: date", "# voice: ta_v2", "# bgm: default", "またね", "-> END",
    ].join("\n");
    expect(sceneAudioOf([{ id: "places/ta_tower", source: place }])).toEqual({ schemaVersion: 1, stories: {
      "places/ta_tower.ta_talk": { voices: [{ id: "ta_v1", textJa: "{heroine_name}、こっち" }], bgm: ["ta_tense"] },
      "places/ta_tower.ta_date": { voices: [{ id: "ta_v2", textJa: "またね" }], bgm: [] },
    } });
  });

  it("puts a one-scene file's all under the file, helper knots too, and leaves stories without audio out", () => {
    const battle = ["INCLUDE modules.ink", "# voice: ta_v3", "はじめ", "-> END", "=== ta_finale_claim ===", "# voice: ta_v4", "主張", "->->"].join("\n");
    expect(sceneAudioOf([{ id: "battles/ta_finale", source: battle }, { id: "places/ta_quiet", source: "INCLUDE modules.ink\n-> DONE\n=== a ===\n朝。\n" }]))
      .toEqual({ schemaVersion: 1, stories: { "battles/ta_finale": { voices: [{ id: "ta_v3", textJa: "はじめ" }, { id: "ta_v4", textJa: "主張" }], bgm: [] } } });
  });
});
