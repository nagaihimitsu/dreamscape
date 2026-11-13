import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { voiceRecordWarnings } from "./voice-changes";
import { readRecordedClips, readSentScripts, readVoiceHistory, writeRecordedClips } from "./voice-records";

// A journey's voice records in authoring/journeys/<journeyId>/voice/: the scripts sent (one folder per date) and
// recorded.json (what each delivered clip says).

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

  it("reads the scripts sent, newest first: each date folder with an entries.json", () => {
    write(`${folder}/2026-11-12/entries.json`, JSON.stringify([line("ta_a_001", "行こう")]));
    write(`${folder}/2026-11-20/entries.json`, JSON.stringify([line("ta_a_001", "行こうよ")]));
    write(`${folder}/2026-11-25/heroine_lines.txt`, "台本だけ");
    write(`${folder}/notes/entries.json`, "[]");
    expect(readSentScripts(root, "ta_trip").map((script) => [script.date, script.lines[0].text])).toEqual([["2026-11-20", "行こうよ"], ["2026-11-12", "行こう"]]);
    expect(readSentScripts(root, "tb_trip")).toEqual([]);
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
