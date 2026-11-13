import { describe, expect, it } from "vitest";
import { deliveredIds, insertVoiceTags, planVoiceTags } from "./voice-tag";
import { voiceScript, type ScriptedLine, type VoiceScriptInput } from "./voice-script";

// voice:tag: the delivered clips get their `# voice:` before their lines when the line still says what the script
// said, and recorded.json records that text; the others are refused with the reason.

const SOURCE = `=== ta_gate ===
# speaker: heroine
いち
{ cond("flag ta_x"):
    # reaction: heroine,smile
    {heroine_name}じゃなくて、に
}
さん、だよ
# voice: ta_gate_004
よん
`;
const scripted = (id: string, text: string): ScriptedLine => ({ id, text, knot: "ta_gate", file: "places/ta_west_gate.ink", title: "門" });
const scripts = [{ journeyId: "ta_trip", date: "2026-11-12", file: "", lines: [
  scripted("ta_gate_001", "いち"), scripted("ta_gate_002", "【ヒロインの名前】じゃなくて、に"), scripted("ta_gate_003", "さん"), scripted("ta_gate_004", "よん"),
] }];
const input: VoiceScriptInput = {
  journeyId: "ta_trip", nameJa: "テストの旅", storiesPath: "", cities: [{ id: "west", nameJa: "西" }],
  stories: [{ storyId: "places/ta_west_gate", source: SOURCE }], people: new Map(), battles: new Map(),
  scripts, recorded: new Set(["ta_gate_004"]), voiceFiles: new Set(["ta_gate_001", "ta_gate_002", "ta_gate_004"]),
};
const script = voiceScript(input);

describe("voice:tag", () => {
  it("reads the IDs of the delivered files and refuses a name that is no ID", () => {
    expect(deliveredIds(["ta_gate_001.wav", "ta_gate_001.mp3", "ta_gate_002.MP3", "Take 1.wav", "notes.txt"])).toEqual({
      ids: ["ta_gate_001", "ta_gate_002"],
      refused: [{ id: "Take 1", reasonJa: "ファイル名が声の ID ではありません（英小文字・数字・_ だけ。台本の [ID] と同じ名前にします）" }],
    });
  });

  it("tags the lines that say what the script said, records the text, and refuses the rest with the reason", () => {
    const plan = planVoiceTags(script, scripts, ["ta_gate_999", "ta_gate_003", "ta_gate_004", "ta_gate_001", "ta_gate_002"], input.voiceFiles);
    expect(plan.tag.map((line) => line.id)).toEqual(["ta_gate_001", "ta_gate_002"]);
    // A clip delivered again for a line already tagged is recorded only.
    expect(plan.record).toEqual([["ta_gate_001", { text: "いち", script: "2026-11-12" }],
      ["ta_gate_002", { text: "【ヒロインの名前】じゃなくて、に", script: "2026-11-12" }], ["ta_gate_004", { text: "よん", script: "2026-11-12" }]]);
    expect(plan.refused).toEqual([
      { id: "ta_gate_003", reasonJa: "今の台詞に、この ID の行がありません（2026-11-12の台本の文：さん）。" +
        "文が変わった行は新しい ID になるので、この声は使えません（npm run voice:changes で確かめます）" },
      { id: "ta_gate_999", reasonJa: "渡した台本にない ID です" },
    ]);
  });

  it("refuses a clip whose MP3 is not in place yet, and one made from a text the tagged line no longer says", () => {
    expect(planVoiceTags(script, scripts, ["ta_gate_001"], new Set()).refused[0].reasonJa)
      .toBe("声のファイルがまだありません。この旅行編の public/assets/voice/ta_gate_001.mp3 に置いてから付けます");
    const changed = voiceScript({ ...input, stories: [{ storyId: "places/ta_west_gate", source: SOURCE.replace("よん\n", "よんだよ\n") }] });
    expect(planVoiceTags(changed, scripts, ["ta_gate_004"], input.voiceFiles).refused[0].reasonJa)
      .toBe("文が台本と違います（2026-11-12の台本：よん　今：よんだよ）。今の文で作り直します");
  });

  it("puts each # voice: on a line of its own before its line, with the line's indent", () => {
    const plan = planVoiceTags(script, scripts, ["ta_gate_001", "ta_gate_002"], input.voiceFiles);
    expect(insertVoiceTags(SOURCE, plan.tag)).toBe(SOURCE.replace("いち\n", "# voice: ta_gate_001\nいち\n")
      .replace("    {heroine_name}", "    # voice: ta_gate_002\n    {heroine_name}"));
    expect(() => insertVoiceTags(SOURCE, [{ line: 2, id: "ta_gate_001", text: "に" }])).toThrow("3行目は「に」ではありません");
  });
});
