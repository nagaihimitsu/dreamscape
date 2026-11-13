import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatVoiceChanges, recordedLineWarnings, textSimilarity, voiceChanges } from "./voice-changes";
import type { ScriptedLine, SentVoiceScript, VoiceLine, VoiceScript } from "./voice-script";

// Which heroine lines changed (voice:changes and content:build's warning): recorded lines against what their clips
// say (recorded.json), the others against the newest script sent.

const scripted = (id: string, text: string, file = "places/ta_west_square.ink"): ScriptedLine =>
  ({ id, text, file, knot: id.replace(/_\d+$/u, ""), title: "広場の時計" });
const current = (id: string, text: string, file = "places/ta_west_square.ink"): VoiceLine =>
  ({ ...scripted(id, text, file), line: 0, emo: [], staging: [], context: [], prev: null, flags: [] });
const scriptOf = (lines: VoiceLine[], tagged: string[] = []): VoiceScript => ({ journeyId: "ta_trip", nameJa: "テストの旅",
  cities: [{ id: "west", nameJa: "西" }, { id: "east", nameJa: "東" }], storiesPath: "", lines, tagged: new Set(tagged), skipped: 0 });
const sent = (lines: ScriptedLine[]): SentVoiceScript => ({ journeyId: "ta_trip", date: "2026-11-12", file: "", lines });
const clip = (text: string) => ({ text, script: "2026-11-12" });

describe("voice:changes", () => {
  it("finds nothing when the recorded lines say what their clips say and the others what the script said", () => {
    const changes = voiceChanges(scriptOf([current("ta_a_001", "行こう"), current("ta_b_001", "うん")], ["ta_a_001"]),
      sent([scripted("ta_a_001", "行こう"), scripted("ta_b_001", "うん")]), new Map([["ta_a_001", clip("行こう")]]));
    expect(changes).toEqual({ rerecord: [], unused: [], unlisted: [], same: 1, changed: [], removed: [], added: [] });
  });

  it("lists a recorded line against its clip, even when the newest script already has its new text", () => {
    const changes = voiceChanges(scriptOf([current("ta_a_001", "行こうよ"), current("ta_a_002", "うん")], ["ta_a_001", "ta_a_002"]),
      sent([scripted("ta_a_001", "行こうよ")]), new Map([["ta_a_001", clip("行こう")], ["ta_a_003", clip("またね")]]));
    expect(changes.rerecord.map(({ now, recorded }) => [now.id, recorded.text, now.text])).toEqual([["ta_a_001", "行こう", "行こうよ"]]);
    expect(changes.unused).toEqual([{ id: "ta_a_003", recorded: clip("またね") }]);
    expect(changes.unlisted.map((line) => line.id)).toEqual(["ta_a_002"]);
    expect(changes).toMatchObject({ same: 0, changed: [], removed: [], added: [] });
  });

  it("pairs a rewritten line not recorded by similarity in its city; the rest are removed and added", () => {
    const changes = voiceChanges(scriptOf([current("ta_a_004", "三時で止まってるね"), current("ta_a_005", "初めての台詞"),
      current("ta_d_001", "東の門はこっち", "places/ta_west_gate.ink")]),
    sent([scripted("ta_a_002", "三時で止まってる"), scripted("ta_a_003", "また来よう"), scripted("ta_c_001", "東の門はこっち", "places/ta_east_gate.ink")]),
    new Map());
    expect(changes.changed.map(({ old, now }) => [old.id, now.id])).toEqual([["ta_a_002", "ta_a_004"]]);
    // The same text in another city is another line.
    expect(changes.removed.map((old) => old.id)).toEqual(["ta_a_003", "ta_c_001"]);
    expect(changes.added.map((line) => line.id)).toEqual(["ta_a_005", "ta_d_001"]);
  });

  it("measures similarity as the longest common subsequence", () => {
    expect(textSimilarity("abcd", "abcd")).toBe(1);
    expect(textSimilarity("abcd", "abxy")).toBe(0.5);
    expect(textSimilarity("", "")).toBe(1);
    expect(textSimilarity("ab", "")).toBe(0);
  });

  it("prints the recorded lines first, in Japanese", () => {
    const script = scriptOf([current("ta_a_001", "きれいな時計だよね"), current("ta_a_004", "三時で止まってるね"), current("ta_a_005", "初めて")], ["ta_a_001"]);
    const changes = voiceChanges(script, sent([scripted("ta_a_001", "きれいな時計だね"), scripted("ta_a_002", "三時で止まってる")]),
      new Map([["ta_a_001", clip("きれいな時計だね")]]));
    const where = { date: "2026-11-12", count: 2, file: "v/2026-11-12/entries.json" };
    expect(formatVoiceChanges(changes, script, where, { count: 1, file: "v/recorded.json" })).toEqual([
      "テストの旅（ta_trip）：今のヒロインの台詞 3行（録音済み 1行）を比べました。",
      "録音済みの行は録音した声 1本の文（v/recorded.json）と、まだ録音していない行は2026-11-12に渡した台本（2行、v/2026-11-12/entries.json）と比べます。",
      "録り直し 1行／使われなくなった声 0本／記録のない声 0行／まだ録音していない台詞：台本と同じ 0行・変わった 1行・なくなった 0行・台本にない 1行",
      "",
      "■ 録り直しが必要：録音した台詞が変わりました（1行）",
      "",
      "[ta_a_001]　広場の時計（places/ta_west_square.ink）",
      "  録音：きれいな時計だね（2026-11-12の台本）",
      "  今　：きれいな時計だよね",
      "",
      "■ まだ録音していない台詞が変わりました（1行。新しい ID で、今の文で作ります）",
      "",
      "[ta_a_002]（今のID：ta_a_004）　広場の時計（places/ta_west_square.ink）",
      "  台本：三時で止まってる",
      "  今　：三時で止まってるね",
      "",
      "■ 台本にない新しい台詞（1行。声を作るときは npm run voice:script で台本を作り直します）",
      "",
      "[ta_a_005]　広場の時計（places/ta_west_square.ink）",
      "  今　：初めて",
    ]);
    expect(formatVoiceChanges(voiceChanges(scriptOf([]), sent([]), new Map()), scriptOf([]), where, { count: 0, file: "" }).at(-1))
      .toBe("変わった台詞はありません（録音済みの0行は録音した文のまま、まだ録音していない0行は台本のままです）。");
  });
});

