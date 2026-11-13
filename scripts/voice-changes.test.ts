import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  changedRecordingWarnings, compareVoiceScripts, formatVoiceChanges, readLatestVoiceScript, textSimilarity, voiceScriptWarnings,
  type ScriptedLine, type SentVoiceScript,
} from "./voice-changes";
import type { VoiceLine } from "./voice-script";

// The voice scripts sent (authoring/journeys/<journeyId>/voice/<date>/): voice:changes against the current heroine
// lines, and content:build's warning for a recorded line whose text is no longer the script's.

const scripted = (id: string, text: string, file = "places/ta_west_square.ink"): ScriptedLine =>
  ({ id, text, file, knot: id.replace(/_\d+$/u, ""), title: "広場の時計" });
const current = (id: string, text: string, file = "places/ta_west_square.ink"): VoiceLine =>
  ({ ...scripted(id, text, file), line: 0, emo: [], staging: [], context: [], prev: null, flags: [] });
const cities = ["west", "east"];

describe("voice:changes", () => {
  it("finds nothing when every line says what the script said, under a new ID too (a knot renamed)", () => {
    const changes = compareVoiceScripts([scripted("ta_a_001", "行こう"), scripted("ta_b_001", "うん")],
      [current("ta_b_battle_001", "うん"), current("ta_a_001", "行こう")], cities, new Set(["ta_a_001"]));
    expect(changes).toEqual({ same: 2, changed: [], removed: [], added: [] });
  });

  it("pairs a rewritten line by similarity in its city, a recorded one by its ID; the rest are removed and added", () => {
    const changes = compareVoiceScripts(
      [scripted("ta_a_001", "きれいな時計だね"), scripted("ta_a_002", "三時で止まってる"), scripted("ta_a_003", "また来よう"),
        scripted("ta_c_001", "東の門はこっち", "places/ta_east_gate.ink")],
      [current("ta_a_001", "まったく別の言葉になった"), current("ta_a_002", "三時で止まってるね"), current("ta_a_004", "初めての台詞"),
        current("ta_d_001", "東の門はこっち", "places/ta_west_gate.ink")],
      cities, new Set(["ta_a_001"]));
    expect(changes.same).toBe(0);
    expect(changes.changed.map(({ old, now, recorded }) => [old.id, now.text, recorded])).toEqual([
      ["ta_a_001", "まったく別の言葉になった", true], ["ta_a_002", "三時で止まってるね", false]]);
    // The same text in another city is another line.
    expect(changes.removed.map(({ old }) => old.id)).toEqual(["ta_a_003", "ta_c_001"]);
    expect(changes.added.map((line) => line.id)).toEqual(["ta_a_004", "ta_d_001"]);
  });

  it("matches the same text line by line, so a repeated line counts once", () => {
    const changes = compareVoiceScripts([scripted("ta_a_001", "うん"), scripted("ta_a_002", "うん")],
      [current("ta_a_001", "うん"), current("ta_a_003", "うん"), current("ta_a_004", "うん")], cities, new Set());
    expect(changes).toMatchObject({ same: 2, changed: [], removed: [] });
    expect(changes.added.map((line) => line.id)).toEqual(["ta_a_004"]);
  });

  it("measures similarity as the longest common subsequence", () => {
    expect(textSimilarity("abcd", "abcd")).toBe(1);
    expect(textSimilarity("abcd", "abxy")).toBe(0.5);
    expect(textSimilarity("", "")).toBe(1);
    expect(textSimilarity("ab", "")).toBe(0);
  });

  it("prints the recorded lines first, in Japanese", () => {
    const script: SentVoiceScript = { journeyId: "ta_trip", date: "2026-11-12", file: "/x/entries.json",
      lines: [scripted("ta_a_001", "きれいな時計だね"), scripted("ta_a_002", "三時で止まってる"), scripted("ta_a_003", "また来よう")] };
    const changes = compareVoiceScripts(script.lines,
      [current("ta_a_002", "三時で止まってるね"), current("ta_a_009", "きれいな時計だよね"), current("ta_a_003", "また来よう"), current("ta_a_004", "初めて")],
      cities, new Set(["ta_a_001"]));
    expect(formatVoiceChanges(changes, script, { id: "ta_trip", nameJa: "テストの旅" }, "authoring/v.json")).toEqual([
      "テストの旅（ta_trip）：2026-11-12に渡した声の台本（3行、authoring/v.json）と今のシナリオの比べ",
      "台本と同じ 1行／変わった 2行（録音済み 1行）／なくなった 0行（録音済み 0行）／台本にない 1行",
      "",
      "■ 録り直しが必要：録音した台詞が変わりました（1行）",
      "",
      "[ta_a_001]（今のID：ta_a_009）　広場の時計（places/ta_west_square.ink）",
      "  台本：きれいな時計だね",
      "  今　：きれいな時計だよね",
      "",
      "■ まだ録音していない台詞が変わりました（1行。今の文で作ります）",
      "",
      "[ta_a_002]　広場の時計（places/ta_west_square.ink）",
      "  台本：三時で止まってる",
      "  今　：三時で止まってるね",
      "",
      "■ 台本にない新しい台詞（1行。声を作るときは npm run voice:script で台本を作り直します）",
      "",
      "[ta_a_004]　広場の時計（places/ta_west_square.ink）",
      "  今　：初めて",
    ]);
    expect(formatVoiceChanges({ same: 3, changed: [], removed: [], added: [] }, script, { id: "ta_trip", nameJa: "テストの旅" }, "v.json")[1])
      .toBe("変わった台詞はありません。台本の3行は、どれも今のシナリオと同じです。");
  });
});

