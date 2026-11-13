import { describe, expect, it } from "vitest";
import { checkVoiceTags } from "./voice-files";

// content:build's checks of `# voice:` (scripts/voice-files.ts): the file of the line's own journey, and (2026-11-13) never
// on a line that says the protagonist's name, which the player sets.

const folder = "content/journeys/ta_trip/public/assets/voice";
const voices = [{ id: "ta_v1", journeyId: "ta_trip" }, { id: "tb_v1", journeyId: "tb_trip" }];
const check = (source: string) => checkVoiceTags(source, "ta_trip", voices, folder);

describe("the voice tags of a story", () => {
  it("accepts a voice of the journey, on its line or before it", () => {
    expect(() => check("=== ta_talk ===\n「行こう」 # voice: ta_v1\n-> END\n")).not.toThrow();
    expect(() => check("=== ta_talk ===\n# speaker: heroine\n# voice: ta_v1\n「行こう」\n{player_name}は頷いた。\n-> END\n")).not.toThrow();
  });

  it("refuses an ID that is not one, a missing file and another journey's", () => {
    expect(() => check("「行こう」 # voice: Ta-V1\n")).toThrow("Invalid voice tag: # voice: Ta-V1");
    expect(() => check("「行こう」 # voice: ta_v2\n")).toThrow("Unknown voice: # voice: ta_v2");
    expect(() => check("「行こう」 # voice: tb_v1\n")).toThrow("Voice of another journey: # voice: tb_v1");
  });

  it("refuses a voiced line that says the protagonist's name, after its tag or under it", () => {
    expect(() => check("=== ta_talk ===\n「{player_name}、行こう」 # voice: ta_v1\n")).toThrow(
      "主人公の名前は声にできません：knot ta_talk の2行目の # voice: ta_v1 の台詞（2行目）に {player_name} があります。");
    expect(() => check("=== ta_talk ===\n# voice: ta_v1\n\n「ねえ、{player_name}」\n")).toThrow(
      "Voiced line says the protagonist's name: the line of # voice: ta_v1 has {player_name}");
  });
});