describe("the warning for a recorded line that changed", () => {
  const root = path.join(path.sep, "virtual", "dreamscape");
  const story = (source: string, layer = "ta_trip") => ({ id: "places/ta_west_square", layer, source,
    file: path.join(root, "content/journeys/ta_trip/stories/places/ta_west_square.ink") });
  const recorded = new Map([["ta_a_001", clip("行こう、【ヒロインの名前】")], ["ta_a_002", clip("うん")]]);
  const warnings = (source: string, layer?: string) => recordedLineWarnings({ root, storyFiles: [story(source, layer)] }, "ta_trip", recorded);

  it("warns for a # voice: whose line no longer says what its clip says, with both texts", () => {
    expect(warnings("=== ta_a ===\n# speaker: heroine\n# voice: ta_a_002\nうん、行こう\n")).toEqual([{ kind: "voice-changed",
      message: "録音した台詞が変わりました：ta_a_002（録り直しが必要）。録音した文（2026-11-12の台本）：うん　今：うん、行こう" +
        "（content/journeys/ta_trip/stories/places/ta_west_square.ink の4行目）" }]);
  });

  it("warns for a # voice: that recorded.json does not have", () => {
    expect(warnings("# voice: ta_a_003\n新しい\n")[0].message).toBe(
      "録音した文の記録がない声です：ta_a_003（content/journeys/ta_trip/stories/places/ta_west_square.ink の2行目）。" +
      "npm run voice:tag で付けると、録音した文が記録されます。");
  });

  it("does not warn for a line that says what its clip says (names as the script shows them), nor for another journey's", () => {
    expect(warnings("=== ta_a ===\n# voice: ta_a_001\n行こう、{heroine_name}\nうん # voice: ta_a_002\n")).toEqual([]);
    expect(warnings("# voice: ta_a_002\n違う\n", "tb_trip")).toEqual([]);
  });
});