describe("the warning for a recorded line that changed", () => {
  const root = path.join(path.sep, "virtual", "dreamscape");
  const story = (source: string) => ({ id: "places/ta_west_square", layer: "ta_trip", source,
    file: path.join(root, "content/journeys/ta_trip/stories/places/ta_west_square.ink") });
  const script: SentVoiceScript = { journeyId: "ta_trip", date: "2026-11-12", file: "", lines: [scripted("ta_a_001", "行こう、【ヒロインの名前】"), scripted("ta_a_002", "うん")] };

  it("warns for a # voice: whose line no longer says the script's text, with both", () => {
    const source = "=== ta_a ===\n# speaker: heroine\n# voice: ta_a_002\nうん、行こう\n# voice: ta_a_003\n新しい\n";
    expect(changedRecordingWarnings({ root, storyFiles: [story(source)] }, script)).toEqual([{ kind: "voice-changed",
      message: "録音した台詞が変わりました：ta_a_002（録り直しが必要）。2026-11-12の台本：うん　今：うん、行こう" +
        "（content/journeys/ta_trip/stories/places/ta_west_square.ink の4行目）" }]);
  });

  it("does not warn for a line that says the script's text (names as the script shows them) or another journey's", () => {
    const source = "=== ta_a ===\n# voice: ta_a_001\n行こう、{heroine_name}\nうん # voice: ta_a_002\n";
    expect(changedRecordingWarnings({ root, storyFiles: [story(source)] }, script)).toEqual([]);
    expect(changedRecordingWarnings({ root, storyFiles: [{ ...story("# voice: ta_a_002\n違う\n"), layer: "tb_trip" }] }, script)).toEqual([]);
  });
});

describe("the voice scripts kept in authoring/", () => {
  let root = "";
  afterEach(() => rmSync(root, { recursive: true, force: true }));
  const write = (relative: string, text: string) => {
    mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    writeFileSync(path.join(root, relative), text);
  };

  it("reads the latest dated folder with an entries.json; a script it cannot read is a warning of content:build", () => {
    root = mkdtempSync(path.join(tmpdir(), "dreamscape-voice-"));
    const folder = "authoring/journeys/ta_trip/voice";
    write(`${folder}/2026-11-12/entries.json`, JSON.stringify([{ ...current("ta_a_001", "行こう"), extra: 1 }]));
    write(`${folder}/2026-11-20/heroine_lines.txt`, "台本だけ");
    write(`${folder}/notes/entries.json`, "[]");
    expect(readLatestVoiceScript(root, "ta_trip")).toMatchObject({ date: "2026-11-12", lines: [scripted("ta_a_001", "行こう")] });
    expect(readLatestVoiceScript(root, "tb_trip")).toBeUndefined();

    write(`${folder}/2026-11-20/entries.json`, "[{");
    expect(() => readLatestVoiceScript(root, "ta_trip")).toThrow(`渡した声の台本を読めません：${folder}/2026-11-20/entries.json`);
    const manifests = [{ id: "ta_trip", order: 10, directory: "", file: "", data: {} }];
    expect(voiceScriptWarnings({ root, storyFiles: [], manifests })[0]).toMatchObject({ kind: "voice-changed",
      message: expect.stringContaining(`渡した声の台本を読めません：${folder}/2026-11-20/entries.json`) });
  });
});
