import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { voiceRecordWarnings } from "./voice-changes";
import { recordedVoicesFile, spokenUpToName, voiceRecordsOf } from "./content-sources";
import { copyVoiceRecords, partialRecordings, RECORDED_FILE, readRecordedClips, readSentScripts, readVoiceCast, readVoiceHistory, voiceRecordsFolder, writeRecordedClips } from "./voice-records";

// A journey's voice records in authoring/journeys/<journeyId>/voice/: the scripts sent (one folder per date, or date and
// label), recorded.json (what each delivered clip says) and cast.json (who voices the other characters).

describe("the voice records of a journey", () => {
  let root = "";
  const folder = "authoring/journeys/ta_trip/voice";
  const write = (relative: string, text: string) => {
    mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    writeFileSync(path.join(root, relative), text);
  };
  const line = (id: string, text: string) => ({ id, text, file: "places/ta_west_square.ink", knot: "ta_a", title: "広場", line: 3, emo: [] });
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "dreamscape-voice-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("is where content-sources.ts reads the voices recorded up to a name with the content tree", () => {
    expect(recordedVoicesFile("ta_trip")).toBe(path.posix.join(voiceRecordsFolder("ta_trip"), RECORDED_FILE));
    write(`${folder}/recorded.json`, JSON.stringify({ schemaVersion: 1, clips: { ta_a_001: { text: "あら。……『{player_name}』", script: "2026-11-17", spoken: "あら。……" } } }));
    expect(spokenUpToName(root, ["ta_trip"])).toEqual(new Map([["ta_a_001", "あら。……"]]));
    write(`${folder}/recorded.json`, "{");
    expect(spokenUpToName(root, ["ta_trip"])).toEqual(new Map());
    expect(voiceRecordsOf(root, ["ta_trip", "tb_trip"]).unreadable).toEqual([`${folder}/recorded.json`]);
  });

  it("copies each journey's recorded.json to a staged copy, so the copy keeps the clips recorded up to a name", () => {
    const clips = { gt_x_001: { text: "あら。……『{player_name}』", script: "2026-11-17", spoken: "あら。……" } };
    write(`${folder}/recorded.json`, JSON.stringify({ schemaVersion: 1, clips }));
    write("authoring/journeys/no_voice/notes.md", "声なし");
    const stage = mkdtempSync(path.join(tmpdir(), "dreamscape-voice-stage-"));
    try {
      copyVoiceRecords(root, stage);
      expect(partialRecordings(stage, ["ta_trip", "no_voice"])).toEqual(new Map([["gt_x_001", "あら。……"]]));
      expect(() => readFileSync(path.join(stage, "authoring/journeys/no_voice/voice/recorded.json"))).toThrow(/ENOENT/);
      copyVoiceRecords(path.join(root, "missing"), stage);
    } finally {
      rmSync(stage, { recursive: true, force: true });
    }
  });

  it("reads the scripts sent, newest first: each date folder with an entries.json", () => {
    write(`${folder}/2026-11-12/entries.json`, JSON.stringify([line("ta_a_001", "行こう")]));
    write(`${folder}/2026-11-20/entries.json`, JSON.stringify([line("ta_a_001", "行こうよ")]));
    write(`${folder}/2026-11-25/heroine_lines.txt`, "台本だけ");
    write(`${folder}/notes/entries.json`, "[]");
    expect(readSentScripts(root, "ta_trip").map((script) => [script.date, script.lines[0].text])).toEqual([["2026-11-20", "行こうよ"], ["2026-11-12", "行こう"]]);
    expect(readSentScripts(root, "tb_trip")).toEqual([]);
  });

  it("reads a date folder with a label (YYYY-MM-DD_<label>, 2026-11-17) as newer than the bare date, and old lines without a voice", () => {
    write(`${folder}/2026-11-17/entries.json`, JSON.stringify([line("ta_a_001", "行こう")]));
    write(`${folder}/2026-11-17_cast/entries.json`, JSON.stringify([{ ...line("ta_a_kamla_001", "おいで"), voice: "ta_kamla", speakerJa: "カムラ" }]));
    write(`${folder}/2026-11-16_b2/entries.json`, "[]");
    write(`${folder}/2026-11-15b/entries.json`, "[]");
    write(`${folder}/2026-11-15_Cast/entries.json`, "[]");
    const scripts = readSentScripts(root, "ta_trip");
    expect(scripts.map((script) => script.date)).toEqual(["2026-11-17_cast", "2026-11-17", "2026-11-16_b2"]);
    expect(scripts[0].lines[0]).toMatchObject({ id: "ta_a_kamla_001", voice: "ta_kamla", speakerJa: "カムラ" });
    expect(scripts[1].lines[0].voice).toBeUndefined();
  });

  it("keeps a sent line's spoken, and reads the clips recorded up to a name of each journey (2026-11-17)", () => {
    write(`${folder}/2026-11-17_cast/entries.json`, JSON.stringify([{ ...line("ta_a_front_001", "あら。【主人公の名前】"), spoken: "あら。" }]));
    expect(readSentScripts(root, "ta_trip")[0].lines[0].spoken).toBe("あら。");
    write(`${folder}/recorded.json`, JSON.stringify({ schemaVersion: 1, clips: {
      ta_a_001: { text: "行こう", script: "2026-11-12" }, ta_a_front_001: { text: "あら。【主人公の名前】", script: "2026-11-17_cast", spoken: "あら。" } } }));
    write("authoring/journeys/tb_trip/voice/recorded.json", "{ not json");
    expect(partialRecordings(root, ["ta_trip", "tb_trip", "tc_trip"])).toEqual(new Map([["ta_a_front_001", "あら。"]]));
    expect(readRecordedClips(root, "ta_trip")?.get("ta_a_001")).toEqual({ text: "行こう", script: "2026-11-12" });
  });

  it("reads cast.json when there is one, and refuses one it cannot read", () => {
    expect(readVoiceCast(root, "ta_trip")).toBeUndefined();
    write(`${folder}/cast.json`, readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../tests/fixtures/voice-cast.json"), "utf8"));
    expect(readVoiceCast(root, "ta_trip")?.voices.map((voice) => voice.voice)).toEqual(["ta_kamla", "ta_guard", "ta_lili"]);
    write(`${folder}/cast.json`, JSON.stringify({ schemaVersion: 1, journeyId: "ta_trip", checkedAt: "2026-11-17", voices: [{ voice: "ta_x", engine: "coeiroink" }] }));
    expect(() => readVoiceCast(root, "ta_trip")).toThrow(`声の配役を読めません：${folder}/cast.json`);
  });

  it("writes and reads recorded.json in the order of its clips", () => {
    mkdirSync(path.join(root, folder), { recursive: true });
    expect(readRecordedClips(root, "ta_trip")).toBeUndefined();
    const clips = new Map([["ta_b_001", { text: "うん", script: "2026-11-12" }], ["ta_a_001", { text: "行こう", script: "2026-11-12" }]]);
    writeRecordedClips(root, "ta_trip", clips);
    expect(JSON.parse(readFileSync(path.join(root, folder, "recorded.json"), "utf8"))).toEqual({ schemaVersion: 1, clips: Object.fromEntries(clips) });
    expect([...readVoiceHistory(root, "ta_trip").recorded]).toEqual([...clips]);
  });

  it("refuses a file it cannot read; for content:build that is a warning", () => {
    write(`${folder}/2026-11-12/entries.json`, "[{");
    write(`${folder}/recorded.json`, JSON.stringify({ schemaVersion: 1, clips: { ta_a_001: { text: "行こう" } } }));
    expect(() => readSentScripts(root, "ta_trip")).toThrow(`渡した声の台本を読めません：${folder}/2026-11-12/entries.json`);
    expect(() => readRecordedClips(root, "ta_trip")).toThrow(`録音した声の記録を読めません：${folder}/recorded.json`);
    const manifests = [{ id: "ta_trip", order: 10, directory: "", file: "", data: {} }];
    expect(voiceRecordWarnings({ root, storyFiles: [], manifests })).toEqual([{ kind: "voice-changed",
      message: expect.stringContaining(`録音した声の記録を読めません：${folder}/recorded.json`) }]);
  });
});
