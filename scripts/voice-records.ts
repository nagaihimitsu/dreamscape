import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { displayPath } from "./content-sources";
import { authoringFolder } from "./journey-authoring";
import type { SentVoiceScript } from "./voice-script";

// The records of a journey's voices in authoring/journeys/<journeyId>/voice/ (2026-11-13; the game never reads them):
// - <date>/ (YYYY-MM-DD): a script sent to the people who make the voices, kept as it was sent, with its entries.json.
//   voice:script keeps the IDs they gave; voice:changes compares the lines not recorded with the newest.
// - recorded.json: what each delivered clip says (the text it was made from and the date of that script), written by
//   voice:tag. voice:changes and content:build compare the recorded lines (`# voice:`) with it, so a changed line is
//   reported until its new clip is delivered and recorded, whatever scripts are sent in between.

/** Where a journey's voice records are: `authoring/journeys/<journeyId>/voice/`. */
export const voiceRecordsFolder = (journeyId: string) => `${authoringFolder(journeyId)}voice/`;
export const RECORDED_FILE = "recorded.json";

/** What a delivered clip says: the text it was made from, and the date of the script that had it. */
export type RecordedClip = { text: string; script: string };
/** Voice ID → what its clip says, in the order they were recorded. */
export type RecordedClips = ReadonlyMap<string, RecordedClip>;

const DATE_FOLDER = /^\d{4}-\d{2}-\d{2}$/u;
const scriptedLinesSchema = z.array(z.object({ id: z.string(), text: z.string(), file: z.string(), knot: z.string(), title: z.string() }));
const recordedSchema = z.object({ schemaVersion: z.literal(1), clips: z.record(z.string(), z.object({ text: z.string(), script: z.string() })) });

function readJson<T>(root: string, file: string, schema: { parse(value: unknown): T }, what: string): T {
  try {
    return schema.parse(JSON.parse(readFileSync(file, "utf8")));
  } catch (error) {
    throw new Error(`${what}を読めません：${displayPath(root, file)}（Cannot read ${path.basename(file)}）`, { cause: error });
  }
}

/** The scripts sent for a journey, newest first: each date folder with an entries.json. Throws for one it cannot read. */
export function readSentScripts(root: string, journeyId: string): SentVoiceScript[] {
  const folder = path.join(root, voiceRecordsFolder(journeyId));
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && DATE_FOLDER.test(entry.name) && existsSync(path.join(folder, entry.name, "entries.json")))
    .map((entry) => entry.name).sort().reverse()
    .map((date) => {
      const file = path.join(folder, date, "entries.json");
      return { journeyId, date, file, lines: readJson(root, file, scriptedLinesSchema, "渡した声の台本") };
    });
}

/** The journey's recorded.json, or undefined when it has none. Throws for one it cannot read. */
export function readRecordedClips(root: string, journeyId: string): RecordedClips | undefined {
  const file = path.join(root, voiceRecordsFolder(journeyId), RECORDED_FILE);
  return existsSync(file) ? new Map(Object.entries(readJson(root, file, recordedSchema, "録音した声の記録").clips)) : undefined;
}

/** Write the journey's recorded.json (its voice records folder must exist); returns the file. */
export function writeRecordedClips(root: string, journeyId: string, clips: RecordedClips): string {
  const file = path.join(root, voiceRecordsFolder(journeyId), RECORDED_FILE);
  writeFileSync(file, `${JSON.stringify({ schemaVersion: 1, clips: Object.fromEntries(clips) }, null, 2)}\n`);
  return file;
}

/** The scripts sent (newest first) and the recorded clips (none without a recorded.json). */
export function readVoiceHistory(root: string, journeyId: string): { scripts: SentVoiceScript[]; recorded: RecordedClips } {
  return { scripts: readSentScripts(root, journeyId), recorded: readRecordedClips(root, journeyId) ?? new Map() };
}
